# HANDOFF.md — Estado para la siguiente sesión

> Se **sobrescribe** al cerrar cada sesión (`AI-WORKFLOW.md` §9). La IA lo lee justo después de `CLAUDE.md`.

## Estado actual

- **Fecha:** 2026-10-27 (segunda sesión del día)
- **Rebanada en curso:** VS-1 (esqueleto andante). Detalle por historia en `docs/PROGRESS.md`.
- **Hallazgo al empezar:** el PR #1 entró a `main`, pero los PR #3 (`US-003`) y #4 (`US-022b`) se fusionaron en sus ramas base, no en `main`. GitHub solo cambia la base del PR siguiente cuando se **borra** la rama fusionada, y este repositorio no las borra (`delete_branch_on_merge: false`). La instrucción del `HANDOFF` anterior ("GitHub cambia la base sola") era incorrecta.
- **Hecho en esta sesión** (el responsable pidió avanzar sin su intervención):
  - **PR #5** (`feat/US-022b-sessions-audit` → `main`): trae a `main` el cierre de `US-003` y todo `US-022b`, con `main` fusionada encima. Sin cambios de código respecto a #3 y #4.
  - **`US-023`** — organizaciones, roles del sistema y membresías (`DONE`), en `feat/US-023-organizations`, PR a `main` que **contiene** el #5.
- **Siguiente historia recomendada:** `US-024a` (tablas `permissions` y `role_permissions`, `permissions:sync`, semilla de la matriz); después `US-024b`, `US-025a`, `US-028`.

## Lo que necesita al responsable

1. **Fusionar primero el PR #5 y después el de `US-023`.** Al fusionar #5, el PR de `US-023` se reduce solo a su propio cambio; pulse "Update branch" (la protección exige la rama al día). La IA no puede fusionar: el clasificador del modo automático rechaza `gh pr merge`.
2. **Recomendado:** activar *Settings → General → Automatically delete head branches*. Con eso, si en el futuro hay PR apilados, GitHub cambia la base del siguiente a `main` al fusionar. Mientras tanto, la IA abre cada PR directamente contra `main`.
3. **Revisar** el PR #5 y el de `US-023` (autenticación, migraciones y contratos: revisión humana obligatoria, `AI-WORKFLOW.md` §2).
4. **Confirmar o cambiar las decisiones `PROPUESTO`:**
   - De la sesión anterior: `DEC-095` (eventos de autenticación en `audit_log`), `DEC-096` (IP como HMAC con `IP_HASH_SECRET`), `DEC-097` (forma de las rutas de sesiones), `DEC-098` (`ACCOUNT_SUSPENDED` solo tras la contraseña correcta).
   - De esta: `DEC-099` (tabla `roles` desde `US-023`, unicidades, *slug* de 3 a 63 caracteres elegido por quien crea, "último `org_owner`" garantizado por la base al confirmar), `DEC-100` (hasta `US-024`, crear organización exige una membresía en el alcance `PLATFORM`), `DEC-101` (rutas `POST/GET /organizations`, `GET /me/memberships` y eventos `organization.created`/`membership.granted`).

## Entorno de esta máquina (lo que conviene saber)

- `pnpm` está en `~/bin` (Corepack): en la herramienta bash, `export PATH="$HOME/bin:$PATH"`; en PowerShell no está en el `PATH`.
- `pnpm dev:infra` levanta Postgres nativo (`127.0.0.1:55432`) y Valkey en WSL (`127.0.0.1:6379`); `pnpm infra:check --only postgres,redis` los comprueba.
- La base local tiene aplicada la migración `organizations_memberships`. Para correr una sola suite de integración: cargar `.env` y `npx vitest run --config vitest.e2e.config.ts apps/api/test/<archivo>.spec.ts`.
- Tras cambiar `schema.prisma`: `pnpm --filter @torre/api db:generate` (si no, `typecheck` falla con modelos inexistentes). El OpenAPI versionado se regenera con `npx vitest run -u apps/api/src/system/contracts.spec.ts`.
- Cobertura: `pnpm test:ci`, luego `pnpm test:e2e` (completo) y `pnpm test:coverage`. `pnpm test:trace` lee `reports/vitest.json` y `reports/vitest-e2e.json`.
- La guardia de piso marca como "aserción quitada" cualquier línea quitada de una prueba que contenga `should`, `expect` o `assert`: para etiquetar un caso del plan, mejor una prueba nueva.
- Para mutar a mano una migración nueva (no versionada todavía), copiarla antes al *scratchpad*: `git checkout` no la restaura.

## Deuda y riesgos

- `organizations`, `roles` y `memberships` sin RLS hasta `US-025`; las listas propias necesitarán además una política por `app.user_id` (nota en `US-025`).
- El error de la API al quitar al último `org_owner` se define en `US-028` (hoy lo rechaza la base con `organizations_keep_an_org_owner`, SQLSTATE `23514`).
- Un rol propio de una organización (`US-108`) todavía podría otorgarse en otra: la base no lo impide; se cierra con `US-108`.
- La guardia de piso solo detecta mutaciones de `events`/`audit_log` en SQL crudo; por Prisma no.
- `audit_log` sin RLS hasta `US-025`; `trust proxy` sin configurar hasta `US-105`.
- `override` de `multer` 2.5.0 hasta subir Nest a 12.3.2 o posterior (`ADR-0001`); `experimental_RethrowHandlerPlugin` de oRPC puede cambiar (`ADR-0002`).
- Respuestas de ASCUN pendientes (`docs/requests/SOLICITUD-ASCUN.md`); `OQ-033`, `OQ-034`, `OQ-035` antes de `US-015`, `US-035`, `US-042`; `US-018` bloqueada por `OQ-013`.
- `apps/api/test/auth-limits.spec.ts` no pasa `prettier --check` (ya estaba así en `main`).

## Antes de empezar la próxima sesión

1. Leer `CLAUDE.md`, `CONSTRAINTS.md`, este archivo y la historia elegida.
2. `gh pr list --state all`: si #5 y el de `US-023` ya están en `main`, partir de `main`; si no, de `feat/US-023-organizations`. Comprobar con `git merge-base --is-ancestor <rama> origin/main` que lo fusionado llegó de verdad a `main`.
3. `pnpm dev:infra` y `pnpm infra:check --only postgres,redis`.
4. Una rama por historia, PR contra `main`; `pnpm verify:fast` antes de cada commit.
