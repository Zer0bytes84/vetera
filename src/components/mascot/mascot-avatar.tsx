import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import type { MascotAnimal } from "@/lib/mascot-preferences";
import { cn } from "@/lib/utils";
import "./mascot.css";


function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
function isPageVisible() {
  return !document.hidden;
}
function serverPageVisible() {
  return true;
}

export type MascotMood = "idle" | "happy" | "thinking";

export interface MascotAvatarProps {
  animal: MascotAnimal;
  animated?: boolean;
  idle?: boolean;
  size?: number;
  framing?: "full" | "portrait";
  className?: string;
  mood?: MascotMood;
}

interface CharacterProps {
  headRotate: MotionValue<number>;
  faceTranslateX: MotionValue<number>;
  faceTranslateY: MotionValue<number>;
  eyeTranslateX: MotionValue<number>;
  eyeTranslateY: MotionValue<number>;
  earRotateL: MotionValue<number>;
  earRotateR: MotionValue<number>;
  blink: boolean;
  isHovered: boolean;
}

interface TrackingEyesProps {
  eyeTranslateX: MotionValue<number>;
  eyeTranslateY: MotionValue<number>;
  blink: boolean;
  patch?: boolean;
}

interface CuteMouthProps {
  isHovered: boolean;
  yOffset?: number;
  stroke?: string;
}

const BaseGumdrop = ({ fill }: { fill: string }) => (
  <path d="M 18 55 C 18 15 82 15 82 55 C 88 95 12 95 18 55 Z" fill={fill} />
);

const TrackingEyes = ({
  eyeTranslateX,
  eyeTranslateY,
  blink,
  patch,
}: TrackingEyesProps) => (
  <motion.g
    animate={{ scaleY: blink ? 0.05 : 1 }}
    transition={{ duration: 0.1 }}
    style={{ transformOrigin: "50px 48px" }}
  >
    {patch && (
      <>
        <ellipse
          cx="30"
          cy="48"
          rx="14"
          ry="16"
          fill="#1e293b"
          style={{ transform: "rotate(15deg)", transformOrigin: "30px 48px" }}
        />
        <ellipse
          cx="70"
          cy="48"
          rx="14"
          ry="16"
          fill="#1e293b"
          style={{ transform: "rotate(-15deg)", transformOrigin: "70px 48px" }}
        />
      </>
    )}
    <ellipse cx="32" cy="48" rx="8" ry="10" fill="white" />
    <motion.g style={{ x: eyeTranslateX, y: eyeTranslateY }}>
      <circle cx="32" cy="48" r="5" fill="#1e293b" />
      <circle cx="33.5" cy="46" r="1.5" fill="white" />
    </motion.g>
    <ellipse cx="68" cy="48" rx="8" ry="10" fill="white" />
    <motion.g style={{ x: eyeTranslateX, y: eyeTranslateY }}>
      <circle cx="68" cy="48" r="5" fill="#1e293b" />
      <circle cx="69.5" cy="46" r="1.5" fill="white" />
    </motion.g>
  </motion.g>
);

const CuteMouth = ({
  isHovered,
  yOffset = 0,
  stroke = "#1e293b",
}: CuteMouthProps) => (
  <motion.g animate={{ y: isHovered ? yOffset - 1 : yOffset }}>
    {isHovered ? (
      <path
        d="M 45 62 Q 50 68 55 62"
        stroke={stroke}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    ) : (
      <>
        <path
          d="M 50 60 C 46 64 42 62 42 60"
          stroke={stroke}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 50 60 C 54 64 58 62 58 60"
          stroke={stroke}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </>
    )}
  </motion.g>
);

