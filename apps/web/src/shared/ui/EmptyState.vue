<script setup lang="ts">
/** What a list shows when it has nothing (UI-UX.md §4): what happened and what to do next. */
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <div
    role="status"
    class="flex flex-col items-center gap-2 rounded-card border border-dashed border-input px-6 py-10 text-center"
  >
    <div class="text-muted-foreground [&_svg]:size-8"><slot name="icon" /></div>
    <p class="text-base font-semibold text-foreground">{{ title }}</p>
    <p v-if="description" class="max-w-sm text-sm text-muted-foreground">{{ description }}</p>
    <div class="mt-2"><slot name="action" /></div>
  </div>
</template>
