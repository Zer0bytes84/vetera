//! Local network mode: one main workstation keeps baitari.db, the others
//! read and write it through a small HTTP API. Nothing leaves the clinic
//! network. Standalone stays the default: without a saved choice nothing
//! listens and every query goes to the local file as before.

mod client;
mod discovery;
mod host;
mod protocol;
mod wire;

#[cfg(test)]
mod tests;

use crate::clinic_database::clinic_data_dir;
use client::{RemoteClient, RemoteTarget};
use discovery::{Advertiser, DiscoveredHost};
use host::{HostConfig, HostServer};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::net::{Ipv4Addr, SocketAddr};
use std::path::PathBuf;
use std::sync::{Arc, Mutex as StdMutex};
use std::time::Duration;
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex;
use wire::JsonRow;

const SETTINGS_FILE: &str = "clinic-network.json";
pub const DEFAULT_PORT: u16 = 47230;
const KEY_ALPHABET: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZ23456789";

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub enum NetworkMode {
    #[default]
    Standalone,
    Host,
    Client,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NetworkSettings {
    #[serde(default)]
    pub mode: NetworkMode,
    #[serde(default = "default_workstation_name")]
    pub workstation_name: String,
    #[serde(default = "default_port")]
    pub port: u16,
    #[serde(default)]
    pub host_key: Option<String>,
    #[serde(default)]
    pub remote_address: Option<String>,
    #[serde(default)]
    pub remote_key: Option<String>,
}

fn default_workstation_name() -> String {
    "Poste principal".into()
}

fn default_port() -> u16 {
    DEFAULT_PORT
}

impl Default for NetworkSettings {
    fn default() -> Self {
        Self {
            mode: NetworkMode::Standalone,
            workstation_name: default_workstation_name(),
            port: DEFAULT_PORT,
            host_key: None,
            remote_address: None,
            remote_key: None,
        }
    }
}

pub(crate) fn random_token(length: usize) -> String {
    let mut bytes = vec![0u8; length];
    getrandom::getrandom(&mut bytes).expect("system random generator unavailable");
    // 31 symbols; the tiny modulo bias does not matter for a pairing key.
    bytes.iter().map(|b| KEY_ALPHABET[*b as usize % KEY_ALPHABET.len()] as char).collect()
}

fn format_key(key: &str) -> String {
    key.as_bytes()
        .chunks(4)
        .map(|chunk| String::from_utf8_lossy(chunk).into_owned())
        .collect::<Vec<_>>()
        .join("-")
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(clinic_data_dir(app)?.join(SETTINGS_FILE))
}

fn load_settings(app: &AppHandle) -> NetworkSettings {
    settings_path(app)
        .ok()
        .and_then(|path| std::fs::read(path).ok())
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

fn save_settings(app: &AppHandle, settings: &NetworkSettings) -> Result<(), String> {
    let path = settings_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let bytes = serde_json::to_vec_pretty(settings).map_err(|e| e.to_string())?;
    // Write then rename so a crash never leaves a half-written file.
    let temporary = path.with_extension("json.tmp");
    std::fs::write(&temporary, bytes).map_err(|e| e.to_string())?;
    std::fs::rename(&temporary, &path).map_err(|e| e.to_string())
}

struct RunningHost {
    _advertiser: Option<Advertiser>,
    advertise_error: Option<String>,
    server: HostServer,
}

pub struct ClinicNetwork {
    client: Mutex<Option<Arc<RemoteClient>>>,
    host: Mutex<Option<RunningHost>>,
    host_error: StdMutex<Option<String>>,
    /// The mode the database was opened with; switching to or from a
    /// secondary workstation takes effect on the next launch.
    launch_mode: StdMutex<NetworkMode>,
}

impl ClinicNetwork {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(None),
            host: Mutex::new(None),
            host_error: StdMutex::new(None),
            launch_mode: StdMutex::new(NetworkMode::Standalone),
        }
    }
}

/// Reads the saved mode and starts serving if this is the main workstation.
pub fn init(app: &AppHandle) {
    let settings = load_settings(app);
    *app.state::<ClinicNetwork>().launch_mode.lock().unwrap() = settings.mode;
    if settings.mode == NetworkMode::Host {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            let network = app.state::<ClinicNetwork>();
            let outcome = start_host(&app, &network, &settings).await;
            *network.host_error.lock().unwrap() = outcome.err();
        });
    }
}

