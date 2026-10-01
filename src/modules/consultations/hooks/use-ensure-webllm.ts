import { useEffect, useState } from "react";
import {
  getActiveModelId,
  getCurrentProgress,
  initializeWebLLM,
  isWebLLMReady,
  resetWebLLM,
  subscribeToProgress,
} from "@/services/webLLMService";
import { resolveModelId } from "@/lib/ai-models";

export type WebLLMState = {
  activeModelId: string | null;
  error: string | null;
  isLoading: boolean;
  isReady: boolean;
  progress: number; // 0..1
  progressText: string;
  ensure: (modelId?: string) => Promise<void>;
  reset: () => void;
};

const getInitialState = () => {
  const report = getCurrentProgress();
  return {
    activeModelId: getActiveModelId(),
    error: report.status === "error" ? report.text : null,
    isLoading: report.status === "loading",
    isReady: isWebLLMReady(),
    progress: report.progress,
    progressText: report.text,
  };
};

/**
 * useEnsureWebLLM — initialise le moteur WebLLM local à la demande,
 * expose la progression et permet un reset. Idempotent : plusieurs appels
 * à `ensure()` pendant un init déjà en cours sont no-op.
 */
export function useEnsureWebLLM(): WebLLMState {
  const [state, setState] = useState(getInitialState);

  useEffect(() => {
    const unsubscribe = subscribeToProgress((report) => {
      setState((previous) => ({
        ...previous,
        activeModelId: getActiveModelId(),
        error: report.status === "error" ? report.text : null,
        isLoading: report.status === "loading",
        isReady: report.status === "ready",
        progress: report.progress,
        progressText: report.text,
      }));
    });
    return unsubscribe;
  }, []);

  const ensure = async (requestedModelId?: string) => {
    const targetModelId = resolveModelId(requestedModelId);
    if (isWebLLMReady() && getActiveModelId() === targetModelId) {
      setState((previous) => ({
        ...previous,
        isReady: true,
        isLoading: false,
      }));
      return;
    }
    setState((previous) => ({
      ...previous,
      error: null,
      isLoading: true,
    }));
    try {
      await initializeWebLLM(targetModelId, (report) => {
        setState((previous) => ({
          ...previous,
          progress: report.progress,
          progressText: report.text,
        }));
      });
      setState((previous) => ({
        ...previous,
        activeModelId: getActiveModelId(),
        isLoading: false,
        isReady: true,
        progress: 1,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "WebLLM load failed";
      setState((previous) => ({
        ...previous,
        error: message,
        isLoading: false,
      }));
      throw err;
    }
  };

  const reset = () => {
    // The service broadcasts idle only once GPU resources have been released.
    void resetWebLLM();
  };

  return {
    activeModelId: state.activeModelId,
    error: state.error,
    isLoading: state.isLoading,
    isReady: state.isReady,
    progress: state.progress,
    progressText: state.progressText,
    ensure,
    reset,
  };
}
