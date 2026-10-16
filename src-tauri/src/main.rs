#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(debug_assertions)]
use tauri::Manager;

mod clinic_database;
mod license_installation;
mod local_ai_models;
mod local_ai_download;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|_app| {
            // DevTools only in debug mode
            #[cfg(debug_assertions)]
            {
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            license_installation::license_installation_id,
            clinic_database::open_clinic_database,
            local_ai_models::local_ai_model_status,
            local_ai_models::import_local_ai_model,
            local_ai_download::download_local_ai_models,
            local_ai_download::cancel_local_ai_download,
            greet,
            test_sqlite_write,
            test_sqlite_read
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Bonjour, {}! Bienvenue sur Baitari", name)
}

#[tauri::command]
async fn test_sqlite_write(message: String) -> Result<String, String> {
    Ok(format!("Received: {}", message))
}

#[tauri::command]
async fn test_sqlite_read() -> Result<Vec<String>, String> {
    Ok(vec!["Test depuis Rust".to_string()])
}