async fn start_host(app: &AppHandle, network: &ClinicNetwork, settings: &NetworkSettings) -> Result<(), String> {
    let key = settings.host_key.clone().ok_or("Clé de connexion manquante.")?;
    let database_path = clinic_data_dir(app)?.join("baitari.db");
    let mut running = network.host.lock().await;
    if let Some(previous) = running.take() {
        previous.server.stop().await;
    }
    let config = HostConfig::new(database_path, key, settings.workstation_name.clone());
    let server = HostServer::start(config, SocketAddr::from((Ipv4Addr::UNSPECIFIED, settings.port))).await?;
    let (advertiser, advertise_error) = match Advertiser::start(&settings.workstation_name, server.address().port()) {
        Ok(advertiser) => (Some(advertiser), None),
        Err(error) => (None, Some(error)),
    };
    *running = Some(RunningHost { _advertiser: advertiser, advertise_error, server });
    Ok(())
}

fn local_addresses() -> Vec<String> {
    let mut addresses: Vec<String> = if_addrs::get_if_addrs()
        .unwrap_or_default()
        .into_iter()
        .filter(|interface| !interface.is_loopback())
        .filter_map(|interface| match interface.ip() {
            std::net::IpAddr::V4(ip) if ip.is_private() => Some(ip.to_string()),
            _ => None,
        })
        .collect();
    addresses.sort();
    addresses.dedup();
    addresses
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostStatus {
    addresses: Vec<String>,
    advertise_error: Option<String>,
    error: Option<String>,
    key: Option<String>,
    port: u16,
    running: bool,
    workstations: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkStatus {
    host: HostStatus,
    launch_mode: NetworkMode,
    mode: NetworkMode,
    needs_restart: bool,
    remote_address: Option<String>,
    workstation_name: String,
}

async fn status(app: &AppHandle, network: &ClinicNetwork) -> NetworkStatus {
    let settings = load_settings(app);
    let launch_mode = *network.launch_mode.lock().unwrap();
    let running = network.host.lock().await;
    let host = HostStatus {
        addresses: local_addresses(),
        advertise_error: running.as_ref().and_then(|h| h.advertise_error.clone()),
        error: network.host_error.lock().unwrap().clone(),
        key: settings.host_key.as_deref().map(format_key),
        port: running.as_ref().map(|h| h.server.address().port()).unwrap_or(settings.port),
        running: running.is_some(),
        workstations: running.as_ref().map(|h| h.server.workstations()).unwrap_or_default(),
    };
    let crosses_client = |mode: NetworkMode| mode == NetworkMode::Client;
    NetworkStatus {
        host,
        launch_mode,
        mode: settings.mode,
        needs_restart: settings.mode != launch_mode && (crosses_client(settings.mode) || crosses_client(launch_mode)),
        remote_address: settings.remote_address,
        workstation_name: settings.workstation_name,
    }
}

fn clean_name(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 40 {
        return Err("Donnez à ce poste un nom de 1 à 40 caractères (par exemple « Accueil »).".into());
    }
    Ok(name.to_string())
}

#[tauri::command]
pub async fn clinic_network_status(app: AppHandle, network: State<'_, ClinicNetwork>) -> Result<NetworkStatus, String> {
    Ok(status(&app, &network).await)
}

#[tauri::command]
pub fn clinic_network_launch_mode(network: State<'_, ClinicNetwork>) -> NetworkMode {
    *network.launch_mode.lock().unwrap()
}

#[tauri::command]
pub async fn clinic_network_start_host(
    app: AppHandle,
    network: State<'_, ClinicNetwork>,
    workstation_name: String,
) -> Result<NetworkStatus, String> {
    let mut settings = load_settings(&app);
    settings.workstation_name = clean_name(&workstation_name)?;
    settings.mode = NetworkMode::Host;
    if settings.host_key.is_none() {
        settings.host_key = Some(random_token(12));
    }
    save_settings(&app, &settings)?;
    // A secondary workstation still has its database elsewhere until restart.
    if *network.launch_mode.lock().unwrap() != NetworkMode::Client {
        let outcome = start_host(&app, &network, &settings).await;
        *network.host_error.lock().unwrap() = outcome.clone().err();
        outcome?;
    }
    Ok(status(&app, &network).await)
}

#[tauri::command]
pub async fn clinic_network_regenerate_key(app: AppHandle, network: State<'_, ClinicNetwork>) -> Result<NetworkStatus, String> {
    let mut settings = load_settings(&app);
    settings.host_key = Some(random_token(12));
    save_settings(&app, &settings)?;
    if network.host.lock().await.is_some() {
        start_host(&app, &network, &settings).await?;
    }
    Ok(status(&app, &network).await)
}

#[tauri::command]
pub async fn clinic_network_stop(app: AppHandle, network: State<'_, ClinicNetwork>) -> Result<NetworkStatus, String> {
    let mut settings = load_settings(&app);
    settings.mode = NetworkMode::Standalone;
    save_settings(&app, &settings)?;
    if let Some(running) = network.host.lock().await.take() {
        running.server.stop().await;
    }
    *network.host_error.lock().unwrap() = None;
    Ok(status(&app, &network).await)
}

#[tauri::command]
pub async fn clinic_network_discover() -> Result<Vec<DiscoveredHost>, String> {
    tauri::async_runtime::spawn_blocking(|| discovery::discover(Duration::from_millis(2500)))
        .await
        .map_err(|e| e.to_string())?
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteHostInfo {
    address: String,
    app_version: String,
    workstation_name: String,
}

fn remote_address(address: &str) -> Result<String, String> {
    let address = address.trim();
    if address.is_empty() {
        return Err("Indiquez l'adresse du poste principal.".into());
    }
    Ok(if address.contains(':') { address.to_string() } else { format!("{address}:{DEFAULT_PORT}") })
}

async fn try_remote(address: String, key: &str, migrations: Vec<String>, name: String) -> Result<RemoteHostInfo, String> {
    let client = RemoteClient::new(RemoteTarget { address: address.clone(), key: protocol::normalize_key(key) }, migrations, name)?;
    let reply = client.hello().await?;
    client.close().await;
    Ok(RemoteHostInfo { address, app_version: reply.app_version, workstation_name: reply.workstation_name })
}

#[tauri::command]
pub async fn clinic_network_test(
    address: String,
    key: String,
    migrations: Vec<String>,
    workstation_name: String,
) -> Result<RemoteHostInfo, String> {
    try_remote(remote_address(&address)?, &key, migrations, clean_name(&workstation_name)?).await
}

/// Saves this workstation as secondary once the main one accepted it.
#[tauri::command]
pub async fn clinic_network_join(
    app: AppHandle,
    network: State<'_, ClinicNetwork>,
    address: String,
    key: String,
    migrations: Vec<String>,
    workstation_name: String,
) -> Result<NetworkStatus, String> {
    let address = remote_address(&address)?;
    let name = clean_name(&workstation_name)?;
    try_remote(address.clone(), &key, migrations, name.clone()).await?;
    if let Some(running) = network.host.lock().await.take() {
        running.server.stop().await;
    }
    let mut settings = load_settings(&app);
    settings.mode = NetworkMode::Client;
    settings.workstation_name = name;
    settings.remote_address = Some(address);
    settings.remote_key = Some(protocol::normalize_key(&key));
    save_settings(&app, &settings)?;
    Ok(status(&app, &network).await)
}

/// Opens the remote database when this workstation was launched as secondary.
#[tauri::command]
pub async fn clinic_network_connect(
    app: AppHandle,
    network: State<'_, ClinicNetwork>,
    migrations: Vec<String>,
) -> Result<RemoteHostInfo, String> {
    let settings = load_settings(&app);
    let (Some(address), Some(key)) = (settings.remote_address, settings.remote_key) else {
        return Err("Ce poste n'est relié à aucun poste principal.".into());
    };
    let client = Arc::new(RemoteClient::new(RemoteTarget { address: address.clone(), key }, migrations, settings.workstation_name)?);
    let reply = client.hello().await?;
    *network.client.lock().await = Some(client);
    Ok(RemoteHostInfo { address, app_version: reply.app_version, workstation_name: reply.workstation_name })
}

async fn remote(network: &ClinicNetwork) -> Result<Arc<RemoteClient>, String> {
    network
        .client
        .lock()
        .await
        .clone()
        .ok_or_else(|| "La base du poste principal n'est pas ouverte.".to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteReply {
    last_insert_id: i64,
    rows_affected: u64,
}

#[tauri::command]
pub async fn clinic_network_execute(
    network: State<'_, ClinicNetwork>,
    query: String,
    values: Vec<JsonValue>,
) -> Result<ExecuteReply, String> {
    let result = remote(&network).await?.execute(query, values).await?;
    Ok(ExecuteReply { last_insert_id: result.last_insert_id, rows_affected: result.rows_affected })
}

#[tauri::command]
pub async fn clinic_network_select(
    network: State<'_, ClinicNetwork>,
    query: String,
    values: Vec<JsonValue>,
) -> Result<Vec<JsonRow>, String> {
    remote(&network).await?.select(query, values).await
}

#[tauri::command]
pub async fn clinic_network_close(network: State<'_, ClinicNetwork>) -> Result<bool, String> {
    if let Some(client) = network.client.lock().await.take() {
        client.close().await;
    }
    Ok(true)
}

#[tauri::command]
pub async fn clinic_network_ping(network: State<'_, ClinicNetwork>) -> Result<RemoteHostInfo, String> {
    let client = remote(&network).await?;
    let reply = client.ping().await?;
    Ok(RemoteHostInfo {
        address: client.address().to_string(),
        app_version: reply.app_version,
        workstation_name: reply.workstation_name,
    })
}
