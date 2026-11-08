// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: the live state of the assistant (listening, preparing the note), timer in French.
 * Icons are lucide (`strokeWidth={2.5}` for what Phosphor drew bold); colours are our tokens (`brand`, `positive`,
 * `negative`, `warning` are our tones; never the TuffUI theme); text is French, never under 12 px; no demo data.
 */

import { Check, Square, CircleStop, TriangleAlert } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/action-button";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Panel, Shell } from "@/components/ui/surface";
import { EASE_OUT } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

export type AgentStatusStep = {
  id: string;
  label: string;
  /** Milliseconds the step took. */
  durationMs?: number;
};

export type AgentStatusState = "working" | "done" | "stopped" | "error";

export type AgentStatusData = {
  /** What the assistant is doing right now, e.g. « Écoute en cours ». */
  label: string;
  /** A changing detail under the label. */
  detail?: string;
  /** When the run started (ms since epoch); drives the elapsed timer. */
  startedAt: number;
  /** Finished steps, oldest first. The last few show above the current one. */
  steps?: AgentStatusStep[];
  status?: AgentStatusState;
};

export type AgentStatusProps = {
  data: AgentStatusData;
  /** Shows a « Arrêter » button while working. */
  onStop?: () => void;
  /** Label of that button; « Annuler » while the microphone is still being prepared. */
  stopLabel?: string;
  /** Replaces the three dots while working: the microphone level, for the dictation. */
  meter?: ReactNode;
  /** How many finished steps to show; 0 hides them. */
  maxSteps?: number;
  className?: string;
};

// Strong ease-out for things entering; exits are quicker than entrances.
const enter = { duration: 0.24, ease: EASE_OUT };
const leave = { duration: 0.15, ease: EASE_OUT };
// Finished steps shift up as new ones land: a critically damped spring.
const shift = { type: "spring", duration: 0.35, bounce: 0 } as const;

const finalLabel: Record<Exclude<AgentStatusState, "working">, string> = {
  done: "Terminé",
  stopped: "Arrêté",
  error: "Échec",
};

export const formatElapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
};

function useElapsed(startedAt: number, running: boolean) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    // Tick once now (also freezes the time when the run ends), then every second.
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = running ? setInterval(tick, 1000) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [startedAt, running]);
  return now - startedAt;
}

function Indicator({ status }: { status: AgentStatusState }) {
  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center">
      <AnimatePresence initial={false} mode="popLayout">
        {status === "working" ? (
          <motion.span
            key="working"
            aria-hidden="true"
            exit={{ scale: 0.9, opacity: 0, transition: leave }}
            className="flex gap-[3px]"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-[5px] rounded-full bg-brand"
                animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.16,
                }}
              />
            ))}
          </motion.span>
        ) : (
          <motion.span
            key={status}
            aria-hidden="true"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={enter}
            className={cn(
              "flex size-5 items-center justify-center rounded-full",
              status === "done" && "bg-positive/15 text-positive",
              status === "stopped" && "bg-foreground/[0.08] text-muted-foreground",
              status === "error" && "bg-negative/15 text-negative",
            )}
          >
            {status === "done" && (
              <Check className="size-3" strokeWidth={3} />
            )}
            {status === "stopped" && (
              <Square className="size-2.5" fill="currentColor" />
            )}
            {status === "error" && <TriangleAlert className="size-3" />}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function AgentStatus({
  data,
  onStop,
  stopLabel = "Arrêter",
  meter,
  maxSteps = 3,
  className,
}: AgentStatusProps) {
  const { label, detail, startedAt, steps = [], status = "working" } = data;
  const working = status === "working";
  const elapsed = useElapsed(startedAt, working);
  const recent = maxSteps > 0 ? steps.slice(-maxSteps) : [];

  return (
    <MotionConfig reducedMotion="user">
      <Shell
        aria-label="État de l’assistant"
        aria-busy={working}
        className={cn("max-w-none", className)}
      >
        {recent.length > 0 && (
          <ol aria-label="Étapes terminées" className="px-2 pt-1.5 pb-1">
            <AnimatePresence initial={false}>
              {recent.map((step) => (
                <motion.li
                  key={step.id}
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: enter }}
                  exit={{ opacity: 0, y: -10, transition: leave }}
                  transition={shift}
                  className="flex items-center gap-3 px-1.5 py-1.5 text-[0.8125rem] text-muted-foreground"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <Check
                      strokeWidth={2.5}
                      className="size-3.5 text-positive"
                      aria-label="Terminée"
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{step.label}</span>
                  {step.durationMs !== undefined && (
                    <span className="font-mono text-xs tabular-nums">
                      {formatElapsed(step.durationMs)}
                    </span>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
        <Panel className="flex items-center gap-3 py-2.5 pr-2.5 pl-3.5">
          {working && meter ? <span className="flex shrink-0 items-center">{meter}</span> : <Indicator status={status} />}
          <div className="min-w-0 flex-1">
            <div className="relative h-5 overflow-hidden text-sm font-medium">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.p
                  key={working ? label : status}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1, transition: enter }}
                  exit={{ y: "-100%", opacity: 0, transition: leave }}
                  className="truncate"
                >
                  {working ? label : `${finalLabel[status]} · ${label}`}
                </motion.p>
              </AnimatePresence>
            </div>
            {detail && working && (
              <div className="relative h-[1.125rem] overflow-hidden">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.p
                    key={detail}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0, transition: enter }}
                    exit={{ opacity: 0, x: -6, transition: leave }}
                    className="truncate text-xs text-muted-foreground"
                  >
                    {detail}
                  </motion.p>
                </AnimatePresence>
              </div>
            )}
          </div>
          <time
            dateTime={`PT${Math.floor(elapsed / 1000)}S`}
            className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums"
          >
            <RollingNumber value={formatElapsed(elapsed)} />
          </time>
          {working && onStop && (
            <Button
              icon={CircleStop}
              onClick={onStop}
              aria-label={`${stopLabel} : ${label}`}
              className="px-3"
            >
              {stopLabel}
            </Button>
          )}
        </Panel>
        <p role="status" aria-live="polite" className="sr-only">
          {working ? label : `${finalLabel[status]}: ${label}`}
        </p>
      </Shell>
    </MotionConfig>
  );
}
