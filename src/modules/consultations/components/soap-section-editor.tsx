import { Brain, ChatText, ClipboardText, Stethoscope } from "@phosphor-icons/react";
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
  const IconComponent = SECTION_ICON[sectionKey];

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 transition-all duration-300 backdrop-blur-sm relative group overflow-hidden",
        SECTION_COLOR[sectionKey],
        status === "active" ? "ring-2 ring-primary/40 ring-offset-0 shadow-md" : "hover:shadow-sm",
        className
      )}
      onClick={() => onFocusSection?.(sectionKey)}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-lg shadow-sm",
              SECTION_BADGE[sectionKey]
            )}
            aria-hidden
          >
            <IconComponent weight="duotone" className="size-3.5" />
          </span>
          <h4 className="text-sm font-semibold tracking-tight text-foreground/90">{title}</h4>
        </div>
      </div>

      <Textarea
        className="min-h-[120px] resize-y border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-0 py-1 text-foreground/90 placeholder:text-muted-foreground/50 relative z-10"
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
