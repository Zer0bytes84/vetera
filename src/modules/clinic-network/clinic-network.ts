import { invoke } from "@tauri-apps/api/core";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import type { NetworkLaunchMode } from "@/services/sqlite/remote-database";

export type NetworkMode = NetworkLaunchMode;

export interface NetworkStatus {
  host: {
    addresses: string[];
    advertiseError: string | null;
    error: string | null;
    key: string | null;
    port: number;
    running: boolean;
    workstations: string[];
  };
  launchMode: NetworkMode;
  mode: NetworkMode;
  needsRestart: boolean;
  remoteAddress: string | null;
  workstationName: string;
}

export interface DiscoveredHost {
  address: string;
  appVersion: string | null;
  port: number;
  workstationName: string;
}

export interface RemoteHostInfo {
  address: string;
  appVersion: string;
  workstationName: string;
}

const migrations = () => SQLITE_MIGRATIONS.map(({ version }) => version);

/** Native errors arrive as plain strings already written for the user. */
export function networkErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Le réseau local n'a pas répondu. Réessayez.";
}

export const clinicNetwork = {
  status: () => invoke<NetworkStatus>("clinic_network_status"),
  startHost: (workstationName: string) =>
    invoke<NetworkStatus>("clinic_network_start_host", { workstationName }),
  regenerateKey: () => invoke<NetworkStatus>("clinic_network_regenerate_key"),
  stop: () => invoke<NetworkStatus>("clinic_network_stop"),
  discover: () => invoke<DiscoveredHost[]>("clinic_network_discover"),
  test: (address: string, key: string, workstationName: string) =>
    invoke<RemoteHostInfo>("clinic_network_test", {
      address,
      key,
      migrations: migrations(),
      workstationName,
    }),
  join: (address: string, key: string, workstationName: string) =>
    invoke<NetworkStatus>("clinic_network_join", {
      address,
      key,
      migrations: migrations(),
      workstationName,
    }),
  ping: () => invoke<RemoteHostInfo>("clinic_network_ping"),
};
