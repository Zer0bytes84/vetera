//! The main workstation serves its SQLite file to the other workstations.
//!
//! Each remote workstation gets its own SQLite connection. The SQL plugin
//! sends BEGIN, statements and COMMIT as separate requests, so a transaction
//! spans several HTTP calls: a lease rolls it back if the workstation stops
//! talking (cable pulled, crash, sleep) so it can never hold the write lock.

use super::protocol::*;
use super::wire::{bind_values, row_to_json};
use crate::clinic_database::connect_options;
use axum::extract::{ConnectInfo, DefaultBodyLimit, State};
use axum::http::{HeaderMap, StatusCode};
use axum::routing::{get, post};
use axum::{Json, Router};
use sqlx::{ConnectOptions, Connection, Executor, SqliteConnection};
use std::collections::{HashMap, HashSet};
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::{Duration, Instant};
use tokio::sync::{oneshot, Mutex};
use tokio::task::JoinHandle;

#[derive(Clone)]
pub struct HostConfig {
    pub app_version: String,
    pub database_path: PathBuf,
    /// A transaction left open longer than this without a request is rolled back.
    pub lease: Duration,
    /// A workstation silent for this long outside a transaction is forgotten.
    pub idle: Duration,
    pub key: String,
    pub workstation_name: String,
}

impl HostConfig {
    pub fn new(database_path: PathBuf, key: String, workstation_name: String) -> Self {
        Self {
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            database_path,
            lease: Duration::from_secs(5),
            idle: Duration::from_secs(120),
            key,
            workstation_name,
        }
    }
}

struct Session {
    connection: Mutex<SqliteConnection>,
    in_transaction: AtomicBool,
    last_seen: StdMutex<Instant>,
    workstation: String,
}

impl Session {
    fn touch(&self) {
        *self.last_seen.lock().unwrap() = Instant::now();
    }

    fn silent_for(&self) -> Duration {
        self.last_seen.lock().unwrap().elapsed()
    }
}

struct Shared {
    config: HostConfig,
    sessions: StdMutex<HashMap<String, Arc<Session>>>,
}

pub struct HostServer {
    address: SocketAddr,
    shared: Arc<Shared>,
    shutdown: Option<oneshot::Sender<()>>,
    server: JoinHandle<()>,
    watchdog: JoinHandle<()>,
}

impl HostServer {
    pub async fn start(config: HostConfig, bind: SocketAddr) -> Result<Self, String> {
        let listener = tokio::net::TcpListener::bind(bind).await.map_err(|error| {
            if error.kind() == std::io::ErrorKind::AddrInUse {
                format!("Le port {} est déjà utilisé sur ce poste. Choisissez un autre port.", bind.port())
            } else {
                format!("Impossible d'ouvrir le port {} : {error}", bind.port())
            }
        })?;
        let address = listener.local_addr().map_err(|e| e.to_string())?;
        let shared = Arc::new(Shared { config, sessions: StdMutex::new(HashMap::new()) });
        let app = Router::new()
            .route("/v1/ping", get(ping))
            .route("/v1/hello", post(hello))
            .route("/v1/query", post(query))
            .route("/v1/close", post(close))
            // Consultation documents can be stored inline; keep room for them.
            .layer(DefaultBodyLimit::max(64 * 1024 * 1024))
            .with_state(shared.clone());
        let (shutdown, signal) = oneshot::channel::<()>();
        let server = tokio::spawn(async move {
            let service = app.into_make_service_with_connect_info::<SocketAddr>();
            let _ = axum::serve(listener, service)
                .with_graceful_shutdown(async {
                    let _ = signal.await;
                })
                .await;
        });
        let watchdog = tokio::spawn(watch_sessions(shared.clone()));
        Ok(Self { address, shared, shutdown: Some(shutdown), server, watchdog })
    }

    pub fn address(&self) -> SocketAddr {
        self.address
    }

    pub fn workstations(&self) -> Vec<String> {
        let sessions = self.shared.sessions.lock().unwrap();
        let mut names: Vec<String> = sessions.values().map(|s| s.workstation.clone()).collect();
        names.sort();
        names.dedup();
        names
    }

    pub async fn stop(mut self) {
        if let Some(shutdown) = self.shutdown.take() {
            let _ = shutdown.send(());
        }
        self.watchdog.abort();
        let _ = tokio::time::timeout(Duration::from_secs(3), &mut self.server).await;
        self.server.abort();
        let sessions: Vec<_> = self.shared.sessions.lock().unwrap().drain().map(|(_, s)| s).collect();
        for session in sessions {
            end_session(session).await;
        }
    }
}

