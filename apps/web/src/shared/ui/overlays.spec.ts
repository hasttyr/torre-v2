import { flushPromises, mount } from '@vue/test-utils';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue';
import type { Component } from 'vue';
import {
  Button,
  Combobox,
  DatePicker,
  DateRangePicker,
  Dialog,
  Drawer,
  parseDate,
  Select,
  Tabs,
  Toaster,
  toast,
  Tooltip,
} from './index.js';
import type { DateRange, DateValue } from './index.js';

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

function render(component: Component) {
  const wrapper = mount(component, { attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}

/** Portals render outside the wrapper, so queries go to the document. */
const $ = (selector: string) => document.body.querySelector<HTMLElement>(selector);
const $$ = (selector: string) => [...document.body.querySelectorAll<HTMLElement>(selector)];

async function violations(element: Element | null) {
  // Contrast is measured on the tokens; landmarks (`region`) belong to whole pages (e2e, US-079).
  const result = await axe.run(element ?? document.body, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`);
}

const key = async (target: Element | Document, name: string) => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
  await flushPromises();
};

describe('shared/ui overlays and pickers (US-069b2)', () => {
  it('[US-069:AC3] should open a titled dialog from its trigger and close it with Escape', async () => {
    render(
      defineComponent(
        () => () =>
          h(
            Dialog,
            { title: 'Cerrar la ronda 3', description: 'Los resultados quedan oficiales.', closeLabel: 'Cerrar' },
            {
              trigger: () => h(Button, null, () => 'Cerrar ronda'),
              default: () => h('p', 'Hay 0 partidas pendientes.'),
            },
          ),
      ),
    );
    $('button')!.click();
    await flushPromises();
    const dialog = $('[role="dialog"]')!;

    expect(dialog.getAttribute('aria-labelledby')).toBe($('h2')?.id);
    expect(dialog.className).toContain('bg-glass-strong');
    expect(await violations(dialog)).toEqual([]);

    await key(dialog, 'Escape');
    expect($('[role="dialog"]')).toBeNull();
  });

  it('[US-069:AC3] should slide a drawer in from the chosen side, with a labelled close button', async () => {
    const open = ref(true);
    render(
      defineComponent(
        () => () =>
          h(
            Drawer,
            {
              title: 'Filtros',
              closeLabel: 'Cerrar filtros',
              side: 'left',
              open: open.value,
              'onUpdate:open': (v: boolean) => (open.value = v),
            },
            () => h('p', 'Ronda'),
          ),
      ),
    );
    await flushPromises();

    expect($('[role="dialog"]')!.className).toContain('rounded-r-panel');
    $('button[aria-label="Cerrar filtros"]')!.click();
    await flushPromises();
    expect(open.value).toBe(false);
  });

  it('[US-069:AC3] should show a tooltip when its trigger gets keyboard focus', async () => {
    render(
      defineComponent(
        () => () => h(Tooltip, { content: 'Copiar enlace' }, () => h(Button, { size: 'icon' }, () => '⧉')),
      ),
    );
    $('button')!.focus();
    $('button')!.dispatchEvent(new FocusEvent('focus'));
    await vi.waitFor(() => expect($('[role="tooltip"]')?.textContent).toContain('Copiar enlace'));
  });

  it('[US-069:AC3] should switch tabs and keep a labelled tab list', async () => {
    const active = ref('standings');
    const wrapper = render(
      defineComponent(
        () => () =>
          h(
            Tabs,
            {
              label: 'Vistas del torneo',
              items: [
                { value: 'standings', label: 'Clasificación' },
                { value: 'pairings', label: 'Mesas' },
              ],
              modelValue: active.value,
              'onUpdate:modelValue': (v: string) => (active.value = v),
            },
            { standings: () => h('p', 'Tabla de puntos'), pairings: () => h('p', 'Mesas de la ronda') },
          ),
      ),
    );
    const [, pairings] = $$('[role="tab"]');
    pairings!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    await flushPromises();

    expect($('[role="tablist"]')!.getAttribute('aria-label')).toBe('Vistas del torneo');
    expect(active.value).toBe('pairings');
    expect(wrapper.text()).toContain('Mesas de la ronda');
    expect(await violations(wrapper.element as Element)).toEqual([]);
  });

  it('[US-069:AC3] should pick one option of a select with the keyboard', async () => {
    const value = ref<string | null>(null);
    render(
      defineComponent(
        () => () =>
          h(Select, {
            placeholder: 'Rama',
            options: [
              { value: 'F', label: 'Femenina' },
              { value: 'M', label: 'Masculina' },
            ],
            modelValue: value.value,
            'onUpdate:modelValue': (v: string | null) => (value.value = v),
          }),
      ),
    );
    await key($('button')!, 'Enter');
    await vi.waitFor(() => expect($$('[role="option"]')).toHaveLength(2));
    $$('[role="option"]')[1]!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' }));
    await flushPromises();

    expect(value.value).toBe('M');
  });

  it('[US-069:AC3] should choose several options in a combobox and remove them as tags', async () => {
    const chosen = ref<string[]>(['udea']);
    render(
      defineComponent(
        () => () =>
          h(Combobox, {
            placeholder: 'Instituciones',
            emptyText: 'Sin coincidencias',
            removeLabel: (label: string) => `Quitar ${label}`,
            options: [
              { value: 'udea', label: 'Universidad Demo de Antioquia' },
              { value: 'uandes', label: 'Universidad Demo Andina' },
            ],
            modelValue: chosen.value,
            'onUpdate:modelValue': (v: string[]) => (chosen.value = v),
          }),
      ),
    );

    expect($('button[aria-label="Quitar Universidad Demo de Antioquia"]')).not.toBeNull();
    $('button[aria-label="Quitar Universidad Demo de Antioquia"]')!.click();
    await flushPromises();
    expect(chosen.value).toEqual([]);
    expect(await violations(document.body)).toEqual([]);
  });

  it('[US-069:AC3] should show and change a date in Spanish (Colombia), day first', async () => {
    const date = shallowRef<DateValue | null>(parseDate('2026-11-14'));
    render(
      defineComponent(
        () => () =>
          h(DatePicker, {
            labels: { open: 'Abrir calendario', previous: 'Mes anterior', next: 'Mes siguiente' },
            modelValue: date.value,
            'onUpdate:modelValue': (v: DateValue | null) => (date.value = v),
          }),
      ),
    );
    await flushPromises();
    const parts = ['day', 'month', 'year'].map((part) => $(`[data-reka-date-field-segment="${part}"]`)?.textContent);
    const order = $$('[data-reka-date-field-segment]').map((s) => s.getAttribute('data-reka-date-field-segment'));

    expect(parts).toEqual(['14', '11', '2026']);
    expect(order.indexOf('day')).toBeLessThan(order.indexOf('month'));
    $('button[aria-label="Abrir calendario"]')!.click();
    await flushPromises();
    await nextTick();
    const day = $$('[role="gridcell"] [data-reka-calendar-cell-trigger]').find((d) => d.textContent?.trim() === '20');
    day?.click();
    await flushPromises();
    expect(date.value?.toString()).toBe('2026-11-20');
  });

  it('[US-069:AC3] should show a date range with its start and end', async () => {
    const range = shallowRef<DateRange | null>({ start: parseDate('2026-11-14'), end: parseDate('2026-11-16') });
    render(
      defineComponent(
        () => () =>
          h(DateRangePicker, {
            labels: { open: 'Abrir calendario', previous: 'Mes anterior', next: 'Mes siguiente' },
            modelValue: range.value,
            'onUpdate:modelValue': (v: DateRange | null) => (range.value = v),
          }),
      ),
    );
    await flushPromises();
    const days = $$('[data-reka-date-field-segment="day"]').map((s) => s.textContent);

    expect(days).toEqual(['14', '16']);
    expect(await violations(document.body)).toEqual([]);
  });

  it('[US-069:AC3] should announce toasts in a labelled live region', async () => {
    render(defineComponent(() => () => h(Toaster, { label: 'Avisos' })));
    toast.success('Resultado guardado');
    await vi.waitFor(() => expect(document.body.textContent).toContain('Resultado guardado'));

    expect($('section[aria-label^="Avisos"]')).not.toBeNull();
  });
});