function CatMascot({ headRotate, faceTranslateX, faceTranslateY, eyeTranslateX, eyeTranslateY, earRotateL, earRotateR, blink, isHovered }: CharacterProps) {
  return (
    <motion.g style={{ rotate: headRotate, transformOrigin: '50px 50px' }}>
      <motion.g style={{ rotate: earRotateL, transformOrigin: '20px 35px' }} animate={isHovered ? { rotate: -15 } : {}}>
        <path d="M 12 40 Q 12 10 40 25 Z" fill="#f97316" />
        <path d="M 18 37 Q 18 16 35 27 Z" fill="#f472b6" />
      </motion.g>
      <motion.g style={{ rotate: earRotateR, transformOrigin: '80px 35px' }} animate={isHovered ? { rotate: 15 } : {}}>
        <path d="M 88 40 Q 88 10 60 25 Z" fill="#f97316" />
        <path d="M 82 37 Q 82 16 65 27 Z" fill="#f472b6" />
      </motion.g>
      <BaseGumdrop fill="#f97316" />
      <motion.g style={{ x: faceTranslateX, y: faceTranslateY }}>
        <ellipse cx="50" cy="62" rx="16" ry="12" fill="#ffedd5" />
        {/* Whiskers */}
        <line x1="26" y1="60" x2="14" y2="58" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
        <line x1="26" y1="64" x2="14" y2="66" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
        <line x1="74" y1="60" x2="86" y2="58" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
        <line x1="74" y1="64" x2="86" y2="66" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
        <TrackingEyes eyeTranslateX={eyeTranslateX} eyeTranslateY={eyeTranslateY} blink={blink} />
        <path d="M 47 57 Q 50 60 53 57 Z" fill="#f472b6" />
        <CuteMouth isHovered={isHovered} />
      </motion.g>
    </motion.g>
  );
}

function DogMascot({ headRotate, faceTranslateX, faceTranslateY, eyeTranslateX, eyeTranslateY, earRotateL, earRotateR, blink, isHovered }: CharacterProps) {
  return (
    <motion.g style={{ rotate: headRotate, transformOrigin: '50px 50px' }}>
      <motion.g style={{ rotate: earRotateL, transformOrigin: '25px 45px' }} animate={isHovered ? { rotate: -25, y: -5 } : {}}>
        <path d="M 30 35 C -5 35 0 95 25 80 C 35 70 35 50 30 35 Z" fill="#b45309" />
      </motion.g>
      <motion.g style={{ rotate: earRotateR, transformOrigin: '75px 45px' }} animate={isHovered ? { rotate: 25, y: -5 } : {}}>
        <path d="M 70 35 C 105 35 100 95 75 80 C 65 70 65 50 70 35 Z" fill="#b45309" />
      </motion.g>
      <BaseGumdrop fill="#f59e0b" />
      <motion.g style={{ x: faceTranslateX, y: faceTranslateY }}>
        <ellipse cx="50" cy="64" rx="20" ry="15" fill="#fef3c7" />
        <TrackingEyes eyeTranslateX={eyeTranslateX} eyeTranslateY={eyeTranslateY} blink={blink} />
        <ellipse cx="50" cy="58" rx="7" ry="5" fill="#1e293b" />
        {isHovered ? (
          <motion.g animate={{ y: -1 }}>
            <path d="M 50 63 L 50 66" stroke="#1e293b" strokeWidth="1.5" />
            <path d="M 44 66 C 44 78 56 78 56 66 Z" fill="#f472b6" />
          </motion.g>
        ) : (
          <CuteMouth isHovered={false} yOffset={4} />
        )}
      </motion.g>
    </motion.g>
  );
}

