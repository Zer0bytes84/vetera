//! The main workstation announces itself with mDNS (Bonjour) so the other
//! workstations find it without typing an IP address.

use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use serde::Serialize;
use std::collections::HashMap;
use std::time::{Duration, Instant};

pub const SERVICE_TYPE: &str = "_baitari._tcp.local.";

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredHost {
    pub address: String,
    pub app_version: Option<String>,
    pub port: u16,
    pub workstation_name: String,
}

pub struct Advertiser {
    daemon: ServiceDaemon,
    fullname: String,
}

impl Advertiser {
    pub fn start(workstation_name: &str, port: u16) -> Result<Self, String> {
        let daemon = ServiceDaemon::new().map_err(|e| e.to_string())?;
        let slug: String = workstation_name
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
            .collect();
        let host_name = format!("baitari-{}.local.", slug.trim_matches('-'));
        let properties = [("v", env!("CARGO_PKG_VERSION")), ("name", workstation_name)];
        let service = ServiceInfo::new(SERVICE_TYPE, workstation_name, &host_name, "", port, &properties[..])
            .map_err(|e| e.to_string())?
            .enable_addr_auto();
        let fullname = service.get_fullname().to_string();
        daemon.register(service).map_err(|e| e.to_string())?;
        Ok(Self { daemon, fullname })
    }
}

impl Drop for Advertiser {
    fn drop(&mut self) {
        let _ = self.daemon.unregister(&self.fullname);
        let _ = self.daemon.shutdown();
    }
}

/// Listens for `wait`, then returns every main workstation heard (IPv4 first).
pub fn discover(wait: Duration) -> Result<Vec<DiscoveredHost>, String> {
    let daemon = ServiceDaemon::new().map_err(|e| e.to_string())?;
    let receiver = daemon.browse(SERVICE_TYPE).map_err(|e| e.to_string())?;
    let deadline = Instant::now() + wait;
    let mut found: HashMap<String, DiscoveredHost> = HashMap::new();
    while let Some(left) = deadline.checked_duration_since(Instant::now()) {
        match receiver.recv_timeout(left) {
            Ok(ServiceEvent::ServiceResolved(service)) => {
                let mut addresses: Vec<_> = service.get_addresses_v4().into_iter().collect();
                addresses.sort();
                let Some(address) = addresses.first() else { continue };
                let name = service
                    .get_property_val_str("name")
                    .map(str::to_string)
                    .unwrap_or_else(|| service.get_fullname().split('.').next().unwrap_or_default().to_string());
                found.insert(
                    service.get_fullname().to_string(),
                    DiscoveredHost {
                        address: address.to_string(),
                        app_version: service.get_property_val_str("v").map(str::to_string),
                        port: service.get_port(),
                        workstation_name: name,
                    },
                );
            }
            Ok(_) => {}
            Err(_) => break,
        }
    }
    let _ = daemon.stop_browse(SERVICE_TYPE);
    let _ = daemon.shutdown();
    let mut hosts: Vec<_> = found.into_values().collect();
    hosts.sort_by(|a, b| a.workstation_name.cmp(&b.workstation_name));
    Ok(hosts)
}
