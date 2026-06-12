import {
  Brain,
  ChatText,
  ClipboardText,
  Stethoscope,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SoapSectionKey } from "@/types/db";

interface SoapSectionEditorProps {
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onFocusSection?: (sectionKey: SoapSectionKey) => void;
  placeholder: string;
  rows?: number;
  sectionKey: SoapSectionKey;
  /** "active" affiche un ring autour de la section (utilisé par le dictation target) */
  status?: "active" | "default";
  title: string;
  value: string;
}

const SECTION_ICON: Record<SoapSectionKey, React.ComponentType<any>> = {
  subjective: ChatText,
  objective: Stethoscope,
  assessment: Brain,
  plan: ClipboardText,
};

const SECTION_COLOR: Record<SoapSectionKey, string> = {
  subjective:
    "border-sky-200/60 bg-sky-50/40 dark:border-sky-500/20 dark:bg-sky-500/5",
  objective:
    "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5",
  assessment:
    "border-amber-200/60 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5",
  plan: "border-violet-200/60 bg-violet-50/40 dark:border-violet-500/20 dark:bg-violet-500/5",
};

const SECTION_BADGE: Record<SoapSectionKey, string> = {
  subjective: "bg-sky-500 text-white",
  objective: "bg-emerald-500 text-white",
  assessment: "bg-amber-500 text-white",
  plan: "bg-violet-500 text-white",
};

export function SoapSectionEditor({
  className,
  disabled,
  onChange,
  onFocusSection,
  placeholder,
  rows = 4,
  sectionKey,
  title,
  status = "default",
  value,
}: SoapSectionEditorProps) {
  // (useTranslation est importé par le parent — pas requis ici pour l'instant)
  void useTranslation;
  const IconComponent = SECTION_ICON[sectionKey];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-3.5 backdrop-blur-sm transition-all duration-300",
        SECTION_COLOR[sectionKey],
        status === "active"
          ? "shadow-md ring-2 ring-primary/40 ring-offset-0"
          : "hover:shadow-sm",
        className
      )}
      onClick={() => onFocusSection?.(sectionKey)}
    >
      <div className="relative z-10 mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "flex size-6 items-center justify-center rounded-lg shadow-sm",
              SECTION_BADGE[sectionKey]
            )}
          >
            <IconComponent className="size-3.5" weight="duotone" />
          </span>
          <h4 className="font-semibold text-foreground/90 text-sm tracking-tight">
            {title}
          </h4>
        </div>
      </div>

      <Textarea
        className="relative z-10 min-h-[120px] resize-y border-0 bg-transparent px-0 py-1 text-foreground/90 text-sm shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => onFocusSection?.(sectionKey)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </div>
  );
}
