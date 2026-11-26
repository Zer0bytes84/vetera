import { beforeEach, describe, expect, it, vi } from "vitest";

const check = vi.fn();
const toastInfo = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
// The app's settings, kept in memory: what the service writes, it reads back at the next launch.
const settings = new Map<string, string>();
const setSetting = vi.fn(async (key: string, value: string) => {
  settings.set(key, value);
});
const getSetting = vi.fn(async (key: string) => settings.get(key) ?? "");
const relaunch = vi.fn(async () => undefined);

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: (...args: unknown[]) => check(...args),
}));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: () => relaunch() }));
vi.mock("sonner", () => ({
  toast: {
    info: (...a: unknown[]) => toastInfo(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));
vi.mock("@/services/browser-store", () => ({ isTauriRuntime: () => true }));
vi.mock("@/services/appSettingsService", () => ({
  getSetting: (...a: unknown[]) => getSetting(...(a as [string])),
  setSetting: (...a: unknown[]) => setSetting(...(a as [string, string])),
}));

import {
  checkForAppUpdates,
  isPlatformNotInFeedError,
} from "@/services/updateService";

const PLATFORM_ERROR =
  'None of the fallback platforms `["linux-aarch64"]` were found in the response `platforms` object';

beforeEach(() => {
  vi.clearAllMocks();
  settings.clear();
});

interface Notice {
  action: { onClick: () => void };
  cancel: { onClick: () => void };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const DISMISSED = "updates.dismissed_version";

/** A 5.1.0 offered by the feed, whose installation succeeds or fails. */
function offer(install: () => Promise<void>) {
  const downloadAndInstall = vi.fn(install);
  check.mockResolvedValue({
    body: "Notes",
    downloadAndInstall,
    version: "5.1.0",
  });
  return downloadAndInstall;
}
async function noticeFor(options?: {
  userInitiated?: boolean;
}): Promise<Notice> {
  await checkForAppUpdates(options);
  const call = toastInfo.mock.calls.find(([title]) =>
    String(title).includes("5.1.0 est disponible")
  );
  if (!call) {
    throw new Error("aucune notification de mise à jour");
  }
  return call[1] as Notice;
}

describe("la vérification des mises à jour", () => {
  it("reconnaît l'absence de la plateforme dans le flux, qu'elle arrive en texte ou en erreur", () => {
    expect(isPlatformNotInFeedError(PLATFORM_ERROR)).toBe(true);
    expect(isPlatformNotInFeedError(new Error(PLATFORM_ERROR))).toBe(true);
    expect(isPlatformNotInFeedError("error sending request for url")).toBe(
      false
    );
    expect(
      isPlatformNotInFeedError(new Error("signature verification failed"))
    ).toBe(false);
  });

  it("une plateforme absente du flux n'est pas une erreur : rien n'est levé, rien n'est dit au lancement", async () => {
    check.mockRejectedValueOnce(PLATFORM_ERROR);
    await expect(checkForAppUpdates()).resolves.toBeNull();
    expect(toastInfo).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("à la demande de l'utilisateur, on lui dit la vérité sans prétendre qu'il a la dernière version", async () => {
    check.mockRejectedValueOnce(PLATFORM_ERROR);
    await expect(
      checkForAppUpdates({ userInitiated: true })
    ).resolves.toBeNull();
    expect(toastInfo).toHaveBeenCalledTimes(1);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("une vraie panne (réseau, signature) est toujours remontée", async () => {
    check.mockRejectedValueOnce(
      "error sending request for url (https://github.com/...)"
    );
    await expect(checkForAppUpdates()).rejects.toBe(
      "error sending request for url (https://github.com/...)"
    );
  });

  it("sans mise à jour, l'utilisateur est informé uniquement s'il l'a demandé", async () => {
    check.mockResolvedValue(null);
    await expect(checkForAppUpdates()).resolves.toBeNull();
    expect(toastSuccess).not.toHaveBeenCalled();
    await checkForAppUpdates({ userInitiated: true });
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });
});

describe("le circuit de mise à jour de la 5.1.1 : un échec n'est pas un refus", () => {
  it("une installation qui échoue ne marque pas la version comme refusée, et le message dit vrai", async () => {
    const install = offer(() =>
      Promise.reject(new Error("could not replace the app bundle"))
    );
    (await noticeFor()).action.onClick();
    await flush();
    expect(install).toHaveBeenCalledTimes(1);
    expect(
      setSetting.mock.calls.filter(
        ([key, value]) => key === DISMISSED && value === "5.1.0"
      )
    ).toEqual([]);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(toastError.mock.calls[0])).toContain(
      "reproposee au prochain lancement"
    );
    expect(relaunch).not.toHaveBeenCalled();
  });

  it("après cet échec, le lancement suivant repropose la version", async () => {
    offer(() => Promise.reject(new Error("échec")));
    (await noticeFor()).action.onClick();
    await flush();
    toastInfo.mockClear();
    await expect(noticeFor()).resolves.toBeDefined();
  });

  it("« Plus tard » reste un vrai refus : la version est notée et le lancement suivant se tait", async () => {
    offer(() => Promise.resolve());
    (await noticeFor()).cancel.onClick();
    await flush();
    expect(setSetting).toHaveBeenCalledWith(DISMISSED, "5.1.0");
    expect(settings.get(DISMISSED)).toBe("5.1.0");
    toastInfo.mockClear();
    await checkForAppUpdates();
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it("la vérification manuelle propose quand même une version reportée par « Plus tard »", async () => {
    offer(() => Promise.resolve());
    settings.set(DISMISSED, "5.1.0");
    await expect(noticeFor({ userInitiated: true })).resolves.toBeDefined();
  });

  it("une installation réussie efface le refus éventuel et relance l'application", async () => {
    const install = offer(() => Promise.resolve());
    (await noticeFor()).action.onClick();
    await flush();
    expect(install).toHaveBeenCalledTimes(1);
    expect(setSetting).toHaveBeenCalledWith(DISMISSED, "");
    expect(relaunch).toHaveBeenCalledTimes(1);
  });
});
