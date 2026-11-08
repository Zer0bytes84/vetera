// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: asks the vet to choose between options; no « agent » wording, no demo data.
 * Icons are lucide (`strokeWidth={2.5}` for what Phosphor drew bold); colours are our tokens (`brand`, `positive`,
 * `negative`, `warning` are our tones; never the TuffUI theme); text is French, never under 12 px; no demo data.
 */

import { Undo2, MessageCircleMore, Check, type LucideIcon, PencilLine } from "lucide-react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/action-button";
import { StatusPill } from "@/components/ui/status-pill";
import { IconTile, Shell } from "@/components/ui/surface";
import { enter, exit as leave } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

export type QuestionOption = {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
};

export type AgentQuestionData = {
  question: string;
  options: QuestionOption[];
  /** Allow several answers instead of one. */
  multiple?: boolean;
  /** Adds an « Autre chose… » card that turns into a text field. */
  allowOther?: boolean;
  /** The option the agent would pick, and why. */
  suggested?: { optionId: string; reason: string };
};

export type QuestionAnswer = {
  /** Ids of the picked options. */
  optionIds: string[];
  /** Free text from « Autre chose… ». */
  other?: string;
};

export type AgentQuestionProps = {
  data: AgentQuestionData;
  /** Controls the state; leave unset to let the card track it. */
  status?: "pending" | "answered" | "delegated";
  answer?: QuestionAnswer;
  onSubmit?: (answer: QuestionAnswer) => void;
  /** « Laisser l’assistant choisir »: the assistant goes with its suggestion. */
  onDelegate?: () => void;
  /** Called from the Undo pill shown for `undoMs` after answering. */
  onUndo?: () => void;
  undoMs?: number;
  /** Controlled selection for multiple-choice questions. */
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  /** Name shown above the question: « Assistant IA », never a model name. */
  agent?: string;
  className?: string;
};

// Cards morph into the summary on screen: a critically damped spring.
const morph = { type: "spring", duration: 0.35, bounce: 0 } as const;

