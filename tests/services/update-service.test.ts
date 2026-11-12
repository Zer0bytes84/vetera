import { beforeEach, describe, expect, it, vi } from "vitest";

const check = vi.fn();
const toastInfo = vi.fn();
const toastSuccess = vi.fn();
const setSetting = vi.fn(async () => {});

vi.mock("@tauri-apps/plugin-updater", () => ({ check: (...args: unknown[]) => check(...args) }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: (...a: unknown[]) => toastInfo(...a), success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() } }));
vi.mock("@/services/browser-store", () => ({ isTauriRuntime: () => true }));
vi.mock("@/services/appSettingsService", () => ({ getSetting: vi.fn(async () => ""), setSetting: (...a: unknown[]) => setSetting(...(a as [])) }));

import { checkForAppUpdates, isPlatformNotInFeedError } from "@/services/updateService";

const PLATFORM_ERROR = "None of the fallback platforms `[\"linux-aarch64\"]` were found in the response `platforms` object";

beforeEach(() => vi.clearAllMocks());

describe("la vérification des mises à jour", () => {
  it("reconnaît l'absence de la plateforme dans le flux, qu'elle arrive en texte ou en erreur", () => {
    expect(isPlatformNotInFeedError(PLATFORM_ERROR)).toBe(true);
    expect(isPlatformNotInFeedError(new Error(PLATFORM_ERROR))).toBe(true);
    expect(isPlatformNotInFeedError("error sending request for url")).toBe(false);
    expect(isPlatformNotInFeedError(new Error("signature verification failed"))).toBe(false);
  });

  it("une plateforme absente du flux n'est pas une erreur : rien n'est levé, rien n'est dit au lancement", async () => {
    check.mockRejectedValueOnce(PLATFORM_ERROR);
    await expect(checkForAppUpdates()).resolves.toBeNull();
    expect(toastInfo).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("à la demande de l'utilisateur, on lui dit la vérité sans prétendre qu'il a la dernière version", async () => {
    check.mockRejectedValueOnce(PLATFORM_ERROR);
    await expect(checkForAppUpdates({ userInitiated: true })).resolves.toBeNull();
    expect(toastInfo).toHaveBeenCalledTimes(1);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("une vraie panne (réseau, signature) est toujours remontée", async () => {
    check.mockRejectedValueOnce("error sending request for url (https://github.com/...)");
    await expect(checkForAppUpdates()).rejects.toBe("error sending request for url (https://github.com/...)");
  });

  it("sans mise à jour, l'utilisateur est informé uniquement s'il l'a demandé", async () => {
    check.mockResolvedValue(null);
    await expect(checkForAppUpdates()).resolves.toBeNull();
    expect(toastSuccess).not.toHaveBeenCalled();
    await checkForAppUpdates({ userInitiated: true });
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });
});
