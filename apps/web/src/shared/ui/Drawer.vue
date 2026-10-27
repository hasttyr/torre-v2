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

/** A side panel of glass on Reka's dialog, like shadcn-vue's Sheet (ADR-0005: no vaul-vue). */
const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    closeLabel: string;
    side?: 'left' | 'right' | 'bottom';
    class?: string;
  }>(),
  { side: 'right', description: '', class: '' },
);
const open = defineModel<boolean>('open', { default: false });

const SIDES = {
  left: 'inset-y-0 left-0 h-full w-[min(24rem,100%-3rem)] rounded-r-panel',
  right: 'inset-y-0 right-0 h-full w-[min(24rem,100%-3rem)] rounded-l-panel',
  bottom: 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-panel',
} as const;
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
            'fixed z-50 flex flex-col gap-4 overflow-y-auto p-6 text-foreground focus:outline-none',
            SIDES[side],
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
