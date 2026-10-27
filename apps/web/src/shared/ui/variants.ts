import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';

const FOCUS =
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';
const MOTION = 'transition-colors duration-(--duration-fast)';

/** Buttons (UI-UX.md §4): solid for the main action, glass for secondary ones over the backdrop. */
export const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${FOCUS} ${MOTION}`,
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background text-foreground hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        glass:
          'border border-glass-border bg-glass-strong text-foreground shadow-glass backdrop-blur-glass backdrop-saturate-150 hover:bg-card reduced-transparency:backdrop-filter-none',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        icon: 'size-10',
      },
      // Main actions are pills (DEC-087); the rest follow the control radius.
      shape: { default: 'rounded-control', pill: 'rounded-full' },
    },
    defaultVariants: { variant: 'default', size: 'md', shape: 'default' },
  },
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;

/** Status badges: colour plus text, never colour alone (UI-UX.md §9). */
export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-input text-foreground',
        success: 'border-transparent bg-success text-success-foreground',
        warning: 'border-transparent bg-warning text-warning-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        provisional: 'border-provisional text-provisional',
        official: 'border-official text-official',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);
export type BadgeVariants = VariantProps<typeof badgeVariants>;

/** Fields are always opaque, so their contrast never depends on the backdrop (UI-UX.md §3.3). */
export const fieldClasses = `flex h-10 w-full rounded-control border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive ${FOCUS} ${MOTION}`;
