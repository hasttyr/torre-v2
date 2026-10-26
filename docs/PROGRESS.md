# PROGRESS.md — Avance de la implementación

> Se actualiza **en el mismo commit** de cada historia: qué funciona, con qué pruebas y qué quedó pendiente. Una historia se marca `DONE` solo cuando sus criterios de aceptación tienen pruebas en verde y `pnpm verify` pasa. El commit de cierre de cada historia se anota en la actualización siguiente (un commit no puede citar su propio hash).

## Resumen

- **Rebanada en curso:** VS-1 — esqueleto andante (`USER-STORIES.md` §5).
- **Historias terminadas:** 5 de 102 (VS-1: 5 de 38). En curso, a la espera de un entorno externo: `US-003` (Docker) y `US-004` (repositorio en GitHub).
- **Última historia:** `US-010` — esquema del `RuleSet`, validación y presets.
- **Siguiente:** `US-012` — puntajes y clasificación base.
- **Orden:** mientras no haya Redis local, se adelanta el núcleo de dominio (`US-011`, `US-021`, `US-010`, `US-012`, `US-014`), que se prueba completo en esta máquina.

## Entorno local verificado (esta máquina)

| Herramienta | Estado | Notas |
|---|---|---|
| Node.js 24.22.1 | ✅ | LTS fijada en `.nvmrc` (`ADR-0001`) |
| pnpm 12.15.0 | ✅ | Por Corepack: `corepack enable --install-directory ~/bin pnpm` (sin permisos de administrador) |
| Git y hooks | ✅ | Husky instala los hooks al hacer `pnpm install` |
| gitleaks 8.30.1 | ✅ | Lo descarga `pnpm secrets` en `.tools/` y verifica su SHA-256 |
| Docker | ❌ | No está instalado. `docker-compose.yml` existe pero no se ha podido ejecutar aquí |
| PostgreSQL 18 | ✅ | Clúster propio con los binarios instalados (`pnpm dev:infra`, modo nativo) en `127.0.0.1:55432` (el 5432 lo ocupa el servicio de Windows); `.env` local con ese puerto |
| Redis / Valkey | ❌ | No instalado. Descargar o compilar binarios externos quedó bloqueado por los permisos de esta sesión |
| Mailpit, S3 (RustFS) | ❌ | Igual que Redis: solo con Docker o con permiso para descargar sus binarios |

## Historias

