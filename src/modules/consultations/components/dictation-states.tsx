import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import "./dictation-states.css";

/** Bar weights, highest in the middle: the meter reads as one voice, not a spectrum. */
const BARS = [0.5, 0.78, 1, 0.78, 0.5];
const FOLLOW_UP = 0.45;
const FALL_BACK = 0.07;
/** Below this smoothed level the room is taken as silent. */
const SILENCE = 0.08;

/**
 * Recording indicator driven by the real microphone level, readable from
 * across the table: the bars rise when the vet speaks and settle into a slow
 * breath in silence. Animated outside React renders (requestAnimationFrame
 * writes CSS variables), so the assistant panel never re-renders per frame.
 */
export function DictationLevelMeter({ read, className }: { read: () => number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frame = 0;
    let smooth = 0;
    const tick = (time: number) => {
      const level = read();
      smooth += (level - smooth) * (level > smooth ? FOLLOW_UP : FALL_BACK);
      const node = ref.current;
      if (node) {
        // A slight per-bar sway keeps a sustained voice from looking frozen.
        BARS.forEach((weight, index) => {
          const sway = 0.82 + 0.18 * Math.sin(time / 140 + index * 1.7);
          node.style.setProperty(`--bar-${index}`, (smooth * weight * sway).toFixed(3));
        });
        node.toggleAttribute("data-silent", smooth < SILENCE);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [read]);
  return (
    <span
      aria-label="Niveau du micro : la dictée enregistre"
      className={["dictation-level", className].filter(Boolean).join(" ")}
      data-silent=""
      ref={ref}
      role="img"
    >
      {BARS.map((_, index) => (
        <span key={index} style={{ "--bar": `var(--bar-${index}, 0)` } as CSSProperties} />
      ))}
    </span>
  );
}

/** After this wait, the panel explains where the permission is given. */
const HINT_AFTER_MS = 5_000;

/**
 * Waiting for macOS to answer the microphone permission: never a dead end.
 * Annuler always ends the wait; after a few seconds the panel says where to
 * grant the permission, in case the system dialog never showed.
 */
export function MicrophonePermissionWait({ onCancel }: { onCancel: () => void }) {
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setHint(true), HINT_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div
      aria-live="polite"
      className="microphone-permission-wait flex flex-col gap-2 rounded-xl border border-border bg-card px-3.5 py-3 t-13 shadow-xs"
      role="status"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Spinner className="size-3.5" />
          Autorisation du microphone…
        </span>
        <Button className="h-7 px-2.5 t-12" onClick={onCancel} size="xs" variant="outline">
          Annuler
        </Button>
      </div>
      <p className="t-12 leading-relaxed text-muted-foreground">
        {hint
          ? "Aucune fenêtre ne s’affiche ? Ouvrez Réglages Système → Confidentialité et sécurité → Microphone, autorisez Baitari, puis cliquez à nouveau sur Dicter."
          : "Si macOS vous le demande, cliquez sur Autoriser."}
      </p>
    </div>
  );
}
