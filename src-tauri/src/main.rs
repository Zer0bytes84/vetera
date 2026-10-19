#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(debug_assertions)]
use tauri::Manager;

mod clinic_database;
mod clinic_network;
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
        .manage(clinic_network::ClinicNetwork::new())
        .setup(|_app| {
            clinic_network::init(_app.handle());

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
            clinic_network::clinic_network_status,
            clinic_network::clinic_network_launch_mode,
            clinic_network::clinic_network_start_host,
            clinic_network::clinic_network_regenerate_key,
            clinic_network::clinic_network_stop,
            clinic_network::clinic_network_discover,
            clinic_network::clinic_network_test,
            clinic_network::clinic_network_join,
            clinic_network::clinic_network_connect,
            clinic_network::clinic_network_execute,
            clinic_network::clinic_network_select,
            clinic_network::clinic_network_close,
            clinic_network::clinic_network_ping,
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
