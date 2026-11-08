import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "@/services/browser-store";

/*
 * Windows: the application's header is the title bar. The native bar is removed by tauri-plugin-decorum (Rust side, Windows
 * only), which fills the `#window-controls` element of index.html with three buttons:
 * `button#decorum-tb-minimize`, `button#decorum-tb-maximize`, `button#decorum-tb-close` (class `decorum-tb-btn`).
 *
 * That element is static in index.html on purpose. decorum looks for `[data-tauri-decorum-tb]` once the DOM is loaded, before
 * React has drawn anything: when it finds none it lays its own transparent 32 px bar over the whole top of the window, which
 * would swallow the clicks on our header. With ours in place it only adds its buttons to it.
 *
 * Here: switch the element on (Windows desktop only), name the buttons in French, and keep two attributes on <html> that the
 * CSS reads: `data-window-maximized` (the maximize icon becomes « restore ») and `data-window-fullscreen` (the controls and
 * the room kept for them disappear). Mac and Linux keep their bar: nothing here runs there.
 */

const ROOT = document.documentElement;
const LABELS: Record<string, string> = {
  "decorum-tb-minimize": "Réduire",
  "decorum-tb-close": "Fermer",
};

export function windowControlsActive() {
  return ROOT.dataset.windowControls === "decorum";
}

function isWindowsDesktop() {
  return isTauriRuntime() && /Windows/i.test(navigator.userAgent);
}

/** In development only, `localStorage["baitari:window-controls-preview"] = "1"` draws the bar in a browser, with inert buttons. */
function previewRequested() {
  try {
    return import.meta.env.DEV && localStorage.getItem("baitari:window-controls-preview") === "1";
  } catch {
    return false;
  }
}

function nameButtons(host: HTMLElement) {
  const maximized = ROOT.dataset.windowMaximized === "true";
  for (const button of host.querySelectorAll<HTMLButtonElement>("button.decorum-tb-btn, button[id^='decorum-tb-']")) {
    const label = button.id === "decorum-tb-maximize" ? (maximized ? "Restaurer" : "Agrandir") : LABELS[button.id];
    if (!label) continue;
    if (button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);
    if (button.title !== label) button.title = label;
    if (button.type !== "button") button.type = "button";
    // Like Windows' own caption buttons, out of the Tab order: the first Tab of a screen goes to the screen, not to « Réduire ».
    if (button.tabIndex !== -1) button.tabIndex = -1;
  }
}

function addPreviewButtons(host: HTMLElement) {
  if (host.querySelector("button")) return;
  for (const id of ["minimize", "maximize", "close"]) {
    const button = document.createElement("button");
    button.id = `decorum-tb-${id}`;
    button.className = "decorum-tb-btn";
    // The Segoe glyph decorum writes in each button, so the preview lays out exactly like the real thing.
    button.textContent = { minimize: "\uE921", maximize: "\uE922", close: "\uE8BB" }[id] ?? "";
    host.appendChild(button);
  }
}

export function initWindowControls() {
  const host = document.getElementById("window-controls");
  if (!host) return;
  const preview = !isWindowsDesktop() && previewRequested();
  if (!isWindowsDesktop() && !preview) return;

  ROOT.dataset.windowControls = "decorum";
  host.hidden = false;
  host.setAttribute("role", "group");
  host.setAttribute("aria-label", "Contrôles de la fenêtre");
  if (preview) addPreviewButtons(host);

  // decorum adds its buttons a moment after the page loads, and swaps the maximize glyph on every resize.
  new MutationObserver(() => nameButtons(host)).observe(host, { childList: true, subtree: true, characterData: true });
  nameButtons(host);

  if (preview) return;
  const appWindow = getCurrentWindow();

  // Safety net: decorum injects its buttons when the page loads. If none have come after a few seconds, the window has no
  // bar and no buttons at all: give it back its native bar rather than leave only Alt+F4.
  window.setTimeout(() => {
    if (host.querySelector("button")) return;
    delete ROOT.dataset.windowControls;
    host.hidden = true;
    void appWindow.setDecorations(true).catch(() => undefined);
  }, 4000);

  const sync = async () => {
    try {
      const [maximized, fullscreen] = await Promise.all([appWindow.isMaximized(), appWindow.isFullscreen()]);
      ROOT.dataset.windowMaximized = String(maximized);
      ROOT.dataset.windowFullscreen = String(fullscreen);
      nameButtons(host);
    } catch {
      // A failed read leaves the bar as it is; the next resize tries again.
    }
  };
  void sync();
  void appWindow.onResized(() => void sync()).catch(() => undefined);
}
