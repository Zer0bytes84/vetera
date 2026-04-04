// Prevents additional console window on Windows in release
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
            
            // Hide native traffic lights on macOS
            #[cfg(target_os = "macos")]
            {
                let ns_window = window.ns_window().unwrap();
                let ns_window = ns_window as *mut objc::runtime::Object;
                unsafe {
                    use objc::{msg_send, sel, sel_impl};
                    let buttons: *mut objc::runtime::Object = msg_send![ns_window, standardWindowButton:0]; // NSWindowCloseButton
                    let _: () = msg_send![buttons, setHidden: true];
                    let buttons: *mut objc::runtime::Object = msg_send![ns_window, standardWindowButton:1]; // NSWindowMiniaturizeButton
                    let _: () = msg_send![buttons, setHidden: true];
                    let buttons: *mut objc::runtime::Object = msg_send![ns_window, standardWindowButton:2]; // NSWindowZoomButton
                    let _: () = msg_send![buttons, setHidden: true];
                }
            }
            
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
    format!("Bonjour, {}! Bienvenue sur SuperVet+", name)
}

#[tauri::command]
async fn test_sqlite_write(message: String) -> Result<String, String> {
    // La commande SQL sera exécutée depuis le frontend via le plugin,
    // pas depuis Rust
    // Cette commande sert juste de pont
    Ok(format!("Received: {}", message))
}

#[tauri::command]
async fn test_sqlite_read() -> Result<Vec<String>, String> {
    // Idem, la lecture se fera depuis le frontend
    Ok(vec!["Test depuis Rust".to_string()])
}
