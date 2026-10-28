//! Dictée native : le parcours réel envoie son PCM au compagnon whisper.cpp.
//!
//! Un processus par dictée, aucun processus résident. Le PCM Float32 16 kHz
//! arrive encodé en base64 depuis la page ; ce module l'écrit en WAV PCM 16 bits
//! dans un dossier temporaire, lance `whisper-cli` (turbo q8, 4 threads), relit
//! le JSON, puis supprime le WAV et le JSON dans tous les cas.
//!
//! La résolution du modèle est volontairement explicite : variable
//! `BAITARI_TURBO_MODEL` d'abord (banc et essai sans écrire dans l'app-data),
//! puis le chemin installé `local-ai/whisper-turbo/ggml-large-v3-turbo-q8_0.bin`.
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

/// Trois minutes de dictée au maximum, comme la capture du parcours.
pub const MAX_SAMPLES: usize = 16_000 * 180;
const MAX_SECONDES: u64 = 300;
/// Dossier et fichier du modèle sous `local-ai/`, là où le téléchargement l'installe.
pub const MODEL_DIR: &str = "whisper-turbo";
pub const MODEL_FILE: &str = "ggml-large-v3-turbo-q8_0.bin";
/// Le compagnon et ses bibliothèques ne sont empaquetés que pour macOS.
pub const NATIVE_PLATFORM: bool = cfg!(target_os = "macos");
static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DicteeStatus {
    /// Le modèle existe et le compagnon peut être résolu.
    pub disponible: bool,
    pub modele: Option<String>,
    /// Chemin attendu quand rien n'est installé : le message le montre.
    pub chemin_attendu: String,
    /// `env` ou `app` : d'où vient le modèle réellement choisi.
    pub source: String,
    pub raison: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DicteeResultat {
    pub texte: String,
    /// Du lancement du compagnon à la relecture du JSON, mesuré dans Rust.
    pub secondes: f64,
    pub pid: Option<u32>,
    pub pid_application: u32,
    pub code: Option<i32>,
    /// Fin du journal du compagnon, pour diagnostiquer un échec sans le deviner.
    pub journal: String,
}

fn modele_attendu(app: &AppHandle) -> Result<PathBuf, String> {
    let racine = app
        .path()
        .app_data_dir()
        .map_err(|erreur| format!("Dossier de données introuvable : {erreur}"))?;
    Ok(racine.join("local-ai").join(MODEL_DIR).join(MODEL_FILE))
}

fn modele_resolu(app: &AppHandle) -> Result<(PathBuf, String), String> {
    if let Some(chemin) = std::env::var_os("BAITARI_TURBO_MODEL") {
        if !chemin.is_empty() {
            return Ok((PathBuf::from(chemin), "env".into()));
        }
    }
    Ok((modele_attendu(app)?, "app".into()))
}

#[tauri::command]
pub fn dictee_status(app: AppHandle) -> DicteeStatus {
    let attendu = modele_attendu(&app)
        .map(|chemin| chemin.display().to_string())
        .unwrap_or_default();
    if !NATIVE_PLATFORM {
        return DicteeStatus {
            disponible: false,
            modele: None,
            chemin_attendu: attendu,
            source: "app".into(),
            raison: Some("La dictée native n’est pas disponible sur ce système.".into()),
        };
    }
    match modele_resolu(&app) {
        Ok((chemin, source)) => {
            let existe = chemin.is_file();
            DicteeStatus {
                disponible: existe,
                modele: existe.then(|| chemin.display().to_string()),
                chemin_attendu: attendu,
                source,
                raison: (!existe).then(|| {
                    "Le modèle de dictée turbo n’est pas installé sur cet ordinateur.".into()
                }),
            }
        }
        Err(raison) => DicteeStatus {
            disponible: false,
            modele: None,
            chemin_attendu: attendu,
            source: "app".into(),
            raison: Some(raison),
        },
    }
}

/// Décode le base64 standard (padding compris) sans dépendance supplémentaire.
pub fn decoder_base64(entree: &str) -> Result<Vec<u8>, String> {
    let mut sortie = Vec::with_capacity(entree.len() * 3 / 4);
    let mut tampon = 0u32;
    let mut bits = 0u32;
    let mut vus = 0usize;
    let mut total = 0usize;
    let mut remplissage = 0usize;
    let mut fin = false;
    for octet in entree.bytes() {
        if octet.is_ascii_whitespace() {
            continue;
        }
        total += 1;
        if octet == b'=' {
            remplissage += 1;
            fin = true;
            continue;
        }
        if fin {
            return Err("Base64 invalide : données après le remplissage.".into());
        }
        let valeur = match octet {
            b'A'..=b'Z' => octet - b'A',
            b'a'..=b'z' => octet - b'a' + 26,
            b'0'..=b'9' => octet - b'0' + 52,
            b'+' => 62,
            b'/' => 63,
            _ => return Err("Base64 invalide : caractère inattendu.".into()),
        } as u32;
        tampon = (tampon << 6) | valeur;
        bits += 6;
        vus += 1;
        if bits >= 8 {
            bits -= 8;
            sortie.push((tampon >> bits) as u8);
            tampon &= (1 << bits) - 1;
        }
    }
    if total % 4 != 0 || remplissage > 2 || vus % 4 == 1 {
        return Err("Base64 invalide : longueur incomplète.".into());
    }
    Ok(sortie)
}

/// Float32 little-endian (ce que produit `Float32Array` côté page) → échantillons.
pub fn echantillons_f32(octets: &[u8]) -> Result<Vec<f32>, String> {
    if octets.is_empty() {
        return Err("Aucun échantillon audio reçu.".into());
    }
    if octets.len() % 4 != 0 {
        return Err("Audio invalide : taille non multiple de 4 octets.".into());
    }
    if octets.len() / 4 > MAX_SAMPLES {
        return Err("La dictée dépasse trois minutes.".into());
    }
    let mut sortie = Vec::with_capacity(octets.len() / 4);
    for bloc in octets.chunks_exact(4) {
        let valeur = f32::from_le_bytes([bloc[0], bloc[1], bloc[2], bloc[3]]);
        if !valeur.is_finite() {
            return Err("Audio invalide : échantillon non fini.".into());
        }
        sortie.push(valeur.clamp(-1.0, 1.0));
    }
    Ok(sortie)
}

fn echantillon_i16(valeur: f32) -> i16 {
    // -1.0 → -32768, 1.0 → 32767 ; l'arrondi évite le biais de la troncature.
    (valeur.clamp(-1.0, 1.0) * 32767.0).round() as i16
}

/// WAV mono PCM 16 bits, 16 kHz : le format attendu par whisper-cli.
pub fn wav_pcm16(echantillons: &[f32]) -> Vec<u8> {
    let donnees = echantillons.len() * 2;
    let mut sortie = Vec::with_capacity(44 + donnees);
    sortie.extend_from_slice(b"RIFF");
    sortie.extend_from_slice(&(36 + donnees as u32).to_le_bytes());
    sortie.extend_from_slice(b"WAVEfmt ");
    sortie.extend_from_slice(&16u32.to_le_bytes());
    sortie.extend_from_slice(&1u16.to_le_bytes()); // PCM
    sortie.extend_from_slice(&1u16.to_le_bytes()); // mono
    sortie.extend_from_slice(&16_000u32.to_le_bytes());
    sortie.extend_from_slice(&32_000u32.to_le_bytes()); // octets par seconde
    sortie.extend_from_slice(&2u16.to_le_bytes()); // alignement de bloc
    sortie.extend_from_slice(&16u16.to_le_bytes()); // bits par échantillon
    sortie.extend_from_slice(b"data");
    sortie.extend_from_slice(&(donnees as u32).to_le_bytes());
    for valeur in echantillons {
        sortie.extend_from_slice(&echantillon_i16(*valeur).to_le_bytes());
    }
    sortie
}

/// Dossier temporaire propre, supprimé même sur erreur ou panne du compagnon.
struct DossierTemporaire(PathBuf);

impl DossierTemporaire {
    fn nouveau() -> Result<Self, String> {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duree| duree.as_nanos())
            .unwrap_or_default();
        let compte = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
        let chemin = std::env::temp_dir().join(format!(
            "baitari-dictee-{}-{nanos}-{compte}",
            std::process::id()
        ));
        fs::create_dir_all(&chemin)
            .map_err(|erreur| format!("Dossier temporaire impossible : {erreur}"))?;
        Ok(Self(chemin))
    }

    fn chemin(&self, nom: &str) -> PathBuf {
        self.0.join(nom)
    }
}

