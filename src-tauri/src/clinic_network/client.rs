//! A secondary workstation sends its SQL to the main workstation.

use super::protocol::*;
use super::wire::JsonRow;
use reqwest::StatusCode;
use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_json::Value as JsonValue;
use std::time::Duration;
use tokio::sync::Mutex;

pub const INTERRUPTED_MESSAGE: &str = "La connexion au poste principal a été coupée pendant un enregistrement. Rien n'a été enregistré : réessayez.";
/// The COMMIT may have reached the host before the reply was lost.
pub const UNCERTAIN_MESSAGE: &str = "La connexion au poste principal a été coupée au moment d'enregistrer. Vérifiez si la modification apparaît avant de recommencer.";

fn is_commit(sql: &str) -> bool {
    let head = sql.trim_start().get(..6).unwrap_or_default().to_ascii_uppercase();
    head.starts_with("COMMIT") || head.starts_with("END")
}

#[derive(Clone)]
pub struct RemoteTarget {
    /// `host:port`, e.g. `192.168.1.20:47230`.
    pub address: String,
    pub key: String,
}

#[derive(Debug)]
pub struct ExecuteResult {
    pub last_insert_id: i64,
    pub rows_affected: u64,
}

#[derive(Default)]
struct SessionState {
    id: Option<String>,
    in_transaction: bool,
}

pub struct RemoteClient {
    app_version: String,
    http: reqwest::Client,
    migrations: Vec<String>,
    session: Mutex<SessionState>,
    target: RemoteTarget,
    workstation_name: String,
}

enum Failure {
    /// The host does not know this session any more.
    Session,
    Refused(String),
    Unreachable,
}

impl RemoteClient {
    pub fn new(target: RemoteTarget, migrations: Vec<String>, workstation_name: String) -> Result<Self, String> {
        let _ = rustls::crypto::ring::default_provider().install_default();
        let http = reqwest::Client::builder()
            // A clinic proxy must never see local traffic.
            .no_proxy()
            .connect_timeout(Duration::from_secs(2))
            .timeout(Duration::from_secs(20))
            .user_agent(concat!("Baitari/", env!("CARGO_PKG_VERSION")))
            .build()
            .map_err(|e| e.to_string())?;
        Ok(Self {
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            http,
            migrations,
            session: Mutex::new(SessionState::default()),
            target,
            workstation_name,
        })
    }

    #[cfg(test)]
    pub fn with_app_version(mut self, version: &str) -> Self {
        self.app_version = version.to_string();
        self
    }

    pub fn address(&self) -> &str {
        &self.target.address
    }

    fn unreachable_message(&self) -> String {
        format!(
            "Poste principal injoignable ({}). Vérifiez qu'il est allumé, que Baitari y est ouvert et que les deux postes sont sur le même réseau.",
            self.target.address
        )
    }

    async fn post<B: Serialize, R: DeserializeOwned>(&self, path: &str, body: &B) -> Result<R, Failure> {
        let response = self
            .http
            .post(format!("http://{}{}", self.target.address, path))
            .bearer_auth(&self.target.key)
            .header("content-type", "application/json")
            .body(serde_json::to_vec(body).map_err(|e| Failure::Refused(e.to_string()))?)
            .send()
            .await
            .map_err(|_| Failure::Unreachable)?;
        let status = response.status();
        let bytes = response.bytes().await.map_err(|_| Failure::Unreachable)?;
        if status.is_success() {
            return serde_json::from_slice(&bytes).map_err(|e| Failure::Refused(e.to_string()));
        }
        if status == StatusCode::NOT_FOUND {
            return Err(Failure::Session);
        }
        let message = serde_json::from_slice::<ErrorReply>(&bytes)
            .map(|reply| reply.message)
            .unwrap_or_else(|_| format!("Réponse inattendue du poste principal ({status})."));
        Err(Failure::Refused(message))
    }

    fn explain(&self, failure: Failure) -> String {
        match failure {
            Failure::Session => INTERRUPTED_MESSAGE.to_string(),
            Failure::Refused(message) => message,
            Failure::Unreachable => self.unreachable_message(),
        }
    }

