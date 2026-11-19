// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: the avatar is the app's mascot (never a generic « AI » glyph); `bubble` puts the text in a bubble (TuffUI draws the assistant as free text and only the user in a bubble); no sources chip (nothing leaves the machine, so no links), copy and regenerate can be turned off, the author is « Assistant IA ».
 * Icons are lucide (`strokeWidth={2.5}` for what Phosphor drew bold); colours are our tokens (`brand`, `positive`,
 * `negative`, `warning` are our tones; never the TuffUI theme); text is French, never under 12 px; no demo data.
 */

import {
  RotateCcw,
  Brain,
  ChevronRight,
  Check,
  Copy,
  CircleAlert,
} from "lucide-react";
import { Mascot } from "@/components/mascot";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Fragment, useEffect, useState } from "react";
import { Button, IconButton } from "@/components/ui/action-button";
import { EASE_OUT } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

export interface StreamingMessageData {
  content: string;
  error?: string;
  reasoning?: { text: string; durationMs?: number; streaming?: boolean };
  status: "streaming" | "done" | "error";
}

export interface StreamingMessageProps {
  /** The message in its bubble (rounded, tinted, the corner at the author's side squared), as the vet's bubble is on the other side. */
  bubble?: boolean;
  className?: string;
  data: StreamingMessageData;
  /** Shown in the header: « Assistant IA », never a model name. */
  model?: string;
  onCopy?: (content: string) => void;
  onRetry?: () => void;
  /** Copy and regenerate under a finished message; off for the assistant's fixed prompts. */
  showActions?: boolean;
  /** Hide the avatar + model row when a surrounding thread already shows the author. */
  showHeader?: boolean;
}

// Strong ease-out for things entering; exits are quicker than entrances.
const enter = { duration: 0.22, ease: EASE_OUT };
const leave = { duration: 0.15, ease: EASE_OUT };
const fold = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto", transition: enter },
  exit: { opacity: 0, height: 0, transition: leave },
};

