#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            // DevTools only in debug mode
            #[cfg(debug_assertions)]
            {
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            test_sqlite_write,
            test_sqlite_read
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Bonjour, {}! Bienvenue sur Vetera", name)
}

#[tauri::command]
async fn test_sqlite_write(message: String) -> Result<String, String> {
    Ok(format!("Received: {}", message))
}

#[tauri::command]
async fn test_sqlite_read() -> Result<Vec<String>, String> {
    Ok(vec!["Test depuis Rust".to_string()])
}
