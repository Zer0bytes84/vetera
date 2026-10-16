//! Explicit, disk-only GET downloads. No audio, consultation or patient data enters this module.
use crate::local_ai_models::{self, LocalModelStatus, IMPORT_LOCK};
use reqwest::{blocking::Client, StatusCode};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs::{self, File},
    io::{Read, Write},
    path::{Component, Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    time::{Duration, Instant},
};
use tauri::{ipc::Channel, Manager};

static CANCELLED: AtomicBool = AtomicBool::new(false);
const MANIFEST: &str = include_str!("../../resources/local-ai/download-manifest.json");

#[derive(Clone, Deserialize)]
struct ModelFile {
    path: String,
    url: String,
    size: u64,
    sha256: String,
}

#[derive(Deserialize)]
struct Model {
    id: String,
    name: String,
    files: Vec<ModelFile>,
}

#[derive(Clone, Debug, Serialize)]
pub struct DownloadError {
    code: &'static str,
    message: String,
}

impl DownloadError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    step: String,
    step_message: String,
    current_model_id: Option<String>,
    total_bytes: u64,
    downloaded_bytes: u64,
    percentage: u64,
    speed_mbps: f64,
    seconds_remaining: u64,
    models: BTreeMap<String, String>,
}

fn safe_path(root: &Path, relative: &str) -> Result<PathBuf, DownloadError> {
    let path = Path::new(relative);
    if path.as_os_str().is_empty()
        || path
            .components()
            .any(|part| !matches!(part, Component::Normal(_)))
    {
        return Err(DownloadError::new(
            "configuration",
            "Les fichiers d’installation ne sont pas compatibles.",
        ));
    }
    Ok(root.join(path))
}

fn manifest() -> Result<Vec<Model>, DownloadError> {
    let models: Vec<Model> = serde_json::from_str(MANIFEST).map_err(|_| {
        DownloadError::new(
            "configuration",
            "La liste des outils à installer est indisponible.",
        )
    })?;
    for model in &models {
        if !matches!(
            model.id.as_str(),
            "whisper" | "generator" | "embeddinggemma"
        ) {
            return Err(DownloadError::new(
                "configuration",
                "Outil d’installation inconnu.",
            ));
        }
        for file in &model.files {
            safe_path(Path::new("."), &file.path)?;
            let url = reqwest::Url::parse(&file.url).map_err(|_| {
                DownloadError::new("configuration", "Source d’installation invalide.")
            })?;
            if url.scheme() != "https"
                || url.host_str() != Some("huggingface.co")
                || file.size == 0
                || file.sha256.len() != 64
            {
                return Err(DownloadError::new(
                    "configuration",
                    "Source d’installation invalide.",
                ));
            }
        }
    }
    Ok(models)
}

fn disk_error() -> DownloadError {
    DownloadError::new("disk", "Impossible d’enregistrer les outils. Vérifiez l’espace disque et les autorisations, puis réessayez.")
}

fn network_client(https_only: bool) -> Result<Client, DownloadError> {
    let _ = rustls::crypto::ring::default_provider().install_default();
    Client::builder()
        .https_only(https_only)
        .connect_timeout(Duration::from_secs(20))
        .timeout(Duration::from_secs(30 * 60))
        .user_agent("Baitari local model installer")
        .build()
        .map_err(|_| http_error(StatusCode::SERVICE_UNAVAILABLE))
}

fn interrupted(cancelled: &AtomicBool) -> Result<(), DownloadError> {
    if cancelled.load(Ordering::Relaxed) {
        return Err(DownloadError::new(
            "cancelled",
            "Téléchargement arrêté. Vous pouvez le relancer depuis les paramètres.",
        ));
    }
    Ok(())
}

fn verified_file(
    path: &Path,
    spec: &ModelFile,
    cancelled: &AtomicBool,
) -> Result<bool, DownloadError> {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return Ok(false);
    };
    if !metadata.is_file() || metadata.len() != spec.size {
        return Ok(false);
    }
    let mut reader = File::open(path).map_err(|_| disk_error())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    loop {
        interrupted(cancelled)?;
        let count = reader.read(&mut buffer).map_err(|_| disk_error())?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }
    Ok(format!("{:x}", hasher.finalize()) == spec.sha256)
}

fn http_error(status: StatusCode) -> DownloadError {
    if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
        DownloadError::new("access_required", "Le fournisseur doit autoriser le téléchargement de cet outil. Autorisez l’accès puis indiquez votre clé de téléchargement dans les paramètres, ou importez les fichiers déjà téléchargés.")
    } else {
        DownloadError::new("network", "Le téléchargement est indisponible pour le moment. Vérifiez votre connexion et réessayez.")
    }
}

