//! Local model status and explicit disk imports. Status checks never install files.
use serde::Serialize;
use serde_json::Value;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::Manager;

pub(crate) static IMPORT_LOCK: Mutex<()> = Mutex::new(());
const WHISPER_REQUIRED: &[&str] = &[
    "config.json",
    "generation_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "preprocessor_config.json",
    "onnx/encoder_model_quantized.onnx",
    "onnx/decoder_model_merged_quantized.onnx",
];
const WHISPER_OPTIONAL: &[&str] = &[
    "special_tokens_map.json",
    "added_tokens.json",
    "vocab.json",
    "merges.txt",
    "normalizer.json",
    "model-manifest.json",
    "LICENSE",
    "onnx/encoder_model_quantized.onnx_data",
    "onnx/decoder_model_merged_quantized.onnx_data",
];

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalModelStatus {
    root: String,
    pub(crate) whisper_ready: bool,
    whisper_model: Option<String>,
    pub(crate) generator_ready: bool,
    pub(crate) embedding_ready: bool,
}

fn read_json(path: &Path) -> Result<Value, String> {
    let metadata =
        fs::symlink_metadata(path).map_err(|_| "Un fichier JSON du modèle est manquant.")?;
    if !metadata.is_file() || metadata.len() > 32 * 1024 * 1024 {
        return Err("Fichier JSON de modèle invalide.".into());
    }
    serde_json::from_slice(
        &fs::read(path).map_err(|_| "Lecture des fichiers du modèle impossible.")?,
    )
    .map_err(|_| "Un fichier JSON du modèle est invalide.".into())
}
pub(crate) fn validate_whisper(folder: &Path) -> Result<(), String> {
    for name in WHISPER_REQUIRED {
        let file = folder.join(name);
        let metadata = fs::symlink_metadata(&file).map_err(|_| format!("Fichier Whisper manquant : {name}. Choisissez un modèle multilingue ONNX quantifié (q8)."))?;
        if !metadata.is_file() || metadata.len() == 0 {
            return Err(format!("Fichier Whisper invalide : {name}."));
        }
    }
    let config = read_json(&folder.join("config.json"))?;
    let generation = read_json(&folder.join("generation_config.json"))?;
    if config["model_type"] != "whisper"
        || generation["is_multilingual"] != true
        || !generation["lang_to_id"]["<|fr|>"].is_number()
    {
        return Err("Ce modèle Whisper n’est pas multilingue ou ne prend pas en charge le français. Les modèles .en ne conviennent pas.".into());
    }
    if config["encoder_layers"].as_u64().unwrap_or(0) < 12
        || config["decoder_layers"].as_u64().unwrap_or(0) < 12
        || config["d_model"].as_u64().unwrap_or(0) < 768
    {
        return Err("Choisissez Whisper small ou medium multilingue (q8). Les anciens modèles tiny et base ne sont plus adaptés à la dictée de consultation.".into());
    }
    let preprocessing = read_json(&folder.join("preprocessor_config.json"))?;
    if preprocessing["sampling_rate"] != 16000 {
        return Err("Ce modèle doit accepter un signal audio à 16 kHz.".into());
    }
    Ok(())
}
const EMBEDDING_CONFIG: &str = include_str!("../../resources/local-ai/embeddinggemma-config.json");
const EMBEDDING_REQUIRED: &[(&str, u64)] = &[
    ("tokenizer.json", 20323312),
    ("tokenizer.model", 4689074),
    ("tokenizer_config.json", 1156830),
    ("onnx/model.onnx", 479932),
    ("onnx/model.onnx_data", 1234521088),
];
fn embedding_source_file(folder: &Path, name: &str) -> PathBuf {
    let nested = folder.join(name);
    if nested.exists() {
        nested
    } else {
        folder.join(name.strip_prefix("onnx/").unwrap_or(name))
    }
}
pub(crate) fn validate_embedding(folder: &Path) -> Result<(), String> {
    let config = if folder.join("config.json").exists() {
        read_json(&folder.join("config.json"))?
    } else {
        serde_json::from_str(EMBEDDING_CONFIG)
            .map_err(|_| "Configuration de recherche invalide.")?
    };
    if config["model_type"] != "gemma3_text" || config["hidden_size"] != 768 {
        return Err("Les fichiers de recherche sélectionnés ne sont pas compatibles.".into());
    }
    for (name, expected_size) in EMBEDDING_REQUIRED {
        let meta = fs::symlink_metadata(embedding_source_file(folder, name))
            .map_err(|_| "Un fichier de recherche est manquant.")?;
        if !meta.is_file() || meta.len() != *expected_size {
            return Err("Un fichier de recherche est incomplet ou incompatible.".into());
        }
    }
    read_json(&folder.join("tokenizer_config.json"))?;
    read_json(&folder.join("tokenizer.json"))?;
    Ok(())
}
pub(crate) fn status(root: &Path) -> LocalModelStatus {
    LocalModelStatus {
        root: root.to_string_lossy().into_owned(),
        embedding_ready: validate_embedding(&root.join("embeddinggemma")).is_ok(),
        whisper_ready: validate_whisper(&root.join("whisper")).is_ok(),
        whisper_model: read_json(&root.join("whisper/config.json"))
            .ok()
            .and_then(|config| {
                match (
                    config["encoder_layers"].as_u64()?,
                    config["d_model"].as_u64()?,
                ) {
                    (12, 768) => Some("Whisper small · q8".into()),
                    (24, 1024) => Some("Whisper medium · q8".into()),
                    (layers, width) if layers >= 12 && width >= 768 => {
                        Some("Whisper multilingue · q8".into())
                    }
                    _ => None,
                }
            }),
        generator_ready: root
            .join("generator/gemma3.task")
            .metadata()
            .is_ok_and(|meta| meta.is_file() && meta.len() > 1024 * 1024),
    }
}
pub(crate) fn replace_directory(stage: &Path, destination: &Path) -> Result<(), String> {
    let backup = destination.with_extension("previous");
    if backup.exists() {
        fs::remove_dir_all(&backup)
            .map_err(|_| "Impossible de préparer le remplacement du modèle.")?;
    }
    let had_previous = destination.exists();
    if had_previous {
        fs::rename(destination, &backup).map_err(|_| {
            "Le modèle précédent est occupé. Arrêtez la dictée avant de réimporter."
        })?;
    }
    if fs::rename(stage, destination).is_err() {
        if had_previous {
            let _ = fs::rename(&backup, destination);
        }
        return Err(
            "Installation du modèle impossible. Le modèle précédent a été conservé.".into(),
        );
    }
    if had_previous {
        let _ = fs::remove_dir_all(backup);
    }
    Ok(())
}
fn copy_regular(source: &Path, target: &Path) -> Result<(), String> {
    let metadata =
        fs::symlink_metadata(source).map_err(|_| "Un fichier du modèle est inaccessible.")?;
    if !metadata.is_file() {
        return Err(
            "Les fichiers de modèle doivent être des fichiers ordinaires, sans liens symboliques."
                .into(),
        );
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)
            .map_err(|_| "Impossible de créer le dossier des modèles locaux.")?;
    }
    fs::copy(source, target).map(|_| ()).map_err(|_| {
        "Copie du modèle impossible. Vérifiez l’espace disque et les autorisations.".to_string()
    })
}
fn import_model(root: PathBuf, kind: String, source: String) -> Result<LocalModelStatus, String> {
    let _guard = IMPORT_LOCK
        .lock()
        .map_err(|_| "Une importation de modèle est déjà en cours.")?;
    if kind != "whisper" && kind != "generator" && kind != "embeddinggemma" {
        return Err("Type de modèle local inconnu.".into());
    }
    let source = PathBuf::from(source)
        .canonicalize()
        .map_err(|_| "Le modèle sélectionné n’existe plus.")?;
    // A fixed whitelist is copied into AppData; no arbitrary files are served.
    if kind == "whisper" {
        validate_whisper(&source)?;
    } else if kind == "embeddinggemma" {
        validate_embedding(&source)?;
    } else if source.extension().and_then(|value| value.to_str()) != Some("task")
        || !source
            .metadata()
            .is_ok_and(|meta| meta.is_file() && meta.len() > 1024 * 1024)
    {
        return Err("Choisissez un fichier de préparation des notes compatible (.task).".into());
    }
    fs::create_dir_all(&root).map_err(|_| "Impossible de créer le dossier des modèles locaux.")?;
    let stage = root.join(format!(".{kind}-import"));
    if stage.exists() {
        fs::remove_dir_all(&stage)
            .map_err(|_| "Impossible de nettoyer une importation interrompue.")?;
    }
    fs::create_dir_all(&stage).map_err(|_| "Impossible de préparer le dossier des modèles.")?;
    let result = (|| {
        if kind == "whisper" {
            for name in WHISPER_REQUIRED {
                copy_regular(&source.join(name), &stage.join(name))?;
            }
            for name in WHISPER_OPTIONAL {
                if source.join(name).exists() {
                    copy_regular(&source.join(name), &stage.join(name))?;
                }
            }
            validate_whisper(&stage)?;
        } else if kind == "embeddinggemma" {
            for (name, _) in EMBEDDING_REQUIRED {
                copy_regular(&embedding_source_file(&source, name), &stage.join(name))?;
            }
            if source.join("config.json").exists() {
                copy_regular(&source.join("config.json"), &stage.join("config.json"))?;
            } else {
                fs::write(stage.join("config.json"), EMBEDDING_CONFIG)
                    .map_err(|_| "Impossible de préparer la configuration de recherche.")?;
            }
            for name in ["special_tokens_map.json", "added_tokens.json", "LICENSE"] {
                if source.join(name).is_file() {
                    copy_regular(&source.join(name), &stage.join(name))?;
                }
            }
            validate_embedding(&stage)?;
        } else {
            copy_regular(&source, &stage.join("gemma3.task"))?;
        }
        replace_directory(&stage, &root.join(&kind))
    })();
    if result.is_err() {
        let _ = fs::remove_dir_all(&stage);
    }
    result?;
    Ok(status(&root))
}
#[tauri::command]
pub async fn local_ai_model_status(app: tauri::AppHandle) -> Result<LocalModelStatus, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|_| "Le dossier de l’assistant local est inaccessible.")?
        .join("local-ai");
    tauri::async_runtime::spawn_blocking(move || Ok(status(&root)))
        .await
        .map_err(|_| "L’assistant local ne peut pas être préparé.")?
}
#[tauri::command]
pub async fn import_local_ai_model(
    app: tauri::AppHandle,
    kind: String,
    source: String,
) -> Result<LocalModelStatus, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|_| "Le dossier des modèles locaux est inaccessible.")?
        .join("local-ai");
    tauri::async_runtime::spawn_blocking(move || import_model(root, kind, source))
        .await
        .map_err(|_| "L’importation locale a été interrompue.".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_TEMP_DIR: AtomicU64 = AtomicU64::new(0);
    fn temp_dir() -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "baitari-ai-test-{}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            NEXT_TEMP_DIR.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&path).unwrap();
        path
    }
    fn whisper(folder: &Path, multilingual: bool) {
        for name in WHISPER_REQUIRED {
            let file = folder.join(name);
            fs::create_dir_all(file.parent().unwrap()).unwrap();
            fs::write(file, b"{}").unwrap();
        }
        fs::write(
            folder.join("config.json"),
            br#"{"model_type":"whisper","encoder_layers":12,"decoder_layers":12,"d_model":768}"#,
        )
        .unwrap();
        fs::write(
            folder.join("preprocessor_config.json"),
            br#"{"sampling_rate":16000}"#,
        )
        .unwrap();
        fs::write(
            folder.join("generation_config.json"),
            format!(r#"{{"is_multilingual":{multilingual},"lang_to_id":{{"<|fr|>":50265}}}}"#),
        )
        .unwrap();
    }
    #[test]
    fn rejects_incomplete_embedding_download() {
        let path = temp_dir();
        fs::write(path.join("model.onnx_data"), b"partial").unwrap();
        assert!(validate_embedding(&path).is_err());
        fs::remove_dir_all(path).unwrap();
    }
    #[test]
    #[ignore = "Requires explicitly selected local model files"]
    fn imports_real_embedding_model_from_flat_directory() {
        let source = std::env::var("BAITARI_EMBEDDING_TEST_SOURCE")
            .expect("Select a local test model directory");
        let path = temp_dir();
        let result = import_model(path.clone(), "embeddinggemma".into(), source).unwrap();
        assert!(result.embedding_ready);
        assert!(path.join("embeddinggemma/config.json").is_file());
        assert!(path.join("embeddinggemma/onnx/model.onnx_data").is_file());
        assert!(path.join("embeddinggemma/tokenizer.model").is_file());
        fs::remove_dir_all(path).unwrap();
    }
    #[test]
    fn rejects_english_only_and_missing_files() {
        let path = temp_dir();
        whisper(&path, false);
        assert!(validate_whisper(&path).is_err());
        whisper(&path, true);
        assert!(validate_whisper(&path).is_ok());
        fs::remove_file(path.join("onnx/decoder_model_merged_quantized.onnx")).unwrap();
        assert!(validate_whisper(&path).is_err());
        fs::remove_dir_all(path).unwrap();
    }
    #[test]
    fn rejects_base_and_wrong_sample_rate_but_accepts_medium() {
        let path = temp_dir();
        whisper(&path, true);
        fs::write(
            path.join("config.json"),
            br#"{"model_type":"whisper","encoder_layers":6,"decoder_layers":6,"d_model":512}"#,
        )
        .unwrap();
        assert!(validate_whisper(&path)
            .unwrap_err()
            .contains("small ou medium"));
        fs::write(
            path.join("config.json"),
            br#"{"model_type":"whisper","encoder_layers":24,"decoder_layers":24,"d_model":1024}"#,
        )
        .unwrap();
        assert!(validate_whisper(&path).is_ok());
        fs::write(
            path.join("preprocessor_config.json"),
            br#"{"sampling_rate":44100}"#,
        )
        .unwrap();
        assert!(validate_whisper(&path).unwrap_err().contains("16 kHz"));
        fs::remove_dir_all(path).unwrap();
    }
    #[test]
    fn failed_import_preserves_previous_model() {
        let path = temp_dir();
        let source = path.join("source");
        whisper(&source, true);
        let root = path.join("models");
        assert!(
            import_model(
                root.clone(),
                "whisper".into(),
                source.to_string_lossy().into()
            )
            .unwrap()
            .whisper_ready
        );
        whisper(&source, false);
        assert!(import_model(
            root.clone(),
            "whisper".into(),
            source.to_string_lossy().into()
        )
        .is_err());
        assert!(status(&root).whisper_ready);
        fs::remove_dir_all(path).unwrap();
    }
    #[test]
    fn copies_only_known_model_files() {
        let path = temp_dir();
        let source = path.join("source");
        whisper(&source, true);
        fs::write(source.join("patient.txt"), "private").unwrap();
        let root = path.join("models");
        import_model(
            root.clone(),
            "whisper".into(),
            source.to_string_lossy().into(),
        )
        .unwrap();
        assert!(!root.join("whisper/patient.txt").exists());
        fs::remove_dir_all(path).unwrap();
    }
}
