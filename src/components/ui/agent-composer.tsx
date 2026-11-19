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

import {
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type Ref,
} from "react";
import { MotionConfig } from "motion/react";
import { Panel, Shell } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export interface ComposerSuggestion {
  detail?: string;
  key: string;
  label: string;
}

export interface ComposerMenu {
  active: number;
  items: ComposerSuggestion[];
  /** Accessible name of the list, e.g. « Suggestions de patients ». */
  label: string;
  onActiveChange: (index: number) => void;
  /** Escape closes the menu without choosing. */
  onDismiss: () => void;
  onPick: (item: ComposerSuggestion) => void;
}

export interface AgentComposerProps {
  className?: string;
  disabled?: boolean;
  /** Takes the height the panel leaves: the field is the work area, not a fixed box. */
  fill?: boolean;
  /** Accessible name of the field. */
  label: string;
  maxLength?: number;
  menu?: ComposerMenu;
  /** Right of the footer: the counter. */
  meter?: ReactNode;
  /** The caret moved (selection, click, arrow keys): the caller finds the « @ » being typed from it. */
  onCaretChange?: (caret: number) => void;
  /** ⌘ or Ctrl + Entrée. Plain Entrée adds a line: a dictation is prose, not a command. */
  onSubmit?: () => void;
  onValueChange: (value: string, caret: number) => void;
  placeholder?: string;
  /** A question, not prose: plain Entrée sends it and Maj + Entrée adds a line. */
  submitOnEnter?: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
  /** Left of the footer: the dictation button, the language. */
  toolbar?: ReactNode;
  value: string;
}

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
  submitOnEnter = false,
  fill = false,
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
    if (!el || fill) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value, fill]);

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
    // While an input method is composing (accents, Arabic), Entrée belongs to it.
    if (
      event.key === "Enter" &&
      submitOnEnter &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      onSubmit?.();
      return;
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <Shell
        className={cn(
          "relative max-w-none bg-transparent p-0",
          fill && "flex min-h-0 flex-col",
          className
        )}
      >
        {/* Opened by typing « @ », so it appears instantly: keyboard actions never animate. */}
        {menuOpen && menu && (
          <ul
            aria-label={menu.label}
            className="mb-3 max-h-40 overflow-y-auto rounded-2xl border border-border bg-surface-raised p-1"
            id={`${id}-menu`}
            role="listbox"
          >
            {items.map((item, i) => (
              <li
                aria-selected={i === active}
                className="flex cursor-pointer flex-col gap-0.5 rounded-xl px-3 py-2 text-[0.8125rem] aria-selected:bg-foreground/[0.07]"
                id={`${id}-opt-${i}`}
                key={item.key}
                onClick={() => menu.onPick(item)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => menu.onActiveChange(i)}
                role="option"
              >
                <span className="truncate font-medium">{item.label}</span>
                {item.detail && (
                  <span className="truncate text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <Panel
          className={cn(
            "relative border border-border",
            fill && "flex min-h-0 flex-1 flex-col"
          )}
        >
          <label className="sr-only" htmlFor={`${id}-input`}>
            {label}
          </label>
          <textarea
            aria-activedescendant={menuOpen ? `${id}-opt-${active}` : undefined}
            aria-autocomplete={menu ? "list" : undefined}
            aria-controls={menu && menuOpen ? `${id}-menu` : undefined}
            aria-expanded={menu ? menuOpen : undefined}
            className={cn(
              "block w-full resize-none bg-transparent px-3 pt-3 pb-0 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60",
              fill ? "min-h-[14rem] flex-1" : "max-h-[220px] min-h-[5.5rem]"
            )}
            disabled={disabled}
            id={`${id}-input`}
            maxLength={maxLength}
            onChange={(event) =>
              onValueChange(event.target.value, event.target.selectionStart)
            }
            onKeyDown={onKeyDown}
            onSelect={(event) =>
              onCaretChange?.(event.currentTarget.selectionStart)
            }
            placeholder={placeholder}
            ref={inner}
            role={menu ? "combobox" : undefined}
            rows={fill ? undefined : 2}
            value={value}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              {toolbar}
            </div>
            {meter ? (
              <div className="shrink-0 text-xs text-muted-foreground">
                {meter}
              </div>
            ) : null}
          </div>
        </Panel>
      </Shell>
    </MotionConfig>
  );
}
