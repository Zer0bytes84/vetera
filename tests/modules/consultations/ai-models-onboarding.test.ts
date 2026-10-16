import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "@/services/browser-store";
import * as models from "@/modules/consultations/local-ai/models";
import {
  AI_MODELS_CATALOG, AI_ONBOARDING_OPEN_EVENT,
  AI_SETTINGS_PENDING_KEY, TOTAL_AI_MODELS_BYTES,
  hasCompletedAIOnboarding, hasDismissedAIOnboarding, provisionAllAIModels,
  resetAIOnboarding, setAIOnboardingCompleted, setAIOnboardingDismissed,
  shouldShowAIOnboarding, triggerOpenAIOnboarding,
  type AIProvisioningProgress,
} from "@/modules/consultations/services/ai-model-provisioning";
import { createAIModelInstallation } from "@/modules/consultations/services/ai-model-installation";
import { AIModelSettings } from "@/modules/consultations/components/ai-model-settings";

const missing = {root: "/local-models", whisperReady: false, generatorReady: false, embeddingReady: false};
const ready = {...missing, whisperReady: true, generatorReady: true, embeddingReady: true};
const progress: AIProvisioningProgress = {
  step: "whisper", stepMessage: "Téléchargement : Dictée vocale…", currentModelId: "whisper",
  totalBytes: TOTAL_AI_MODELS_BYTES, downloadedBytes: 1234, percentage: 0,
  speedMbps: 1, secondsRemaining: 12, models: {whisper: "downloading", generator: "pending", embeddinggemma: "pending"},
};
function storage(): Storage {
  const values = new Map<string, string>();
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => {values.set(key, value);}, removeItem: key => {values.delete(key);}, clear: () => values.clear(), key: index => [...values.keys()][index] ?? null, get length() {return values.size;}};
}
let disk: Storage;
beforeEach(() => {
  vi.restoreAllMocks();
  disk = storage();
  vi.stubGlobal("window", {localStorage: disk, sessionStorage: storage(), location: {hash: "#/dashboard"}, dispatchEvent: vi.fn()});
  vi.spyOn(runtime, "isTauriRuntime").mockReturnValue(true);
  vi.spyOn(models, "getLocalModels").mockResolvedValue(missing);
});
afterEach(() => {vi.restoreAllMocks(); vi.unstubAllGlobals();});

it("affiche uniquement trois libellés métier, avec les tailles réelles des fichiers à télécharger", () => {
  expect(AI_MODELS_CATALOG.map(model => model.name)).toEqual(["Dictée vocale", "Assistant IA", "Recherche clinique"]);
  expect(AI_MODELS_CATALOG.reduce((bytes, model) => bytes + model.sizeBytes, 0)).toBe(TOTAL_AI_MODELS_BYTES);
  expect(TOTAL_AI_MODELS_BYTES).toBe(2_215_021_763);
});

it("conserve le choix Plus tard et permet de le réinitialiser", async () => {
  setAIOnboardingDismissed();
  expect(hasDismissedAIOnboarding()).toBe(true);
  expect(await shouldShowAIOnboarding()).toBe(false);
  expect(models.getLocalModels).not.toHaveBeenCalled();
  resetAIOnboarding();
  expect(hasDismissedAIOnboarding()).toBe(false);
  expect(await shouldShowAIOnboarding()).toBe(true);
});

it("n’impose rien sur le web et ne tente aucun appel natif, même avec un ancien flag", async () => {
  vi.mocked(runtime.isTauriRuntime).mockReturnValue(false);
  setAIOnboardingCompleted();
  expect(await shouldShowAIOnboarding()).toBe(false);
  expect(models.getLocalModels).not.toHaveBeenCalled();
  const download = vi.spyOn(models, "downloadLocalModels");
  await expect(provisionAllAIModels()).rejects.toThrow("version web reste utilisable");
  expect(download).not.toHaveBeenCalled();
});

it("vérifie le disque plutôt que de croire une installation simulée d’une ancienne version", async () => {
  setAIOnboardingCompleted();
  expect(await shouldShowAIOnboarding()).toBe(true);
  expect(hasCompletedAIOnboarding()).toBe(false);
});

it("ne propose pas de téléchargement lorsque les trois outils sont réellement installés", async () => {
  vi.mocked(models.getLocalModels).mockResolvedValue(ready);
  expect(await shouldShowAIOnboarding()).toBe(false);
  expect(hasCompletedAIOnboarding()).toBe(true);
});

it("ouvre la bonne section des paramètres sans modal", () => {
  triggerOpenAIOnboarding();
  expect(window.location.hash).toBe("#/parametres");
  expect(window.sessionStorage.getItem(AI_SETTINGS_PENDING_KEY)).toBe("true");
  expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type: AI_ONBOARDING_OPEN_EVENT}));
});

