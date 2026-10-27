<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { GlassPanel } from '../../shared/ui/index.js';

const { t } = useI18n();
</script>

<template>
  <GlassPanel class="max-w-2xl">
    <h1 class="text-3xl font-bold tracking-tight">{{ t('app.name') }}</h1>
    <p class="mt-2 text-lg font-medium">{{ t('home.title') }}</p>
    <p class="mt-1 text-muted-foreground">{{ t('home.description') }}</p>
  </GlassPanel>
</template>