fn download_file(
    client: &Client,
    spec: &ModelFile,
    destination: &Path,
    access_token: Option<&str>,
    cancelled: &AtomicBool,
    mut progress: impl FnMut(u64),
) -> Result<(), DownloadError> {
    interrupted(cancelled)?;
    if verified_file(destination, spec, cancelled)? {
        progress(spec.size);
        return Ok(());
    }
    fs::create_dir_all(destination.parent().ok_or_else(disk_error)?).map_err(|_| disk_error())?;
    let partial = destination.with_extension("part");
    // Only the in-memory optional key is sent; redirects drop authorization on another host.
    let mut request = client.get(&spec.url);
    if let Some(token) = access_token {
        request = request.bearer_auth(token);
    }
    let mut response = request
        .send()
        .map_err(|_| http_error(StatusCode::SERVICE_UNAVAILABLE))?;
    if !response.status().is_success() {
        return Err(http_error(response.status()));
    }
    let result = (|| {
        let mut target = File::create(&partial).map_err(|_| disk_error())?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 64 * 1024];
        let mut received = 0;
        let mut last_report = Instant::now();
        loop {
            interrupted(cancelled)?;
            let count = response
                .read(&mut buffer)
                .map_err(|_| http_error(StatusCode::SERVICE_UNAVAILABLE))?;
            if count == 0 {
                break;
            }
            received += count as u64;
            if received > spec.size {
                return Err(DownloadError::new(
                    "integrity",
                    "Le fichier reçu n’est pas conforme. Réessayez le téléchargement.",
                ));
            }
            target
                .write_all(&buffer[..count])
                .map_err(|_| disk_error())?;
            hasher.update(&buffer[..count]);
            if last_report.elapsed() >= Duration::from_millis(250) {
                progress(received);
                last_report = Instant::now();
            }
        }
        if received != spec.size || format!("{:x}", hasher.finalize()) != spec.sha256 {
            return Err(DownloadError::new("integrity", "Le téléchargement est incomplet ou non conforme. Les outils déjà installés sont conservés ; réessayez."));
        }
        target.sync_all().map_err(|_| disk_error())?;
        drop(target);
        if destination.exists() {
            fs::remove_file(destination).map_err(|_| disk_error())?;
        }
        fs::rename(&partial, destination).map_err(|_| disk_error())?;
        progress(received);
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(partial);
    }
    result
}

fn ready(status: &LocalModelStatus, id: &str) -> bool {
    match id {
        "whisper" => status.whisper_ready,
        "generator" => status.generator_ready,
        _ => status.embedding_ready,
    }
}

fn validate_model(id: &str, folder: &Path) -> Result<(), DownloadError> {
    let result = match id {
        "whisper" => local_ai_models::validate_whisper(folder),
        "embeddinggemma" => local_ai_models::validate_embedding(folder),
        _ => {
            if folder
                .join("gemma3.task")
                .metadata()
                .is_ok_and(|meta| meta.len() > 1024 * 1024)
            {
                Ok(())
            } else {
                Err("Fichier de rédaction incomplet.".into())
            }
        }
    };
    result.map_err(|_| {
        DownloadError::new(
            "integrity",
            "Les fichiers de cet outil sont incomplets ou incompatibles. Réessayez.",
        )
    })
}

