<script setup lang="ts">
import { Primitive } from 'reka-ui';
import type { PrimitiveProps } from 'reka-ui';
import { cn } from './cn.js';
import { buttonVariants } from './variants.js';
import type { ButtonVariants } from './variants.js';

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  shape?: ButtonVariants['shape'];
  class?: string;
}
const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  variant: 'default',
  size: 'md',
  shape: 'default',
  class: '',
});
</script>

<template>
  <Primitive :as="as" :as-child="asChild" :class="cn(buttonVariants({ variant, size, shape }), props.class)">
    <slot />
  </Primitive>
</template>