| Historia | Estado | Rama / commit | Qué funciona | Pruebas | Pendiente |
|---|---|---|---|---|---|
| `US-001` Monorepo y herramientas base | DONE | `16e7615` (merge `27c90f0`) | Workspace pnpm con `apps/api`, `apps/web` y 9 paquetes `@torre/*` en ESM que compilan; scripts raíz (`lint`, `typecheck`, `test`, `test:e2e`, `build`, `dev`, `verify:fast`, `check:floor`, `verify`, `verify:full`, `depcruise`, `secrets`); Husky + lint-staged + commitlint; reglas de dependencias de `ARCHITECTURE.md` §5; guardia de piso; gitleaks verificado; `ADR-0001` | `tools/floor-guard.test.mjs` (9), `tools/depcruise-canary.test.mjs` (2) | `test:e2e` y `dev` todavía no tienen nada que ejecutar (llegan con `US-003`, `US-005`, `US-009`, `US-022`); `test:trace` y `test:report` se crean en `US-004` |
| `US-002` Configuración estricta compartida | DONE | `668ad62` (merge `e927428`) | `@torre/config` exporta la base de TypeScript, el preset de ESLint (reglas con tipos: `no-explicit-any`, `no-non-null-assertion` salvo pruebas, `no-floating-promises`, `switch-exhaustiveness-check`, `consistent-type-imports`; en `packages/*` además reloj, azar, `process` y módulos de Node prohibidos) y Prettier | `tools/lint-config.test.mjs` (9, con *fixtures* que deben fallar), `tools/tsconfig.test.mjs` (3) | Reglas de Vue al crear la web (`US-009`) |
| `US-003` Entorno local | IN_PROGRESS | `1c5b89e` (merge `52abb54`) | `docker-compose.yml` (Postgres 18, Valkey 8, Mailpit, RustFS y el trabajo que crea el *bucket*), script de inicialización con extensiones y roles sin `BYPASSRLS`, `pnpm dev:infra`, `dev:infra:down` e `infra:check`, modo nativo de Postgres probado aquí, `.env.example` completo (`ADR-0003`: RustFS en lugar de MinIO) | `tools/infra.test.mjs` (7, servidores falsos), `tools/env-example.test.mjs` (2); `pnpm infra:check --only postgres` en verde en esta máquina | Ejecutar `pnpm dev:infra` + `pnpm infra:check` con Docker (criterios 1, 3 y 4 para Redis, Mailpit y S3); el trabajo `infra` de la CI lo hará en cuanto el repositorio esté en GitHub |
| `US-004` Integración continua | IN_PROGRESS | `3dc158c` (merge `6a74a1f`) | `ci.yml` (trabajos `quality`, `security`, `infra`, `integration`, con las *actions* fijadas por SHA) y `nightly.yml` (abre un *issue* si falla); `pnpm test:ci` (cobertura con los umbrales de `CONSTRAINTS.md`, JSON y JUnit), `test:trace` (`reports/traceability.md`; falla con criterios de historias `DONE` sin prueba), `test:manifest`, `test:report`, `test:smoke` y `test:nightly`; protección de `main` documentada en el README | `tools/test-trace.test.mjs` (4, con *fixture*), `tools/ci.test.mjs` (9), `tools/repo-structure.test.mjs` (7, cubre los criterios restantes de `US-001` y `US-002`); la secuencia de la CI corre en verde en local | Crear el repositorio en GitHub, activar la protección de `main` y abrir un PR con un fallo deliberado para demostrar el bloqueo (pruebas requeridas de la historia) |
| `US-011` Tipos base del dominio | DONE | `75d1dc7` (merge `162cb6c`) | `@torre/core`: `Result` y `DomainError`; identificadores con marca de tipo; resultados de partida (`GameResult`), *byes* (`ByeKind`) y lados; competidor, emparejamiento, ronda e historia de rondas; unidades enteras con divisor (medios y cuartos de punto) y su formato (`2½`, `2,5`); orden canónico por *seed* e id. Sin dependencias de ejecución. fast-check configurado globalmente (200 ejecuciones y semilla fija; 5 000 en la corrida nocturna) | `packages/core` (13 pruebas, con propiedades para TC-001 y TC-002) y `tools/domain-packages.test.mjs` (dependencias de ejecución); cobertura ≥ 90 % de líneas y ramas | — |
| `US-021` PRNG y hash canónico | DONE | `9c22cbe` (merge `3cc3b7c`) | `createPrng(seed)` con xoshiro128\*\* sembrado por SplitMix64 (enteros de 32 bits y BigInt: misma secuencia en cualquier motor), `nextInt` sin sesgo, `shuffle`, `pick` y `drawLots` (independiente del orden de llegada); `canonicalJson` (claves ordenadas, sin `undefined`, rechaza lo que no tiene un único JSON) y `hashCanonical` con el SHA-256 inyectado por el entorno | 14 pruebas: vectores de referencia de los autores (TC-003), propiedades de reproducibilidad, uniformidad y estabilidad del hash ante el orden de claves (TC-004) | Repetir TC-003 en un navegador real cuando exista Playwright (`US-066`); el SHA-256 real se prueba en la API |
| `US-010` Esquema del `RuleSet` | DONE | `feat/US-010-ruleset` (3 commits: a, b, c) | `@torre/rules`: esquema Zod estricto (formato, sistema, rondas, puntuación en medios puntos, Suizo, desempates de FIDE C.07, política de desempates, equipos, elegibilidad, ritmo, siembra, correcciones, rating) con JSON Schema versionado; validaciones cruzadas con el nombre de la regla que falla; `listUnconfirmedFields`, `canApprove` y `assertImmutable`; presets `fide-dutch-2026` (puntuación de las Leyes del Ajedrez; rondas y desempates los fija cada torneo), `demo-round-robin` y `ascun-chess-classical`/`ascun-chess-blitz` con los valores de 2012 y su artículo | `packages/rules` (22 pruebas: propiedad de `RuleSet` coherentes, una mutación por regla, ciclo de vida y presets; TC-005) | Aprobar los presets de ASCUN cuando se resuelvan `OQ-001` y `OQ-023` |

## Pendiente global

- **Docker o permiso de descarga** (`US-003`): sin Docker no hay Redis, Mailpit ni S3 locales. Afecta a las historias que usan Redis (`US-117` colas, límites de tasa de `US-022`, caché de `US-024`), correo (`US-027`, `US-061`) y archivos (`US-065`). Opciones: instalar Docker Desktop, o permitir que la sesión descargue y ejecute Valkey, Mailpit y RustFS verificados por SHA-256.
- **Respuestas de ASCUN** (`docs/requests/SOLICITUD-ASCUN.md`): los presets ASCUN siguen en `DRAFT`.
- **`US-018`** (eliminación directa) bloqueada por `OQ-013`.
