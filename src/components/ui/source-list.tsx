// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: the list of sources behind what the assistant found. TuffUI's is for web answers (links opening in a
 * new tab, domains, a favicon tile coloured from the domain, claims and citation footnotes). Here nothing is a link and
 * nothing leaves the machine: a source is a passage of the records (a consultation note, a document, a protocol, a patient
 * file), grouped by the kind of record, with the passage itself put forward and the vet's actions (copy, insert) under it.
 * Only the panel variant is installed: the footnotes variant numbers citations in an answer's text, and the assistant's
 * answers carry none. Colours are our tokens, text is French and never under 12 px; no demo data.
 */

import { BookOpen, type LucideIcon } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";
import { Tag } from "@/components/ui/status-pill";
import { IconTile, Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { enter } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

export type Source = {
  id: string;
  /** Whose and what: « Rex · Évaluation ». */
  title: ReactNode;
  /** The kind of record it comes from; sources are grouped by it. */
  group: string;
  icon?: LucideIcon;
  /** A short tag after the title, e.g. the SOAP rubric. */
  tag?: string;
  /** Display date, e.g. « 12 oct. 2026 ». */
  date?: string;
  /** The passage found, already highlighted by the caller: it is what the source is shown for. */
  passage: ReactNode;
  /** The vet's actions on the passage: copy, insert. */
  actions?: ReactNode;
};

export type SourceListProps = {
  sources: Source[];
  heading: string;
  subtitle?: string;
  className?: string;
};

export function SourceList({ sources, heading, subtitle, className }: SourceListProps) {
  const groups = sources.reduce<{ name: string; icon?: LucideIcon; items: Source[] }[]>((acc, source) => {
    const group = acc.find((g) => g.name === source.group);
    if (group) group.items.push(source);
    else acc.push({ name: source.group, icon: source.icon, items: [source] });
    return acc;
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <Shell aria-label={heading} className={cn("max-w-none", className)}>
        <ShellHeader icon={BookOpen} subtitle={subtitle} title={heading} />
        <Panel className="flex flex-col gap-3 border border-border p-1.5">
          {groups.map((group, g) => (
            <motion.section
              key={group.name}
              aria-label={group.name}
              animate={{ opacity: 1, y: 0, transition: { ...enter, delay: g * 0.04 } }}
              initial={{ opacity: 0, y: 6 }}
            >
              <h4 className="flex items-center gap-3 px-3 pt-1.5 pb-1 text-xs text-muted-foreground">
                {group.icon ? <IconTile className="size-5 rounded-md" icon={group.icon} /> : null}
                {group.name}
                <span className="tabular-nums">· {group.items.length}</span>
              </h4>
              <ul className="flex flex-col">
                {group.items.map((source) => (
                  <li className="flex flex-col gap-1.5 rounded-xl px-3 py-3" key={source.id}>
                    <div className="flex items-baseline gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{source.title}</span>
                      {source.tag ? <Tag className="font-sans">{source.tag}</Tag> : null}
                      {source.date ? (
                        <span className="shrink-0 text-xs text-muted-foreground">{source.date}</span>
                      ) : null}
                    </div>
                    {/* The passage found, put forward. */}
                    <div className="rounded-xl border-l-2 border-brand bg-brand/[0.06] px-3 py-2">{source.passage}</div>
                    {source.actions ? <div className="flex items-center justify-end gap-1.5">{source.actions}</div> : null}
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </Panel>
      </Shell>
    </MotionConfig>
  );
}