fn install_models(
    root: &Path,
    client: &Client,
    models: &[Model],
    access_token: Option<&str>,
    cancelled: &AtomicBool,
    mut emit: impl FnMut(DownloadProgress),
) -> Result<LocalModelStatus, DownloadError> {
    let initial = local_ai_models::status(root);
    let total_bytes = models
        .iter()
        .flat_map(|model| &model.files)
        .map(|file| file.size)
        .sum::<u64>();
    let mut states: BTreeMap<String, String> = models
        .iter()
        .map(|model| {
            (
                model.id.clone(),
                if ready(&initial, &model.id) {
                    "ready"
                } else {
                    "pending"
                }
                .into(),
            )
        })
        .collect();
    let mut completed_bytes = models
        .iter()
        .filter(|model| ready(&initial, &model.id))
        .flat_map(|model| &model.files)
        .map(|file| file.size)
        .sum::<u64>();
    let started = Instant::now();
    let initial_bytes = completed_bytes;
    let mut publish = |step: &str,
                       message: String,
                       current: Option<&str>,
                       bytes: u64,
                       states: &BTreeMap<String, String>| {
        let speed =
            bytes.saturating_sub(initial_bytes) as f64 / started.elapsed().as_secs_f64().max(0.1);
        emit(DownloadProgress {
            step: step.into(),
            step_message: message,
            current_model_id: current.map(str::to_string),
            total_bytes,
            downloaded_bytes: bytes.min(total_bytes),
            percentage: if total_bytes > 0 {
                bytes.saturating_mul(100) / total_bytes
            } else {
                0
            },
            speed_mbps: speed / 1_000_000.0,
            seconds_remaining: if speed > 0.0 {
                (total_bytes.saturating_sub(bytes) as f64 / speed).ceil() as u64
            } else {
                0
            },
            models: states.clone(),
        });
    };
    publish(
        "preparing",
        "Vérification des outils installés…".into(),
        None,
        completed_bytes,
        &states,
    );
    let mut first_error = None;
    for model in models {
        interrupted(cancelled)?;
        if ready(&initial, &model.id) {
            continue;
        }
        let stage = root.join(".downloads").join(&model.id);
        states.insert(model.id.clone(), "downloading".into());
        let result = (|| {
            for file in &model.files {
                let destination = safe_path(&stage, &file.path)?;
                download_file(
                    client,
                    file,
                    &destination,
                    if model.id == "generator" {
                        access_token
                    } else {
                        None
                    },
                    cancelled,
                    |received| {
                        publish(
                            &model.id,
                            format!("Téléchargement : {}…", model.name),
                            Some(&model.id),
                            completed_bytes + received,
                            &states,
                        );
                    },
                )?;
                completed_bytes += file.size;
            }
            states.insert(model.id.clone(), "verifying".into());
            publish(
                &model.id,
                format!("Vérification : {}…", model.name),
                Some(&model.id),
                completed_bytes,
                &states,
            );
            validate_model(&model.id, &stage)?;
            interrupted(cancelled)?;
            local_ai_models::replace_directory(&stage, &root.join(&model.id))
                .map_err(|_| disk_error())?;
            states.insert(model.id.clone(), "ready".into());
            Ok::<(), DownloadError>(())
        })();
        if let Err(error) = result {
            states.insert(model.id.clone(), "error".into());
            publish(
                "error",
                error.message.clone(),
                Some(&model.id),
                completed_bytes,
                &states,
            );
            if error.code == "cancelled" {
                return Err(error);
            }
            if first_error.is_none() {
                first_error = Some(error);
            }
            // Independent tools can still finish, including when one requires authorization.
        }
    }
    let actual = local_ai_models::status(root);
    if models.iter().any(|model| !ready(&actual, &model.id)) {
        return Err(first_error.unwrap_or_else(|| {
            DownloadError::new(
                "integrity",
                "L’installation n’a pas pu être vérifiée. Réessayez depuis les paramètres.",
            )
        }));
    }
    publish(
        "completed",
        "Vos outils IA sont prêts à être utilisés hors ligne.".into(),
        None,
        total_bytes,
        &states,
    );
    Ok(actual)
}

#[tauri::command]
pub async fn download_local_ai_models(
    app: tauri::AppHandle,
    on_progress: Channel<DownloadProgress>,
    access_token: Option<String>,
) -> Result<LocalModelStatus, DownloadError> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|_| disk_error())?
        .join("local-ai");
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = IMPORT_LOCK.try_lock().map_err(|_| {
            DownloadError::new(
                "busy",
                "Une installation est déjà en cours. Vous pouvez continuer à utiliser Baitari.",
            )
        })?;
        CANCELLED.store(false, Ordering::Relaxed);
        let models = manifest()?;
        let client = network_client(true)?;
        install_models(
            &root,
            &client,
            &models,
            access_token
                .as_deref()
                .filter(|token| !token.trim().is_empty()),
            &CANCELLED,
            |progress| {
                let _ = on_progress.send(progress);
            },
        )
    })
    .await
    .map_err(|_| {
        DownloadError::new(
            "interrupted",
            "L’installation a été interrompue. Réessayez depuis les paramètres.",
        )
    })?
}