it("transmet la progression native et ne marque l’installation complète qu’après vérification", async () => {
  vi.spyOn(models, "downloadLocalModels").mockImplementation(async notify => {notify?.(progress); return ready;});
  vi.mocked(models.getLocalModels).mockResolvedValue(ready);
  const notify = vi.fn();
  expect(await provisionAllAIModels(notify)).toEqual(ready);
  expect(notify).toHaveBeenCalledExactlyOnceWith(progress);
  expect(models.getLocalModels).toHaveBeenCalledOnce();
  expect(hasCompletedAIOnboarding()).toBe(true);
});

it("refuse une fausse réussite si les fichiers manquent encore après le téléchargement", async () => {
  vi.spyOn(models, "downloadLocalModels").mockResolvedValue(ready);
  await expect(provisionAllAIModels()).rejects.toThrow("n’a pas pu être vérifiée");
  expect(hasCompletedAIOnboarding()).toBe(false);
});

it("propage l’accès refusé et n’enregistre jamais la clé de téléchargement", async () => {
  const error = {code: "access_required", message: "Le fournisseur doit autoriser cet outil."};
  const download = vi.spyOn(models, "downloadLocalModels").mockRejectedValue(error);
  await expect(provisionAllAIModels(undefined, {accessToken: "test-ephemeral-key"})).rejects.toEqual(error);
  expect(download).toHaveBeenCalledWith(undefined, "test-ephemeral-key");
  expect(hasCompletedAIOnboarding()).toBe(false);
  for (let index = 0; index < disk.length; index++) expect(disk.getItem(disk.key(index)!)).not.toContain("test-ephemeral-key");
});

it("annule avant de télécharger lorsque le signal est déjà arrêté", async () => {
  const signal = AbortSignal.abort();
  const download = vi.spyOn(models, "downloadLocalModels");
  await expect(provisionAllAIModels(undefined, {signal})).rejects.toThrow("Opération annulée");
  expect(download).not.toHaveBeenCalled();
});

it("laisse le contenu des paramètres utilisable sur le web avec une explication claire", () => {
  vi.mocked(runtime.isTauriRuntime).mockReturnValue(false);
  const html = renderToStaticMarkup(createElement(AIModelSettings));
  expect(html).toContain("continuer à utiliser la version web sans les installer");
  expect(html).not.toContain('role="dialog"');
  expect(html).not.toContain("Télécharger les outils IA");
});

it("présente la gestion des outils sur ordinateur sans nom technique ni écran forcé", () => {
  const html = renderToStaticMarkup(createElement(AIModelSettings));
  const text = html.replace(/<[^>]*>/g, "");
  expect(text).toContain("Dictée vocale");
  expect(text).toContain("Assistant IA");
  expect(text).toContain("Recherche clinique");
  expect(text).toContain("Télécharger les outils IA");
  expect(text).not.toMatch(/Whisper|Gemma|MediaPipe|ONNX/);
  expect(html).not.toContain('role="dialog"');
});

describe("Installation partagée en arrière-plan", () => {
  it("continue après la fermeture d’une vue et fusionne les doubles clics", async () => {
    let finish!: (value: typeof ready) => void;
    const provision = vi.fn(() => new Promise<typeof ready>(resolve => {finish = resolve;}));
    const installation = createAIModelInstallation({check: async () => missing, provision});
    const listener = vi.fn();
    const unsubscribe = installation.subscribe(listener);
    const first = installation.start();
    expect(installation.start()).toBe(first);
    expect(provision).toHaveBeenCalledOnce();
    unsubscribe(); finish(ready); await first;
    expect(installation.getSnapshot().running).toBe(false);
    expect(installation.getSnapshot().status).toEqual(ready);
  });

  it("conserve les outils partiellement installés après échec et permet un vrai réessai", async () => {
    const partial = {...missing, whisperReady: true, embeddingReady: true};
    const provision = vi.fn().mockRejectedValueOnce({code: "network", message: "Connexion interrompue."}).mockResolvedValueOnce(ready);
    const installation = createAIModelInstallation({check: async () => partial, provision});
    await installation.start();
    expect(installation.getSnapshot()).toMatchObject({running: false, error: "Connexion interrompue.", status: partial});
    await installation.start();
    expect(provision).toHaveBeenCalledTimes(2);
    expect(installation.getSnapshot()).toMatchObject({running: false, error: null, status: ready});
  });

  it("empêche un ancien contrôle de statut de remplacer une installation fraîchement terminée", async () => {
    let checked!: (value: typeof missing) => void;
    const installation = createAIModelInstallation({check: () => new Promise(resolve => {checked = resolve;}), provision: async () => ready});
    const checking = installation.refresh();
    await installation.start();
    checked(missing); await checking;
    expect(installation.getSnapshot().status).toEqual(ready);
  });

  it("retire l’erreur si un import manuel complète ensuite l’installation", async () => {
    const check = vi.fn().mockResolvedValueOnce(missing).mockResolvedValueOnce(ready);
    const installation = createAIModelInstallation({check, provision: async () => {throw Error("Accès refusé.");}});
    await installation.start();
    expect(installation.getSnapshot().error).toBe("Accès refusé.");
    await installation.refresh();
    expect(installation.getSnapshot()).toMatchObject({error: null, status: ready});
  });
});
