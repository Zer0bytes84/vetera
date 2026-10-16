import { Check, ChevronDown, CircleNotch, Clock, XCircle } from "@/lib/icons";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Progress } from "@/components/ui/progress";
import type { LocalAiPhase } from "../hooks/use-local-consultation-ai";
import type { LocalAiProgress } from "../local-ai/worker-protocol";
import "./assistant-thinking.css";

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
  const steps = [
    {
      label: "Transcription",
      done: hasTranscript,
      active: busy && !preparing,
      detail: hasTranscript
        ? "Observations prêtes à relire"
        : busy && !preparing
          ? progress.message
          : "En attente de vos observations",
    },
    {
      label: "Vérification du patient",
      done: patientVerified,
      active: false,
      detail: patientVerified
        ? "Fiche et mentions vérifiées"
        : hasTranscript
          ? "Confirmez le patient dans la conversation"
          : "Après la dictée",
    },
    {
      label: "Préparation de la note",
      done: hasNote,
      active: preparing,
      detail: hasNote
        ? "Quatre sections vérifiées · à relire par vous"
        : preparing
          ? progress.message
          : "Après votre confirmation",
    },
  ];
  const summary = failed
    ? "Préparation interrompue"
    : hasNote
      ? "Note prête à relire"
      : busy
        ? progress.message
        : patientVerified
          ? "Patient vérifié"
          : hasTranscript
            ? "Vérification du patient"
            : "Les étapes de votre note";
  return (
    <Collapsible className="group/activity rounded-lg bg-muted/20">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Marker
          render={<span />}
          role="status"
          aria-live="polite"
          className="min-w-0 flex-1 text-xs"
        >
          <MarkerIcon>
            {failed ? (
              <XCircle />
            ) : busy ? (
              <CircleNotch className="animate-spin motion-reduce:animate-none" />
            ) : hasNote || patientVerified ? (
              <Check />
            ) : (
              <Clock />
            )}
          </MarkerIcon>
          <MarkerContent className={busy && !failed ? "assistant-thinking-text" : undefined}>
            {summary}
          </MarkerContent>
        </Marker>
        {(preparing || phase === "transcribing") &&
          typeof progress.characters === "number" && (
            <span
              aria-live="off"
              className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
            >
              {progress.characters.toLocaleString("fr-FR")} caractères
            </span>
          )}
        <ChevronDown
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground transition-transform group-has-[[data-panel-open]]/activity:rotate-180 motion-reduce:transition-none"
        />
        <span className="sr-only">
          Afficher ou masquer les étapes de préparation
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden">
        <ol
          className="flex flex-col gap-3 border-t px-3 py-3"
          aria-label="Étapes de préparation"
        >
          {steps.map(({ label, done, active, detail }) => (
            <li key={label} className="flex items-start gap-2.5 text-xs">
              <span
                aria-hidden
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted"
              >
                {done ? (
                  <Check className="size-3" />
                ) : active ? (
                  <CircleNotch className="size-3 animate-spin motion-reduce:animate-none" />
                ) : (
                  <span className="size-1 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span
                  className={
                    done || active ? "font-medium" : "text-muted-foreground"
                  }
                >
                  {label}
                </span>
                <span className="text-muted-foreground">{detail}</span>
                {active &&
                  preparing &&
                  typeof progress.characters === "number" && (
                    <span
                      aria-live="off"
                      className="tabular-nums text-muted-foreground"
                    >
                      {progress.characters.toLocaleString("fr-FR")} caractères
                      rédigés{progress.attempt === 2 ? " · nouvel essai" : ""}
                    </span>
                  )}
                {active &&
                  !preparing &&
                  typeof progress.progress === "number" && (
                    <Progress
                      value={progress.progress * 100}
                      aria-label="Chargement de la dictée"
                      className="h-1"
                    />
                  )}
              </div>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