/// Rolls back what the workstation left open, then closes its connection.
async fn end_session(session: Arc<Session>) {
    let mut connection = session.connection.lock().await;
    if session.in_transaction.swap(false, Ordering::SeqCst) {
        let _ = connection.execute("ROLLBACK").await;
    }
    drop(connection);
    if let Ok(session) = Arc::try_unwrap(session) {
        let _ = session.connection.into_inner().close().await;
    }
}

async fn watch_sessions(shared: Arc<Shared>) {
    let tick = (shared.config.lease / 4).clamp(Duration::from_millis(20), Duration::from_millis(250));
    let mut interval = tokio::time::interval(tick);
    loop {
        interval.tick().await;
        let expired: Vec<Arc<Session>> = {
            let mut sessions = shared.sessions.lock().unwrap();
            let ids: Vec<String> = sessions
                .iter()
                .filter(|(_, session)| {
                    let limit = if session.in_transaction.load(Ordering::SeqCst) {
                        shared.config.lease
                    } else {
                        shared.config.idle
                    };
                    // A locked connection means a request is running right now.
                    session.silent_for() > limit && session.connection.try_lock().is_ok()
                })
                .map(|(id, _)| id.clone())
                .collect();
            ids.iter().filter_map(|id| sessions.remove(id)).collect()
        };
        for session in expired {
            if session.in_transaction.load(Ordering::SeqCst) {
                eprintln!(
                    "[LAN] Transaction de « {} » annulée : poste silencieux depuis {:?}.",
                    session.workstation,
                    session.silent_for()
                );
            }
            end_session(session).await;
        }
    }
}

type Reply<T> = Result<Json<T>, (StatusCode, Json<ErrorReply>)>;

fn refuse(status: StatusCode, code: &str, message: impl Into<String>) -> (StatusCode, Json<ErrorReply>) {
    (status, Json(ErrorReply { code: code.into(), message: message.into(), in_transaction: false }))
}

/// Only machines of the clinic network may talk to the host.
fn check_peer(peer: &SocketAddr) -> Result<(), (StatusCode, Json<ErrorReply>)> {
    let allowed = match peer.ip() {
        IpAddr::V4(ip) => ip.is_loopback() || ip.is_private() || ip.is_link_local(),
        IpAddr::V6(ip) => {
            let first = ip.segments()[0];
            ip.is_loopback()
                || (first & 0xfe00) == 0xfc00
                || (first & 0xffc0) == 0xfe80
                || ip.to_ipv4_mapped().is_some_and(|v4| v4.is_private() || v4.is_loopback())
        }
    };
    if allowed {
        Ok(())
    } else {
        Err(refuse(StatusCode::FORBIDDEN, "network", "Ce poste n'est pas sur le réseau local de la clinique."))
    }
}

