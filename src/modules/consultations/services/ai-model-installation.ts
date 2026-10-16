import { useSyncExternalStore } from "react";
import { EMPTY_MODEL_STATUS, type LocalModelStatus } from "../local-ai/models";
import { allAIModelsReady, checkAIModelsStatus, provisionAllAIModels, type AIProvisioningProgress } from "./ai-model-provisioning";

export interface AIInstallationState {
  status: LocalModelStatus;
  running: boolean;
  progress: AIProvisioningProgress | null;
  error: string | null;
  errorCode: string | null;
}
type Dependencies = {check: typeof checkAIModelsStatus; provision: typeof provisionAllAIModels};

export function createAIModelInstallation(dependencies: Dependencies) {
  let state: AIInstallationState = {status: EMPTY_MODEL_STATUS, running: false, progress: null, error: null, errorCode: null};
  const listeners = new Set<() => void>();
  let pending: Promise<void> | null = null;
  let statusRequest = 0;
  const update = (patch: Partial<AIInstallationState>) => {
    state = {...state, ...patch};
    listeners.forEach(listener => listener());
  };
  const refresh = async () => {
    const request = ++statusRequest;
    const status = await dependencies.check();
    if (request === statusRequest) update({status, ...(allAIModelsReady(status) ? {error: null, errorCode: null} : {})});
    return status;
  };
  const start = (accessToken?: string) => {
    if (pending) return pending;
    update({running: true, progress: null, error: null, errorCode: null});
    pending = (async () => {
      try {
        const status = await dependencies.provision(progress => update({progress}), {accessToken});
        if (!allAIModelsReady(status)) throw new Error("L’installation n’a pas pu être vérifiée. Réessayez depuis les paramètres.");
        ++statusRequest;
        update({status});
      } catch (error) {
        const detail = error as {message?: unknown; code?: unknown};
        update({
          error: typeof detail?.message === "string" ? detail.message : "Le téléchargement a échoué. Vérifiez votre connexion et réessayez.",
          errorCode: typeof detail?.code === "string" ? detail.code : null,
        });
        // Keep partial successes visible after a network or authorization failure.
        try { await refresh(); } catch { /* The actionable installation error stays visible. */ }
      } finally { pending = null; update({running: false}); }
    })();
    return pending;
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {listeners.add(listener); return () => {listeners.delete(listener);};},
    refresh, start,
  };
}

export const aiModelInstallation = createAIModelInstallation({check: checkAIModelsStatus, provision: provisionAllAIModels});
export function useAIModelInstallation() {
  return useSyncExternalStore(aiModelInstallation.subscribe, aiModelInstallation.getSnapshot, aiModelInstallation.getSnapshot);
}
