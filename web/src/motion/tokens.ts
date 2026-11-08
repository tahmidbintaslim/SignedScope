// Motion tokens (docs/BRAND.md, Figma "08 Motion"). Framer Motion takes seconds and bezier arrays.
import type { Transition, Variants } from 'motion/react';

export const duration = { fast: 0.12, base: 0.2, slow: 0.32, page: 0.4 } as const;
export const ease = {
  standard: [0.2, 0, 0, 1],
  enter: [0.05, 0.7, 0.1, 1],
  exit: [0.3, 0, 0.8, 0.15],
} as const satisfies Record<string, [number, number, number, number]>;
export const spring: Transition = { type: 'spring', stiffness: 400, damping: 30 };

/** Buttons and pressable cards: scale on press, following the finger. */
export const press = { whileTap: { scale: 0.97 }, transition: spring } as const;

/** Page change: fade and rise 8px. */
export const page: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: duration.page, ease: ease.enter } },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: ease.exit } },
};

/** Dialogs: fade and scale from 0.96. */
export const dialog: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  enter: { opacity: 1, scale: 1, transition: { duration: duration.slow, ease: ease.enter } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: duration.base, ease: ease.exit } },
};

/** Sheets slide 24px from their edge. */
export const sheet: Variants = {
  initial: { opacity: 0, y: 24 },
  enter: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.enter } },
  exit: { opacity: 0, y: 24, transition: { duration: duration.base, ease: ease.exit } },
};

/** Toasts rise 12px. */
export const toast: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.enter } },
  exit: { opacity: 0, y: 12, transition: { duration: duration.fast, ease: ease.exit } },
};

/** Lists: children stagger 40ms. */
export const list: Variants = { enter: { transition: { staggerChildren: 0.04 } } };
export const listItem: Variants = page;

export const backdrop: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: duration.base } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
};
