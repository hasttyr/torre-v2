<script setup lang="ts">
import { Check, ChevronDown } from 'lucide-vue-next';
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui';
import { cn } from './cn.js';
import { glassSurfaceStrong } from './glass.js';
import { fieldClasses } from './variants.js';

/** Single choice from a short list; for long or searchable lists use Combobox. */
const props = defineProps<{
  options: readonly { value: string; label: string }[];
  placeholder: string;
  class?: string;
}>();
const model = defineModel<string | null>({ default: null });
</script>

<template>
  <SelectRoot v-model="model">
    <SelectTrigger :class="cn(fieldClasses, 'items-center justify-between', props.class)">
      <SelectValue :placeholder="placeholder" />
      <ChevronDown class="size-4 opacity-60" aria-hidden="true" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="4"
        :class="[
          glassSurfaceStrong,
          'z-50 max-h-72 min-w-(--reka-select-trigger-width) overflow-hidden rounded-card p-1 text-foreground',
        ]"
      >
        <SelectViewport>
          <SelectItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            class="relative flex cursor-default items-center rounded-control py-2 pr-8 pl-3 text-sm outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-card"
          >
            <SelectItemText>{{ option.label }}</SelectItemText>
            <SelectItemIndicator class="absolute right-2"
              ><Check class="size-4" aria-hidden="true"
            /></SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