export function StreamingMessage({
  data,
  model = "Assistant IA",
  showHeader = true,
  bubble = false,
  showActions = true,
  onCopy,
  onRetry,
  className,
}: StreamingMessageProps) {
  const { content, status, reasoning, error } = data;
  const streaming = status === "streaming";
  // Words present on first render (SSR, paused thumbnails) appear without animating in.
  const [settled] = useState(() => countWords(content));

  return (
    <MotionConfig reducedMotion="user">
      <article
        aria-busy={streaming}
        aria-label={`Message de ${model}`}
        className={cn("w-full max-w-xl text-sm", className)}
      >
        {showHeader && (
          <header className="mb-2 flex items-center gap-2">
            <Mascot className="shrink-0" size={28} />
            <span className="font-medium">{model}</span>
            {streaming && (
              <span className="text-[0.8125rem] text-muted-foreground">
                Rédaction en cours…
              </span>
            )}
          </header>
        )}
        <div className={showHeader ? "pl-8" : undefined}>
          {reasoning && <Reasoning {...reasoning} />}
          {(content || !reasoning?.streaming) && (
            <div
              className={cn(
                bubble &&
                  "w-fit max-w-full rounded-2xl rounded-tl-md bg-[var(--card-band)] px-3.5 py-2"
              )}
            >
              <Content settled={settled} streaming={streaming} text={content} />
            </div>
          )}
          <AnimatePresence initial={false}>
            {status === "error" && (
              <motion.div role="alert" {...fold} className="overflow-hidden">
                <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-negative/10 py-2 pr-2 pl-3.5">
                  <CircleAlert
                    aria-hidden="true"
                    className="size-4 shrink-0 text-negative"
                  />
                  <p className="flex-1 text-[0.8125rem]">
                    <span className="font-medium text-negative">
                      Réponse interrompue.{" "}
                    </span>
                    <span className="text-muted-foreground">
                      {error ?? "Une erreur est survenue."}
                    </span>
                  </p>
                  {onRetry && (
                    <Button
                      className="h-7 px-3 text-xs"
                      icon={RotateCcw}
                      iconWeight="bold"
                      onClick={onRetry}
                    >
                      Réessayer
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {showActions && status === "done" && (
              <motion.div
                animate={{ opacity: 1, y: 0, transition: enter }}
                className="mt-2 -ml-2 flex items-center gap-0.5"
                exit={{ opacity: 0, transition: leave }}
                initial={{ opacity: 0, y: -4 }}
              >
                <CopyAction content={content} onCopy={onCopy} />
                {onRetry && (
                  <IconButton
                    className="size-7"
                    icon={RotateCcw}
                    iconWeight="bold"
                    label="Régénérer la réponse"
                    onClick={onRetry}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p aria-live="polite" className="sr-only" role="status">
          {status === "done"
            ? "Réponse terminée"
            : status === "error"
              ? "Réponse en échec"
              : ""}
        </p>
      </article>
    </MotionConfig>
  );
}

function Reasoning({
  text,
  durationMs,
  streaming,
}: NonNullable<StreamingMessageData["reasoning"]>) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? Boolean(streaming);
  const seconds = Math.max(1, Math.round((durationMs ?? 0) / 1000));

  return (
    <div className="mb-3 rounded-2xl bg-foreground/[0.04]">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-[0.8125rem] text-muted-foreground transition-[color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-foreground active:scale-[0.99]"
        onClick={() => setUserOpen(!open)}
        type="button"
      >
        <Brain aria-hidden="true" className="size-3.5" />
        {streaming ? (
          <motion.span
            animate={{ backgroundPosition: "-100% 0" }}
            className="bg-[length:200%_100%] bg-[linear-gradient(90deg,var(--muted-foreground)_35%,var(--foreground)_50%,var(--muted-foreground)_65%)] bg-clip-text text-transparent"
            initial={{ backgroundPosition: "100% 0" }}
            transition={{
              duration: 1.6,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          >
            Réflexion…
          </motion.span>
        ) : (
          <span>
            Réflexion de <span className="tabular-nums">{seconds} s</span>
          </span>
        )}
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          className="ml-auto inline-flex"
          transition={{ duration: 0.2, ease: [0.77, 0, 0.175, 1] }}
        >
          <ChevronRight
            aria-hidden="true"
            className="size-3.5"
            strokeWidth={2.5}
          />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div {...fold} className="overflow-hidden">
            <p className="px-3.5 pb-3 text-[0.8125rem] text-muted-foreground leading-6">
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Segment {
  kind: "text" | "code" | "bold";
  text: string;
}

// Unclosed `code` or **bold** at the tail (mid-stream) already renders styled,
// so markdown markers never flash on screen.
function parseInline(paragraph: string): Segment[] {
  return paragraph
    .split(/(`[^`]*(?:`|$)|\*\*[^*]*(?:\*\*|$))/)
    .filter((part) => part && part !== "`" && part !== "**")
    .map((part) =>
      part.startsWith("`")
        ? { text: part.replace(/^`|`$/g, ""), kind: "code" }
        : part.startsWith("**")
          ? { text: part.replace(/^\*\*|\*\*$/g, ""), kind: "bold" }
          : { text: part, kind: "text" }
    );
}

const tokenize = (segment: string) => segment.match(/\S+\s*|\s+/g) ?? [];

function countWords(text: string) {
  return text
    .split(/\n{2,}/)
    .flatMap(parseInline)
    .reduce((sum, segment) => sum + tokenize(segment.text).length, 0);
}

/** Numerote les mots au fil du rendu. Hors du composant : le compilateur React ne traduit pas `i++` sur une variable capturée. */
function counter(): () => number {
  let value = 0;
  return () => value++;
}

function Content({
  text,
  streaming,
  settled,
}: {
  text: string;
  streaming: boolean;
  settled: number;
}) {
  const paragraphs = text.split(/\n{2,}/);
  const nextIndex = counter();

  return (
    <div className="flex flex-col gap-3 text-pretty leading-6">
      {paragraphs.map((paragraph, p) => (
        <p key={p}>
          {parseInline(paragraph).map((segment, s) => {
            const words = tokenize(segment.text);
            const nodes = words.map((word) => {
              const i = nextIndex();
              return i < settled ? (
                <Fragment key={i}>{word}</Fragment>
              ) : (
                <motion.span
                  animate={{ opacity: 1 }}
                  initial={{ opacity: 0 }}
                  key={i}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                >
                  {word}
                </motion.span>
              );
            });
            if (segment.kind === "code") {
              return (
                <code
                  className="rounded-md bg-foreground/[0.07] px-1 py-px font-mono text-[0.75rem]"
                  key={s}
                >
                  {nodes}
                </code>
              );
            }
            if (segment.kind === "bold") {
              return (
                <strong className="font-semibold" key={s}>
                  {nodes}
                </strong>
              );
            }
            return <Fragment key={s}>{nodes}</Fragment>;
          })}
          {streaming && p === paragraphs.length - 1 && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              aria-hidden="true"
              className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] rounded-full bg-brand"
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
          )}
        </p>
      ))}
    </div>
  );
}

function CopyAction({
  content,
  onCopy,
}: {
  content: string;
  onCopy?: (content: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <IconButton
      className={cn("size-7", copied && "text-positive hover:text-positive")}
      icon={copied ? Check : Copy}
      iconWeight={copied ? "bold" : "fill"}
      label={copied ? "Copié" : "Copier le message"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(content);
        } catch {}
        setCopied(true);
        onCopy?.(content);
      }}
    />
  );
}
