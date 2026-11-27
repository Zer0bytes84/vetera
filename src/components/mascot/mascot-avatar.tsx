import type { MascotAnimal } from "@/lib/mascot-preferences";
import { cn } from "@/lib/utils";
import { COLOR_MASCOTS, USE_COLOR_MASCOTS } from "./color-mascots";
import { LineMascot } from "./line-mascot";
import { lineAnimalOf } from "./mascot-assets";
// The sidebar brand, the choices and the settings panel are styled here.
import "./mascot.css";

export type MascotMood = "idle" | "happy" | "thinking";

export interface MascotAvatarProps {
  animal: MascotAnimal;
  animated?: boolean;
  className?: string;
  framing?: "full" | "portrait";
  /** Kept for callers of the earlier portraits; the line mascot breathes on its own. */
  idle?: boolean;
  mood?: MascotMood;
  /** Ears and horns may leave the round frame. */
  overflow?: boolean;
  size?: number;
}

/**
 * The clinic's mascot as a line portrait (see line-mascots): alive when
 * `animated`, its mood set by the caller when the app has one to show
 * (the assistant thinking, a welcome), its own otherwise.
 */
export function MascotAvatar({
  animal,
  animated = true,
  size = 48,
  className,
  mood = "idle",
  overflow = false,
}: MascotAvatarProps) {
  // Essai : l'image en couleurs, immobile (regard, clignements et humeurs ne s'appliquent qu'aux dessins au trait).
  if (USE_COLOR_MASCOTS) {
    return (
      <span
        aria-hidden="true"
        className={cn("mascot-color", className)}
        data-animal={lineAnimalOf(animal)}
        style={{ width: size, height: size }}
      >
        <img
          alt=""
          decoding="async"
          draggable={false}
          height={size}
          src={COLOR_MASCOTS[lineAnimalOf(animal)]}
          width={size}
        />
      </span>
    );
  }
  return (
    <LineMascot
      animal={lineAnimalOf(animal)}
      className={className}
      live={animated}
      mood={mood === "idle" ? undefined : mood}
      overflow={overflow}
      size={size}
    />
  );
}
