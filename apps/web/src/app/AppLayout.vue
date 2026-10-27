<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { glassSurfaceStrong } from '../shared/ui/index.js';

const { t } = useI18n();
</script>

<template>
  <!-- Base layout (US-009:AC4) on the brand backdrop that the glass blurs (UI-UX.md §3.3). -->
  <div
    class="min-h-dvh bg-background bg-[radial-gradient(at_0%_0%,var(--color-backdrop-primary),transparent_55%),radial-gradient(at_100%_0%,var(--color-backdrop-accent),transparent_50%)] bg-fixed font-sans text-foreground antialiased"
  >
    <a
      href="#content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-2 focus:ring-2 focus:ring-ring"
    >
      {{ t('app.skipToContent') }}
    </a>
    <header :class="[glassSurfaceStrong, 'sticky top-0 z-40 border-x-0 border-t-0']">
      <div class="mx-auto flex h-14 max-w-6xl items-center px-4">
        <RouterLink
          :to="{ name: 'home' }"
          class="rounded-control px-2 py-1 text-lg font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {{ t('app.name') }}
        </RouterLink>
      </div>
    </header>
    <main id="content" tabindex="-1" class="mx-auto max-w-6xl px-4 py-10 focus:outline-none">
      <RouterView />
    </main>
  </div>
</template>
