<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui';
import { cn } from './cn.js';

// `id` and the ARIA attributes of FormField fall through to the control.
const props = defineProps<{ disabled?: boolean; class?: string }>();
const checked = defineModel<boolean>({ default: false });
</script>

<template>
  <SwitchRoot
    v-model="checked"
    :disabled="disabled"
    :class="
      cn(
        'peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-input bg-muted transition-colors duration-(--duration-fast) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        props.class,
      )
    "
  >
    <SwitchThumb
      class="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-card shadow-sm transition-transform duration-(--duration-fast) data-[state=checked]:translate-x-5"
    />
  </SwitchRoot>
</template>
