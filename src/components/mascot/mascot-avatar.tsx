import { useRef } from "react";
import { useMascotPreferences } from "@/hooks/use-mascot-preferences";
import type { MascotAnimal } from "@/lib/mascot-preferences";
import { cn } from "@/lib/utils";
import { COLOR_MASCOTS, USE_COLOR_MASCOTS } from "./color-mascots";
import { LineMascot } from "./line-mascot";
import type { LineAnimalKey } from "./line-mascots";
import { lineAnimalOf } from "./mascot-assets";
import { FACE_VARIANTS } from "./mascot-face";
// The sidebar brand, the choices and the settings panel are styled here.
import "./mascot.css";
import { useMascotFace } from "./use-mascot-face";

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
  if (USE_COLOR_MASCOTS) {
    return (
      <ColorPortrait
        animal={lineAnimalOf(animal)}
        animated={animated}
        className={className}
        mood={mood}
        size={size}
      />
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

// The colour portrait (USE_COLOR_MASCOTS; the line drawings stay as a fallback). Its life is in transform only
// (mascot.css, mascot-motion.ts): where it is well seen, a breath with a sway and an occasional blink
// (data-life), a lean on hover and a hop on click (data-motion); a pulse while the assistant thinks, a hop when
// happy. Small sizes (buttons, messages) stay still; « Animations discrètes » off stills it all, and so does a
// system that asks for reduced motion.
// Where it is lively, its face lives too (use-mascot-face.ts): it blinks, follows the pointer, smiles at a click,
// dozes off and wakes, by swapping aligned expressions stacked over the base; only the shown one is visible.
function ColorPortrait({
  animal,
  animated,
  className,
  mood,
  size,
}: {
  animal: LineAnimalKey;
  animated: boolean;
  className?: string;
  mood: MascotMood;
  size: number;
}) {
  const portrait = useRef<HTMLSpanElement>(null);
  const motionAllowed = useMascotPreferences().animated;
  const lively = size >= LIVELY_SIZE;
  const living = animated && motionAllowed && lively;
  const { face, faces } = useMascotFace(portrait, animal, living);
  return (
    <span
      aria-hidden="true"
      className={cn("mascot-color", className)}
      data-animal={animal}
      data-faces={faces ? "on" : undefined}
      data-life={living ? "on" : undefined}
      data-mood={
        animated && motionAllowed && mood !== "idle" ? mood : undefined
      }
      data-motion={motionAllowed && lively ? "on" : undefined}
      ref={portrait}
      style={{ width: size, height: size }}
    >
      <span className="mascot-color-body">
        <img
          alt=""
          data-face-hidden={face === "base" ? undefined : ""}
          decoding="async"
          draggable={false}
          height={size}
          src={COLOR_MASCOTS[animal]}
          width={size}
        />
        {faces &&
          FACE_VARIANTS.map((variant) => (
            <img
              alt=""
              className="mascot-color-face"
              data-face={variant}
              data-shown={face === variant ? "" : undefined}
              decoding="async"
              draggable={false}
              height={size}
              key={variant}
              src={faces[variant]}
              width={size}
            />
          ))}
      </span>
    </span>
  );
}
