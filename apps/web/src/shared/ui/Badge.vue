<script setup lang="ts">
import { cn } from './cn.js';
import { badgeVariants } from './variants.js';
import type { BadgeVariants } from './variants.js';

const props = defineProps<{ variant?: BadgeVariants['variant']; class?: string }>();
</script>

<template>
  <span :class="cn(badgeVariants({ variant }), props.class)"><slot /></span>
</template>
