# PROGRESS.md — Avance de la implementación

> Se actualiza **en el mismo commit** de cada historia: qué funciona, con qué pruebas y qué quedó pendiente. Una historia se marca `DONE` solo cuando sus criterios de aceptación tienen pruebas en verde y `pnpm verify` pasa. El commit de cierre de cada historia se anota en la actualización siguiente (un commit no puede citar su propio hash).

## Resumen

- **Rebanada en curso:** VS-1 — esqueleto andante (`USER-STORIES.md` §5).
- **Historias terminadas:** 1 de 102 (VS-1: 1 de 38).
- **Última historia:** `US-001` — monorepo y herramientas base.
- **Siguiente:** `US-002` — configuración estricta de TypeScript, ESLint y Prettier.

## Entorno local verificado (esta máquina)

| Herramienta | Estado | Notas |
|---|---|---|
| Node.js 24.22.1 | ✅ | LTS fijada en `.nvmrc` (`ADR-0001`) |
| pnpm 12.15.0 | ✅ | Por Corepack: `corepack enable --install-directory ~/bin pnpm` (sin permisos de administrador) |
| Git y hooks | ✅ | Husky instala los hooks al hacer `pnpm install` |
| gitleaks 8.30.1 | ✅ | Lo descarga `pnpm secrets` en `.tools/` y verifica su SHA-256 |
| Docker | ❌ | No está instalado: `US-003` necesita una alternativa local para Postgres, Redis, Mailpit y MinIO |
| PostgreSQL 18 | ⚠️ | Servicio de Windows en `localhost:5432` con contraseña desconocida; se puede levantar un clúster propio con sus binarios |
| Redis / Valkey | ❌ | No instalado; WSL (Ubuntu 24.04) tiene `gcc` y `make` para compilar Valkey sin `sudo` |

## Historias

| Historia | Estado | Rama / commit | Qué funciona | Pruebas | Pendiente |
|---|---|---|---|---|---|
| `US-001` Monorepo y herramientas base | DONE | `feat/US-001-monorepo` | Workspace pnpm con `apps/api`, `apps/web` y 9 paquetes `@torre/*` en ESM que compilan; scripts raíz (`lint`, `typecheck`, `test`, `test:e2e`, `build`, `dev`, `verify:fast`, `check:floor`, `verify`, `verify:full`, `depcruise`, `secrets`); Husky + lint-staged + commitlint; reglas de dependencias de `ARCHITECTURE.md` §5; guardia de piso; gitleaks verificado; `ADR-0001` | `tools/floor-guard.test.mjs` (9), `tools/depcruise-canary.test.mjs` (2) | `test:e2e` y `dev` todavía no tienen nada que ejecutar (llegan con `US-003`, `US-005`, `US-009`, `US-022`); `test:trace` y `test:report` se crean en `US-004` |

## Pendiente global

- **Infraestructura local sin Docker** (`US-003`): definir cómo se levantan Postgres, Redis, Mailpit y MinIO en esta máquina.
- **Respuestas de ASCUN** (`docs/requests/SOLICITUD-ASCUN.md`): los presets ASCUN siguen en `DRAFT`.
- **`US-018`** (eliminación directa) bloqueada por `OQ-013`.
