<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui';
import { glassSurfaceStrong } from './glass.js';

/** A short hint on hover and on keyboard focus; never the only place for important information. */
defineProps<{ content: string }>();
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <TooltipRoot>
      <TooltipTrigger as-child><slot /></TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          :side-offset="6"
          :class="[glassSurfaceStrong, 'z-50 max-w-xs rounded-control px-3 py-1.5 text-sm text-foreground']"
        >
          {{ content }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
