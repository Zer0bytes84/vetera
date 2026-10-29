import { isTauriRuntime } from "@/services/browser-store";

let answer: Promise<boolean> | null = null;

/**
 * True when a debug build runs on a test data folder (a copy of a clinic
 * database, see is_test_data_folder in clinic_database.rs). Asked once.
 */
export function isTestDataFolder(): Promise<boolean> {
  if (!isTauriRuntime()) return Promise.resolve(false);
  answer ??= import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke<boolean>("is_test_data_folder"))
    .catch(() => false);
  return answer;
}
