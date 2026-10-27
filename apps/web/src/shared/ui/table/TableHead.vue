<script setup lang="ts">
import { cn } from '../cn.js';

const props = defineProps<{ class?: string }>();
</script>

<template>
  <th scope="col" :class="cn('h-10 px-3 text-left align-middle font-semibold text-muted-foreground', props.class)">
    <slot />
  </th>
</template>
