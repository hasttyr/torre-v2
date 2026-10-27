<script setup lang="ts">
import { cn } from './cn.js';

/** Loading placeholder; static on purpose (UI-UX.md §3.2 allows transitions only, no looping animation). */
const props = defineProps<{ class?: string }>();
</script>

<template>
  <div aria-hidden="true" :class="cn('rounded-control bg-muted', props.class)" />
</template>
