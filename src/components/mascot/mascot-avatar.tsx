import type { MascotAnimal } from "@/lib/mascot-preferences";
import { LineMascot } from "./line-mascot";
import { lineAnimalOf } from "./mascot-assets";
// The sidebar brand, the choices and the settings panel are styled here.
import "./mascot.css";

export type MascotMood = "idle" | "happy" | "thinking";

export interface MascotAvatarProps {
  animal: MascotAnimal;
  animated?: boolean;
  /** Kept for callers of the earlier portraits; the line mascot breathes on its own. */
  idle?: boolean;
  size?: number;
  framing?: "full" | "portrait";
  className?: string;
  mood?: MascotMood;
  /** Ears and horns may leave the round frame. */
  overflow?: boolean;
}

/**
 * The clinic's mascot as a line portrait (see line-mascots): alive when
 * `animated`, its mood set by the caller when the app has one to show
 * (the assistant thinking, a welcome), its own otherwise.
 */
export function MascotAvatar({ animal, animated = true, size = 48, className, mood = "idle", overflow = false }: MascotAvatarProps) {
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
