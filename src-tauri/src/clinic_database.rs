use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_sql::{DbInstances, DbPool};

// The JS SQL API sends BEGIN, statements and COMMIT as separate requests.
// One connection keeps that sequence atomic; the JS queue prevents interleaving.
async fn connect(path: std::path::PathBuf) -> Result<sqlx::SqlitePool, sqlx::Error> {
    SqlitePoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect_with(connect_options(path))
        .await
}

/// Shared by the local pool and by the connections the LAN host opens for
/// remote workstations, so every writer uses the same journal and timeouts.
pub(crate) fn connect_options(path: std::path::PathBuf) -> SqliteConnectOptions {
    SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(Duration::from_secs(3))
}

/// Folder holding baitari.db. Debug builds accept BAITARI_DATA_DIR so two
/// instances can run side by side on one machine to test the LAN mode.
pub(crate) fn clinic_data_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    #[cfg(debug_assertions)]
    if let Some(directory) = std::env::var_os("BAITARI_DATA_DIR") {
        return Ok(directory.into());
    }
    app.path().app_config_dir().map_err(|e| e.to_string())
}

/// Debug builds running on a folder other than the account's own clinic data:
/// the folder given by BAITARI_DATA_DIR, or the default one under a borrowed
/// HOME. Such folders hold copies made for tests, which number invoices on
/// their own: what they issue is marked TEST. Release builds never are.
#[tauri::command]
pub fn is_test_data_folder(app: tauri::AppHandle) -> bool {
    #[cfg(debug_assertions)]
    {
        if std::env::var_os("BAITARI_DATA_DIR").is_some() {
            return true;
        }
        if let (Some(own), Ok(current)) = (account_home(), app.path().home_dir()) {
            return current != own;
        }
    }
    let _ = app;
    false
}

/// The account's home folder from the user database, whatever HOME says.
#[cfg(all(debug_assertions, unix))]
fn account_home() -> Option<std::path::PathBuf> {
    use std::os::unix::ffi::OsStrExt;
    // SAFETY: getpwuid returns null or a record valid until the next call; it is copied at once.
    unsafe {
        let entry = libc::getpwuid(libc::getuid());
        if entry.is_null() || (*entry).pw_dir.is_null() {
            return None;
        }
        let dir = std::ffi::CStr::from_ptr((*entry).pw_dir).to_bytes();
        Some(std::ffi::OsStr::from_bytes(dir).into())
    }
}

#[cfg(all(debug_assertions, not(unix)))]
fn account_home() -> Option<std::path::PathBuf> {
    None
}

#[tauri::command]
pub async fn open_clinic_database(app: tauri::AppHandle) -> Result<(), String> {
    let directory = clinic_data_dir(&app)?;
    std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let instances = app.state::<DbInstances>();
    let mut databases = instances.0.write().await;
    if let Some(DbPool::Sqlite(pool)) = databases.get("sqlite:baitari.db") {
        if !pool.is_closed() {
            return Ok(());
        }
    }
    let pool = connect(directory.join("baitari.db"))
        .await
        .map_err(|e| e.to_string())?;
    databases.insert("sqlite:baitari.db".into(), DbPool::Sqlite(pool));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::Executor;

    // The account's own HOME is not a test folder: only a borrowed one is.
    #[cfg(unix)]
    #[test]
    fn account_home_is_the_unborrowed_home() {
        assert_eq!(account_home(), std::env::var_os("HOME").map(Into::into));
    }

    #[test]
    fn separate_requests_share_transaction_and_rollback() {
        tauri::async_runtime::block_on(async {
            let pool = connect(std::path::PathBuf::from(":memory:")).await.unwrap();
            pool.execute("CREATE TABLE receipts (amount INTEGER)").await.unwrap();
            pool.execute("BEGIN IMMEDIATE").await.unwrap();
            pool.execute("INSERT INTO receipts VALUES (4200)").await.unwrap();
            pool.execute("ROLLBACK").await.unwrap();
            let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM receipts")
                .fetch_one(&pool).await.unwrap();
            assert_eq!(count.0, 0);
            pool.execute("BEGIN IMMEDIATE").await.unwrap();
            pool.execute("INSERT INTO receipts VALUES (4200)").await.unwrap();
            pool.execute("COMMIT").await.unwrap();
            let total: (i64,) = sqlx::query_as("SELECT SUM(amount) FROM receipts")
                .fetch_one(&pool).await.unwrap();
            assert_eq!(total.0, 4200);
            pool.close().await;
        });
    }
}
