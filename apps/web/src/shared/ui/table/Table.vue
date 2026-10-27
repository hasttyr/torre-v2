<script setup lang="ts">
import { cn } from '../cn.js';

/** Dense data tables sit on an opaque card, never on glass (UI-UX.md §3.3); numbers are tabular. */
const props = defineProps<{ class?: string }>();
</script>

<template>
  <div class="w-full overflow-x-auto rounded-card border border-border bg-card">
    <table :class="cn('w-full caption-bottom text-sm text-card-foreground tabular-nums', props.class)">
      <slot />
    </table>
  </div>
</template>
