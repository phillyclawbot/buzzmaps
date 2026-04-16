import type { Variants } from "framer-motion";

/** Standard spring used for most entrance / layout animations. */
export const springy = {
  type: "spring" as const,
  stiffness: 260,
  damping: 22,
  mass: 0.9,
};

/** Snappier spring for pin drops & micro-interactions. */
export const snap = {
  type: "spring" as const,
  stiffness: 520,
  damping: 28,
  mass: 0.6,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: springy },
};

export const pinDrop: Variants = {
  hidden: { opacity: 0, y: -24, scale: 0.5 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...snap, delay: 0.05 },
  },
};

/** Use on a parent to stagger children. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const hoverLift = {
  whileHover: { y: -4, transition: { type: "spring" as const, stiffness: 300, damping: 20 } },
  whileTap: { scale: 0.97 },
};

export const tap = {
  whileTap: { scale: 0.94 },
};
