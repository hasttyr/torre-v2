<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <!-- Base layout (US-009:AC4); the design system of US-069 styles it. -->
  <a href="#content">{{ t('app.skipToContent') }}</a>
  <header>
    <RouterLink :to="{ name: 'home' }">{{ t('app.name') }}</RouterLink>
  </header>
  <main id="content" tabindex="-1">
    <RouterView />
  </main>
</template>
