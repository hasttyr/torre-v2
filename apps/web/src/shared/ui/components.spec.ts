import { flushPromises, mount } from '@vue/test-utils';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './index.js';

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

/** Mounts into the document, where axe can see it. */
function render(component: ReturnType<typeof defineComponent>) {
  const wrapper = mount(component, { attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}

/** axe on the rendered element; contrast is measured on the tokens instead (tokens.spec.ts). */
async function violations(element: unknown) {
  // VueWrapper types its root element as `any`.
  const result = await axe.run(element as Element, { rules: { 'color-contrast': { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`);
}

describe('shared/ui primitives (US-069b)', () => {
  it('[US-069:AC3] should render buttons in every variant, as links too, and keep them accessible', async () => {
    const wrapper = render(
      defineComponent(
        () => () =>
          h('div', [
            h(Button, null, () => 'Guardar'),
            h(Button, { variant: 'glass', shape: 'pill' }, () => 'Compartir'),
            h(Button, { variant: 'destructive', disabled: true }, () => 'Borrar'),
            h(Button, { asChild: true }, () => h('a', { href: '/t/demo' }, 'Ver torneo')),
          ]),
      ),
    );

    expect(wrapper.findAll('button')).toHaveLength(3);
    expect(wrapper.find('a').classes()).toContain('rounded-control');
    expect(wrapper.findAll('button')[1]!.classes()).toEqual(
      expect.arrayContaining(['bg-glass-strong', 'rounded-full']),
    );
    expect(wrapper.findAll('button')[2]!.attributes()).toHaveProperty('disabled');
    expect(await violations(wrapper.element)).toEqual([]);
  });

  it('[US-069:AC3] should tie the label, help and error of a field to its control', async () => {
    const name = ref('Ana');
    const wrapper = render(
      defineComponent(
        () => () =>
          h(
            FormField,
            { label: 'Nombre', help: 'Como aparece en la clasificación', error: 'Es obligatorio', required: true },
            {
              default: (attrs: Record<string, unknown>) =>
                h(Input, {
                  ...attrs,
                  modelValue: name.value,
                  'onUpdate:modelValue': (v: string | undefined) => (name.value = v ?? ''),
                }),
            },
          ),
      ),
    );
    const input = wrapper.find('input');
    await input.setValue('Bea');

    expect(wrapper.find('label').attributes('for')).toBe(input.attributes('id'));
    expect(input.attributes('aria-describedby')?.split(' ')).toHaveLength(2);
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(name.value).toBe('Bea');
    expect(await violations(wrapper.element)).toEqual([]);
  });

  it('[US-069:AC3] should toggle checkboxes and switches with their labels', async () => {
    const accepted = ref(false);
    const projector = ref(true);
    const wrapper = render(
      defineComponent(
        () => () =>
          h('div', [
            h(
              FormField,
              { label: 'Acepto' },
              {
                default: (attrs: Record<string, unknown>) =>
                  h(Checkbox, {
                    ...attrs,
                    modelValue: accepted.value,
                    'onUpdate:modelValue': (v: boolean) => (accepted.value = v),
                  }),
              },
            ),
            h(
              FormField,
              { label: 'Modo proyector' },
              {
                default: (attrs: Record<string, unknown>) =>
                  h(Switch, {
                    ...attrs,
                    modelValue: projector.value,
                    'onUpdate:modelValue': (v: boolean) => (projector.value = v),
                  }),
              },
            ),
          ]),
      ),
    );
    await wrapper.find('[role="checkbox"]').trigger('click');
    await wrapper.find('[role="switch"]').trigger('click');
    await flushPromises();

    expect(accepted.value).toBe(true);
    expect(projector.value).toBe(false);
    expect(await violations(wrapper.element)).toEqual([]);
  });

  it('[US-069:AC3] should render a data table with headers, caption and tabular numbers on an opaque card', async () => {
    const wrapper = render(
      defineComponent(
        () => () =>
          h(Table, null, () => [
            h(TableCaption, null, () => 'Clasificación tras la ronda 3'),
            h(TableHeader, null, () =>
              h(TableRow, null, () => [h(TableHead, null, () => 'Jugador'), h(TableHead, null, () => 'Puntos')]),
            ),
            h(TableBody, null, () =>
              h(TableRow, null, () => [h(TableCell, null, () => 'Ana'), h(TableCell, null, () => '2½')]),
            ),
          ]),
      ),
    );

    expect(wrapper.findAll('th').map((th) => th.attributes('scope'))).toEqual(['col', 'col']);
    expect(wrapper.find('table').classes()).toContain('tabular-nums');
    expect(wrapper.find('div').classes()).toContain('bg-card');
    expect(await violations(wrapper.element)).toEqual([]);
  });

  it('[US-069:AC3] should say what is empty, show status with text and hide placeholders from readers', async () => {
    const wrapper = render(
      defineComponent(
        () => () =>
          h('div', [
            h(EmptyState, { title: 'Sin jugadores', description: 'Importa un CSV para empezar.' }),
            h(Badge, { variant: 'provisional' }, () => 'Provisional'),
            h(Skeleton, { class: 'h-4 w-24' }),
          ]),
      ),
    );

    expect(wrapper.find('[role="status"]').text()).toContain('Sin jugadores');
    expect(wrapper.text()).toContain('Provisional');
    expect(wrapper.find('[aria-hidden="true"]').classes()).toContain('w-24');
    expect(await violations(wrapper.element)).toEqual([]);
  });
});
