<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui';
import { cn } from './cn.js';

// `id` and the ARIA attributes of FormField fall through to the control.
const props = defineProps<{ disabled?: boolean; class?: string }>();
const checked = defineModel<boolean>({ default: false });
</script>

<template>
  <CheckboxRoot
    v-model="checked"
    :disabled="disabled"
    :class="
      cn(
        'peer grid size-5 shrink-0 place-content-center rounded-md border border-input bg-background text-primary-foreground transition-colors duration-(--duration-fast) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        props.class,
      )
    "
  >
    <CheckboxIndicator>
      <Check class="size-4" aria-hidden="true" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
