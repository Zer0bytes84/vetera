import { useState } from "react";
import { AgentStatus } from "@/components/ui/agent-status";
import type { LocalAiPhase } from "../hooks/use-local-consultation-ai";
import type { LocalAiProgress } from "../local-ai/worker-protocol";

interface Props {
  phase: LocalAiPhase;
  progress: LocalAiProgress;
  hasTranscript: boolean;
  patientVerified: boolean;
  hasNote: boolean;
  failed: boolean;
}

// This is an activity log of observable operations, not generated reasoning.
export function AssistantActivity({
  phase,
  progress,
  hasTranscript,
  patientVerified,
  hasNote,
  failed,
}: Props) {
  const busy = phase !== "idle";
  const preparing = phase === "loading-soap" || phase === "generating";
  const [startedAt] = useState(() => Date.now());
  // The steps already behind: the dictation, then the patient's file.
  const steps = [
    hasTranscript && { id: "transcription", label: "Dictée transcrite" },
    patientVerified && { id: "patient", label: "Fiche et mentions vérifiées" },
  ].filter((step): step is { id: string; label: string } => Boolean(step));
  const label = failed
    ? "Préparation interrompue"
    : hasNote
      ? "Note prête à relire"
      : preparing
        ? "Préparation de la note"
        : busy
          ? "Transcription de la dictée"
          : patientVerified
            ? "Patient vérifié"
            : "Les étapes de votre note";
  const detail =
    busy && !failed
      ? preparing && typeof progress.characters === "number"
        ? `${progress.characters.toLocaleString("fr-FR")} caractères rédigés${progress.attempt === 2 ? " · nouvel essai" : ""}`
        : progress.message
      : undefined;
  return (
    <AgentStatus
      data={{
        label,
        detail,
        startedAt,
        steps,
        status: failed ? "error" : hasNote ? "done" : busy ? "working" : "done",
      }}
    />
  );
}
