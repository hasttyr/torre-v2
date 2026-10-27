import type { App } from 'vue';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import type { Router } from 'vue-router';
import { createAppI18n } from './i18n.js';

/**
 * Router, Pinia (UI and session state only), Vue Query (server state) and vue-i18n, installed once
 * for the app and for component tests alike (US-009:AC2, ARCHITECTURE.md §13.2).
 */
export function installProviders(app: App, { router, queryClient }: { router: Router; queryClient?: QueryClient }) {
  const i18n = createAppI18n();
  app.use(router);
  app.use(createPinia());
  app.use(VueQueryPlugin, { queryClient: queryClient ?? new QueryClient() });
  app.use(i18n);
  return { i18n };
}