export function AgentQuestion({
  data,
  status: statusProp,
  answer: answerProp,
  onSubmit,
  onDelegate,
  onUndo,
  undoMs = 4000,
  selected: selectedProp,
  onSelectedChange,
  agent = "Assistant IA",
  className,
}: AgentQuestionProps) {
  const [own, setOwn] = useState<{
    status: "pending" | "answered" | "delegated";
    answer?: QuestionAnswer;
  }>({
    status: "pending",
  });
  const [ownSelected, setOwnSelected] = useState<string[]>([]);
  const [writing, setWriting] = useState(false);
  const [other, setOther] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  const id = useId();

  const status = statusProp ?? own.status;
  const answer = answerProp ?? own.answer;
  const selected = selectedProp ?? ownSelected;
  const suggested = data.options.find((o) => o.id === data.suggested?.optionId);

  const setSelected = (ids: string[]) => {
    setOwnSelected(ids);
    onSelectedChange?.(ids);
  };
  const submit = (a: QuestionAnswer) => {
    setOwn({ status: "answered", answer: a });
    onSubmit?.(a);
  };
  const pick = (optionId: string) => {
    if (!data.multiple) return submit({ optionIds: [optionId] });
    setSelected(
      selected.includes(optionId)
        ? selected.filter((x) => x !== optionId)
        : [...selected, optionId],
    );
  };
  const undo = () => {
    setOwn({ status: "pending" });
    setSelected([]);
    setWriting(false);
    onUndo?.();
  };

  // Roving focus: arrows move between cards, following the grid's column count.
  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const cards = [...(grid.current?.querySelectorAll<HTMLElement>("[data-card]") ?? [])];
    const i = cards.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const cols = getComputedStyle(grid.current!).gridTemplateColumns.split(" ").length;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (!step) return;
    e.preventDefault();
    cards[Math.min(Math.max(i + step, 0), cards.length - 1)]?.focus();
  };

  const count = selected.length + (data.multiple && other.trim() ? 1 : 0);
  const chosen = data.options.filter((o) => answer?.optionIds.includes(o.id));

  return (
    <MotionConfig reducedMotion="user">
      <Shell aria-labelledby={`${id}-q`} className={cn("max-w-xl", className)}>
        <div className="flex items-center gap-3 pt-1.5 pr-2 pb-3 pl-1.5">
          <IconTile icon={MessageCircleMore} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Question de l’{agent}</p>
            <h3
              id={`${id}-q`}
              className="mt-0.5 text-[1rem] font-medium text-pretty"
            >
              {data.question}
            </h3>
          </div>
        </div>
        {status === "pending" && data.suggested && suggested && (
          <p className="-mt-1 flex items-start gap-1.5 px-3.5 pb-3 text-[0.8125rem] text-muted-foreground">
            <span>
              Suggestion : <span className="text-foreground">{suggested.label}</span> —{" "}
              {data.suggested.reason}
            </span>
          </p>
        )}
        <LayoutGroup id={id}>
          {status === "pending" ? (
            <div
              ref={grid}
              role={data.multiple ? "group" : "radiogroup"}
              aria-labelledby={`${id}-q`}
              onKeyDown={onGridKey}
              className="grid grid-cols-1 gap-1.5 @md:grid-cols-2"
            >
              {data.options.map((o, i) => {
                const on = selected.includes(o.id);
                return (
                  <Card
                    key={o.id}
                    option={o}
                    role={data.multiple ? "checkbox" : "radio"}
                    checked={on}
                    tabIndex={i === 0 ? 0 : -1}
                    suggested={o.id === data.suggested?.optionId}
                    onClick={() => pick(o.id)}
                  />
                );
              })}
              {data.allowOther &&
                (writing ? (
                  <motion.form
                    layout
                    transition={morph}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!data.multiple && other.trim())
                        submit({ optionIds: [], other: other.trim() });
                    }}
                    className="flex items-center gap-2 rounded-2xl bg-[var(--card-inset)] p-2 @md:col-span-2"
                  >
                    <input
                      autoFocus
                      value={other}
                      onChange={(e) => setOther(e.target.value)}
                      onKeyDown={(e) => e.key === "Escape" && setWriting(false)}
                      placeholder="Dites à l’assistant ce que vous souhaitez"
                      aria-label="Votre réponse"
                      className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
                    />
                    {!data.multiple && (
                      <Button type="submit" variant="primary" disabled={!other.trim()}>
                        Répondre
                      </Button>
                    )}
                  </motion.form>
                ) : (
                  <button
                    type="button"
                    data-card
                    tabIndex={-1}
                    onClick={() => setWriting(true)}
                    className="flex min-h-16 items-center gap-3 rounded-2xl bg-[var(--card-inset)]/50 p-3.5 text-left text-sm text-muted-foreground transition-[color,background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[var(--card-inset)] hover:text-foreground active:scale-[0.98]"
                  >
                    <PencilLine
                     
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    Autre chose…
                  </button>
                ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {status === "delegated" ? (
                <p className="rounded-2xl bg-[var(--card-inset)] p-3.5 text-sm">
                  Laissé à l’{agent}
                  {suggested && (
                    <span className="text-muted-foreground">
                      {" "}
                      — retenu : {suggested.label}
                    </span>
                  )}
                </p>
              ) : (
                <>
                  {chosen.map((o) => (
                    <Card
                      key={o.id}
                      option={o}
                      role="radio"
                      checked
                      readOnly
                      suggested={false}
                    />
                  ))}
                  {answer?.other && (
                    <p className="rounded-2xl bg-[var(--card-inset)] p-3.5 text-sm">
                      “{answer.other}”
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </LayoutGroup>
        <div className="flex min-h-12 items-center gap-3 px-2 pt-1.5 text-[0.8125rem]">
          {status === "pending" ? (
            <>
              {onDelegate && (
                <Button
                  variant="quiet"
                  onClick={() => {
                    setOwn({ status: "delegated" });
                    onDelegate();
                  }}
                  className="-ml-1 px-2.5 font-normal"
                >
                  Laisser l’assistant choisir
                </Button>
              )}
              <AnimatePresence>
                {data.multiple && count > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1, transition: enter }}
                    exit={{ opacity: 0, scale: 0.95, transition: leave }}
                    className="ml-auto origin-right"
                  >
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() =>
                        submit({ optionIds: selected, other: other.trim() || undefined })
                      }
                    >
                      Envoyer {count} {count === 1 ? "choix" : "choix"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <Settled status={status} undoMs={undoMs} onUndo={undo} />
          )}
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {status === "answered"
            ? "Réponse envoyée"
            : status === "delegated"
              ? "Laissé à l’assistant"
              : ""}
        </p>
      </Shell>
    </MotionConfig>
  );
}

function Card({
  option,
  checked,
  suggested,
  readOnly,
  role,
  ...props
}: {
  option: QuestionOption;
  checked: boolean;
  suggested: boolean;
  readOnly?: boolean;
  role: "radio" | "checkbox";
} & Omit<React.ComponentProps<"button">, "children" | "role">) {
  const Icon = option.icon;
  const content = (
    <>
      {Icon && (
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl",
            checked
              ? "bg-brand text-white"
              : "bg-foreground/[0.05] text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium">
          {option.label}
          {suggested && (
            <StatusPill tone="brand" size="sm">
              Suggéré
            </StatusPill>
          )}
        </span>
        {option.description && (
          <span className="mt-0.5 block text-[0.8125rem] text-muted-foreground">
            {option.description}
          </span>
        )}
      </span>
      {checked && (
        <Check
          strokeWidth={2.5}
          className="mt-0.5 size-4 shrink-0 text-brand"
          aria-label="Choisi"
        />
      )}
    </>
  );
  const base = cn(
    "flex min-h-16 items-start gap-3 rounded-2xl p-3.5 text-left",
    checked ? "bg-brand/10" : "bg-[var(--card-inset)]",
  );
  return (
    <motion.div layoutId={`card-${option.id}`} transition={morph}>
      {readOnly ? (
        <div className={base}>{content}</div>
      ) : (
        <button
          type="button"
          data-card
          role={role}
          aria-checked={checked}
          className={cn(
            base,
            "w-full transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-raised/60 active:scale-[0.98]",
            checked && "hover:bg-brand/15",
          )}
          {...props}
        >
          {content}
        </button>
      )}
    </motion.div>
  );
}

/** Answered or delegated: a short window to take it back. */
function Settled({
  status,
  undoMs,
  onUndo,
}: {
  status: "answered" | "delegated";
  undoMs: number;
  onUndo: () => void;
}) {
  const [undoable, setUndoable] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setUndoable(false), undoMs);
    return () => clearTimeout(timer);
  }, [undoMs]);
  return (
    <>
      <span className="flex items-center gap-1.5 px-1.5 text-muted-foreground">
        <Check strokeWidth={2.5} className="size-3.5 text-positive" aria-hidden="true" />
        {status === "answered" ? "Réponse envoyée" : "L’assistant choisira"}
      </span>
      <AnimatePresence>
        {undoable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: enter }}
            exit={{ opacity: 0, transition: leave }}
            className="ml-auto"
          >
            <Button
              icon={Undo2}
              iconWeight="bold"
              onClick={onUndo}
              className="gap-1 px-3 text-xs"
            >
              Annuler
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
