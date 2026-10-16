import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { isTauriRuntime } from "@/services/browser-store";
import { aiModelInstallation, useAIModelInstallation } from "../services/ai-model-installation";
import { allAIModelsReady, shouldShowAIOnboarding, setAIOnboardingDismissed, triggerOpenAIOnboarding, TOTAL_AI_MODELS_SIZE_LABEL } from "../services/ai-model-provisioning";

const TOAST_ID = "baitari-local-tools-installation";

/** Optional prompt after app setup/authentication; never replaces or covers the page. */
export function AIModelInstallPrompt() {
  const state = useAIModelInstallation();
  const offered = useRef(false);
  const wasRunning = useRef(false);
  const progressHidden = useRef(false);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let alive = true;
    void shouldShowAIOnboarding().then(show => {
      if (!alive || !show || offered.current || aiModelInstallation.getSnapshot().running) return;
      offered.current = true;
      toast.info("Vos outils IA locaux", {
        id: TOAST_ID, duration: 20_000,
        description: `Dictée, notes et recherche (${TOTAL_AI_MODELS_SIZE_LABEL}).`,
        action: {label: "Télécharger", onClick: () => { void aiModelInstallation.start(); }},
        cancel: {label: "Plus tard", onClick: setAIOnboardingDismissed},
      });
    }).catch(() => { /* Optional installation must never interrupt startup. */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (state.running) {
      if (!wasRunning.current) progressHidden.current = false;
      wasRunning.current = true;
      if (!progressHidden.current) toast.loading("Installation en arrière-plan", {
        id: TOAST_ID, duration: Infinity, closeButton: true,
        description: state.progress
          ? `${state.progress.stepMessage} ${state.progress.percentage} %`
          : "Préparation du téléchargement. Votre travail reste disponible.",
        action: {label: "Gérer", onClick: triggerOpenAIOnboarding},
        onDismiss: () => { progressHidden.current = true; },
      });
      return;
    }
    if (!wasRunning.current) return;
    wasRunning.current = false;
    if (state.error) {
      toast.error("Installation à reprendre", {
        id: TOAST_ID, duration: 20_000,
        description: state.errorCode === "access_required" ? "Autorisez l’accès dans les paramètres, ou importez vos fichiers." : state.error,
        action: state.errorCode === "access_required"
          ? {label: "Gérer l’accès", onClick: triggerOpenAIOnboarding}
          : {label: "Réessayer", onClick: () => { void aiModelInstallation.start(); }},
        cancel: state.errorCode === "access_required" ? undefined : {label: "Paramètres", onClick: triggerOpenAIOnboarding},
      });
    } else if (allAIModelsReady(state.status)) {
      toast.success("Vos outils IA sont prêts", {id: TOAST_ID, description: "Vous pouvez désormais les utiliser hors ligne.", duration: 6000});
    } else toast.dismiss(TOAST_ID);
  }, [state]);

  return null;
}
