# ADR-0001 — Stack y versiones verificadas

- **Estado:** Aceptado
- **Fecha:** 2026-10-26
- **Decide:** responsable del proyecto (con la IA, `US-001`)
- **Relacionado:** `DEC-001`, `DEC-004`, `DEC-061`, `DEC-063`, `DEC-071`, `US-001`, `SOURCES.md` §6

## Contexto

`US-001` crea el monorepo y debe fijar versiones verificadas, no de memoria (`CLAUDE.md` regla 10). Hay cuatro elecciones con alternativas reales:

1. TypeScript 6 o 7, con los decoradores de Nest comprobados.
2. La versión LTS de Node vigente.
3. La versión de pnpm y su política para los scripts de instalación.
4. Cómo resuelven los paquetes internos su código: fuente o compilado.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| TypeScript 7.0.2 | Compilador nativo, más rápido | `typescript-eslint` 8.72 solo admite TypeScript `>=4.8.4 <6.1.0`; los *schematics* de Nest 12 piden `>=6.0.0` |
| **TypeScript 6.0.3** | Compatible con typescript-eslint, vue-tsc y Nest 12 | Más lento que la 7 |
| Paquetes internos compilados (`dist`) con *project references* | Igual que en producción | Hay que compilar antes de cada typecheck y cada prueba |
| **Paquetes internos con condición `@torre/source`** | Typecheck, Vitest y Vite leen el código fuente; la compilación usa `dist` | Hay que declarar la condición en cada herramienta |

Comprobación del 2026-10-26: una clase con un decorador de parámetros, compilada con `experimentalDecorators` y `emitDecoratorMetadata` y `module`/`moduleResolution` `nodenext`, emite `design:paramtypes` tanto con TypeScript 6.0.3 como con 7.0.2. La diferencia entre ambas está en el ecosistema, no en los decoradores.

## Decisión

