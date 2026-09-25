import { LogicalPosition } from "@tauri-apps/api/dpi";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { isTauriRuntime } from "./browser-store";

export const ACTIVATION_ADMIN_ROUTE = "activation-admin";
export const ACTIVATION_ADMIN_WINDOW_LABEL = "activation-admin";

export function isActivationAdminRoute() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.hash.replace(/^#\/?/, "") === ACTIVATION_ADMIN_ROUTE;
}

function activationAdminUrl() {
  if (typeof window === "undefined") {
    return `#/${ACTIVATION_ADMIN_ROUTE}`;
  }

  return `${window.location.href.replace(/#.*/, "")}#/${ACTIVATION_ADMIN_ROUTE}`;
}

export async function openActivationAdminWindow() {
  if (!isTauriRuntime()) {
    const opened = window.open(
      activationAdminUrl(),
      "baitari-activation",
      "popup,width=1100,height=780,resizable=yes"
    );
    if (!opened) {
      window.location.assign(activationAdminUrl());
    }
    return;
  }

  const existing = await WebviewWindow.getByLabel(ACTIVATION_ADMIN_WINDOW_LABEL);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const child = new WebviewWindow(ACTIVATION_ADMIN_WINDOW_LABEL, {
    url: activationAdminUrl(),
    title: "Baitari · Centre d’activation",
    width: 1200,
    height: 820,
    minWidth: 920,
    minHeight: 640,
    resizable: true,
    center: true,
    focus: true,
    decorations: true,
    titleBarStyle: "overlay",
    hiddenTitle: true,
    trafficLightPosition: new LogicalPosition(18, 18),
  });

  await new Promise<void>((resolve, reject) => {
    child.once("tauri://created", () => resolve());
    child.once("tauri://error", (event) => {
      reject(new Error(String(event.payload ?? "Impossible de créer la fenêtre.")));
    });
  });
}

export async function closeActivationAdminWindow() {
  if (isTauriRuntime()) {
    await getCurrentWindow().close();
    return;
  }

  window.close();
}