    /// Opens a session, checking the key, the app version and the schema.
    pub async fn hello(&self) -> Result<HelloReply, String> {
        let mut session = self.session.lock().await;
        let reply = self.open_session().await.map_err(|f| self.explain(f))?;
        session.id = Some(reply.session_id.clone());
        session.in_transaction = false;
        Ok(reply)
    }

    async fn open_session(&self) -> Result<HelloReply, Failure> {
        self.post(
            "/v1/hello",
            &HelloRequest {
                app_version: self.app_version.clone(),
                key: self.target.key.clone(),
                migrations: self.migrations.clone(),
                workstation_name: self.workstation_name.clone(),
            },
        )
        .await
    }

    pub async fn ping(&self) -> Result<PingReply, String> {
        let response = self
            .http
            .get(format!("http://{}/v1/ping", self.target.address))
            .bearer_auth(&self.target.key)
            .send()
            .await
            .map_err(|_| self.unreachable_message())?;
        let status = response.status();
        let bytes = response.bytes().await.map_err(|_| self.unreachable_message())?;
        if !status.is_success() {
            return Err(serde_json::from_slice::<ErrorReply>(&bytes)
                .map(|reply| reply.message)
                .unwrap_or_else(|_| self.unreachable_message()));
        }
        serde_json::from_slice(&bytes).map_err(|e| e.to_string())
    }

    async fn query(&self, kind: QueryKind, sql: String, values: Vec<JsonValue>) -> Result<QueryReply, String> {
        // One request at a time per workstation keeps statement order intact.
        let mut session = self.session.lock().await;
        let mut reopened = false;
        loop {
            let id = match session.id.clone() {
                Some(id) => id,
                None => {
                    let reply = self.open_session().await.map_err(|f| self.explain(f))?;
                    session.id = Some(reply.session_id.clone());
                    reply.session_id
                }
            };
            let request = QueryRequest { kind, session_id: id, sql: sql.clone(), values: values.clone() };
            match self.post::<_, QueryReply>("/v1/query", &request).await {
                Ok(reply) => {
                    session.in_transaction = reply.in_transaction;
                    return Ok(reply);
                }
                Err(Failure::Session) => {
                    session.id = None;
                    // Inside a transaction, the host has already rolled back:
                    // replaying the rest on a fresh session would commit half of it.
                    if std::mem::take(&mut session.in_transaction) || reopened {
                        return Err(INTERRUPTED_MESSAGE.to_string());
                    }
                    reopened = true;
                }
                Err(Failure::Unreachable) => {
                    if std::mem::take(&mut session.in_transaction) {
                        // The host rolls the transaction back when its lease ends.
                        session.id = None;
                        let message = if is_commit(&sql) { UNCERTAIN_MESSAGE } else { INTERRUPTED_MESSAGE };
                        return Err(message.to_string());
                    }
                    return Err(self.unreachable_message());
                }
                Err(Failure::Refused(message)) => {
                    // SQL errors carry the host's view of the transaction.
                    return Err(message);
                }
            }
        }
    }

    pub async fn execute(&self, sql: String, values: Vec<JsonValue>) -> Result<ExecuteResult, String> {
        let reply = self.query(QueryKind::Execute, sql, values).await?;
        Ok(ExecuteResult {
            last_insert_id: reply.last_insert_id.unwrap_or_default(),
            rows_affected: reply.rows_affected.unwrap_or_default(),
        })
    }

    pub async fn select(&self, sql: String, values: Vec<JsonValue>) -> Result<Vec<JsonRow>, String> {
        Ok(self.query(QueryKind::Select, sql, values).await?.rows.unwrap_or_default())
    }

    pub async fn close(&self) {
        let mut session = self.session.lock().await;
        if let Some(id) = session.id.take() {
            let _ = self.post::<_, JsonValue>("/v1/close", &CloseRequest { session_id: id }).await;
        }
        session.in_transaction = false;
    }
}
