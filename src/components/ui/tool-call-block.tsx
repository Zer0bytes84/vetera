// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: one step the assistant takes (reading a patient file, searching the records), as a folded row that
 * opens on its details. TuffUI draws tool names and JSON arguments in mono for developers; here the row says what was done
 * in words (`name`, `summary`), the details are label and value pairs and the result a sentence. Nothing technical is
 * shown: no model or tool names. Colours are our tokens, text is French and never under 12 px.
 */

import { Check, ChevronRight, Clock, Copy, LoaderCircle, RotateCcw, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { Button, IconButton } from "@/components/ui/action-button";
import { Inset, Panel, Shell } from "@/components/ui/surface";
import { EASE_OUT, exit as exitFast, instant, spring as morph } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

export type ToolCallStatus = "pending" | "running" | "success" | "error";

export type ToolCall = {
  id: string;
  /** What the assistant does, in words: « Recherche dans les dossiers ». */
  name: string;
  /** One line after the name: the query, the patient. */
  summary?: string;
  status: ToolCallStatus;
  /** Final duration; while running the block counts up on its own. */
  durationMs?: number;
  /** Label and value pairs shown when the row opens. */
  details?: { label: string; value: string }[];
  result?: string;
  error?: string;
};

export type ToolCallBlockProps = {
  data: ToolCall;
  defaultOpen?: boolean;
  onRetry?: (call: ToolCall) => void;
  className?: string;
};

const statuses = {
  pending: { label: "En attente", icon: Clock, className: "bg-foreground/[0.06] text-muted-foreground" },
  running: { label: "En cours", icon: LoaderCircle, className: "bg-brand/15 text-brand" },
  success: { label: "Terminé", icon: Check, className: "bg-positive/15 text-positive" },
  error: { label: "Échec", icon: X, className: "bg-negative/15 text-negative" },
} as const;

// Height morphs on a damped spring; opacity leads on enter and exits faster.
const reveal = { height: morph, opacity: { duration: 0.2, ease: EASE_OUT } } as const;

export function ToolCallBlock({ data, defaultOpen = false, onRetry, className }: ToolCallBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  // Toggling from the keyboard (detail === 0) or with reduced motion is instant.
  const [viaKeys, setViaKeys] = useState(false);
  const reduce = useReducedMotion();
  const still = viaKeys || !!reduce;
  const panelId = useId();
  const status = statuses[data.status];
  const Icon = status.icon;
  const running = data.status === "running";
  const hasBody = Boolean(data.details?.length || data.result || data.status === "error");

  const header = (
    <>
      <span className="relative flex size-6 shrink-0 items-center justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={data.status}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0, transition: exitFast }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className={cn("flex size-6 items-center justify-center rounded-full", status.className)}
          >
            <Icon
              strokeWidth={Icon === Clock ? 2 : 2.5}
              className={cn("size-3.5", running && "animate-spin motion-reduce:animate-none")}
              aria-hidden="true"
            />
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="shrink-0 text-[0.8125rem] font-medium">{data.name}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{data.summary}</span>
      <span className="sr-only">{status.label}</span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {running ? (
          <Elapsed key={data.id} />
        ) : data.durationMs !== undefined && data.status !== "pending" ? (
          formatMs(data.durationMs)
        ) : null}
      </span>
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <Shell className={cn("max-w-none overflow-hidden rounded-[1.125rem] p-1", className)}>
        {hasBody ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={(e) => {
              setViaKeys(e.detail === 0);
              setOpen((o) => !o);
            }}
            className="flex w-full items-center gap-2.5 rounded-[0.875rem] py-1.5 pr-2.5 pl-1.5 text-left text-sm transition-[background-color,scale] duration-150 ease-out hover:bg-foreground/[0.03] active:scale-[0.99]"
          >
            {header}
            <motion.span animate={{ rotate: open ? 90 : 0 }} transition={still ? instant : morph} className="flex">
              <ChevronRight strokeWidth={2.5} className="size-4 text-muted-foreground" aria-hidden="true" />
            </motion.span>
          </button>
        ) : (
          <div className="flex w-full items-center gap-2.5 py-1.5 pr-2.5 pl-1.5 text-left text-sm">{header}</div>
        )}
        <AnimatePresence initial={false}>
          {open && hasBody && (
            <motion.div
              id={panelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0, transition: still ? instant : exitFast }}
              transition={still ? instant : reveal}
              className="overflow-hidden"
            >
              <Panel className="mt-1 flex flex-col gap-3 rounded-[0.875rem] border border-border p-3">
                {data.details?.length ? (
                  <Section title="Détails" copy={data.details.map((d) => `${d.label} : ${d.value}`).join("\n")}>
                    <dl className="flex flex-col gap-1 text-[0.8125rem]">
                      {data.details.map((d) => (
                        <div key={d.label} className="flex gap-3">
                          <dt className="w-28 shrink-0 text-muted-foreground">{d.label}</dt>
                          <dd className="min-w-0 flex-1 break-words">{d.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </Section>
                ) : null}
                {data.status === "error" ? (
                  <div className="flex items-start gap-2 rounded-xl bg-negative/10 py-2 pr-2 pl-3 text-[0.8125rem] text-negative">
                    <X strokeWidth={2.5} className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    <p className="min-w-0 flex-1 text-xs leading-5 break-words">
                      {data.error ?? "L’opération n’a pas abouti."}
                    </p>
                    {onRetry && (
                      <Button
                        variant="danger"
                        icon={RotateCcw}
                        iconWeight="bold"
                        onClick={() => onRetry(data)}
                        className="h-7 gap-1 px-3 text-xs"
                      >
                        Réessayer
                      </Button>
                    )}
                  </div>
                ) : data.status === "success" && data.result ? (
                  <Section title="Résultat" copy={data.result}>
                    <p className="text-[0.8125rem] leading-5 whitespace-pre-wrap">{data.result}</p>
                  </Section>
                ) : null}
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
        <p role="status" aria-live="polite" className="sr-only">
          {`${data.name} : ${status.label}`}
        </p>
      </Shell>
    </MotionConfig>
  );
}

function Section({ title, copy, children }: { title: string; copy: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="pl-1 text-[0.8125rem] text-muted-foreground">{title}</span>
        <IconButton
          icon={copied ? Check : Copy}
          iconWeight={copied ? "bold" : "fill"}
          label={copied ? `${title} copié` : `Copier : ${title.toLowerCase()}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(copy);
            } catch {
              // The clipboard can be refused; the text stays on screen.
            }
            setCopied(true);
          }}
          className={cn("size-7", copied && "text-positive hover:text-positive")}
        />
      </div>
      <Inset className="px-3 py-2.5">{children}</Inset>
    </div>
  );
}

/** Counts up from mount; remounted (via key) each time a call starts running. */
function Elapsed() {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => setMs(performance.now() - start), 100);
    return () => clearInterval(timer);
  }, []);
  return <>{formatMs(ms)}</>;
}

function formatMs(ms: number) {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}
