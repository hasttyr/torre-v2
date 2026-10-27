# HANDOFF.md — Estado para la siguiente sesión

> Se **sobrescribe** al cerrar cada sesión (`AI-WORKFLOW.md` §9). La IA lo lee justo después de `CLAUDE.md`.

## Estado actual

- **Fecha:** 2026-10-27
- **Rebanada en curso:** VS-1 (esqueleto andante). Detalle por historia en `docs/PROGRESS.md`.
- **Terminada en esta sesión:** `US-022a2` — `POST /auth/refresh` (rotación atómica, reuso que revoca la familia), `POST /auth/logout`, CSRF por Fetch Metadata, límites de registro y login con bloqueo, contadores compartidos en Redis; y la medición combinada de cobertura de `apps/api` (`DEC-094`). Rama `feat/US-022a2-refresh-limits-csrf`, integrada en `main`.
- **Siguiente historia recomendada:** `US-022b` (criterios 7, 9 y 10: `audit_log` de login, reuso y logout; `GET /user/sessions` y `DELETE /user/other-sessions`; cuentas suspendidas o anonimizadas con `ACCOUNT_SUSPENDED`). Después, `US-023`, `US-024`, `US-025`, `US-045`, `US-046`.

## Decisiones de esta sesión

- **`DEC-090`** contadores de límites en Redis con un almacén propio sobre `ioredis` (sin paquete nuevo); límite general por usuario autenticado o IP, uno para toda la API y sin `/health/*`; si Redis cae, el general falla abierto con aviso y los de autenticación fallan cerrados (500).
- **`DEC-091`** CSRF: `same-origin` pasa, `cross-site` se rechaza; `same-site`, `none` o sin cabecera exigen `Origin` (o `Referer`) de `CORS_ORIGINS`/`PUBLIC_WEB_URL`; sin ninguno o con `Origin: null`, 403 `FORBIDDEN`.
- **`DEC-092`** rotación estricta: el perdedor de una carrera revoca la familia; la web serializará la renovación entre pestañas con Web Locks (`US-066`, anotado en su criterio 2).
- **`DEC-093`** límites: la "cuenta" es el email normalizado, exista o no; racha de fallos solo en el login, reiniciada por un éxito o tras 15 min sin fallos; el bloqueo rechaza también la contraseña correcta.
- **`DEC-094`** cobertura de `apps/api` con unitarias + integración (`pnpm test:coverage` tras `test:ci` y `test:e2e`); el dominio sigue solo con unitarias. `main` ya medía 71,6 % solo con unitarias.

## Entorno de esta máquina (lo que conviene saber)

- `pnpm` está en `~/bin` (Corepack): en la herramienta bash, `export PATH="$HOME/bin:$PATH"`; en PowerShell no está en el `PATH`.
- `pnpm dev:infra` levanta Postgres nativo (`127.0.0.1:55432`) y Valkey en WSL (`127.0.0.1:6379`); `pnpm infra:check --only postgres,redis` los comprueba.
- Cobertura: `pnpm test:ci`, luego `pnpm test:e2e` (completo, sin filtrar archivos) y `pnpm test:coverage`. `pnpm test:trace` lee `reports/vitest.json` y `reports/vitest-e2e.json`.
- Las suites de integración usan un `prefix` de Redis propio (`AppModule.forRoot({ prefix })`); las de unidad, `counters: 'memory'`.
- Editar documentos con la herramienta de edición: un script de Python en Windows los deja en CRLF.

## Deuda y riesgos

- Sin Docker: Mailpit y S3 (`US-061`, `US-065`) y la ruta de Testcontainers (`US-007`) siguen pendientes. Repositorio sin remoto: la CI no ha corrido (`US-004`), tampoco el nuevo paso `test:coverage` del trabajo `integration`.
- `trust proxy` sin configurar hasta el despliegue (`US-105`): detrás de un *proxy*, los límites contarían la IP del *proxy*.
- `experimental_RethrowHandlerPlugin` de oRPC puede cambiar (`ADR-0002`).
- Respuestas de ASCUN pendientes (`docs/requests/SOLICITUD-ASCUN.md`); `OQ-033`, `OQ-034`, `OQ-035` antes de `US-015`, `US-035`, `US-042`.

## Antes de empezar la próxima sesión

1. Leer `CLAUDE.md`, `CONSTRAINTS.md`, este archivo y la historia elegida.
2. `pnpm dev:infra` y `pnpm infra:check --only postgres,redis`.
3. Trabajar en una rama por historia; `pnpm verify:fast` antes de cada commit.
