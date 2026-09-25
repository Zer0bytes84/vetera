use std::io::Write;
use std::sync::Mutex;
use tauri::Manager;

static ID_LOCK: Mutex<()> = Mutex::new(());

// Kept outside SQLite: restoring a clinic backup must not clone a licensed seat.
#[tauri::command]
pub fn license_installation_id(app: tauri::AppHandle, candidate: String) -> Result<String, String> {
    let _guard = ID_LOCK.lock().map_err(|_| "Identité du poste indisponible")?;
    let directory = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let path = directory.join("license-installation-id");
    match std::fs::read_to_string(&path) {
        Ok(id) if valid_id(id.trim()) => return Ok(id.trim().to_string()),
        Ok(_) => return Err("Identité du poste endommagée. Contactez l’administrateur.".into()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => (),
        Err(e) => return Err(e.to_string()),
    }
    if !valid_id(&candidate) { return Err("Identifiant du poste invalide".into()); }
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)] {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(&path).map_err(|e| e.to_string())?;
    file.write_all(candidate.as_bytes()).and_then(|_| file.sync_all()).map_err(|e| e.to_string())?;
    Ok(candidate)
}

fn valid_id(value: &str) -> bool {
    value.len() == 36 && value.chars().enumerate().all(|(i, ch)| {
        if [8, 13, 18, 23].contains(&i) { ch == '-' } else { ch.is_ascii_hexdigit() }
    })
}
