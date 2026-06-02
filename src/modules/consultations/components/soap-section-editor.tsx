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
  title: string;
  /** "active" affiche un ring autour de la section (utilisé par le dictation target) */
  status?: "active" | "default";
  value: string;
}

const SECTION_ICON: Record<SoapSectionKey, string> = {
  subjective: "S",
  objective: "O",
  assessment: "A",
  plan: "P",
};

const SECTION_COLOR: Record<SoapSectionKey, string> = {
  subjective:
    "border-sky-200/60 bg-sky-50/40 dark:border-sky-500/20 dark:bg-sky-500/5",
  objective:
    "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5",
  assessment:
    "border-amber-200/60 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5",
  plan:
    "border-violet-200/60 bg-violet-50/40 dark:border-violet-500/20 dark:bg-violet-500/5",
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
  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all",
        SECTION_COLOR[sectionKey],
        status === "active" && "ring-2 ring-primary/40 ring-offset-0",
        className
      )}
      onClick={() => onFocusSection?.(sectionKey)}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
            SECTION_BADGE[sectionKey]
          )}
          aria-hidden
        >
          {SECTION_ICON[sectionKey]}
        </span>
        <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
      </div>

      <Textarea
        className="min-h-[120px] resize-y border-0 bg-background/70 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-ring/40"
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
