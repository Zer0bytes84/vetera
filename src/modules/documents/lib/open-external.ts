import { isTauriRuntime } from "@/services/browser-store";
import { normalizeLinkUrl } from "./library";

/**
 * Opens a kept link in the person's own browser. Only web and mail addresses are opened, whatever the base holds. In the
 * desktop app the address goes to the system through the shell plugin (its « open » permission is in the capabilities,
 * limited by default to http, https, mailto and tel); in a browser it opens in a new tab, cut off from this page.
 */
export async function openExternalLink(url: string): Promise<boolean> {
  if (normalizeLinkUrl(url) === null) return false;
  if (isTauriRuntime()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("plugin:shell|open", { path: url });
      return true;
    } catch {
      // Fall through: a webview that refuses the plugin may still open the tab.
    }
  }
  return window.open(url, "_blank", "noopener,noreferrer") !== null;
}
