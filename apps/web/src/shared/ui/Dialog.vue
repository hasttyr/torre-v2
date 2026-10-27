<script setup lang="ts">
import { X } from 'lucide-vue-next';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui';
import { cn } from './cn.js';
import { glassSurfaceStrong } from './glass.js';

/**
 * A modal dialog of glass (UI-UX.md §3.3, §4): title and description are required for screen readers;
 * focus stays inside and Escape closes it. Confirmations of irreversible actions use it with a reason.
 */
const props = defineProps<{ title: string; description?: string; closeLabel: string; class?: string }>();
const open = defineModel<boolean>('open', { default: false });
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></DialogTrigger>
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[2px] reduced-transparency:backdrop-filter-none"
      />
      <DialogContent
        :class="
          cn(
            glassSurfaceStrong,
            'fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-panel p-6 text-foreground focus:outline-none',
            props.class,
          )
        "
      >
        <div class="grid gap-1.5 pr-8">
          <DialogTitle class="text-lg font-semibold">{{ title }}</DialogTitle>
          <DialogDescription v-if="description" class="text-sm text-muted-foreground">{{
            description
          }}</DialogDescription>
        </div>
        <slot />
        <div v-if="$slots.footer" class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <slot name="footer" />
        </div>
        <DialogClose
          :aria-label="closeLabel"
          class="absolute top-4 right-4 rounded-control p-1 text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X class="size-4" aria-hidden="true" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