function FennecMascot({ headRotate, faceTranslateX, faceTranslateY, eyeTranslateX, eyeTranslateY, earRotateL, earRotateR, blink, isHovered }: CharacterProps) {
  return (
    <motion.g style={{ rotate: headRotate, transformOrigin: '50px 50px' }}>
      {/* Giant Fennec Ears */}
      <motion.g style={{ rotate: earRotateL, transformOrigin: '30px 42px' }} animate={isHovered ? { rotate: -18, scale: 1.05 } : {}}>
        <path d="M 28 42 C 10 32 -2 6 12 2 C 26 1 36 22 40 34 Z" fill="#fde68a" />
        <path d="M 26 38 C 14 30 5 12 15 8 C 24 7 32 24 35 32 Z" fill="#fbcfe8" />
        <path d="M 24 36 Q 30 28 34 35" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
      </motion.g>
      <motion.g style={{ rotate: earRotateR, transformOrigin: '70px 42px' }} animate={isHovered ? { rotate: 18, scale: 1.05 } : {}}>
        <path d="M 72 42 C 90 32 102 6 88 2 C 74 1 64 22 60 34 Z" fill="#fde68a" />
        <path d="M 74 38 C 86 30 95 12 85 8 C 76 7 68 24 65 32 Z" fill="#fbcfe8" />
        <path d="M 76 36 Q 70 28 66 35" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
      </motion.g>

      {/* Body: Sandy desert coat */}
      <BaseGumdrop fill="#fde68a" />

      {/* Face & Muzzle */}
      <motion.g style={{ x: faceTranslateX, y: faceTranslateY }}>
        {/* White cheek fluff */}
        <path d="M 20 54 Q 50 46 80 54 C 82 82 18 82 20 54 Z" fill="#ffffff" />

        {/* Rosy blush */}
        <circle cx="28" cy="58" r="4.5" fill="#f43f5e" opacity="0.18" />
        <circle cx="72" cy="58" r="4.5" fill="#f43f5e" opacity="0.18" />

        {/* Tracking eyes */}
        <TrackingEyes eyeTranslateX={eyeTranslateX} eyeTranslateY={eyeTranslateY} blink={blink} />

        {/* Tiny button nose & mouth */}
        <ellipse cx="50" cy="57" rx="3.5" ry="2.5" fill="#1e293b" />
        <path d="M 50 59 L 50 61" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        <CuteMouth isHovered={isHovered} yOffset={1} />
      </motion.g>
    </motion.g>
  );
}

