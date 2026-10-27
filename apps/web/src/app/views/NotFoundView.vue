<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section aria-labelledby="not-found-title">
    <h1 id="not-found-title">{{ t('pages.notFound.title') }}</h1>
    <p>{{ t('pages.notFound.body') }}</p>
    <RouterLink :to="{ name: 'home' }">{{ t('pages.backHome') }}</RouterLink>
  </section>
</template>
