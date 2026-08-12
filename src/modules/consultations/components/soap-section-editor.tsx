import {
  ChatCircleDots,
  ChartLineUp,
  ClipboardText,
  ListChecks,
  type Icon,
} from "@phosphor-icons/react";
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

const SECTION_ICON: Record<SoapSectionKey, Icon> = {
  subjective: ChatCircleDots,
  objective: ClipboardText,
  assessment: ChartLineUp,
  plan: ListChecks,
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
  const SectionIcon = SECTION_ICON[sectionKey];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-4 transition-[border-color,box-shadow] duration-200",
        status === "active"
          ? "border-foreground/25 shadow-[0_0_0_3px_color-mix(in_oklch,var(--foreground)_7%,transparent)]"
          : "border-border hover:border-foreground/15",
        className
      )}
      onClick={() => onFocusSection?.(sectionKey)}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex size-8 items-center justify-center rounded-xl bg-muted text-foreground"
          >
            <SectionIcon aria-hidden className="size-4" weight="duotone" />
          </span>
          <h4 className="font-semibold text-foreground text-sm tracking-[-0.01em]">
            {title}
          </h4>
        </div>
      </div>

      <Textarea
        aria-label={title}
        className="min-h-[144px] resize-y border-0 bg-transparent px-0 py-1 text-foreground text-sm leading-6 shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
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
