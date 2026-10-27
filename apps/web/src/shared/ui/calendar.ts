import { fieldClasses } from './variants.js';

/** Classes shared by DatePicker and DateRangePicker, so both calendars look the same. */
export const calendarClasses = {
  field: `${fieldClasses} items-center gap-0.5`,
  segment: 'rounded px-0.5 tabular-nums focus:bg-muted focus:outline-none data-[placeholder]:text-muted-foreground',
  trigger:
    'ml-auto rounded-control p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
  content: 'z-50 rounded-panel p-3 text-foreground',
  header: 'flex items-center justify-between pb-2',
  heading: 'text-sm font-semibold capitalize',
  nav: 'inline-flex size-8 items-center justify-center rounded-control hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
  grid: 'w-full border-collapse select-none',
  row: 'grid grid-cols-7',
  headCell: 'pb-1 text-center text-xs font-medium text-muted-foreground',
  day: 'inline-flex size-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors duration-(--duration-fast) hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[disabled]:opacity-40 data-[outside-view]:text-muted-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[today]:font-bold data-[highlighted]:bg-secondary data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground',
} as const;
