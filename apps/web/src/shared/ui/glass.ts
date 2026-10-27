/**
 * Glass surfaces (UI-UX.md §3.3, DEC-085, DEC-087), as Tailwind classes so every surface is built the
 * same way. Tokens switch to opaque colours by themselves when transparency is reduced or in projector
 * mode; the variant only drops the saturation of the backdrop filter.
 */
const BASE =
  'border border-glass-border shadow-glass inset-shadow-[0_1px_0_var(--glass-highlight)] backdrop-saturate-150 reduced-transparency:backdrop-filter-none';

/** Cards and panels over the brand backdrop. */
export const glassSurface = `${BASE} bg-glass backdrop-blur-glass`;

/** Bars, dialogs, menus, popovers and toasts, which float over content. */
export const glassSurfaceStrong = `${BASE} bg-glass-strong backdrop-blur-glass-strong`;