function CowMascot({ headRotate, faceTranslateX, faceTranslateY, eyeTranslateX, eyeTranslateY, earRotateL, earRotateR, blink, isHovered }: CharacterProps) {
  return (
    <motion.g style={{ rotate: headRotate, transformOrigin: '50px 50px' }}>
      {/* Little Golden Horns */}
      <path d="M 33 28 C 26 14 36 12 38 22 Z" fill="#fcd34d" stroke="#d97706" strokeWidth="0.8" />
      <path d="M 67 28 C 74 14 64 12 62 22 Z" fill="#fcd34d" stroke="#d97706" strokeWidth="0.8" />

      {/* Floppy Cow Ears */}
      <motion.g style={{ rotate: earRotateL, transformOrigin: '24px 38px' }} animate={isHovered ? { rotate: -18 } : {}}>
        <ellipse cx="14" cy="38" rx="14" ry="7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" transform="rotate(-18 14 38)" />
        <ellipse cx="14" cy="38" rx="9" ry="4" fill="#fbcfe8" transform="rotate(-18 14 38)" />
      </motion.g>
      <motion.g style={{ rotate: earRotateR, transformOrigin: '76px 38px' }} animate={isHovered ? { rotate: 18 } : {}}>
        <ellipse cx="86" cy="38" rx="14" ry="7" fill="#1e293b" transform="rotate(18 86 38)" />
        <ellipse cx="86" cy="38" rx="9" ry="4" fill="#fbcfe8" transform="rotate(18 86 38)" />
      </motion.g>

      {/* White Body */}
      <BaseGumdrop fill="#ffffff" />

      {/* Cow Dark Patch over right side of head/eye */}
      <path d="M 52 18 C 75 18 84 35 80 52 C 72 58 60 50 56 36 Z" fill="#1e293b" />

      {/* Forehead Hair Tuft */}
      <path d="M 46 20 Q 50 14 54 20" stroke="#fcd34d" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Face: Eyes & Snout */}
      <motion.g style={{ x: faceTranslateX, y: faceTranslateY }}>
        <TrackingEyes eyeTranslateX={eyeTranslateX} eyeTranslateY={eyeTranslateY} blink={blink} />

        {/* Pink Snout / Muzzle */}
        <ellipse cx="50" cy="65" rx="18" ry="11" fill="#fbcfe8" />
        <ellipse cx="44" cy="63" rx="2.5" ry="3" fill="#db2777" opacity="0.6" />
        <ellipse cx="56" cy="63" rx="2.5" ry="3" fill="#db2777" opacity="0.6" />

        {isHovered ? (
          <path d="M 45 68 Q 50 74 55 68" stroke="#be185d" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M 46 68 Q 50 72 54 68" stroke="#be185d" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        )}
      </motion.g>
    </motion.g>
  );
}

function RabbitMascot({ headRotate, faceTranslateX, faceTranslateY, eyeTranslateX, eyeTranslateY, earRotateL, earRotateR, blink, isHovered }: CharacterProps) {
  return (
    <motion.g style={{ rotate: headRotate, transformOrigin: '50px 50px' }}>
      <motion.g style={{ rotate: earRotateL, transformOrigin: '35px 40px' }} animate={isHovered ? { rotate: -15 } : {}}>
        <path d="M 35 45 C 20 -10 45 -10 45 45 Z" fill="#f8fafc" />
        <path d="M 37 40 C 28 0 41 0 41 40 Z" fill="#f472b6" />
      </motion.g>
      <motion.g style={{ rotate: earRotateR, transformOrigin: '65px 40px' }} animate={isHovered ? { rotate: 15 } : {}}>
        <path d="M 65 45 C 80 -10 55 -10 55 45 Z" fill="#f8fafc" />
        <path d="M 63 40 C 72 0 59 0 59 40 Z" fill="#f472b6" />
      </motion.g>
      <BaseGumdrop fill="#f8fafc" />
      <motion.g style={{ x: faceTranslateX, y: faceTranslateY }}>
        {/* Soft Blush */}
        <circle cx="26" cy="56" r="5" fill="#f43f5e" opacity="0.18" />
        <circle cx="74" cy="56" r="5" fill="#f43f5e" opacity="0.18" />
        <TrackingEyes eyeTranslateX={eyeTranslateX} eyeTranslateY={eyeTranslateY} blink={blink} />
        <path d="M 48 57 Q 50 60 52 57 Z" fill="#f472b6" />
        <path d="M 50 59 L 50 61" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
        <CuteMouth isHovered={isHovered} yOffset={4} />
      </motion.g>
    </motion.g>
  );
}

function FoxMascot({ headRotate, faceTranslateX, faceTranslateY, eyeTranslateX, eyeTranslateY, earRotateL, earRotateR, blink, isHovered }: CharacterProps) {
  return (
    <motion.g style={{ rotate: headRotate, transformOrigin: '50px 50px' }}>
      <motion.g style={{ rotate: earRotateL, transformOrigin: '20px 35px' }} animate={isHovered ? { rotate: -15 } : {}}>
        <path d="M 10 35 L 20 0 L 45 25 Z" fill="#ea580c" />
        <path d="M 10 35 L 20 0 L 25 15 Z" fill="#1e293b" />
        <path d="M 18 32 L 23 12 L 38 25 Z" fill="#fef3c7" />
      </motion.g>
      <motion.g style={{ rotate: earRotateR, transformOrigin: '80px 35px' }} animate={isHovered ? { rotate: 15 } : {}}>
        <path d="M 90 35 L 80 0 L 55 25 Z" fill="#ea580c" />
        <path d="M 90 35 L 80 0 L 75 15 Z" fill="#1e293b" />
        <path d="M 82 32 L 77 12 L 62 25 Z" fill="#fef3c7" />
      </motion.g>
      <BaseGumdrop fill="#ea580c" />
      <motion.g style={{ x: faceTranslateX, y: faceTranslateY }}>
        <path d="M 18 55 Q 50 45 82 55 C 82 85 18 85 18 55 Z" fill="#fef3c7" />
        <TrackingEyes eyeTranslateX={eyeTranslateX} eyeTranslateY={eyeTranslateY} blink={blink} />
        <ellipse cx="50" cy="59" rx="5" ry="3.5" fill="#1e293b" />
        <CuteMouth isHovered={isHovered} yOffset={2} />
      </motion.g>
    </motion.g>
  );
}

function PandaMascot({ headRotate, faceTranslateX, faceTranslateY, eyeTranslateX, eyeTranslateY, earRotateL, earRotateR, blink, isHovered }: CharacterProps) {
  return (
    <motion.g style={{ rotate: headRotate, transformOrigin: '50px 50px' }}>
      <motion.g style={{ rotate: earRotateL, transformOrigin: '20px 30px' }} animate={isHovered ? { rotate: -15, y: -2 } : {}}>
        <circle cx="20" cy="25" r="15" fill="#1e293b" />
      </motion.g>
      <motion.g style={{ rotate: earRotateR, transformOrigin: '80px 30px' }} animate={isHovered ? { rotate: 15, y: -2 } : {}}>
        <circle cx="80" cy="25" r="15" fill="#1e293b" />
      </motion.g>
      <BaseGumdrop fill="#ffffff" />
      <motion.g style={{ x: faceTranslateX, y: faceTranslateY }}>
        <TrackingEyes eyeTranslateX={eyeTranslateX} eyeTranslateY={eyeTranslateY} blink={blink} patch={true} />
        <ellipse cx="50" cy="59" rx="4" ry="3" fill="#1e293b" />
        <CuteMouth isHovered={isHovered} yOffset={2} />
      </motion.g>
    </motion.g>
  );
}

function BearMascot({ headRotate, faceTranslateX, faceTranslateY, eyeTranslateX, eyeTranslateY, earRotateL, earRotateR, blink, isHovered }: CharacterProps) {
  return (
    <motion.g style={{ rotate: headRotate, transformOrigin: '50px 50px' }}>
      <motion.g style={{ rotate: earRotateL, transformOrigin: '20px 30px' }} animate={isHovered ? { rotate: -15, y: -2 } : {}}>
        <circle cx="20" cy="25" r="14" fill="#78350f" />
        <circle cx="20" cy="25" r="8" fill="#d97706" />
      </motion.g>
      <motion.g style={{ rotate: earRotateR, transformOrigin: '80px 30px' }} animate={isHovered ? { rotate: 15, y: -2 } : {}}>
        <circle cx="80" cy="25" r="14" fill="#78350f" />
        <circle cx="80" cy="25" r="8" fill="#d97706" />
      </motion.g>
      <BaseGumdrop fill="#78350f" />
      <motion.g style={{ x: faceTranslateX, y: faceTranslateY }}>
        <ellipse cx="50" cy="62" rx="16" ry="13" fill="#d97706" />
        <TrackingEyes eyeTranslateX={eyeTranslateX} eyeTranslateY={eyeTranslateY} blink={blink} />
        <ellipse cx="50" cy="57" rx="5" ry="3.5" fill="#451a03" />
        <CuteMouth isHovered={isHovered} yOffset={1} stroke="#451a03" />
      </motion.g>
    </motion.g>
  );
}


function VectorMascot({
  animal,
  animated,
  idle,
  size,
  framing,
  className,
  visible,
  mood = "idle",
}: {
  animal: MascotAnimal;
  animated: boolean;
  idle: boolean;
  size: number;
  framing: "full" | "portrait";
  className?: string;
  visible: boolean;
  mood?: MascotMood;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const smoothX = useSpring(pointerX, { damping: 14, stiffness: 180, mass: 0.5 });
  const smoothY = useSpring(pointerY, { damping: 14, stiffness: 180, mass: 0.5 });

  const headRotate = useTransform(smoothX, [-1, 1], [-20, 20]);
  const faceTranslateX = useTransform(smoothX, [-1, 1], [-12, 12]);
  const faceTranslateY = useTransform(smoothY, [-1, 1], [-12, 12]);

  // Now mapped to pupil movement inside the sclera
  const eyeTranslateX = useTransform(smoothX, [-1, 1], [-4, 4]);
  const eyeTranslateY = useTransform(smoothY, [-1, 1], [-4, 4]);

  const earRotateL = useTransform(smoothX, [-1, 1], [-20, 10]);
  const earRotateR = useTransform(smoothX, [-1, 1], [-10, 20]);

  const [isHovered, setIsHovered] = useState(false);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!animated || !visible) return;

    let blinkTimeout: ReturnType<typeof setTimeout>;
    const triggerBlink = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);

      if (Math.random() > 0.75) {
        setTimeout(() => {
          setBlink(true);
          setTimeout(() => setBlink(false), 180);
        }, 220);
      }

      blinkTimeout = setTimeout(triggerBlink, Math.random() * 800 + 3000);
    };
    blinkTimeout = setTimeout(triggerBlink, 1500);

    return () => clearTimeout(blinkTimeout);
  }, [animated, visible]);

  useEffect(() => {
    if (!animated || !visible) return;
    const trigger =
      containerRef.current?.closest<HTMLElement>(".mascot-greeting-target") ||
      containerRef.current;
    if (!trigger) return;

    const motionQuery = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );

    const followPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const bounds = trigger.getBoundingClientRect();
      const x = Math.max(
        -1.5,
        Math.min(1.5, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)
      );
      const y = Math.max(
        -1.5,
        Math.min(1.5, ((event.clientY - bounds.top) / bounds.height) * 2 - 1)
      );
      pointerX.set(x);
      pointerY.set(y);
    };

    const handleEnter = () => setIsHovered(true);
    const handleLeave = () => {
      setIsHovered(false);
      pointerX.set(0);
      pointerY.set(0);
    };

    const syncTracking = () => {
      trigger.removeEventListener("pointermove", followPointer);
      if (motionQuery.matches) {
        trigger.addEventListener("pointermove", followPointer);
      }
    };

    syncTracking();
    motionQuery.addEventListener("change", syncTracking);
    trigger.addEventListener("pointerenter", handleEnter);
    trigger.addEventListener("pointerleave", handleLeave);
    trigger.addEventListener("blur", handleLeave);

    return () => {
      motionQuery.removeEventListener("change", syncTracking);
      trigger.removeEventListener("pointermove", followPointer);
      trigger.removeEventListener("pointerenter", handleEnter);
      trigger.removeEventListener("pointerleave", handleLeave);
      trigger.removeEventListener("blur", handleLeave);
      pointerX.set(0);
      pointerY.set(0);
    };
  }, [animated, visible, pointerX, pointerY]);

  const commonProps = {
    headRotate,
    faceTranslateX,
    faceTranslateY,
    eyeTranslateX,
    eyeTranslateY,
    earRotateL,
    earRotateR,
    blink,
    isHovered,
  };

  return (
    <span
      aria-hidden="true"
      ref={containerRef}
      className={cn("mascot-root plush-mascot", className)}
      data-animal={animal}
      data-framing={framing}
      data-idle={idle ? "true" : "false"}
      data-animated={animated && visible ? "true" : "false"}
      data-mood={mood}
      style={{ "--mascot-size": `${size}px`, width: size, height: size } as CSSProperties}
    >
      <span className="mascot-3d-wrapper" style={{ width: size, height: size }}>
        <span className="plush-mascot-lens">
          <motion.div
            className="plush-mascot-look"
            whileHover={animated ? { scale: 1.08, rotate: 2 } : {}}
            whileTap={animated ? { scale: 0.9, rotate: -3 } : {}}
            animate={
              idle && animated && !isHovered
                ? mood === "happy"
                  ? { y: [0, -4, 0], scale: [1, 1.05, 1] }
                  : mood === "thinking"
                    ? { rotate: [0, 3, -3, 0], y: [0, -2, 0] }
                    : { y: [0, -6, 0], scaleY: [1, 1.03, 1] }
                : {}
            }
            transition={
              isHovered
                ? { type: "spring", stiffness: 400, damping: 15 }
                : idle && animated
                  ? {
                      duration: mood === "happy" ? 1.2 : mood === "thinking" ? 2.4 : 3.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
                  : {}
            }
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="7.5 7.5 85 85"
              width="100%"
              height="100%"
              style={{ overflow: "visible" }}
            >
              {(animal === "cat" || animal === "chat") && <CatMascot {...commonProps} />}
              {(animal === "dog" || animal === "chien") && <DogMascot {...commonProps} />}
              {(animal === "rabbit" || animal === "lapin") && <RabbitMascot {...commonProps} />}
              {animal === "fennec" && <FennecMascot {...commonProps} />}
              {animal === "fox" && <FoxMascot {...commonProps} />}
              {animal === "vache" && <CowMascot {...commonProps} />}
              {animal === "panda" && <PandaMascot {...commonProps} />}
              {animal === "bear" && <BearMascot {...commonProps} />}
            </svg>
          </motion.div>
        </span>
      </span>
    </span>
  );
}

export function MascotAvatar({
  animal,
  animated = true,
  idle = true,
  size = 48,
  framing = "portrait",
  className,
  mood = "idle",
}: MascotAvatarProps) {
  const visible = useSyncExternalStore(
    subscribeToVisibility,
    isPageVisible,
    serverPageVisible
  );

  return (
    <VectorMascot
      animal={animal}
      animated={animated}
      idle={idle}
      size={size}
      framing={framing}
      className={className}
      visible={visible}
      mood={mood}
    />
  );
}
