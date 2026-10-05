import type { Variants } from "framer-motion";

export const MOTION = {
  fast: 0.15,
  base: 0.22,
  easeOut: [0.2, 0, 0, 1] as const,
  icon: { type: "spring" as const, duration: 0.3, bounce: 0 },
};
export const rowMotion: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION.base, ease: MOTION.easeOut },
  },
  exit: {
    opacity: 0,
    y: 4,
    transition: { duration: MOTION.fast, ease: MOTION.easeOut },
  },
};
export const reducedRowMotion: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: MOTION.fast } },
  exit: { opacity: 0, transition: { duration: MOTION.fast } },
};
