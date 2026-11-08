// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: the composer of the assistant's dictation, kept to what a consultation needs. The Shell, the white
 * panel, the growing text field, the suggestion menu opened by typing « @ » (the vet's patients) and the footer row are
 * TuffUI's. The Ask / Plan / Act switch, the model chooser, the file tray and the message queue are not installed: the
 * assistant has no mode to pick and nothing leaves the machine. The menu is driven by the caller (it finds the patients
 * from the caret), the footer holds the dictation controls (`toolbar`) and the counter (`meter`). Colours are our tokens,
 * text is French and never under 12 px.
 */

import { useId, useImperativeHandle, useLayoutEffect, useRef, type ReactNode, type Ref } from "react";
import { MotionConfig } from "motion/react";
import { Panel, Shell } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export type ComposerSuggestion = { key: string; label: string; detail?: string };

export type ComposerMenu = {
  /** Accessible name of the list, e.g. « Suggestions de patients ». */
  label: string;
  items: ComposerSuggestion[];
  active: number;
  onActiveChange: (index: number) => void;
  onPick: (item: ComposerSuggestion) => void;
  /** Escape closes the menu without choosing. */
  onDismiss: () => void;
};

export type AgentComposerProps = {
  value: string;
  onValueChange: (value: string, caret: number) => void;
  /** The caret moved (selection, click, arrow keys): the caller finds the « @ » being typed from it. */
  onCaretChange?: (caret: number) => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  /** Accessible name of the field. */
  label: string;
  menu?: ComposerMenu;
  /** Left of the footer: the dictation button, the language. */
  toolbar?: ReactNode;
  /** Right of the footer: the counter. */
  meter?: ReactNode;
  /** ⌘ or Ctrl + Entrée. Plain Entrée adds a line: a dictation is prose, not a command. */
  onSubmit?: () => void;
  className?: string;
};

export function AgentComposer({
  value,
  onValueChange,
  onCaretChange,
  textareaRef,
  placeholder,
  maxLength,
  disabled,
  label,
  menu,
  toolbar,
  meter,
  onSubmit,
  className,
}: AgentComposerProps) {
  const id = useId();
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const items = menu?.items ?? [];
  const menuOpen = items.length > 0;
  const active = Math.min(menu?.active ?? 0, Math.max(items.length - 1, 0));

  // The caller's ref (to focus the field, set the caret) and the one that sizes it point at the same element.
  useImperativeHandle(textareaRef, () => inner.current as HTMLTextAreaElement);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (menu && menuOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        menu.onActiveChange((active + step + items.length) % items.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        menu.onPick(items[active] ?? items[0]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        menu.onDismiss();
        return;
      }
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <Shell className={cn("relative max-w-none bg-transparent p-0", className)}>
        {/* Opened by typing « @ », so it appears instantly: keyboard actions never animate. */}
        {menuOpen && menu && (
          <ul
            id={`${id}-menu`}
            role="listbox"
            aria-label={menu.label}
            className="mb-3 max-h-40 overflow-y-auto rounded-2xl border border-border bg-surface-raised p-1"
          >
            {items.map((item, i) => (
              <li
                key={item.key}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => menu.onPick(item)}
                onMouseMove={() => menu.onActiveChange(i)}
                className="flex cursor-pointer flex-col gap-0.5 rounded-xl px-3 py-2 text-[0.8125rem] aria-selected:bg-foreground/[0.07]"
              >
                <span className="truncate font-medium">{item.label}</span>
                {item.detail && (
                  <span className="truncate text-xs text-muted-foreground">{item.detail}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <Panel className="relative border border-border">
          <label htmlFor={`${id}-input`} className="sr-only">
            {label}
          </label>
          <textarea
            ref={inner}
            id={`${id}-input`}
            rows={2}
            value={value}
            maxLength={maxLength}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(event) => onValueChange(event.target.value, event.target.selectionStart)}
            onSelect={(event) => onCaretChange?.(event.currentTarget.selectionStart)}
            onKeyDown={onKeyDown}
            role={menu ? "combobox" : undefined}
            aria-autocomplete={menu ? "list" : undefined}
            aria-expanded={menu ? menuOpen : undefined}
            aria-controls={menu && menuOpen ? `${id}-menu` : undefined}
            aria-activedescendant={menuOpen ? `${id}-opt-${active}` : undefined}
            className="block max-h-[220px] min-h-[5.5rem] w-full resize-none bg-transparent px-3 pt-3 pb-0 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">{toolbar}</div>
            {meter ? <div className="shrink-0 text-xs text-muted-foreground">{meter}</div> : null}
          </div>
        </Panel>
      </Shell>
    </MotionConfig>
  );
}
