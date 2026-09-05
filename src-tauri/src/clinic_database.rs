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
        .connect_with(
            SqliteConnectOptions::new()
                .filename(path)
                .create_if_missing(true)
                .foreign_keys(true)
                .journal_mode(SqliteJournalMode::Wal)
                .busy_timeout(Duration::from_secs(3)),
        )
        .await
}

#[tauri::command]
pub async fn open_clinic_database(app: tauri::AppHandle) -> Result<(), String> {
    let directory = app.path().app_config_dir().map_err(|e| e.to_string())?;
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
