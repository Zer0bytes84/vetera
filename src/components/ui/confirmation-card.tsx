// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: the card that asks the vet to confirm before anything is written. TuffUI's is an order summary
 * (prices, quantities, fees, a total, an undo countdown); here the lines are the rubrics of the SOAP note, there is no
 * amount and no total, and nothing is written until « Valider » is pressed: the parent saves on `onConfirm` and not
 * before. `blocked` says why validating is not yet possible (proposals still to review). Colours are our tokens, text is
 * French and never under 12 px; no demo data.
 */

import {
  BadgeCheck,
  Check,
  CircleCheck,
  Minus,
  TriangleAlert,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Button } from "@/components/ui/action-button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  IconTile,
  Inset,
  Panel,
  Shell,
  ShellHeader,
} from "@/components/ui/surface";
import { enter, exit, spring } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

export interface ConfirmationItem {
  /** A short line under the label: what it holds. */
  detail?: string;
  /** Filled in: shown with a check; empty rubrics show a dash. */
  filled?: boolean;
  id: string;
  label: string;
}

export type ConfirmationStatus = "review" | "confirming" | "done";

export interface ConfirmationCardProps {
  /** Why confirming is not yet possible; disables the button and says so. */
  blocked?: string;
  cancelLabel?: string;
  className?: string;
  /** One line instead of the list of items, for a card kept at the foot of a scrolling panel. */
  compact?: boolean;
  confirmingLabel?: string;
  confirmLabel?: string;
  data: {
    title: string;
    subtitle?: string;
    items: ConfirmationItem[];
    warnings?: string[];
    /** Shown once done, e.g. the record it was saved in. */
    reference?: string;
    /** Shown once done, e.g. « Aujourd’hui, 14 h 32 ». */
    doneAt?: string;
  };
  doneLabel?: string;
  editLabel?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  onEdit?: () => void;
  status?: ConfirmationStatus;
}

export function ConfirmationCard({
  data,
  status = "review",
  onConfirm,
  onEdit,
  onCancel,
  confirmLabel = "Valider",
  confirmingLabel = "Enregistrement…",
  doneLabel = "Enregistré",
  editLabel = "Modifier",
  cancelLabel = "Annuler",
  blocked,
  compact = false,
  className,
}: ConfirmationCardProps) {
  return (
    <MotionConfig reducedMotion="user">
      <Shell aria-label={data.title} className={cn("max-w-none", className)}>
        <AnimatePresence initial={false} mode="popLayout">
          {status === "done" ? (
            <Done data={data} key="done" label={doneLabel} />
          ) : (
            <motion.div exit={{ opacity: 0, transition: exit }} key="review">
              <ShellHeader
                icon={BadgeCheck}
                subtitle={data.subtitle}
                title={data.title}
              />
              <Panel className="border border-border">
                {compact ? (
                  <p className="px-4 pt-3 text-[0.8125rem] text-muted-foreground">
                    {data.items.filter((i) => i.filled).length} rubrique
                    {data.items.filter((i) => i.filled).length > 1 ? "s" : ""}{" "}
                    renseignée
                    {data.items.filter((i) => i.filled).length > 1 ? "s" : ""}{" "}
                    sur {data.items.length}
                  </p>
                ) : (
                  <ul className="px-2 pt-2">
                    {data.items.map((item) => (
                      <motion.li
                        animate={{
                          opacity: 1,
                          height: "auto",
                          transition: spring,
                        }}
                        className="overflow-hidden"
                        initial={{ opacity: 0, height: 0 }}
                        key={item.id}
                      >
                        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                          <IconTile
                            className={cn(
                              "size-6 rounded-full",
                              item.filled
                                ? "bg-positive/15 text-positive"
                                : "bg-foreground/[0.06] text-muted-foreground"
                            )}
                            icon={item.filled ? Check : Minus}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{item.label}</p>
                            {item.detail && (
                              <p className="truncate text-muted-foreground text-xs">
                                {item.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                )}
                {data.warnings?.length ? (
                  <div className="flex flex-col gap-1.5 px-2 py-2">
                    {data.warnings.map((w) => (
                      <Inset
                        className="flex items-start gap-2 bg-warning/10 px-3 py-2 text-[0.8125rem] text-warning"
                        key={w}
                      >
                        <TriangleAlert
                          aria-hidden="true"
                          className="mt-0.5 size-3.5 shrink-0"
                        />
                        <span className="whitespace-pre-line">
                          <span className="sr-only">Attention : </span>
                          {w}
                        </span>
                      </Inset>
                    ))}
                  </div>
                ) : null}
                {blocked ? (
                  <p
                    className="px-4 py-3 text-[0.8125rem] text-muted-foreground"
                    role="status"
                  >
                    {blocked}
                  </p>
                ) : (
                  <div className="h-2" />
                )}
              </Panel>
              <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1.5">
                {onCancel && (
                  <Button
                    disabled={status !== "review"}
                    onClick={onCancel}
                    size="sm"
                    variant="quiet"
                  >
                    {cancelLabel}
                  </Button>
                )}
                {onEdit && (
                  <Button
                    disabled={status !== "review"}
                    onClick={onEdit}
                    size="sm"
                    variant="secondary"
                  >
                    {editLabel}
                  </Button>
                )}
                <Button
                  disabled={
                    Boolean(blocked) || !data.items.some((i) => i.filled)
                  }
                  loading={status === "confirming"}
                  onClick={() => onConfirm?.()}
                  size="sm"
                  variant="primary"
                >
                  {status === "confirming" ? confirmingLabel : confirmLabel}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <p aria-live="polite" className="sr-only" role="status">
          {status === "confirming"
            ? confirmingLabel
            : status === "done"
              ? doneLabel
              : ""}
        </p>
      </Shell>
    </MotionConfig>
  );
}

function Done({
  data,
  label,
}: {
  data: ConfirmationCardProps["data"];
  label: string;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0, transition: enter }}
      initial={{ opacity: 0, y: 6 }}
    >
      <Panel className="flex items-center gap-3 border border-border p-3">
        <IconTile className="bg-positive/15 text-positive" icon={CircleCheck} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[1rem]">{data.title}</p>
          <p className="truncate text-[0.8125rem] text-muted-foreground">
            {[data.reference, data.doneAt].filter(Boolean).join(" · ")}
          </p>
        </div>
        <StatusPill icon={CircleCheck} tone="positive">
          {label}
        </StatusPill>
      </Panel>
    </motion.div>
  );
}
