#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(debug_assertions)]
use tauri::Manager;

mod clinic_database;
mod clinic_network;
mod license_installation;
mod local_ai_models;
mod local_ai_download;
mod dictation;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(clinic_network::ClinicNetwork::new())
        .setup(|_app| {
            clinic_network::init(_app.handle());

            #[cfg(all(debug_assertions, target_os = "macos"))]
            nommer_processus_dev(&_app.package_info().name);

            // DevTools only in debug mode. Measurements close it (the
            // inspector is a multi-GB WebKit process that is not the product).
            #[cfg(debug_assertions)]
            if std::env::var_os("BAITARI_NO_DEVTOOLS").is_none() {
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            license_installation::license_installation_id,
            clinic_database::open_clinic_database,
            clinic_database::is_test_data_folder,
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
            dictation::dictee_status,
            dictation::transcrire_dictee,
            greet,
            test_sqlite_write,
            test_sqlite_read
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app, _event| {
            #[cfg(all(debug_assertions, target_os = "macos"))]
            if let tauri::RunEvent::Ready = _event {
                poser_icone_dock_dev();
            }
        });
}

/// En dev, Tauri pose l'icns telle quelle comme icône du Dock : elle remplit
/// toute la case et paraît plus grande que celle du build installé, que macOS
/// réduit à la grille des icônes (824 sur 1024). On pose la même image avec
/// cette marge, après celle de Tauri (posée juste avant l'événement Ready).
#[cfg(all(debug_assertions, target_os = "macos"))]
fn poser_icone_dock_dev() {
    use objc2::{AllocAnyThread, MainThreadMarker};
    use objc2_app_kit::{NSApplication, NSImage};
    use objc2_foundation::NSData;

    let Some(mtm) = MainThreadMarker::new() else { return };
    let donnees = NSData::with_bytes(include_bytes!("../icons/dock-dev.png"));
    let Some(icone) = NSImage::initWithData(NSImage::alloc(), &donnees) else { return };
    unsafe { NSApplication::sharedApplication(mtm).setApplicationIconImage(Some(&icone)) };
}

/// En dev, le binaire tourne hors d'un paquet .app : macOS l'affiche sous son
/// nom de fichier (« vetera ») dans le Dock, Cmd-Tab et « Forcer à quitter ».
/// On donne à LaunchServices le nom de l'app sans renommer le binaire, car
/// ce nom fixe le dossier WebKit du build dev (~/Library/WebKit/vetera).
/// Le build installé lit déjà son nom dans Info.plist (CFBundleName).
#[cfg(all(debug_assertions, target_os = "macos"))]
fn nommer_processus_dev(nom: &str) {
    use std::ffi::{c_char, c_void, CString};

    type CFTypeRef = *const c_void;
    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFStringCreateWithCString(alloc: CFTypeRef, texte: *const c_char, encodage: u32) -> CFTypeRef;
        fn CFRelease(objet: CFTypeRef);
    }
    const UTF8: u32 = 0x0800_0100;
    const SESSION_PAR_DEFAUT: i32 = -2;

    let Ok(nom) = CString::new(nom) else { return };
    // Fonctions privées de LaunchServices, cherchées à l'exécution : si elles
    // manquent, on garde le nom du binaire sans rien casser.
    unsafe {
        let services = libc::dlopen(
            c"/System/Library/Frameworks/CoreServices.framework/CoreServices".as_ptr(),
            libc::RTLD_LAZY,
        );
        if services.is_null() {
            return;
        }
        let asn_courant = libc::dlsym(services, c"_LSGetCurrentApplicationASN".as_ptr());
        let definir = libc::dlsym(services, c"_LSSetApplicationInformationItem".as_ptr());
        let cle_nom = libc::dlsym(services, c"_kLSDisplayNameKey".as_ptr()) as *const CFTypeRef;
        if asn_courant.is_null() || definir.is_null() || cle_nom.is_null() {
            return;
        }
        let asn_courant: extern "C" fn() -> CFTypeRef = std::mem::transmute(asn_courant);
        let definir: extern "C" fn(i32, CFTypeRef, CFTypeRef, CFTypeRef, *mut CFTypeRef) -> i32 =
            std::mem::transmute(definir);
        let asn = asn_courant();
        if asn.is_null() {
            return;
        }
        let valeur = CFStringCreateWithCString(std::ptr::null(), nom.as_ptr(), UTF8);
        if valeur.is_null() {
            return;
        }
        definir(SESSION_PAR_DEFAUT, asn, *cle_nom, valeur, std::ptr::null_mut());
        CFRelease(valeur);
    }
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
