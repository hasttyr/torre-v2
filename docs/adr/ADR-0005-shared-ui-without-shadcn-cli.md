# ADR-0005 — Capa `shared/ui`: componentes de shadcn-vue portados a mano

- **Estado:** Aceptado (decidido por la IA durante `US-069b1`; el responsable puede vetarlo)
- **Fecha:** 2026-10-27
- **Decide:** IA, con la instrucción del responsable de continuar sin parar
- **Relacionado:** `DEC-017`, `DEC-081`, `DEC-085`, `DEC-087`, `US-069`, `UI-UX.md` §2

## Contexto

`DEC-017` eligió shadcn-vue: componentes copiados al repositorio sobre Reka UI y Tailwind. `US-069` pide "shadcn-vue inicializado" y los componentes envueltos en `shared/ui`. Al llegar a la historia:

1. El CLI de shadcn-vue (2.8.2) al inicializar reescribe la hoja de estilos principal con sus variables y animaciones, y espera el alias `@/` en las importaciones. La hoja de `US-069a` ya tiene los tokens aprobados (`DEC-081`, `DEC-087`) y el vidrio (`DEC-085`).
2. Su *Drawer* usa `vaul-vue`, que no declara licencia en npm (0.4.1, consultado el 2026-10-27).
3. Sus animaciones usan `tw-animate-css`, y `DEC-081` solo admite transiciones CSS de 150–200 ms.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| CLI de shadcn-vue | Copia fiel de los componentes | Reescribe la hoja de tokens; alias nuevo; arrastra `vaul-vue` y `tw-animate-css` |
| **Portar a mano los componentes de shadcn-vue (MIT)** | Mismo patrón (Reka UI + `cva` + `cn`), con los tokens y el vidrio aprobados; solo dependencias con licencia clara | Más código que escribir; las actualizaciones de shadcn-vue no se aplican solas |
| Escribir componentes propios sin Reka UI | Sin dependencias | Habría que rehacer la accesibilidad de diálogos, *combobox* y calendario |

## Decisión

- `apps/web/src/shared/ui` contiene los componentes de shadcn-vue portados a mano: la misma API (`variant`, `size`, `asChild`, `v-model`) y las mismas primitivas de Reka UI, con las utilidades de Tailwind de los tokens. No hay `components.json` ni se usa el CLI.
- Dependencias de la capa: `reka-ui` 2.11.0 (MIT), `class-variance-authority` 0.7.1 (Apache-2.0), `clsx` 2.1.1 (MIT) y `tailwind-merge` 3.7.0 (MIT, extendido con los radios, desenfoques y sombras propios). En `US-069b2` se suman `vue-sonner` (toasts), `@internationalized/date` (calendario) y `@vueuse/core` (VueUse, ya en `UI-UX.md` §2.3), con su versión y licencia comprobadas al instalarlas.
- El *Drawer* se construye sobre el `Dialog` de Reka UI (como el *Sheet* de shadcn-vue), sin `vaul-vue`. Sin `tw-animate-css`: las capas aparecen con transiciones de opacidad y posición.
- Las primitivas conservan los nombres de shadcn-vue (`Button`, `Input`, `Table`…): ESLint desactiva `vue/multi-word-component-names` solo en `shared/ui`.
- Accesibilidad por componente con `axe-core` 4.14.0 (MPL-2.0; solo en desarrollo, sin modificar su código) en las pruebas de Vitest; el contraste no se mide ahí (`happy-dom` no calcula colores) sino sobre los tokens (`tokens.spec.ts`).

## Consecuencias

- **Positivas:** los componentes nacen con el vidrio y los tokens aprobados; sin dependencias de licencia dudosa ni librerías de animación.
- **Negativas / costos:** al actualizar shadcn-vue hay que comparar a mano; cada componente nuevo se porta con sus pruebas.
- **Riesgos y mitigación:** divergir de shadcn-vue con el tiempo. Cada componente cita el patrón que sigue y las pruebas de `shared/ui` fijan su comportamiento (roles, teclado, `v-model`, axe).

## Verificación

`apps/web/src/shared/ui/components.spec.ts` (componentes con Vue Test Utils y axe) y `entry.spec.ts` (todo componente se exporta desde `index.ts`).
