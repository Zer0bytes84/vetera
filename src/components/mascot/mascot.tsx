import { useState } from "react";
import Logo from "@/components/Logo";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMascotPreferences } from "@/hooks/use-mascot-preferences";
import type { MascotAnimal } from "@/lib/mascot-preferences";
import { cn } from "@/lib/utils";
import { MascotAvatar, type MascotMood } from "./mascot-avatar";
import { MascotChoices } from "./mascot-choices";

export interface MascotProps {
  animal?: MascotAnimal;
  mood?: MascotMood;
  animated?: boolean;
  size?: number;
  framing?: "full" | "portrait";
  className?: string;
  interactive?: boolean;
  fallbackToLogo?: boolean;
  onSelect?: () => void;
}

export function Mascot({
  animal,
  mood = "idle",
  animated,
  size = 48,
  framing = "portrait",
  className,
  interactive = false,
  fallbackToLogo = true,
  onSelect,
}: MascotProps) {
  const preferences = useMascotPreferences();
  const [open, setOpen] = useState(false);

  const effectiveAnimal = animal || preferences.animal;
  const isAnimated = animated !== undefined ? animated : preferences.animated;
  const isLogoMode = fallbackToLogo && preferences.mode === "logo" && !animal;

  const content = isLogoMode ? (
    <div
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border/70 bg-card shadow-xs overflow-hidden",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Logo collapsed variant="refined" className="scale-75" />
    </div>
  ) : (
    <MascotAvatar
      animal={effectiveAnimal}
      animated={isAnimated}
      mood={mood}
      size={size}
      framing={framing}
      className={className}
    />
  );

  if (!interactive) {
    return content;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label="Changer de mascotte ou logo"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
          className
        )}
      >
        {content}
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="mascot-picker">
        <div className="mascot-picker-heading">
          <PopoverTitle>Compagnon Baitari</PopoverTitle>
          <PopoverDescription>
            Choisissez votre animal ou conservez le logo classique.
          </PopoverDescription>
        </div>
        <MascotChoices
          compact
          onSelect={() => {
            setOpen(false);
            onSelect?.();
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { MascotAvatar, type MascotMood } from "./mascot-avatar";