fn same_key(expected: &str, given: &str) -> bool {
    let (a, b) = (expected.as_bytes(), given.as_bytes());
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

fn check_key(shared: &Shared, headers: &HeaderMap) -> Result<(), (StatusCode, Json<ErrorReply>)> {
    let given = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .unwrap_or_default();
    if same_key(&shared.config.key, &normalize_key(given)) {
        Ok(())
    } else {
        Err(refuse(StatusCode::UNAUTHORIZED, "key", "Clé de connexion refusée par le poste principal."))
    }
}

async fn ping(
    State(shared): State<Arc<Shared>>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
) -> Reply<PingReply> {
    check_peer(&peer)?;
    check_key(&shared, &headers)?;
    Ok(Json(PingReply {
        app_version: shared.config.app_version.clone(),
        workstation_name: shared.config.workstation_name.clone(),
    }))
}

async fn hello(
    State(shared): State<Arc<Shared>>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    Json(request): Json<HelloRequest>,
) -> Reply<HelloReply> {
    check_peer(&peer)?;
    if !same_key(&shared.config.key, &normalize_key(&request.key)) {
        return Err(refuse(StatusCode::UNAUTHORIZED, "key", "Clé de connexion refusée par le poste principal."));
    }
    if request.app_version != shared.config.app_version {
        return Err(refuse(
            StatusCode::CONFLICT,
            "version",
            format!(
                "Versions différentes : ce poste a Baitari {}, le poste principal a Baitari {}. Mettez les deux postes à jour avec la même version.",
                request.app_version, shared.config.app_version
            ),
        ));
    }
    let mut connection = connect_options(shared.config.database_path.clone())
        .create_if_missing(false)
        .connect()
        .await
        .map_err(|_| refuse(StatusCode::SERVICE_UNAVAILABLE, "database", "Le poste principal n'a pas encore ouvert sa base. Lancez Baitari sur le poste principal."))?;
    let applied: Vec<(String,)> = sqlx::query_as("SELECT version FROM migrations")
        .fetch_all(&mut connection)
        .await
        .map_err(|_| refuse(StatusCode::SERVICE_UNAVAILABLE, "database", "Le poste principal n'a pas encore ouvert sa base. Lancez Baitari sur le poste principal."))?;
    let host: HashSet<String> = applied.into_iter().map(|(version,)| version).collect();
    let client: HashSet<String> = request.migrations.into_iter().collect();
    if host != client {
        let _ = connection.close().await;
        return Err(refuse(
            StatusCode::CONFLICT,
            "schema",
            "La base du poste principal n'a pas la même structure que ce poste. Mettez les deux postes à jour avec la même version.",
        ));
    }
    let session_id = super::random_token(16);
    let session = Arc::new(Session {
        connection: Mutex::new(connection),
        in_transaction: AtomicBool::new(false),
        last_seen: StdMutex::new(Instant::now()),
        workstation: request.workstation_name,
    });
    shared.sessions.lock().unwrap().insert(session_id.clone(), session);
    Ok(Json(HelloReply {
        app_version: shared.config.app_version.clone(),
        session_id,
        workstation_name: shared.config.workstation_name.clone(),
    }))
}

async fn query(
    State(shared): State<Arc<Shared>>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(request): Json<QueryRequest>,
) -> Reply<QueryReply> {
    check_peer(&peer)?;
    check_key(&shared, &headers)?;
    let session = shared
        .sessions
        .lock()
        .unwrap()
        .get(&request.session_id)
        .cloned()
        .ok_or_else(|| refuse(StatusCode::NOT_FOUND, "session", "Session inconnue du poste principal."))?;
    let mut connection = session.connection.lock().await;
    session.touch();
    let outcome = match request.kind {
        QueryKind::Execute => bind_values(&request.sql, request.values)
            .execute(&mut *connection)
            .await
            .map(|done| QueryReply {
                in_transaction: false,
                last_insert_id: Some(done.last_insert_rowid()),
                rows: None,
                rows_affected: Some(done.rows_affected()),
            })
            .map_err(|e| e.to_string()),
        QueryKind::Select => match bind_values(&request.sql, request.values).fetch_all(&mut *connection).await {
            Ok(rows) => rows
                .iter()
                .map(row_to_json)
                .collect::<Result<Vec<_>, _>>()
                .map(|rows| QueryReply { in_transaction: false, last_insert_id: None, rows: Some(rows), rows_affected: None }),
            Err(error) => Err(error.to_string()),
        },
    };
    let in_transaction = is_in_transaction(&mut connection).await;
    session.in_transaction.store(in_transaction, Ordering::SeqCst);
    session.touch();
    drop(connection);
    match outcome {
        Ok(mut reply) => {
            reply.in_transaction = in_transaction;
            Ok(Json(reply))
        }
        Err(message) => Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(ErrorReply { code: "sql".into(), message, in_transaction }),
        )),
    }
}

async fn close(
    State(shared): State<Arc<Shared>>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(request): Json<CloseRequest>,
) -> Reply<serde_json::Value> {
    check_peer(&peer)?;
    check_key(&shared, &headers)?;
    let session = shared.sessions.lock().unwrap().remove(&request.session_id);
    if let Some(session) = session {
        end_session(session).await;
    }
    Ok(Json(serde_json::json!({})))
}

/// SQLite itself knows whether a transaction is open; parsing SQL would miss
/// SAVEPOINT, END or a BEGIN that failed.
async fn is_in_transaction(connection: &mut SqliteConnection) -> bool {
    match connection.lock_handle().await {
        // SAFETY: the handle is locked for the duration of the call.
        Ok(mut handle) => unsafe { libsqlite3_sys::sqlite3_get_autocommit(handle.as_raw_handle().as_ptr()) == 0 },
        Err(_) => false,
    }
}
