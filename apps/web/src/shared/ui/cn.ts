import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** tailwind-merge that knows the design tokens, so `rounded-card` overrides `rounded-control`, etc. */
const merge = extendTailwindMerge({
  extend: {
    theme: { radius: ['control', 'card', 'panel'], blur: ['glass', 'glass-strong'], shadow: ['glass'] },
  },
});

/** Joins class lists; later classes win over earlier ones of the same kind (the shadcn-vue `cn`). */
export const cn = (...inputs: ClassValue[]): string => merge(clsx(inputs));
