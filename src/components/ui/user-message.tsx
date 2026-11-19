// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: the vet's bubble (right; tinted with our `brand` instead of `surface-raised`, which vanishes on the white card of the panel), copy on hover; the editing and retry states are kept in French. The panel does not pass `onEdit`: a rubric is edited by going back to it, as before.
 * Icons are lucide (`strokeWidth={2.5}` for what Phosphor drew bold); colours are our tokens (`brand`, `positive`,
 * `negative`, `warning` are our tones; never the TuffUI theme); text is French, never under 12 px; no demo data.
 */

import {
  RotateCw,
  Check,
  Copy,
  FileText,
  Image as ImageIcon,
  Pencil,
  CircleAlert,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/action-button";
import { Textarea as TextArea } from "@/components/ui/textarea";
import { enter, exit } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/loader";

export interface UserMessageAttachment {
  id: string;
  kind: "image" | "file";
  name: string;
  /** Optional thumbnail for images. */
  previewUrl?: string;
  /** Bytes. */
  size?: number;
}

export type UserMessageStatus = "sending" | "sent" | "failed";

export interface UserMessageData {
  attachments?: UserMessageAttachment[];
  content: string;
  edited?: boolean;
  id: string;
  /** Display time, e.g. « 14:02 ». */
  sentAt?: string;
  status?: UserMessageStatus;
}

export interface UserMessageProps {
  className?: string;
  data: UserMessageData;
  onCopy?: (text: string) => void;
  /** Save the edited text. Hides the edit action when omitted (the panel edits a rubric by going back to it). */
  onEdit?: (text: string) => void;
  onRetry?: () => void;
}

export const formatBytes = (n: number) =>
  n < 1024
    ? `${n} o`
    : n < 1024 ** 2
      ? `${Math.round(n / 1024)} Ko`
      : `${(n / 1024 ** 2).toFixed(1).replace(".", ",")} Mo`;

export function UserMessage({
  data,
  onEdit,
  onRetry,
  onCopy,
  className,
}: UserMessageProps) {
  const { content, attachments = [], sentAt, status = "sent", edited } = data;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [copied, setCopied] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const startEdit = () => {
    setDraft(content);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    // Return focus to where editing started.
    requestAnimationFrame(() => editButton.current?.focus());
  };
  const save = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    setEditing(false);
    if (text !== content) {
      onEdit?.(text);
    }
  };
  const copy = () => {
    navigator.clipboard?.writeText(content).catch(() => {});
    onCopy?.(content);
    setCopied(true);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "group flex w-full flex-col items-end gap-1.5",
          className
        )}
      >
        {attachments.length > 0 && (
          <ul
            aria-label="Pièces jointes"
            className="flex max-w-[85%] flex-wrap justify-end gap-1.5"
          >
            {attachments.map((file) => (
              <li
                className="flex items-center gap-2 rounded-xl bg-foreground/[0.05] py-1.5 pr-3 pl-1.5"
                key={file.id}
              >
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-foreground/[0.06] text-muted-foreground">
                  {file.previewUrl ? (
                    <img
                      alt=""
                      className="size-full object-cover"
                      src={file.previewUrl}
                    />
                  ) : file.kind === "image" ? (
                    <ImageIcon aria-hidden="true" className="size-4" />
                  ) : (
                    <FileText aria-hidden="true" className="size-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block max-w-40 truncate text-[0.8125rem]">
                    {file.name}
                  </span>
                  {file.size !== undefined && (
                    <span className="block text-xs text-muted-foreground">
                      {file.kind === "image" ? "Image" : "Fichier"} ·{" "}
                      {formatBytes(file.size)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        <AnimatePresence initial={false} mode="popLayout">
          {editing ? (
            <motion.form
              animate={{ opacity: 1, scale: 1, transition: enter }}
              className="flex w-full max-w-[85%] origin-top-right flex-col gap-2 rounded-2xl bg-surface p-1.5"
              exit={{ opacity: 0, transition: exit }}
              initial={{ opacity: 0, scale: 0.98 }}
              key="edit"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <TextArea
                aria-label="Modifier le message"
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onFocus={(e) =>
                  e.target.setSelectionRange(draft.length, draft.length)
                }
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    cancel();
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    save();
                  }
                }}
                rows={Math.min(6, Math.max(2, draft.split("\n").length))}
                value={draft}
              />
              <div className="flex justify-end gap-1.5">
                <Button
                  onClick={cancel}
                  size="sm"
                  type="button"
                  variant="quiet"
                >
                  Annuler
                </Button>
                <Button disabled={!draft.trim()} size="sm" type="submit">
                  Enregistrer
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              animate={{ opacity: 1, transition: enter }}
              className={cn(
                "max-w-[85%] rounded-2xl rounded-br-md bg-brand/10 px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                status === "sending" && "opacity-70"
              )}
              exit={{ opacity: 0, transition: exit }}
              initial={{ opacity: 0 }}
              key="bubble"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>

        {!editing && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className={cn(
                "flex items-center gap-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
              )}
            >
              {onEdit && status !== "sending" && (
                <IconButton
                  icon={Pencil}
                  label="Modifier le message"
                  onClick={startEdit}
                  ref={editButton}
                  size="sm"
                  variant="quiet"
                />
              )}
              <IconButton
                icon={copied ? Check : Copy}
                iconWeight={copied ? "bold" : "fill"}
                label={copied ? "Copié" : "Copier le message"}
                onClick={copy}
                size="sm"
                variant="quiet"
              />
            </span>
            <Delivery
              edited={edited}
              onRetry={onRetry}
              sentAt={sentAt}
              status={status}
            />
          </div>
        )}
        <p aria-live="polite" className="sr-only" role="status">
          {status === "failed" ? "Message non envoyé" : copied ? "Copié" : ""}
        </p>
      </div>
    </MotionConfig>
  );
}

function Delivery({
  status,
  sentAt,
  edited,
  onRetry,
}: {
  status: UserMessageStatus;
  sentAt?: string;
  edited?: boolean;
  onRetry?: () => void;
}) {
  if (status === "sending") {
    return (
      <span className="flex items-center gap-1 px-1">
        <Spinner className="text-current" label="Envoi" size="sm" />
        <span aria-hidden="true">Envoi…</span>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1.5 pl-1 text-negative">
        <CircleAlert aria-hidden="true" className="size-3.5" />
        Non envoyé
        {onRetry && (
          <Button
            icon={RotateCw}
            iconWeight="bold"
            onClick={onRetry}
            size="sm"
            variant="danger"
          >
            Réessayer
          </Button>
        )}
      </span>
    );
  }
  // Nothing to say about a message that went through, unless it was edited or a time is given.
  if (!(edited || sentAt)) {
    return null;
  }
  return (
    <span className="px-1 tabular-nums">
      {edited ? "Modifié" : "Envoyé"}
      {sentAt && ` · ${sentAt}`}
    </span>
  );
}
