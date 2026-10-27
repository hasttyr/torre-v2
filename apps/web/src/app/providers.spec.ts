import { mount, flushPromises } from '@vue/test-utils';
import { QueryClient, useQuery } from '@tanstack/vue-query';
import { defineStore } from 'pinia';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { useI18n } from 'vue-i18n';
import { createMemoryHistory } from 'vue-router';
import App from './App.vue';
import { installProviders } from './providers.js';
import { createAppRouter, routes } from './router.js';

const useUiStore = defineStore('ui', { state: () => ({ sidebarOpen: true }) });

/** Uses every provider at once: i18n, Pinia, Vue Query and the router. */
const Probe = defineComponent(() => {
  const { t, locale } = useI18n();
  const ui = useUiStore();
  const query = useQuery({ queryKey: ['probe'], queryFn: () => Promise.resolve('server state') });
  return () => h('p', `${t('app.name')}|${locale.value}|${String(ui.sidebarOpen)}|${query.data.value ?? ''}`);
});

describe('web providers (US-009)', () => {
  it('[US-009:AC2] should install the router, Pinia, Vue Query and vue-i18n in Spanish', async () => {
    const router = createAppRouter(createMemoryHistory());
    const wrapper = mount(Probe, {
      global: {
        plugins: [{ install: (app) => installProviders(app, { router, queryClient: new QueryClient() }) }],
      },
    });
    await flushPromises();

    expect(wrapper.text()).toBe('Torre|es|true|server state');
  });

  it('[US-009:AC2] should load every route on demand', () => {
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) expect(typeof route.component).toBe('function');
  });

  it('[US-009:AC1] should render the home view through the router', async () => {
    const router = createAppRouter(createMemoryHistory());
    const wrapper = mount(App, { global: { plugins: [{ install: (app) => installProviders(app, { router }) }] } });
    await router.push('/');
    await flushPromises();

    expect(wrapper.find('h1').text()).toBe('Torre');
    expect(wrapper.text()).toContain('Torneos de ajedrez universitarios');
  });
});
