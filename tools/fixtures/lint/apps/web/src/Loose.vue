<script setup lang="ts">
// Lint fixture (US-009): a component that breaks the TypeScript and Vue rules.
const props = defineProps<{ value: any }>();
const items = [1, 2];
</script>

<template>
  <ul>
    <li v-for="item in items">{{ item }}{{ props.value }}</li>
  </ul>
</template>
