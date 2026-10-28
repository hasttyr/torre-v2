# HANDOFF.md — Estado para la siguiente sesión

> Se **sobrescribe** al cerrar cada sesión (`AI-WORKFLOW.md` §9). La IA lo lee justo después de `CLAUDE.md`.

## Estado actual

- **Fecha:** 2026-10-28
- **Modo de trabajo (pedido por el responsable):** avanzar sin su intervención, con prioridad en **terminar VS-1** (esqueleto andante). Las decisiones que la IA toma sola quedan `PROPUESTO` en `ARCHITECTURE.md` §20.
- **Fusión automática (`DEC-102`):** cada PR que la IA abre contra `main` se fusiona solo cuando pasan `quality`, `security`, `infra` e `integration` con la rama al día (`.github/workflows/auto-merge.yml`; probado con el PR #7). La revisión humana de lo crítico es **posterior** a la fusión. Para revisar antes: abrir el PR como borrador o `gh pr merge --disable-auto <n>`.
- **Hecho:** PR #5 (recuperación de `US-003`/`US-022b`), #6 (`US-023`), #7 (auto-merge) en `main`. `US-024a` (catálogo de permisos, `permissions:sync`, semilla de la matriz, `defineAbilitiesFor`) en el PR #8 `US-024b` (`AuthorizationService`, `@RequirePermission()`, caché en Redis) en el PR #9 `US-024c` (matriz de política generada, IDOR, reglas de estado) en el PR #10 y `US-024d` (`GET /me/abilities`, `accessibleBy`) en el PR #11: `US-024` queda `DONE`. `US-025a` (RLS en `memberships` y `roles`, contexto de tenant por petición) en el PR #12 y `US-045a` (*event store*) en su PR.
- **Siguiente:** `US-045b` (idempotencia), `US-045c`, `US-046`; `US-025b` necesita tablas de torneos y `US-025c` la aprobación de abajo; luego `US-025a…c`, `US-028`, `US-029` y el resto de VS-1 en orden de dependencias.

## Lo que necesita al responsable

1. **Revisar después de la fusión** los PR de autenticación, migraciones y contratos (#5, #6 y los de `US-024`).
2. **Confirmar o cambiar las decisiones `PROPUESTO`:** `DEC-095`…`DEC-098` (auditoría, IP, sesiones, cuentas suspendidas), `DEC-099`…`DEC-101` (organizaciones y membresías) `DEC-104` (caché y `@RequirePermission`), `DEC-105` (reglas de estado en CASL y matriz generada), `DEC-106` (`/me/abilities`, `accessibleBy`; `GET /organizations` lista todas para `platform_admin`), `DEC-107` (RLS: `organizations` como registro sin RLS, lecturas propias de la cuenta, contexto por petición), `DEC-108` (*append* del *event store*) y `DEC-103` (catálogo de permisos: la acción de CASL es la clave del permiso; la matriz de `AUTHORIZATION.md` §4 ganó la columna "Permisos", filas separadas y el permiso nuevo `game.view_own`; `permissions:sync` siembra solo permisos nuevos).
3. **Aprobar (o no) una excepción de la guardia de piso** para `US-025c`: poner RLS en `audit_log` obliga a cambiar la aserción de `apps/api/test/auth-sessions.spec.ts` que, tras intentar modificar una fila, la vuelve a leer con el rol de la app (con RLS esa fila ya no es visible sin contexto). La IA propone leerla con el cliente superusuario de las pruebas (`db.admin`): la prueba sigue comprobando lo mismo. Sin la excepción, `audit_log` se queda sin RLS.
4. Las historias bloqueadas por ASCUN o por preguntas abiertas siguen esperando (ver "Deuda y riesgos").

## Entorno de esta máquina (lo que conviene saber)

- `pnpm` está en `~/bin` (Corepack): en la herramienta bash, `export PATH="$HOME/bin:$PATH"`; en PowerShell no está en el `PATH`.
- `pnpm dev:infra` levanta Postgres nativo (`127.0.0.1:55432`) y Valkey en WSL (`127.0.0.1:6379`); `pnpm infra:check --only postgres,redis` los comprueba.
- La base local tiene aplicadas las migraciones hasta `permissions` y el catálogo sincronizado. Tras `pnpm db:deploy`, siempre `pnpm permissions:sync`.
- Una sola suite de integración: cargar `.env` y `npx vitest run --config vitest.e2e.config.ts apps/api/test/<archivo>.spec.ts`.
- Tras cambiar `schema.prisma`: `pnpm --filter @torre/api db:generate`. El OpenAPI versionado se regenera con `npx vitest run -u apps/api/src/system/contracts.spec.ts`. Tras cambiar `@torre/contracts`: `pnpm --filter @torre/contracts build` antes del *typecheck* de la API.
- Cobertura: `pnpm test:ci`, `pnpm test:e2e` (completo) y `pnpm test:coverage`; `pnpm test:trace` lee los dos reportes JSON.
- La guardia de piso marca como "aserción quitada" cualquier línea quitada de una prueba con `should`, `expect` o `assert`.
- Para mutar a mano una migración nueva (sin versionar), copiarla antes al *scratchpad*.
- Recursos para CASL: siempre `authzResource('Game', {...})` (`apps/api/src/authz/abilities.ts`); comprobar sobre el nombre del sujeto da "sí" en cuanto hay una regla con condiciones.

## Deuda y riesgos

- Lección de la CI: el *global setup* de Vitest no puede importar código de la app (sin `dist` de los paquetes no arranca); la sincronización de permisos va en `createTestDatabase()`. Para reproducir la CI en local, apartar `packages/contracts/dist` antes de `pnpm test:e2e`.
- `organizations`, `roles`, `memberships`, `role_permissions` y `audit_log` sin RLS hasta `US-025`; las listas propias necesitarán una política por `app.user_id`.
- Error de la API para el último `org_owner` y primer `platform_admin` por consola: `US-028`. Quitar un permiso de un rol (sin `DELETE` para la app): lo resuelve `US-108`.
- `trust proxy` sin configurar hasta `US-105`; `override` de `multer` hasta Nest 12.3.2 (`ADR-0001`); `experimental_RethrowHandlerPlugin` de oRPC (`ADR-0002`).
- La fusión automática hecha con `GITHUB_TOKEN` no dispara el CI de `push` en `main` (el árbol es el mismo que probó el PR; la nocturna corre sobre `main`).
- Respuestas de ASCUN pendientes (`docs/requests/SOLICITUD-ASCUN.md`); `OQ-033`, `OQ-034`, `OQ-035` antes de `US-015`, `US-035`, `US-042`; `US-018` bloqueada por `OQ-013`.
- `apps/api/test/auth-limits.spec.ts` no pasa `prettier --check` (ya estaba así en `main`).

## Antes de empezar la próxima sesión

1. Leer `CLAUDE.md`, `CONSTRAINTS.md`, este archivo y la historia elegida.
2. `gh pr list --state all --limit 5`: comprobar que los PR abiertos se fusionaron (si uno falló en la CI, arreglarlo primero). `git merge-base --is-ancestor <rama> origin/main` confirma que llegó a `main`.
3. `pnpm dev:infra` y `pnpm infra:check --only postgres,redis`.
4. Una rama por historia (o parte), PR contra `main`; `pnpm verify:fast` antes de cada commit y la verificación completa antes del PR.
