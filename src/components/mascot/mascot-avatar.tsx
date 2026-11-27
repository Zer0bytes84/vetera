import type { MascotAnimal } from "@/lib/mascot-preferences";
import { cn } from "@/lib/utils";
import { COLOR_MASCOTS, USE_COLOR_MASCOTS } from "./color-mascots";
import { LineMascot } from "./line-mascot";
import { lineAnimalOf } from "./mascot-assets";
// The sidebar brand, the choices and the settings panel are styled here.
import "./mascot.css";

export type MascotMood = "idle" | "happy" | "thinking";

/** From this size the colour companion breathes: the sidebar brand, the settings preview, the assistant's header. */
const LIVELY_SIZE = 34;

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
  // The colour portrait (USE_COLOR_MASCOTS; the line drawings stay as a fallback). Its life is CSS only, in
  // transform (mascot.css): a slow breath where it is well seen, a pulse while the assistant thinks, a hop when happy;
  // small sizes (buttons, messages) stay still, and nothing moves when the system asks for reduced motion.
  if (USE_COLOR_MASCOTS) {
    const key = lineAnimalOf(animal);
    return (
      <span
        aria-hidden="true"
        className={cn("mascot-color", className)}
        data-animal={key}
        data-life={animated && size >= LIVELY_SIZE ? "on" : undefined}
        data-mood={animated && mood !== "idle" ? mood : undefined}
        style={{ width: size, height: size }}
      >
        <span className="mascot-color-body">
          <img
            alt=""
            decoding="async"
            draggable={false}
            height={size}
            src={COLOR_MASCOTS[key]}
            width={size}
          />
        </span>
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
