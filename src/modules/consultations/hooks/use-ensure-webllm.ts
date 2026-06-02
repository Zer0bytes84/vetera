import { useEffect, useState } from "react";
import {
  getActiveModelId,
  getCurrentProgress,
  initializeWebLLM,
  isWebLLMReady,
  resetWebLLM,
  subscribeToProgress,
} from "@/services/webLLMService";

export type WebLLMState = {
  activeModelId: string | null;
  error: string | null;
  isLoading: boolean;
  isReady: boolean;
  progress: number; // 0..1
  progressText: string;
  ensure: () => Promise<void>;
  reset: () => void;
};

const PROGRESS_SNAPSHOT = getCurrentProgress();

const INITIAL_STATE = {
  activeModelId: getActiveModelId(),
  error: null as string | null,
  isLoading: false,
  isReady: isWebLLMReady(),
  progress: PROGRESS_SNAPSHOT.progress,
  progressText: PROGRESS_SNAPSHOT.text,
};

/**
 * useEnsureWebLLM — initialise le moteur WebLLM local à la demande,
 * expose la progression et permet un reset. Idempotent : plusieurs appels
 * à `ensure()` pendant un init déjà en cours sont no-op.
 */
export function useEnsureWebLLM(): WebLLMState {
  const [state, setState] = useState(INITIAL_STATE);

  useEffect(() => {
    const unsubscribe = subscribeToProgress((report) => {
      setState((previous) => ({
        ...previous,
        progress: report.progress,
        progressText: report.text,
      }));
    });
    return unsubscribe;
  }, []);

  const ensure = async () => {
    if (isWebLLMReady()) {
      setState((previous) => ({ ...previous, isReady: true, isLoading: false }));
      return;
    }
    setState((previous) => ({
      ...previous,
      error: null,
      isLoading: true,
    }));
    try {
      await initializeWebLLM(undefined, (report) => {
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
    }
  };

  const reset = () => {
    resetWebLLM();
    setState((previous) => ({
      ...previous,
      activeModelId: null,
      isLoading: false,
      isReady: false,
      progress: 0,
      progressText: "",
    }));
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
