//! Messages exchanged between workstations, versioned under `/v1`.

use super::wire::JsonRow;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelloRequest {
    pub app_version: String,
    pub key: String,
    pub migrations: Vec<String>,
    pub workstation_name: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelloReply {
    pub app_version: String,
    pub session_id: String,
    pub workstation_name: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PingReply {
    pub app_version: String,
    pub workstation_name: String,
}

#[derive(Serialize, Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub enum QueryKind {
    Execute,
    Select,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryRequest {
    pub kind: QueryKind,
    pub session_id: String,
    pub sql: String,
    pub values: Vec<JsonValue>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct QueryReply {
    pub in_transaction: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_insert_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rows: Option<Vec<JsonRow>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rows_affected: Option<u64>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloseRequest {
    pub session_id: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ErrorReply {
    pub code: String,
    #[serde(default)]
    pub in_transaction: bool,
    pub message: String,
}

/// Keys are shown as `ABCD-EFGH-JKMN`; people may type them in lower case,
/// with spaces or without dashes.
pub fn normalize_key(key: &str) -> String {
    key.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}
