<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
import { glassSurface } from './glass.js';

/** Tabs with arrow-key navigation; each item's panel is the slot named after its value. */
defineProps<{ items: readonly { value: string; label: string }[]; label: string }>();
const active = defineModel<string>({ required: true });
</script>

<template>
  <TabsRoot v-model="active" class="grid gap-4">
    <TabsList :aria-label="label" :class="[glassSurface, 'inline-flex w-fit gap-1 rounded-full p-1']">
      <TabsTrigger
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        class="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
      >
        {{ item.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent v-for="item in items" :key="item.value" :value="item.value" class="focus-visible:outline-none">
      <slot :name="item.value" />
    </TabsContent>
  </TabsRoot>
</template>
