<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section aria-labelledby="forbidden-title">
    <h1 id="forbidden-title">{{ t('pages.forbidden.title') }}</h1>
    <p>{{ t('pages.forbidden.body') }}</p>
    <RouterLink :to="{ name: 'home' }">{{ t('pages.backHome') }}</RouterLink>
  </section>
</template>
