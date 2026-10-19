//! Phase 0 acceptance: two workstations on one SQLite file, with pulled
//! cables, a host shutdown and a thousand interleaved writes.

use super::client::{RemoteClient, RemoteTarget, INTERRUPTED_MESSAGE};
use super::discovery;
use super::host::{HostConfig, HostServer};
use crate::clinic_database::connect_options;
use serde_json::json;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Executor, SqlitePool};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::time::Duration;

const KEY: &str = "ABCDEFGHJKMN";
const MIGRATIONS: [&str; 2] = ["001", "002"];

struct Clinic {
    directory: PathBuf,
    /// The main workstation's own connection, as opened by open_clinic_database.
    local: SqlitePool,
}

impl Clinic {
    async fn new() -> Self {
        let directory = std::env::temp_dir().join(format!("baitari-lan-{}", super::random_token(10)));
        std::fs::create_dir_all(&directory).unwrap();
        let local = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(connect_options(directory.join("baitari.db")))
            .await
            .unwrap();
        local
            .execute(
                "CREATE TABLE migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, version TEXT UNIQUE NOT NULL);
                 INSERT INTO migrations (version) VALUES ('001'), ('002');
                 CREATE TABLE visits (id TEXT PRIMARY KEY, source TEXT NOT NULL, seq INTEGER NOT NULL, at DATETIME DEFAULT CURRENT_TIMESTAMP);",
            )
            .await
            .unwrap();
        Self { directory, local }
    }

    fn config(&self) -> HostConfig {
        let mut config = HostConfig::new(self.directory.join("baitari.db"), KEY.into(), "Accueil".into());
        config.lease = Duration::from_millis(400);
        config
    }

    async fn host(&self, config: HostConfig, port: u16) -> HostServer {
        HostServer::start(config, SocketAddr::from(([127, 0, 0, 1], port))).await.unwrap()
    }

    async fn count(&self) -> i64 {
        sqlx::query_scalar("SELECT COUNT(*) FROM visits").fetch_one(&self.local).await.unwrap()
    }

    async fn integrity(&self) -> String {
        sqlx::query_scalar("PRAGMA integrity_check").fetch_one(&self.local).await.unwrap()
    }
}

impl Drop for Clinic {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.directory);
    }
}

fn client(server: &HostServer, key: &str) -> RemoteClient {
    RemoteClient::new(
        RemoteTarget { address: server.address().to_string(), key: key.into() },
        MIGRATIONS.iter().map(|v| v.to_string()).collect(),
        "Salle".into(),
    )
    .unwrap()
}

fn is_locked(message: &str) -> bool {
    message.contains("database is locked")
}

/// Same policy as runDbTransaction plus withLockRetry in database.ts.
async fn remote_insert(client: &RemoteClient, id: String, seq: i64) {
    let delays = [80u64, 160, 320, 640, 1000, 1000, 1000];
    for delay in delays {
        match client.execute("BEGIN IMMEDIATE TRANSACTION".into(), vec![]).await {
            Ok(_) => {}
            Err(error) if is_locked(&error) => {
                tokio::time::sleep(Duration::from_millis(delay)).await;
                continue;
            }
            Err(error) => panic!("BEGIN distant : {error}"),
        }
        client
            .execute("INSERT INTO visits (id, source, seq) VALUES (?, 'salle', ?)".into(), vec![json!(id), json!(seq)])
            .await
            .unwrap();
        client.execute("COMMIT".into(), vec![]).await.unwrap();
        return;
    }
    panic!("écriture distante jamais obtenue");
}

