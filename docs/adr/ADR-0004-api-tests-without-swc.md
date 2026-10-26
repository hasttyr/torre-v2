# ADR-0004 — Pruebas de la API sin SWC

- **Estado:** Aceptado (decidido por la IA durante `US-005`; el responsable puede vetarlo). Reemplaza, de `ADR-0001`, las filas de `@swc/core` y `unplugin-swc`
- **Fecha:** 2026-10-26
- **Decide:** IA, con la instrucción del responsable de continuar sin preguntar
- **Relacionado:** `DEC-021`, `ADR-0001`, `US-005`, `SOURCES.md` §6

## Contexto

Nest resuelve las dependencias de cada clase con los metadatos que TypeScript emite con `emitDecoratorMetadata` (`design:paramtypes`). En la fase de diseño se supuso que Vitest no los emitía, porque su transformador anterior (esbuild) no lo hace, y se previó `unplugin-swc` con `@swc/core` en `apps/api` (`ARCHITECTURE.md` §3, `SOURCES.md` §6).

Vitest 5.0.5 corre sobre Vite 8.3.5, que transforma TypeScript con oxc (rolldown 1.2.15). oxc admite los decoradores *legacy* con `emitDecoratorMetadata` y lee esas opciones del `tsconfig.json` de cada archivo; `apps/api/tsconfig.json` las activa.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| `unplugin-swc` + `@swc/core` | Lo que preveía el diseño | Dos dependencias más; `@swc/core` trae binarios nativos por plataforma |
| **El transformador de Vitest (oxc)** | Sin dependencias nuevas; misma configuración que el resto del monorepo | Si una versión futura de Vite deja de emitir los metadatos, las pruebas de la API fallan |

## Decisión

Las pruebas de `apps/api` usan el transformador de Vitest. No se instalan `unplugin-swc` ni `@swc/core`. La compilación sigue siendo `tsc` (`apps/api/tsconfig.build.json`), que emite los metadatos.

## Consecuencias

- **Positivas:** dos dependencias menos, sin binarios nativos que aprobar.
- **Negativas / costos:** dependemos de que oxc siga emitiendo `design:paramtypes`.
- **Riesgos y mitigación:** la prueba `[US-005:AC2] should be injectable by its type, without an explicit token` (`apps/api/src/config/app-config.spec.ts`) inyecta un proveedor solo por el tipo de su constructor. Si los metadatos dejan de emitirse, esa prueba falla en la CI y se vuelve a `unplugin-swc` con un ADR nuevo.

## Verificación

- `pnpm test` en verde con la prueba anterior (2026-10-26).
- `pnpm build` y `node apps/api/dist/main.js` arrancan Nest con la configuración válida y se detienen con la lista de variables inválidas.

## Notas

La comprobación de `ADR-0001` (decoradores con `tsc` 6.0.3 y 7.0.2) sigue vigente para la compilación.