impl Drop for DossierTemporaire {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn joindre_segments(valeur: &serde_json::Value) -> String {
    valeur["transcription"]
        .as_array()
        .map(|segments| {
            segments
                .iter()
                .filter_map(|segment| segment["text"].as_str())
                .collect::<Vec<_>>()
                .join("")
        })
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn fin_journal(journal: &str) -> String {
    let propre = journal.trim();
    if propre.len() <= 8_000 {
        return propre.to_string();
    }
    // Couper sur une frontière de caractère : le journal peut contenir du texte accentué.
    let mut debut = propre.len() - 8_000;
    while !propre.is_char_boundary(debut) {
        debut += 1;
    }
    propre[debut..].to_string()
}

async fn transcrire(
    app: &AppHandle,
    echantillons: Vec<f32>,
    langue: &str,
) -> Result<DicteeResultat, String> {
    let (modele, _) = modele_resolu(app)?;
    if !modele.is_file() {
        return Err(format!(
            "Le modèle de dictée turbo est introuvable : {}",
            modele.display()
        ));
    }
    let dossier = DossierTemporaire::nouveau()?;
    let wav = dossier.chemin("audio.wav");
    let prefixe = dossier.chemin("sortie");
    fs::write(&wav, wav_pcm16(&echantillons))
        .map_err(|erreur| format!("Écriture du WAV impossible : {erreur}"))?;

    let demarre = Instant::now();
    let commande = app
        .shell()
        .sidecar("whisper-cli")
        .map_err(|erreur| format!("Compagnon de dictée introuvable : {erreur}"))?
        .args([
            "-m",
            &modele.display().to_string(),
            "-f",
            &wav.display().to_string(),
            "-l",
            langue,
            "-t",
            "4",
            "-oj",
            "-of",
            &prefixe.display().to_string(),
        ]);
    let (mut flux, enfant) = commande
        .spawn()
        .map_err(|erreur| format!("Lancement de la dictée impossible : {erreur}"))?;
    let pid = Some(enfant.pid());
    let pid_application = std::process::id();
    let mut journal = String::new();
    let mut code = None;
    let limite = tokio::time::Instant::now() + Duration::from_secs(MAX_SECONDES);
    loop {
        let restant = limite.saturating_duration_since(tokio::time::Instant::now());
        if restant.is_zero() {
            let _ = enfant.kill();
            return Err("La dictée native n’a pas répondu dans le délai imparti.".into());
        }
        match tokio::time::timeout(restant, flux.recv()).await {
            Ok(Some(evenement)) => match evenement {
                CommandEvent::Stderr(octets) | CommandEvent::Stdout(octets) => {
                    journal.push_str(&String::from_utf8_lossy(&octets));
                }
                CommandEvent::Terminated(fin) => {
                    code = fin.code;
                    break;
                }
                CommandEvent::Error(erreur) => {
                    return Err(format!("Compagnon de dictée : {erreur}"));
                }
                _ => {}
            },
            Ok(None) => break,
            Err(_) => {
                let _ = enfant.kill();
                return Err("La dictée native n’a pas répondu dans le délai imparti.".into());
            }
        }
    }
    let secondes = demarre.elapsed().as_secs_f64();
    if code != Some(0) {
        return Err(format!(
            "Le compagnon de dictée a échoué (code {}). {}",
            code.map(|valeur| valeur.to_string())
                .unwrap_or_else(|| "inconnu".into()),
            fin_journal(&journal)
        ));
    }
    let chemin_json = Path::new(&format!("{}.json", prefixe.display())).to_path_buf();
    let brut = fs::read_to_string(&chemin_json)
        .map_err(|erreur| format!("Sortie de dictée illisible : {erreur}"))?;
    let valeur: serde_json::Value = serde_json::from_str(&brut)
        .map_err(|erreur| format!("Sortie de dictée non JSON : {erreur}"))?;
    let texte = joindre_segments(&valeur);
    if texte.is_empty() {
        return Err("La dictée n’a produit aucun texte. Vérifiez le micro et réessayez.".into());
    }
    Ok(DicteeResultat {
        texte,
        secondes,
        pid,
        pid_application,
        code,
        journal: fin_journal(&journal),
    })
}

/// Transcrit le PCM du parcours réel. `audio` est du base64 de Float32 LE 16 kHz.
#[tauri::command]
pub async fn transcrire_dictee(
    app: AppHandle,
    audio: String,
    langue: Option<String>,
) -> Result<DicteeResultat, String> {
    let octets = decoder_base64(&audio)?;
    let echantillons = echantillons_f32(&octets)?;
    let langue = langue.unwrap_or_else(|| "fr".into());
    if !matches!(langue.as_str(), "fr" | "auto" | "en") {
        return Err("Langue de dictée non prise en charge.".into());
    }
    transcrire(&app, echantillons, &langue).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode_le_base64_standard() {
        assert_eq!(decoder_base64("").unwrap(), b"");
        assert_eq!(decoder_base64("Zg==").unwrap(), b"f");
        assert_eq!(decoder_base64("Zm8=").unwrap(), b"fo");
        assert_eq!(decoder_base64("Zm9v").unwrap(), b"foo");
        assert_eq!(decoder_base64("SGVsbG8=").unwrap(), b"Hello");
        assert_eq!(decoder_base64("Z m\n9v").unwrap(), b"foo");
    }

    #[test]
    fn refuse_le_base64_invalide() {
        assert!(decoder_base64("Zg=").is_err());
        assert!(decoder_base64("Zg==Zg==").is_err());
        assert!(decoder_base64("Zg$=").is_err());
    }

    #[test]
    fn relit_le_float32_little_endian() {
        let valeurs = [0.0f32, 0.5, -0.5, 1.0];
        let octets: Vec<u8> = valeurs
            .iter()
            .flat_map(|valeur| valeur.to_le_bytes())
            .collect();
        assert_eq!(echantillons_f32(&octets).unwrap(), valeurs);
        assert!(echantillons_f32(&[1, 2, 3]).is_err());
        assert!(echantillons_f32(&[]).is_err());
    }

    #[test]
    fn borne_les_echantillons_hors_plage() {
        let octets: Vec<u8> = [2.0f32, -2.0, 1.0, -1.0]
            .iter()
            .flat_map(|valeur| valeur.to_le_bytes())
            .collect();
        assert_eq!(echantillons_f32(&octets).unwrap(), vec![1.0, -1.0, 1.0, -1.0]);
        assert_eq!(echantillon_i16(1.0), 32767);
        assert_eq!(echantillon_i16(-1.0), -32767);
        assert_eq!(echantillon_i16(0.5), 16384);
    }

    #[test]
    fn ecrit_un_wav_pcm16_mono_16_khz() {
        let wav = wav_pcm16(&[0.0, 0.5, -0.5]);
        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(&wav[12..16], b"fmt ");
        assert_eq!(u16::from_le_bytes([wav[20], wav[21]]), 1);
        assert_eq!(u16::from_le_bytes([wav[22], wav[23]]), 1);
        assert_eq!(u32::from_le_bytes(wav[24..28].try_into().unwrap()), 16_000);
        assert_eq!(u16::from_le_bytes([wav[34], wav[35]]), 16);
        assert_eq!(&wav[36..40], b"data");
        assert_eq!(wav.len(), 44 + 6);
        assert_eq!(u32::from_le_bytes(wav[40..44].try_into().unwrap()), 6);
        assert_eq!(i16::from_le_bytes([wav[44], wav[45]]), 0);
        assert_eq!(i16::from_le_bytes([wav[46], wav[47]]), 16384);
        assert_eq!(i16::from_le_bytes([wav[48], wav[49]]), -16384);
    }

    #[test]
    fn joint_les_segments_sans_separateur() {
        let valeur: serde_json::Value = serde_json::from_str(
            r#"{"transcription":[{"text":" Bonjour"},{"text":" Max."},{"text":" "}]}"#,
        )
        .unwrap();
        assert_eq!(joindre_segments(&valeur), "Bonjour Max.");
        assert_eq!(joindre_segments(&serde_json::json!({})), "");
    }

    #[test]
    fn garde_la_fin_du_journal() {
        let long = "a".repeat(9_000);
        assert_eq!(fin_journal(&long).len(), 8_000);
        assert_eq!(fin_journal(" court "), "court");
        // « é » sur deux octets : la coupe ne tombe jamais au milieu.
        let accentue = "é".repeat(5_000);
        assert!(fin_journal(&accentue).chars().all(|lettre| lettre == 'é'));
    }
}
