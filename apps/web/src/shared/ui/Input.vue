<script setup lang="ts">
import { cn } from './cn.js';
import { fieldClasses } from './variants.js';

const props = defineProps<{ class?: string }>();
const model = defineModel<string>();
</script>

<template>
  <input v-model="model" :class="cn(fieldClasses, props.class)" />
</template>