#[tauri::command]
pub fn cancel_local_ai_download() {
    CANCELLED.store(true, Ordering::Relaxed);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{net::TcpListener, sync::atomic::AtomicU64, thread};
    static NEXT: AtomicU64 = AtomicU64::new(0);

    fn temporary() -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "baitari-download-test-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).unwrap();
        path
    }
    fn fixture(url: String, body: &[u8]) -> ModelFile {
        ModelFile {
            path: "config.json".into(),
            url,
            size: body.len() as u64,
            sha256: format!("{:x}", Sha256::digest(body)),
        }
    }
    fn server(status: &str, body: &[u8]) -> (String, thread::JoinHandle<String>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = format!("http://{}/model", listener.local_addr().unwrap());
        let body = body.to_vec();
        let status = status.to_string();
        let worker = thread::spawn(move || {
            let (mut connection, _) = listener.accept().unwrap();
            connection
                .set_read_timeout(Some(Duration::from_secs(5)))
                .unwrap();
            let mut request = Vec::new();
            let mut buffer = [0u8; 1024];
            while !request.ends_with(b"\r\n\r\n") {
                let count = connection.read(&mut buffer).unwrap();
                if count == 0 {
                    break;
                }
                request.extend_from_slice(&buffer[..count]);
            }
            let response = format!(
                "HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                body.len()
            );
            connection.write_all(response.as_bytes()).unwrap();
            connection.write_all(&body).unwrap();
            String::from_utf8(request).unwrap()
        });
        (address, worker)
    }

    #[test]
    fn pinned_manifest_only_contains_known_https_sources_and_real_sizes() {
        let models = manifest().unwrap();
        assert_eq!(models.len(), 3);
        assert_eq!(
            models
                .iter()
                .flat_map(|model| &model.files)
                .map(|file| file.size)
                .sum::<u64>(),
            2_215_021_763
        );
        for model in models {
            for file in model.files {
                assert!(file.sha256.bytes().all(|byte| byte.is_ascii_hexdigit()));
                assert!(file.url.contains("/resolve/"));
            }
        }
    }

    #[test]
    fn rejects_paths_outside_model_folder() {
        for name in [
            "../patient.db",
            "/tmp/file",
            "onnx/../../file",
            "",
            "./file",
        ] {
            assert!(safe_path(Path::new("/models"), name).is_err());
        }
        assert_eq!(
            safe_path(Path::new("/models"), "onnx/model.onnx").unwrap(),
            PathBuf::from("/models/onnx/model.onnx")
        );
    }

    #[test]
    fn downloads_verified_bytes_and_reuses_finished_file_without_network() {
        let path = temporary();
        let body = br#"{"model_type":"whisper"}"#;
        let (url, worker) = server("200 OK", body);
        let mut spec = fixture(url, body);
        let target = path.join("config.json");
        let mut received = Vec::new();
        download_file(
            &network_client(false).unwrap(),
            &spec,
            &target,
            None,
            &AtomicBool::new(false),
            |bytes| received.push(bytes),
        )
        .unwrap();
        let request = worker.join().unwrap();
        assert!(request.starts_with("GET /model "));
        assert!(!request.to_lowercase().contains("authorization:"));
        assert_eq!(fs::read(&target).unwrap(), body);
        assert_eq!(received.last().copied(), Some(body.len() as u64));
        spec.url = "http://127.0.0.1:1/must-not-be-requested".into();
        download_file(
            &network_client(false).unwrap(),
            &spec,
            &target,
            None,
            &AtomicBool::new(false),
            |_| {},
        )
        .unwrap();
        fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn failed_integrity_preserves_previous_file_and_retry_succeeds() {
        let path = temporary();
        let target = path.join("config.json");
        fs::write(&target, b"previous working file").unwrap();
        let (url, worker) = server("200 OK", b"corrupted");
        let spec = fixture(url, b"validated");
        let error = download_file(
            &network_client(false).unwrap(),
            &spec,
            &target,
            None,
            &AtomicBool::new(false),
            |_| {},
        )
        .unwrap_err();
        worker.join().unwrap();
        assert_eq!(error.code, "integrity");
        assert_eq!(fs::read(&target).unwrap(), b"previous working file");
        assert!(!target.with_extension("part").exists());
        let (url, worker) = server("200 OK", b"validated");
        download_file(
            &network_client(false).unwrap(),
            &fixture(url, b"validated"),
            &target,
            None,
            &AtomicBool::new(false),
            |_| {},
        )
        .unwrap();
        worker.join().unwrap();
        assert_eq!(fs::read(target).unwrap(), b"validated");
        fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn restricted_access_is_actionable_and_never_saved_as_a_model() {
        let path = temporary();
        let (url, worker) = server("401 Unauthorized", b"provider authorization required");
        let spec = fixture(url, b"real model expected");
        let error = download_file(
            &network_client(false).unwrap(),
            &spec,
            &path.join("model.task"),
            Some("fixture-memory-only-key"),
            &AtomicBool::new(false),
            |_| {},
        )
        .unwrap_err();
        let request = worker.join().unwrap();
        assert!(request
            .to_lowercase()
            .contains("authorization: bearer fixture-memory-only-key"));
        assert_eq!(error.code, "access_required");
        assert!(error.message.contains("fournisseur"));
        assert!(!error.message.contains("fixture-memory-only-key"));
        assert!(!path.join("model.task").exists());
        assert!(!path.join("model.part").exists());
        fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn cancelled_transfer_never_requests_or_installs_a_file() {
        let path = temporary();
        let spec = fixture("http://127.0.0.1:1/not-requested".into(), b"model");
        let error = download_file(
            &network_client(false).unwrap(),
            &spec,
            &path.join("model"),
            None,
            &AtomicBool::new(true),
            |_| {},
        )
        .unwrap_err();
        assert_eq!(error.code, "cancelled");
        assert!(!path.join("model").exists());
        fs::remove_dir_all(path).unwrap();
    }

    #[test]
    fn failed_model_validation_never_activates_the_staging_directory() {
        let path = temporary();
        let body = br#"{"model_type":"wrong"}"#;
        let (url, worker) = server("200 OK", body);
        let models = [Model {
            id: "whisper".into(),
            name: "Dictée vocale".into(),
            files: vec![fixture(url, body)],
        }];
        let mut last_step = String::new();
        let error = install_models(
            &path,
            &network_client(false).unwrap(),
            &models,
            None,
            &AtomicBool::new(false),
            |progress| last_step = progress.step,
        )
        .unwrap_err();
        worker.join().unwrap();
        assert_eq!(error.code, "integrity");
        assert_eq!(last_step, "error");
        assert!(!path.join("whisper").exists());
        assert!(path.join(".downloads/whisper/config.json").exists());
        fs::remove_dir_all(path).unwrap();
    }

    #[test]
    #[ignore = "Requires explicitly enabled public model download"]
    fn downloads_real_public_french_configuration_with_sha256() {
        assert_eq!(std::env::var("BAITARI_AI_NETWORK_TEST").unwrap(), "1");
        let path = temporary();
        let models = manifest().unwrap();
        let spec = models[0]
            .files
            .iter()
            .find(|file| file.path == "generation_config.json")
            .unwrap();
        let target = path.join("generation_config.json");
        download_file(
            &network_client(true).unwrap(),
            spec,
            &target,
            None,
            &AtomicBool::new(false),
            |_| {},
        )
        .unwrap();
        let value: serde_json::Value = serde_json::from_slice(&fs::read(target).unwrap()).unwrap();
        assert_eq!(value["is_multilingual"], true);
        assert!(value["lang_to_id"]["<|fr|>"].is_number());
        fs::remove_dir_all(path).unwrap();
    }

    #[test]
    #[ignore = "Requires explicitly selected local model files; small public config files may download"]
    fn installs_real_cached_models_atomically_and_checks_actual_status() {
        let source = PathBuf::from(
            std::env::var("BAITARI_AI_MODEL_TEST_DIR").expect("Select local model files"),
        );
        let path = temporary();
        let models = manifest().unwrap();
        for model in &models {
            for spec in &model.files {
                let candidate = match model.id.as_str() {
                    "generator" => source.join("gemma3.task"),
                    "whisper" => source.join("whisper-small").join(&spec.path),
                    _ => {
                        let nested = source.join("embeddinggemma").join(&spec.path);
                        if nested.exists() {
                            nested
                        } else {
                            source
                                .join("embeddinggemma")
                                .join(spec.path.strip_prefix("onnx/").unwrap_or(&spec.path))
                        }
                    }
                };
                if candidate.is_file() {
                    let target =
                        safe_path(&path.join(".downloads").join(&model.id), &spec.path).unwrap();
                    fs::create_dir_all(target.parent().unwrap()).unwrap();
                    fs::copy(candidate, target).unwrap();
                } else {
                    assert!(
                        spec.size < 2_000_000,
                        "Large model file must already be present"
                    );
                }
            }
        }
        let mut finished = false;
        let installed = install_models(
            &path,
            &network_client(true).unwrap(),
            &models,
            None,
            &AtomicBool::new(false),
            |progress| {
                finished = progress.step == "completed";
            },
        )
        .unwrap();
        assert!(
            finished
                && installed.whisper_ready
                && installed.generator_ready
                && installed.embedding_ready
        );
        assert!(!path.join(".downloads/generator").exists());
        fs::remove_dir_all(path).unwrap();
    }
}
