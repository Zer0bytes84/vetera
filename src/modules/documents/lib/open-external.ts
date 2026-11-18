import { WHATSAPP_APP_LINK } from "@/lib/whatsapp";
import { isTauriRuntime } from "@/services/browser-store";
import { normalizeLinkUrl } from "./library";

/**
 * Opens a kept link in the person's own browser. Only web and mail addresses are opened, whatever the base holds, plus
 * the one WhatsApp link shape the contact button builds (WHATSAPP_APP_LINK), which goes to the WhatsApp application. In
 * the desktop app the address goes to the system through the shell plugin (its « open » permission is in the
 * capabilities, its pattern in tauri.conf.json: http, https, mailto, tel and that WhatsApp shape); in a browser it opens
 * in a new tab, cut off from this page.
 */
export async function openExternalLink(url: string): Promise<boolean> {
  const allowed = WHATSAPP_APP_LINK.test(url) || normalizeLinkUrl(url) !== null;
  if (!allowed) return false;
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
