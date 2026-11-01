import { useId, useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { LineMascotArt, type LineAnimalKey, type LineMood } from "./line-mascots";
import { useMascotLife } from "./use-mascot-life";
import "./line-mascot.css";

/**
 * A line mascot at its size. `live` gives it eyes that follow the pointer,
 * blinks and moods (see useMascotLife); without it the portrait is still.
 * `overflow` lets ears, horns and paws leave the round frame.
 */
export function LineMascot({
  animal,
  size,
  live = false,
  overflow = true,
  frame = true,
  mood,
  trigger,
  className,
}: {
  animal: LineAnimalKey;
  size: number;
  live?: boolean;
  overflow?: boolean;
  frame?: boolean;
  /** A mood set by the caller (a preview, a state of the app) over the mascot's own. */
  mood?: LineMood;
  /** The element whose hover makes the mascot happy; the mascot itself by default. */
  trigger?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const clipId = `lm${useId().replace(/:/g, "")}`;
  const life = useMascotLife(ref, live, trigger);
  return (
    <span
      aria-hidden="true"
      className={cn("lm-root", className)}
      data-animal={animal}
      data-blink={life.blink || undefined}
      data-mood={mood ?? life.mood}
      data-still={!live || life.still || undefined}
      data-twitch={life.twitch ?? undefined}
      ref={ref}
      style={{ width: size, height: size }}
    >
      <LineMascotArt animal={animal} clipId={clipId} frame={frame} overflow={overflow} />
    </span>
  );
}
