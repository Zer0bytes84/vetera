import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AgentStatus } from "@/components/ui/agent-status";
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
  const [startedAt] = useState(() => Date.now());
  useEffect(() => {
    const timer = setTimeout(() => setHint(true), HINT_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="microphone-permission-wait flex flex-col gap-1.5">
      <AgentStatus
        data={{ label: "Autorisation du microphone…", startedAt }}
        onStop={onCancel}
        stopLabel="Annuler"
      />
      <p className="px-2 text-xs leading-relaxed text-muted-foreground">
        {hint
          ? "Aucune fenêtre ne s’affiche ? Ouvrez Réglages Système → Confidentialité et sécurité → Microphone, autorisez Baitari, puis cliquez à nouveau sur Dicter."
          : "Si macOS vous le demande, cliquez sur Autoriser."}
      </p>
    </div>
  );
}

/**
 * Microphone opened, level not settled yet: a new capture reaches the page
 * attenuated for its first seconds. The vet waits for « Écoute en cours ».
 */
export function MicrophoneWarmup({ onCancel }: { onCancel: () => void }) {
  const [startedAt] = useState(() => Date.now());
  return (
    <div className="microphone-warmup">
      <AgentStatus
        data={{ label: "Préparation du micro…", detail: "Parlez dès « Écoute en cours ».", startedAt }}
        onStop={onCancel}
        stopLabel="Annuler"
      />
    </div>
  );
}
