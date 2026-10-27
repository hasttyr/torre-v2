<script setup lang="ts">
import { computed, useId } from 'vue';
import { Label } from 'reka-ui';

/**
 * The one form field pattern (UI-UX.md §4): a label that is always visible, optional help and the
 * error of the field; the slot receives the attributes that tie the control to them.
 */
const props = defineProps<{ label: string; help?: string; error?: string; required?: boolean }>();
const id = useId();
const helpId = `${id}-help`;
const errorId = `${id}-error`;
const control = computed(() => ({
  id,
  'aria-describedby':
    [props.help ? helpId : null, props.error ? errorId : null].filter((part) => part !== null).join(' ') || undefined,
  'aria-invalid': props.error ? true : undefined,
  'aria-required': props.required ? true : undefined,
}));
</script>

<template>
  <div class="grid gap-1.5">
    <Label :for="id" class="text-sm font-medium text-foreground">
      {{ label }}<span v-if="required" aria-hidden="true" class="text-destructive"> *</span>
    </Label>
    <slot v-bind="control" />
    <p v-if="help" :id="helpId" class="text-sm text-muted-foreground">{{ help }}</p>
    <p v-if="error" :id="errorId" class="text-sm font-medium text-destructive">{{ error }}</p>
  </div>
</template>
