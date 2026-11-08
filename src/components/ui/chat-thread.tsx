// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: the conversation thread of the assistant panel. The rows (an avatar, a name and a hidden time at the
 * start of each turn, the vet's turns as a bubble on the right, the assistant's as free text on the left), the grouping of
 * turns and the entrance are TuffUI's. Changes: French; times in fr-FR; `flow` draws the rows only, with no scroll area of
 * its own, because the panel scrolls the thread together with its field; a turn can bring its own bubble (`plain`, for
 * `UserMessage`); no unread marker, no « Jump to latest » (the panel follows the conversation itself) and no day dividers
 * inside one session; the avatar of a person is the app's own (`renderAvatar`), so `agent-avatar` is not installed.
 * The assistant's avatar is the mascot, never a generic « AI » glyph. Colours are our tokens, text is French and never under 12 px; no demo data.
 */

import { Mascot } from "@/components/mascot";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Fragment, type ReactNode } from "react";
import { enter, exit } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

export type ThreadMessage = {
  id: string;
  role: "user" | "assistant";
  content: ReactNode;
  /** ISO timestamp; drives grouping and the hover time. */
  at: string;
  /** Name shown at the start of a group; defaults to `userName` / `agentName`. */
  author?: string;
  streaming?: boolean;
  /** The content brings its own bubble (the vet's `UserMessage`): the thread draws none around it. */
  plain?: boolean;
};

export type ChatThreadProps = {
  messages: ThreadMessage[];
  agentName?: string;
  userName?: string;
  /** Custom avatar per role; the assistant's is the app's mascot (the panel passes it with its mood). */
  renderAvatar?: (message: ThreadMessage) => ReactNode;
  /** Show the author's name at the start of a turn. The panel hides it: the mascot and the bubble's side say who speaks. */
  showNames?: boolean;
  /** Rendered after the last message: the assistant's live state, its questions. */
  footer?: ReactNode;
  className?: string;
};

/** Turns from the same side within this window share one header. */
const GROUP_MS = 5 * 60_000;

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function ChatThread({
  messages,
  agentName = "Assistant IA",
  userName = "Vous",
  renderAvatar,
  showNames = true,
  footer,
  className,
}: ChatThreadProps) {
  const avatar = (message: ThreadMessage) =>
    renderAvatar?.(message) ??
    (message.role === "assistant" ? (
      <Mascot overflow size={28} />
    ) : (
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-xs font-medium"
      >
        {(message.author ?? userName).slice(0, 1).toUpperCase()}
      </span>
    ));

  return (
    <MotionConfig reducedMotion="user">
      <div
        role="log"
        aria-label="Conversation"
        aria-busy={messages.some((m) => m.streaming) || undefined}
        className={cn("flex flex-col gap-3", className)}
      >
        <AnimatePresence initial={false}>
          {messages.map((message, i) => {
            const prev = messages[i - 1];
            const grouped =
              prev?.role === message.role &&
              new Date(message.at).getTime() - new Date(prev.at).getTime() < GROUP_MS;
            const user = message.role === "user";
            const name = message.author ?? (user ? userName : agentName);

            return (
              <Fragment key={message.id}>
                <motion.article
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: enter }}
                  exit={{ opacity: 0, transition: exit }}
                  aria-label={`${name}, ${time(message.at)}`}
                  className={cn("group flex gap-3", user && "flex-row-reverse")}
                >
                  {grouped ? (
                    <span aria-hidden="true" className="w-8 shrink-0" />
                  ) : (
                    // Centred on the first line of the bubble (its 8 px padding and 24 px line put the middle 20 px down).
                    <span className="mt-1 flex size-8 shrink-0 items-center justify-center">{avatar(message)}</span>
                  )}
                  <div
                    className={cn(
                      "flex min-w-0 flex-col gap-1",
                      // The assistant's turns stretch, so cards get the whole column.
                      user ? "max-w-[85%] items-end" : "max-w-full flex-1 items-start",
                    )}
                  >
                    {!grouped && showNames && (
                      <p className={cn("flex items-baseline gap-3 text-[0.8125rem]", user && "flex-row-reverse")}>
                        <span className="font-medium">{name}</span>
                        <time
                          dateTime={message.at}
                          className="text-xs text-muted-foreground tabular-nums opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                        >
                          {time(message.at)}
                        </time>
                      </p>
                    )}
                    <div
                      className={cn(
                        "max-w-full text-sm leading-relaxed",
                        user && !message.plain && "rounded-2xl bg-brand/10 px-3.5 py-2 whitespace-pre-wrap",
                        user && !message.plain && !grouped && "rounded-tr-md",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                </motion.article>
              </Fragment>
            );
          })}
        </AnimatePresence>
        {footer}
      </div>
    </MotionConfig>
  );
}
