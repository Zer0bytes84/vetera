// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: the vet's bubble (right; tinted with our `brand` instead of `surface-raised`, which vanishes on the white card of the panel), copy on hover; the editing and retry states are kept in French. The panel does not pass `onEdit`: a rubric is edited by going back to it, as before.
 * Icons are lucide (`strokeWidth={2.5}` for what Phosphor drew bold); colours are our tokens (`brand`, `positive`,
 * `negative`, `warning` are our tones; never the TuffUI theme); text is French, never under 12 px; no demo data.
 */

import { RotateCw, Check, Copy, FileText, Image as ImageIcon, Pencil, CircleAlert } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/action-button";
import { Textarea as TextArea } from "@/components/ui/textarea";
import { enter, exit } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/loader";

export type UserMessageAttachment = {
  id: string;
  name: string;
  kind: "image" | "file";
  /** Bytes. */
  size?: number;
  /** Optional thumbnail for images. */
  previewUrl?: string;
};

export type UserMessageStatus = "sending" | "sent" | "failed";

export type UserMessageData = {
  id: string;
  content: string;
  attachments?: UserMessageAttachment[];
  /** Display time, e.g. « 14:02 ». */
  sentAt?: string;
  status?: UserMessageStatus;
  edited?: boolean;
};

export type UserMessageProps = {
  data: UserMessageData;
  /** Save the edited text. Hides the edit action when omitted (the panel edits a rubric by going back to it). */
  onEdit?: (text: string) => void;
  onRetry?: () => void;
  onCopy?: (text: string) => void;
  className?: string;
};

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
    if (!copied) return;
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
    if (!text) return;
    setEditing(false);
    if (text !== content) onEdit?.(text);
  };
  const copy = () => {
    navigator.clipboard?.writeText(content).catch(() => {});
    onCopy?.(content);
    setCopied(true);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("group flex w-full flex-col items-end gap-1.5", className)}>
        {attachments.length > 0 && (
          <ul
            aria-label="Pièces jointes"
            className="flex max-w-[85%] flex-wrap justify-end gap-1.5"
          >
            {attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-2 rounded-xl bg-foreground/[0.05] py-1.5 pr-3 pl-1.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-foreground/[0.06] text-muted-foreground">
                  {file.previewUrl ? (
                    <img
                      src={file.previewUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : file.kind === "image" ? (
                    <ImageIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <FileText className="size-4" aria-hidden="true" />
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

        <AnimatePresence mode="popLayout" initial={false}>
          {editing ? (
            <motion.form
              key="edit"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1, transition: enter }}
              exit={{ opacity: 0, transition: exit }}
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="flex w-full max-w-[85%] origin-top-right flex-col gap-2 rounded-2xl bg-surface p-1.5"
            >
              <TextArea
                aria-label="Modifier le message"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={(e) => e.target.setSelectionRange(draft.length, draft.length)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") cancel();
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    save();
                  }
                }}
                rows={Math.min(6, Math.max(2, draft.split("\n").length))}
              />
              <div className="flex justify-end gap-1.5">
                <Button type="button" variant="quiet" size="sm" onClick={cancel}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={!draft.trim()}>
                  Enregistrer
                </Button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="bubble"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: enter }}
              exit={{ opacity: 0, transition: exit }}
              className={cn(
                "max-w-[85%] rounded-2xl rounded-br-md bg-brand/10 px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                status === "sending" && "opacity-70",
              )}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>

        {!editing && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className={cn(
                "flex items-center gap-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
              )}
            >
              {onEdit && status !== "sending" && (
                <IconButton
                  ref={editButton}
                  icon={Pencil}
                  label="Modifier le message"
                  variant="quiet"
                  size="sm"
                  onClick={startEdit}
                />
              )}
              <IconButton
                icon={copied ? Check : Copy}
                iconWeight={copied ? "bold" : "fill"}
                label={copied ? "Copié" : "Copier le message"}
                variant="quiet"
                size="sm"
                onClick={copy}
              />
            </span>
            <Delivery status={status} sentAt={sentAt} edited={edited} onRetry={onRetry} />
          </div>
        )}
        <p role="status" aria-live="polite" className="sr-only">
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
  if (status === "sending")
    return (
      <span className="flex items-center gap-1 px-1">
        <Spinner size="sm" label="Envoi" className="text-current" />
        <span aria-hidden="true">Envoi…</span>
      </span>
    );
  if (status === "failed")
    return (
      <span className="flex items-center gap-1.5 pl-1 text-negative">
        <CircleAlert className="size-3.5" aria-hidden="true" />
        Non envoyé
        {onRetry && (
          <Button
            variant="danger"
            size="sm"
            icon={RotateCw}
            iconWeight="bold"
            onClick={onRetry}
          >
            Réessayer
          </Button>
        )}
      </span>
    );
  // Nothing to say about a message that went through, unless it was edited or a time is given.
  if (!edited && !sentAt) return null;
  return (
    <span className="px-1 tabular-nums">
      {edited ? "Modifié" : "Envoyé"}
      {sentAt && ` · ${sentAt}`}
    </span>
  );
}
