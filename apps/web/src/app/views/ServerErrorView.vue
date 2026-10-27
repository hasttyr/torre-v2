<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();
/** The correlation id of the failed request, for support (UI-UX.md §4). */
const reference = computed(() => (typeof route.query['ref'] === 'string' ? route.query['ref'] : null));
</script>

<template>
  <section aria-labelledby="server-error-title">
    <h1 id="server-error-title">{{ t('pages.serverError.title') }}</h1>
    <p>{{ t('pages.serverError.body') }}</p>
    <p v-if="reference">
      {{ t('pages.serverError.reference') }}: <code data-testid="reference">{{ reference }}</code>
    </p>
    <RouterLink :to="{ name: 'home' }">{{ t('pages.backHome') }}</RouterLink>
  </section>
</template>
