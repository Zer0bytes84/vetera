import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import "./assistant-welcome-text.css";

const WELCOME_TEXT =
  "Dictez ou écrivez librement vos observations de consultation. Mentionnez vos patients avec @nom. Vos données restent exclusivement sur cet appareil.";
const CHARACTER_DELAY_MS = 22;
const START_DELAY_MS = 180;
export const FIRST_QUESTION_DELAY_MS =
  START_DELAY_MS + Array.from(WELCOME_TEXT).length * CHARACTER_DELAY_MS + 160;

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Presentation only: reserve final geometry and announce the complete text once. */
export function AssistantTypingText({
  text,
  startDelay = START_DELAY_MS,
  kind = "question",
  renderText = (value) => value,
}: {
  text: string;
  startDelay?: number;
  kind?: "welcome" | "question";
  renderText?: (text: string) => ReactNode;
}) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => true
  );
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const characters = Array.from(text);
  const characterCount = characters.length;
  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const startedAt = performance.now() + startDelay;
    const reveal = (now: number) => {
      const count = Math.min(
        characterCount,
        Math.max(0, Math.floor((now - startedAt) / CHARACTER_DELAY_MS))
      );
      setVisibleCharacters(count);
      if (count < characterCount) frame = requestAnimationFrame(reveal);
    };
    // The delayed question does not need animation frames during the greeting.
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(reveal);
    }, startDelay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [reducedMotion, characterCount, startDelay]);
  const complete = reducedMotion || visibleCharacters === characterCount;
  return (
    <span
      className="grid"
      data-assistant-welcome={kind === "welcome" ? true : undefined}
      data-assistant-question={kind === "question" ? true : undefined}
      data-typing={!complete}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {renderText(text)}
      </span>
      <span aria-hidden="true" className="col-start-1 row-start-1">
        {renderText(
          reducedMotion ? text : characters.slice(0, visibleCharacters).join("")
        )}
        {!complete && <span className="assistant-welcome-caret" />}
      </span>
    </span>
  );
}

export function AssistantWelcomeText() {
  return <AssistantTypingText text={WELCOME_TEXT} kind="welcome" />;
}
