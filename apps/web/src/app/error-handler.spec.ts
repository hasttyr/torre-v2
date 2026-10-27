import { flushPromises, mount } from '@vue/test-utils';
import { ORPCError } from '@orpc/client';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { createMemoryHistory } from 'vue-router';
import App from './App.vue';
import { installErrorHandler } from './error-handler.js';
import { installProviders } from './providers.js';
import { createAppRouter } from './router.js';

/** The app with a route whose view throws `error` when it renders. */
async function appThrowing(error: unknown) {
  const router = createAppRouter(createMemoryHistory());
  const reported: unknown[] = [];
  router.addRoute({
    path: '/boom',
    component: defineComponent({
      render() {
        throw error;
      },
    }),
  });
  const wrapper = mount(App, {
    global: {
      plugins: [
        {
          install: (app) => {
            installProviders(app, { router });
            installErrorHandler(app, router, (e) => reported.push(e));
          },
        },
      ],
    },
  });
  await router.push('/boom');
  // The error page is a lazy chunk: the first import can take more than a tick.
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBeDefined());
  await flushPromises();
  return { wrapper, router, reported };
}

const apiFailure = (status: number, code: string) =>
  new ORPCError(code, {
    status,
    data: { body: { type: 'about:blank', title: code, status, code, correlationId: 'corr-500' } },
  });

describe('error pages (US-009:AC4)', () => {
  it('[US-009:AC4] should show the 404 page for an unknown address, inside the base layout', async () => {
    const router = createAppRouter(createMemoryHistory());
    const wrapper = mount(App, { global: { plugins: [{ install: (app) => installProviders(app, { router }) }] } });
    await router.push('/no/such/page');
    await flushPromises();

    expect(wrapper.find('h1').text()).toBe('Página no encontrada');
    expect(wrapper.find('a[href="#content"]').text()).toBe('Saltar al contenido');
    expect(wrapper.find('main#content').exists()).toBe(true);
  });

  it('[US-009:AC4] should send an unexpected error to the 500 page with the id for support', async () => {
    const { wrapper, router, reported } = await appThrowing(apiFailure(500, 'INTERNAL_ERROR'));

    expect(reported).toHaveLength(1);
    expect(router.currentRoute.value.name).toBe('server-error');
    expect(wrapper.find('h1').text()).toBe('Algo salió mal');
    expect(wrapper.find('[data-testid="reference"]').text()).toBe('corr-500');
  });

  it('[US-009:AC4] should send a FORBIDDEN answer to the 403 page', async () => {
    const { wrapper, router } = await appThrowing(apiFailure(403, 'FORBIDDEN'));

    expect(router.currentRoute.value.name).toBe('forbidden');
    expect(wrapper.find('h1').text()).toBe('Sin permiso');
  });

  it('[US-009:AC4] should show the 500 page without a reference for an error outside the API', async () => {
    const { wrapper, router } = await appThrowing(new TypeError('a bug'));

    expect(router.currentRoute.value.name).toBe('server-error');
    expect(wrapper.find('[data-testid="reference"]').exists()).toBe(false);
  });
});
