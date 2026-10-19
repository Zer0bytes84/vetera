import { invoke } from "@tauri-apps/api/core";
import Database, { type QueryResult } from "@tauri-apps/plugin-sql";

export type NetworkLaunchMode = "standalone" | "host" | "client";

/**
 * Same contract as the local SQL plugin, but every statement runs on the
 * main workstation. BEGIN, statements and COMMIT stay separate calls, as
 * with the plugin; the main workstation pins them to one connection.
 */
export class RemoteClinicDatabase extends Database {
  constructor() {
    super("lan:poste-principal");
  }

  override async execute(
    query: string,
    bindValues?: unknown[]
  ): Promise<QueryResult> {
    return invoke<QueryResult>("clinic_network_execute", {
      query,
      values: bindValues ?? [],
    });
  }

  override async select<T>(query: string, bindValues?: unknown[]): Promise<T> {
    return invoke<T>("clinic_network_select", {
      query,
      values: bindValues ?? [],
    });
  }

  override async close(): Promise<boolean> {
    return invoke<boolean>("clinic_network_close");
  }
}

/** Mode the native side opened with; anything unexpected means standalone. */
export async function readNetworkLaunchMode(): Promise<NetworkLaunchMode> {
  try {
    const mode = await invoke<NetworkLaunchMode>("clinic_network_launch_mode");
    return mode === "client" || mode === "host" ? mode : "standalone";
  } catch {
    return "standalone";
  }
}
