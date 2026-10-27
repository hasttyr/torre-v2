<script setup lang="ts">
import { computed } from 'vue';
import { Check, X } from 'lucide-vue-next';
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxViewport,
} from 'reka-ui';
import { glassSurfaceStrong } from './glass.js';

/**
 * Multiple choice with search (UI-UX.md §2.3): the chosen values are tags that can be removed one by one,
 * and typing filters the list.
 */
const props = defineProps<{
  options: readonly { value: string; label: string }[];
  placeholder: string;
  emptyText: string;
  /** Accessible name of each tag's remove button, e.g. `(label) => \`Quitar ${label}\``. */
  removeLabel: (label: string) => string;
}>();
const selected = defineModel<string[]>({ default: () => [] });

const labelOf = computed(() => new Map(props.options.map((o) => [o.value, o.label])));
const remove = (value: string) => {
  selected.value = selected.value.filter((v) => v !== value);
};
</script>

<template>
  <ComboboxRoot v-model="selected" multiple>
    <ComboboxAnchor
      class="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-control border border-input bg-background px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring"
    >
      <span
        v-for="value in selected"
        :key="value"
        class="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pr-1 pl-2.5 text-xs font-medium text-secondary-foreground"
      >
        {{ labelOf.get(value) ?? value }}
        <button
          type="button"
          :aria-label="removeLabel(labelOf.get(value) ?? value)"
          class="rounded-full p-0.5 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="remove(value)"
        >
          <X class="size-3" aria-hidden="true" />
        </button>
      </span>
      <ComboboxInput
        :placeholder="placeholder"
        class="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-foreground outline-none placeholder:text-muted-foreground"
      />
    </ComboboxAnchor>
    <ComboboxPortal>
      <ComboboxContent
        position="popper"
        :side-offset="4"
        :class="[
          glassSurfaceStrong,
          'z-50 max-h-72 w-(--reka-combobox-trigger-width) overflow-hidden rounded-card p-1 text-foreground',
        ]"
      >
        <ComboboxViewport>
          <ComboboxEmpty class="px-3 py-2 text-sm text-muted-foreground">{{ emptyText }}</ComboboxEmpty>
          <ComboboxItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            class="relative flex cursor-default items-center rounded-control py-2 pr-8 pl-3 text-sm outline-none select-none data-[highlighted]:bg-card"
          >
            {{ option.label }}
            <ComboboxItemIndicator class="absolute right-2"
              ><Check class="size-4" aria-hidden="true"
            /></ComboboxItemIndicator>
          </ComboboxItem>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
