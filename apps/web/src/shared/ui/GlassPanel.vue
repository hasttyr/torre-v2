<script setup lang="ts">
import { glassSurface } from './glass.js';

/** A card of glass over the backdrop (UI-UX.md §3.3); dense tables use an opaque card instead. */
withDefaults(defineProps<{ as?: string }>(), { as: 'section' });
</script>

<template>
  <component :is="as" :class="[glassSurface, 'rounded-card p-6']">
    <slot />
  </component>
</template>
