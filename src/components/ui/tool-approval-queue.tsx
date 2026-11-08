// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: the list of what the assistant proposes and the vet decides, one by one or by selection. TuffUI's
 * queue is for developer permissions (risk groups, « once / this session / always » grants, shell and email payloads);
 * here a request is a change the assistant proposes (the reformulation of a rubric of the SOAP note), shown as « your
 * dictation » against « the proposed wording ». There is no grant that lasts: every decision is for that proposal only, and
 * the parent applies it (accepting keeps the wording, refusing returns to the vet's own words). Colours are our tokens,
 * text is French and never under 12 px; nothing technical (no tool or model names) is shown.
 */

import { Check, ChevronDown, ShieldCheck, Undo2, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/action-button";
import { Checkbox } from "@/components/ui/choice-controls";
import { RollingNumber } from "@/components/ui/rolling-number";
import { IconTile, Inset, Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { EmptyState } from "@/components/ui/tuff-controls";
import { EASE_OUT, exit as exitFast, instant } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

export type ApprovalDecision = "approved" | "denied";

export type ApprovalRequest = {
  id: string;
  /** What is proposed, in words: the rubric concerned. */
  title: string;
  /** A short line under the title. */
  detail?: string;
  /** Set by the parent once decided; the queue also tracks the decision it just took, for the undo window. */
  status?: "pending" | ApprovalDecision;
  /** The vet's own words. */
  before: string;
  /** The assistant's proposed wording. */
  after: string;
};

export type ToolApprovalQueueProps = {
  data: ApprovalRequest[];
  heading?: string;
  subtitle?: string;
  /** Called for one request (row actions) or several (selection bar). */
  onDecide?: (requests: ApprovalRequest[], decision: ApprovalDecision) => void;
  /** Takes a decision back, within `undoMs` of taking it here. */
  onUndo?: (request: ApprovalRequest) => void;
  undoMs?: number;
  className?: string;
};

// Height morphs on a damped spring; opacity leads on enter and exits faster.
const reveal = {
  height: { type: "spring", duration: 0.35, bounce: 0 },
  opacity: { duration: 0.2, ease: EASE_OUT },
} as const;

export function ToolApprovalQueue({
  data,
  heading = "Reformulations proposées",
  subtitle,
  onDecide,
  onUndo,
  undoMs = 5000,
  className,
}: ToolApprovalQueueProps) {
  const [undoable, setUndoable] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const rows = useRef<Map<string, HTMLDivElement>>(new Map());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Keyboard-driven changes (Entrée, Espace) and reduced motion skip the animation.
  const [viaKeys, setViaKeys] = useState(false);
  const reduce = useReducedMotion();
  const still = viaKeys || !!reduce;

  useEffect(() => {
    const pendingTimers = timers.current;
    return () => pendingTimers.forEach(clearTimeout);
  }, []);

  const pending = data.filter((r) => !r.status || r.status === "pending");
  const resolved = data.filter((r) => r.status && r.status !== "pending");
  const selectedIds = selected.filter((id) => pending.some((r) => r.id === id));
  const toggle = (id: string) =>
    setSelected(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  const decide = (requests: ApprovalRequest[], decision: ApprovalDecision) => {
    setUndoable((ids) => [...ids, ...requests.map((r) => r.id)]);
    for (const r of requests) {
      timers.current.set(
        r.id,
        setTimeout(() => setUndoable((ids) => ids.filter((x) => x !== r.id)), undoMs),
      );
    }
    setSelected(selectedIds.filter((id) => !requests.some((r) => r.id === id)));
    setAnnouncement(
      `${requests.length === 1 ? requests[0].title : `${requests.length} reformulations`} : ${decision === "approved" ? "acceptée" : "refusée"}`,
    );
    onDecide?.(requests, decision);
  };

  const undo = (r: ApprovalRequest) => {
    clearTimeout(timers.current.get(r.id));
    setUndoable((ids) => ids.filter((x) => x !== r.id));
    setAnnouncement(`${r.title} : de nouveau à examiner`);
    onUndo?.(r);
  };

  const bulk = pending.filter((r) => selectedIds.includes(r.id));

  const onRowKey = (e: KeyboardEvent, r: ApprovalRequest) => {
    const i = pending.findIndex((x) => x.id === r.id);
    const move = (to: number) => rows.current.get(pending[to]?.id)?.focus();
    if (e.key === "ArrowDown") move(Math.min(i + 1, pending.length - 1));
    else if (e.key === "ArrowUp") move(Math.max(i - 1, 0));
    else if (e.key === " ") toggle(r.id);
    else if (e.key === "Enter") setExpanded(expanded === r.id ? null : r.id);
    else return;
    setViaKeys(true);
    e.preventDefault();
  };

  return (
    <MotionConfig reducedMotion="user">
      <Shell aria-label={heading} className={cn("max-w-none", className)}>
        <ShellHeader
          icon={ShieldCheck}
          title={heading}
          subtitle={subtitle}
          aside={
            <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
              {pending.length ? (
                <>
                  <RollingNumber value={String(pending.length)} /> à examiner
                </>
              ) : (
                "Tout est examiné"
              )}
            </span>
          }
        />
        <Panel className="overflow-hidden border border-border">
          <AnimatePresence initial={false}>
            {bulk.length > 0 && (
              <motion.div
                key="bulk"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0, transition: still ? instant : exitFast }}
                transition={still ? instant : reveal}
                className="overflow-hidden"
              >
                <div className="m-1.5 mb-0 flex flex-wrap items-center gap-2 rounded-xl bg-brand/10 py-1.5 pr-1.5 pl-3 text-[0.8125rem]">
                  <span className="font-medium text-brand tabular-nums">
                    <RollingNumber value={String(bulk.length)} /> sélectionnée{bulk.length > 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected([])}
                    className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  >
                    Effacer
                  </button>
                  <Button className="ml-auto" onClick={() => decide(bulk, "denied")}>
                    Garder ma dictée
                  </Button>
                  <Button variant="primary" onClick={() => decide(bulk, "approved")}>
                    Accepter
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {pending.length === 0 && (
            <EmptyState compact icon={ShieldCheck} title="Rien à examiner" description="Les reformulations proposées apparaissent ici." />
          )}
          <div className={cn("p-1.5", pending.length === 0 && "hidden")}>
            <AnimatePresence initial={false}>
              {pending.map((r) => {
                const open = expanded === r.id;
                const checked = selectedIds.includes(r.id);
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0, transition: reduce ? instant : exitFast }}
                    transition={reduce ? instant : reveal}
                    className="overflow-hidden"
                  >
                    <div className={cn("rounded-xl transition-colors", (open || checked) && "bg-foreground/[0.035]")}>
                      <div
                        ref={(el) => {
                          if (el) rows.current.set(r.id, el);
                          else rows.current.delete(r.id);
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={open}
                        aria-keyshortcuts="Space Enter ArrowUp ArrowDown"
                        onClick={() => {
                          setViaKeys(false);
                          setExpanded(open ? null : r.id);
                        }}
                        onKeyDown={(e) => onRowKey(e, r)}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 hover:bg-foreground/[0.03]"
                      >
                        <Checkbox
                          tabIndex={-1}
                          checked={checked}
                          aria-label={`Sélectionner : ${r.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViaKeys(false);
                            toggle(r.id);
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{r.title}</span>
                          {r.detail && <span className="block truncate text-xs text-muted-foreground">{r.detail}</span>}
                        </span>
                        <ChevronDown
                          strokeWidth={2.5}
                          className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                            open && "rotate-180",
                          )}
                          aria-hidden="true"
                        />
                      </div>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0, transition: still ? instant : exitFast }}
                            transition={still ? instant : reveal}
                            className="overflow-hidden"
                          >
                            <div className="px-2.5 pb-2.5">
                              <div className="flex flex-col gap-1.5">
                                <Inset className="px-3.5 py-2.5 text-[0.8125rem]">
                                  <p className="mb-0.5 text-xs text-muted-foreground">Votre dictée</p>
                                  <p className="whitespace-pre-wrap">{r.before || "Vide"}</p>
                                </Inset>
                                <Inset className="bg-brand/10 px-3.5 py-2.5 text-[0.8125rem]">
                                  <p className="mb-0.5 text-xs text-brand">Formulation proposée</p>
                                  <p className="whitespace-pre-wrap">{r.after}</p>
                                </Inset>
                              </div>
                              <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2">
                                <Button onClick={() => decide([r], "denied")}>Garder ma dictée</Button>
                                <Button variant="primary" onClick={() => decide([r], "approved")}>
                                  Accepter la formulation
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </Panel>
        <AnimatePresence initial={false}>
          {resolved.length > 0 && (
            <motion.div
              key="resolved"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0, transition: reduce ? instant : exitFast }}
              transition={reduce ? instant : reveal}
              className="overflow-hidden"
            >
              <div className="px-2 pt-2.5 pb-1">
                <p className="px-1.5 pb-1 text-xs text-muted-foreground">Examinées · {resolved.length}</p>
                <ul>
                  <AnimatePresence initial={false}>
                    {resolved.map((r) => (
                      <ResolvedRow key={r.id} request={r} undoable={undoable.includes(r.id)} onUndo={undo} />
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </Shell>
    </MotionConfig>
  );
}

function ResolvedRow({
  request,
  undoable,
  onUndo,
}: {
  request: ApprovalRequest;
  undoable: boolean;
  onUndo: (request: ApprovalRequest) => void;
}) {
  const ok = request.status === "approved";
  const Icon = ok ? Check : X;
  return (
    <motion.li
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, transition: exitFast }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="overflow-hidden"
    >
      <div className="flex min-h-9 items-center gap-2.5 px-1.5 text-[0.8125rem]">
        <IconTile
          icon={Icon}
          className={cn("size-5 rounded-full", ok ? "bg-positive/15 text-positive" : "bg-foreground/[0.08] text-muted-foreground")}
        />
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          <span className="text-foreground">{request.title}</span>
          {" · "}
          {ok ? "formulation acceptée" : "votre dictée conservée"}
        </span>
        {undoable && (
          <Button icon={Undo2} iconWeight="bold" onClick={() => onUndo(request)} className="h-7 gap-1 px-2.5 text-xs">
            Annuler
          </Button>
        )}
      </div>
    </motion.li>
  );
}