- **Node 24** (LTS activa; instalada 24.22.1). Se fija en `.nvmrc` (`24`) y en `engines` (`>=24.11.0 <25`, el mínimo que piden Prisma 7 y lint-staged). Node 26 pasa a LTS a finales de octubre de 2026; se cambia con un ADR nuevo cuando sus dependencias lo admitan.
- **pnpm 12.15.0** con `packageManager` y Corepack. Los scripts de instalación de las dependencias están bloqueados por defecto (`strictDepBuilds`); se aprueban uno a uno en `allowBuilds` de `pnpm-workspace.yaml`, después de leerlos.
- **TypeScript 6.0.3** en todo el monorepo.
- **Versiones centralizadas** en el `catalog` de `pnpm-workspace.yaml`; cada `package.json` usa `catalog:`.
- **Paquetes internos ESM** (`DEC-071`) con `exports` de tres condiciones: `@torre/source` → `src/index.ts` (desarrollo, typecheck, Vitest y Vite), `types` → `dist/index.d.ts` y `default` → `dist/index.js` (compilación y ejecución). `tsconfig.base.json` declara `customConditions: ["@torre/source"]`; `tsconfig.build.json` la quita, así cada paquete compila contra el `dist` de sus dependencias en orden topológico (`pnpm -r run build`).
- **gitleaks 8.30.1** no es un paquete npm: `tools/gitleaks.mjs` usa el de la ruta del sistema o descarga el binario oficial y verifica su SHA-256 contra el archivo de *checksums* de la versión antes de ejecutarlo.
- **Lista de contraseñas comunes** (`BR-AUTH-09`): `Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt` de [SecLists](https://github.com/danielmiessler/SecLists) (licencia **MIT**, verificada el 2026-10-26). `US-022` la copia fijando el commit de origen y conserva solo las entradas de 8 a 64 caracteres.

## Consecuencias

- **Positivas:** typecheck y pruebas sin compilar antes; una sola fuente de versiones; ningún script de terceros corre sin aprobación.
- **Negativas / costos:** la condición `@torre/source` debe repetirse en Vitest, Vite y dependency-cruiser; TypeScript 7 queda para cuando typescript-eslint lo admita.
- **Riesgos y mitigación:** las versiones envejecen. Cada historia que instala una librería vuelve a comprobar su versión y su licencia, y actualiza este ADR o escribe uno nuevo si cambia la mayor.

## Verificación

- `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm depcruise`, `pnpm test` y `pnpm build` en verde (`US-001`).
- `tools/depcruise-canary.test.mjs` y `tools/floor-guard.test.mjs` demuestran que los controles fallan cuando deben.

## Notas

Versiones del registro de npm consultadas el 2026-10-26 (`SRC-18`). Las de Prisma (7.10.1; `latest` sigue en 8.0.0-rc.27) y Testcontainers (12.2.1) se volvieron a comprobar al instalarlas el 2026-10-27 (`US-007`), igual que oRPC 1.16.1 (`US-008`, `ADR-0002`; se añadió `@orpc/openapi-client`, que trae `OpenAPILink` para el cliente). Las de "Herramientas del monorepo" se instalan en `US-001`; el resto se instala en la historia que lo necesita, que confirma la versión en ese momento.

### Herramientas del monorepo

| Paquete | Versión | Licencia | Publicada | Node |
|---|---|---|---|---|
| `typescript` | **6.0.3** (la 7.0.2 existe, ver Decisión) | Apache-2.0 | 2026-04-16 | >=14.17 |
| `eslint` | 10.13.0 | MIT | 2026-10-16 | ^20.19.0 \|\| ^22.13.0 \|\| >=24 |
| `typescript-eslint` | 8.72.0 | MIT | 2026-10-19 | ^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0 |
| `@eslint/js` | 10.0.1 | MIT | 2026-02-06 | ^20.19.0 \|\| ^22.13.0 \|\| >=24 |
| `prettier` | 3.9.10 | MIT | 2026-10-10 | >=14 |
| `vitest` | 5.0.5 | MIT | 2026-10-15 | ^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0 |
| `@vitest/coverage-v8` | 5.0.5 | MIT | 2026-10-15 | — |
| `husky` | 9.1.7 | MIT | 2024-11-18 | >=18 |
| `lint-staged` | 17.6.0 | MIT | 2026-09-26 | >=22.22.1 |
| `@commitlint/cli` | 21.2.4 | MIT | 2026-10-18 | >=22.12.0 |
| `@commitlint/config-conventional` | 21.2.4 | MIT | 2026-10-18 | >=22.12.0 |
| `dependency-cruiser` | 18.7.0 | MIT | 2026-10-19 | ^22\|\|^24\|\|>=26 |
| `knip` | 6.43.0 | ISC | 2026-10-24 | ^20.19.0 \|\| >=22.12.0 |
| `fast-check` | 4.10.2 | MIT | 2026-09-19 | >=12.17.0 |

### API

| Paquete | Versión | Licencia | Publicada | Node |
|---|---|---|---|---|
| `@nestjs/core` | 12.2.0 | MIT | 2026-10-19 | >= 20 |
| `@nestjs/common` | 12.2.0 | MIT | 2026-10-19 | — |
| `@nestjs/platform-express` | 12.2.0 | MIT | 2026-10-19 | — |
| `@nestjs/config` | 12.0.1 | MIT | 2026-09-22 | — |
| `@nestjs/terminus` | 12.1.0 | MIT | 2026-09-20 | ^20.19.0 \|\| ^22.12.0 \|\| >=24.0.0 |
| `@nestjs/testing` | 12.2.0 | MIT | 2026-10-19 | — |
| `nestjs-pino` | 5.3.1 | MIT | 2026-10-02 | >=22.12.0 |
| `pino` | 10.4.0 | MIT | 2026-10-02 | — |
| `pino-http` | 11.0.0 | MIT | 2025-10-04 | — |
| `nestjs-cls` | 7.0.1 | MIT | 2026-09-24 | >=22 |
| `helmet` | 8.3.0 | MIT | 2026-07-12 | >=18.0.0 |
| `@nestjs/throttler` | 6.7.1 | MIT | 2026-09-24 | ^20.19.0 \|\| ^22.12.0 \|\| >=24.0.0 |
| `reflect-metadata` | 0.2.2 | Apache-2.0 | 2024-03-29 | — |
| `rxjs` | 7.8.2 | Apache-2.0 | 2025-02-22 | — |
| `@swc/core` | 1.16.20 | Apache-2.0 | 2026-10-22 | >=10 |
| `unplugin-swc` | 2.0.0 | MIT | 2026-09-21 | ^20.19.0 \|\| >=22.12.0 |
| `zod` | 4.6.7 | MIT | 2026-10-12 | — |

### Datos

| Paquete | Versión | Licencia | Publicada | Node |
|---|---|---|---|---|
| `prisma` | **7.10.1** (el *tag* `latest` apunta a 8.0.0-rc.27) | Apache-2.0 | 2026-10-15 | ^20.19 \|\| ^22.12 \|\| >=24.0 |
| `@prisma/client` | 7.10.1 | Apache-2.0 | 2026-10-15 | ^20.19 \|\| ^22.12 \|\| >=24.0 |
| `@prisma/adapter-pg` | 7.10.1 | Apache-2.0 | 2026-10-15 | — |
| `pg` | 8.23.1 | MIT | 2026-09-30 | >= 16.0.0 |
| `bullmq` | 6.4.2 | MIT | 2026-10-24 | >=14.17.0 |
| `ioredis` | 6.0.0 | MIT | 2026-07-31 | >=20.0.0 |
| `testcontainers` | 12.2.1 | MIT | 2026-10-13 | >= 22.22 |
| `@testcontainers/postgresql` | 12.2.1 | MIT | 2026-10-13 | — |
| `supertest` | 7.3.1 | MIT | 2026-10-02 | >=14.18.0 |

### Autenticación y permisos

| Paquete | Versión | Licencia | Publicada | Node |
|---|---|---|---|---|
| `@nestjs/passport` | 12.0.0 | MIT | 2026-08-27 | — |
| `passport` | 0.7.0 | MIT | 2023-11-27 | >= 0.4.0 |
| `passport-local` | 1.0.0 | sin campo en npm (revisar el LICENSE del repositorio en US-022) | 2014-03-08 | >= 0.4.0 |
| `passport-jwt` | 4.0.1 | MIT | 2022-12-24 | — |
| `@nestjs/jwt` | 12.0.3 | MIT | 2026-10-12 | — |
| `argon2` | 0.45.1 | MIT | 2026-07-21 | >=16.17.0 |
| `otplib` | 13.5.0 | MIT | 2026-08-21 | — |
| `qrcode` | 1.5.4 | MIT | 2024-08-05 | >=10.13.0 |
| `@casl/ability` | 7.0.2 | MIT | 2026-10-15 | — |
| `@casl/prisma` | 2.0.2 | MIT | 2026-07-06 | — |
| `@casl/vue` | 3.0.1 | MIT | 2026-07-06 | — |

### Contratos

| Paquete | Versión | Licencia | Publicada | Node |
|---|---|---|---|---|
| `@orpc/contract` | 1.16.1 | MIT | 2026-10-22 | — |
| `@orpc/server` | 1.16.1 | MIT | 2026-10-22 | — |
| `@orpc/nest` | 1.16.1 | MIT | 2026-10-22 | — |
| `@orpc/client` | 1.16.1 | MIT | 2026-10-22 | — |
| `@orpc/openapi` | 1.16.1 | MIT | 2026-10-22 | — |
| `@orpc/zod` | 1.16.1 | MIT | 2026-10-22 | — |
| `@orpc/vue-query` | 1.16.1 | MIT | 2026-10-22 | — |

### Web

| Paquete | Versión | Licencia | Publicada | Node |
|---|---|---|---|---|
| `vue` | 3.5.44 | MIT | 2026-10-13 | — |
| `vite` | 8.3.5 | MIT | 2026-10-21 | ^20.19.0 \|\| >=22.12.0 |
| `@vitejs/plugin-vue` | 6.0.10 | MIT | 2026-10-10 | ^20.19.0 \|\| >=22.12.0 |
| `vue-router` | 5.4.0 | MIT | 2026-10-07 | — |
| `pinia` | 4.1.0 | MIT | 2026-10-14 | — |
| `@tanstack/vue-query` | 5.104.5 | MIT | 2026-10-19 | — |
| `@tanstack/vue-table` | 9.3.1 | MIT | 2026-10-12 | >=20 |
| `vue-i18n` | 11.4.16 | MIT | 2026-10-18 | >= 22 |
| `vee-validate` | 4.15.1 | MIT | 2025-06-07 | — |
| `@vee-validate/zod` | 4.15.1 | MIT | 2025-06-07 | — |
| `tailwindcss` | 4.3.3 | MIT | 2026-07-16 | — |
| `reka-ui` | 2.11.0 | MIT | 2026-10-05 | — |
| `lucide-vue-next` | 1.0.0 | ISC | 2026-03-23 | — |
| `@fontsource/fira-sans` | 5.3.0 | OFL-1.1 | 2026-07-19 | — |
| `echarts` | 6.1.0 | Apache-2.0 | 2026-05-19 | — |
| `vue-echarts` | 8.3.2 | MIT | 2026-10-09 | — |
| `@vue/test-utils` | 2.5.1 | MIT | 2026-09-16 | — |
| `vue-tsc` | 3.3.13 | MIT | 2026-10-10 | — |
| `@playwright/test` | 1.64.1 | Apache-2.0 | 2026-10-14 | >=20 |
| `@axe-core/playwright` | 4.14.0 | MPL-2.0 | 2026-10-15 | >=22.12.0 |

### Tiempo real, archivos y correo

| Paquete | Versión | Licencia | Publicada | Node |
|---|---|---|---|---|
| `socket.io` | 4.8.4 | MIT | 2026-09-25 | >=10.2.0 |
| `socket.io-client` | 4.8.4 | MIT | 2026-09-25 | >=10.0.0 |
| `@socket.io/redis-adapter` | 8.3.0 | MIT | 2024-03-13 | >=10.0.0 |
| `nodemailer` | 10.2.1 | MIT-0 | 2026-10-22 | >=20.0.0 |
| `pdfmake` | 0.3.13 | MIT | 2026-10-25 | >=20 |
| `@aws-sdk/client-s3` | 3.1156.0 | Apache-2.0 | 2026-10-22 | >=20.0.0 |
| `prom-client` | 15.1.3 | Apache-2.0 | 2024-06-27 | ^16 \|\| ^18 \|\| >=20 |

### Ajedrez

| Paquete | Versión | Licencia | Publicada | Node |
|---|---|---|---|---|
| `chess.js` | 1.4.0 | BSD-2-Clause | 2025-06-14 | — |
| `cm-chessboard` | 8.15.4 | MIT | 2026-10-19 | — |

### Herramientas fuera de npm

| Herramienta | Versión | Licencia | Fuente |
|---|---|---|---|
| Node.js | 24.22.1 (LTS) | MIT | instalada |
| pnpm | 12.15.0 (2026-10-21) | MIT | Corepack |
| gitleaks | 8.30.1 (2026-03-21) | MIT | [releases](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) |
