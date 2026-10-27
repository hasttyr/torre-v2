<script setup lang="ts">
import { Toaster as Sonner } from 'vue-sonner';
import { glassSurfaceStrong } from './glass.js';

/**
 * Where toasts appear (UI-UX.md §2.3, §9): one per app, in the layout. Sonner announces them in an
 * `aria-live` region; they are styled here with the glass tokens instead of Sonner's own look.
 */
defineProps<{ label: string }>();
</script>

<template>
  <Sonner
    position="bottom-right"
    :container-aria-label="label"
    :toast-options="{
      unstyled: true,
      classes: {
        toast: `${glassSurfaceStrong} flex w-[min(24rem,100vw-2rem)] items-start gap-3 rounded-card p-4 text-sm text-foreground`,
        title: 'font-semibold',
        description: 'text-muted-foreground',
        success: '[&_[data-icon]]:text-success',
        error: '[&_[data-icon]]:text-destructive',
        warning: '[&_[data-icon]]:text-warning',
        actionButton: 'rounded-control bg-primary px-3 py-1 text-primary-foreground',
        cancelButton: 'rounded-control bg-secondary px-3 py-1 text-secondary-foreground',
      },
    }"
  />
</template>