async fn local_insert(pool: &SqlitePool, id: String, seq: i64) {
    let delays = [80u64, 160, 320, 640, 1000, 1000, 1000];
    for delay in delays {
        let mut tx = match pool.begin_with("BEGIN IMMEDIATE").await {
            Ok(tx) => tx,
            Err(error) if is_locked(&error.to_string()) => {
                tokio::time::sleep(Duration::from_millis(delay)).await;
                continue;
            }
            Err(error) => panic!("BEGIN local : {error}"),
        };
        sqlx::query("INSERT INTO visits (id, source, seq) VALUES (?, 'accueil', ?)")
            .bind(id)
            .bind(seq)
            .execute(&mut *tx)
            .await
            .unwrap();
        tx.commit().await.unwrap();
        return;
    }
    panic!("écriture locale jamais obtenue");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn remote_workstation_reads_and_writes_the_shared_file() {
    let clinic = Clinic::new().await;
    let server = clinic.host(clinic.config(), 0).await;
    let salle = client(&server, KEY);
    let hello = salle.hello().await.unwrap();
    assert_eq!(hello.workstation_name, "Accueil");
    let done = salle
        .execute("INSERT INTO visits (id, source, seq) VALUES (?, ?, ?)".into(), vec![json!("v1"), json!("salle"), json!(1)])
        .await
        .unwrap();
    assert_eq!(done.rows_affected, 1);
    let rows = salle.select("SELECT id, source, seq FROM visits".into(), vec![]).await.unwrap();
    assert_eq!(serde_json::to_value(&rows).unwrap(), json!([{ "id": "v1", "source": "salle", "seq": 1 }]));
    assert_eq!(clinic.count().await, 1);
    assert_eq!(server.workstations(), ["Salle"]);
    // SQL errors come back untouched, so database.ts keeps its retry rules.
    let error = salle.select("SELECT nope FROM visits".into(), vec![]).await.unwrap_err();
    assert!(error.contains("no such column"), "{error}");
    server.stop().await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn refuses_wrong_key_version_and_schema() {
    let clinic = Clinic::new().await;
    let server = clinic.host(clinic.config(), 0).await;

    let error = client(&server, "WRONGKEY").hello().await.err().unwrap();
    assert!(error.contains("Clé de connexion refusée"), "{error}");

    let error = client(&server, KEY).with_app_version("0.0.1").hello().await.err().unwrap();
    assert!(error.contains("Versions différentes"), "{error}");

    let behind = RemoteClient::new(
        RemoteTarget { address: server.address().to_string(), key: KEY.into() },
        vec!["001".into()],
        "Salle".into(),
    )
    .unwrap();
    let error = behind.hello().await.err().unwrap();
    assert!(error.contains("même structure"), "{error}");

    // Keys are accepted the way people type them.
    client(&server, "abcd-efgh-jkmn").hello().await.unwrap();
    server.stop().await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn pulled_cable_mid_transaction_is_rolled_back() {
    let clinic = Clinic::new().await;
    let server = clinic.host(clinic.config(), 0).await;
    let salle = client(&server, KEY);
    salle.execute("BEGIN IMMEDIATE TRANSACTION".into(), vec![]).await.unwrap();
    salle
        .execute("INSERT INTO visits (id, source, seq) VALUES ('lost', 'salle', 1)".into(), vec![])
        .await
        .unwrap();

    // The workstation goes silent while holding the write lock. The front
    // desk must still be able to save once the lease has run out.
    let started = std::time::Instant::now();
    local_insert(&clinic.local, "kept".into(), 1).await;
    assert!(started.elapsed() < Duration::from_secs(3), "accueil bloqué {:?}", started.elapsed());

    let ids: Vec<String> = sqlx::query_scalar("SELECT id FROM visits").fetch_all(&clinic.local).await.unwrap();
    assert_eq!(ids, ["kept"]);
    assert_eq!(clinic.integrity().await, "ok");

    // The workstation learns its transaction is gone instead of committing half of it.
    let error = salle.execute("COMMIT".into(), vec![]).await.unwrap_err();
    assert_eq!(error, INTERRUPTED_MESSAGE);
    // And it simply carries on afterwards.
    let rows = salle.select("SELECT COUNT(*) AS n FROM visits".into(), vec![]).await.unwrap();
    assert_eq!(rows[0]["n"], json!(1));
    server.stop().await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn host_stopping_mid_transaction_keeps_the_file_intact() {
    let clinic = Clinic::new().await;
    let server = clinic.host(clinic.config(), 0).await;
    let port = server.address().port();
    let salle = client(&server, KEY);
    salle.execute("INSERT INTO visits (id, source, seq) VALUES ('before', 'salle', 1)".into(), vec![]).await.unwrap();
    salle.execute("BEGIN IMMEDIATE TRANSACTION".into(), vec![]).await.unwrap();
    salle.execute("INSERT INTO visits (id, source, seq) VALUES ('during', 'salle', 2)".into(), vec![]).await.unwrap();

    server.stop().await;
    let error = salle.execute("COMMIT".into(), vec![]).await.unwrap_err();
    assert!(error.contains("coupée au moment d'enregistrer"), "{error}");
    let error = salle.select("SELECT 1".into(), vec![]).await.unwrap_err();
    assert!(error.contains("Poste principal injoignable"), "{error}");

    let server = clinic.host(clinic.config(), port).await;
    let ids: Vec<String> = sqlx::query_scalar("SELECT id FROM visits").fetch_all(&clinic.local).await.unwrap();
    assert_eq!(ids, ["before"]);
    assert_eq!(clinic.integrity().await, "ok");
    // Reconnection is automatic once the main workstation is back.
    let rows = salle.select("SELECT id FROM visits".into(), vec![]).await.unwrap();
    assert_eq!(rows.len(), 1);
    server.stop().await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn silent_workstation_reconnects_transparently() {
    let clinic = Clinic::new().await;
    let mut config = clinic.config();
    config.idle = Duration::from_millis(150);
    let server = clinic.host(config, 0).await;
    let salle = client(&server, KEY);
    salle.hello().await.unwrap();
    tokio::time::sleep(Duration::from_millis(600)).await;
    assert!(server.workstations().is_empty());
    let rows = salle.select("SELECT COUNT(*) AS n FROM visits".into(), vec![]).await.unwrap();
    assert_eq!(rows[0]["n"], json!(0));
    server.stop().await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn thousand_interleaved_writes_from_two_workstations() {
    let clinic = Clinic::new().await;
    let server = clinic.host(clinic.config(), 0).await;
    let salle = std::sync::Arc::new(client(&server, KEY));
    let local = clinic.local.clone();
    let front_desk = tokio::spawn(async move {
        let mut slowest = Duration::ZERO;
        for seq in 0..500 {
            let started = std::time::Instant::now();
            local_insert(&local, format!("accueil-{seq}"), seq).await;
            slowest = slowest.max(started.elapsed());
        }
        slowest
    });
    let remote = salle.clone();
    let exam_room = tokio::spawn(async move {
        let mut slowest = Duration::ZERO;
        for seq in 0..500 {
            let started = std::time::Instant::now();
            remote_insert(&remote, format!("salle-{seq}"), seq).await;
            slowest = slowest.max(started.elapsed());
        }
        slowest
    });
    let (front_desk, exam_room) = (front_desk.await.unwrap(), exam_room.await.unwrap());

    assert_eq!(clinic.count().await, 1000);
    for source in ["accueil", "salle"] {
        let (count, first, last): (i64, i64, i64) =
            sqlx::query_as("SELECT COUNT(DISTINCT seq), MIN(seq), MAX(seq) FROM visits WHERE source = ?")
                .bind(source)
                .fetch_one(&clinic.local)
                .await
                .unwrap();
        assert_eq!((count, first, last), (500, 0, 499), "{source}");
    }
    let switches: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM (SELECT source, LAG(source) OVER (ORDER BY rowid) AS previous FROM visits)
         WHERE previous IS NOT NULL AND previous != source",
    )
    .fetch_one(&clinic.local)
    .await
    .unwrap();
    eprintln!("[LAN] 1000 écritures : {switches} alternances, attente max accueil {front_desk:?}, salle {exam_room:?}");
    // SQLite lets the last writer go again, so writes come in bursts; what
    // matters is that neither workstation waits long enough to be noticed.
    assert!(switches > 0);
    assert!(front_desk < Duration::from_secs(1) && exam_room < Duration::from_secs(1));
    assert_eq!(clinic.integrity().await, "ok");
    server.stop().await;
}

/// Needs multicast on the machine running the tests:
/// `cargo test mdns -- --ignored`.
#[test]
#[ignore]
fn mdns_announces_the_main_workstation() {
    let advertiser = discovery::Advertiser::start("Accueil test", 47999).unwrap();
    let hosts = discovery::discover(Duration::from_secs(3)).unwrap();
    drop(advertiser);
    assert!(
        hosts.iter().any(|h| h.workstation_name == "Accueil test" && h.port == 47999),
        "{hosts:?}"
    );
}
