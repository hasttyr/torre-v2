# HANDOFF.md — Estado para la siguiente sesión

> Se **sobrescribe** al cerrar cada sesión (`AI-WORKFLOW.md` §9). La IA lo lee justo después de `CLAUDE.md`.

## Estado actual

- **Fecha:** 2026-10-27
- **Rebanada en curso:** VS-1 (esqueleto andante). Detalle por historia en `docs/PROGRESS.md`.
- **Terminadas en esta sesión:** `US-008` (contratos oRPC, `ADR-0002`), `US-117` (colas y *worker*), `US-009` (esqueleto web). Avanzadas: `US-007` (a, b, c; solo falta ejecutar la ruta de Testcontainers con Docker), `US-003` (Valkey nativo en WSL), `US-069` (a: tokens y vidrio; b1: primitivas).
- **Siguiente historia recomendada:** `US-069b2` (Dialog, Drawer, Tooltip, Toast, Tabs, Select, Combobox múltiple, DatePicker/RangeCalendar en `shared/ui`, con `ADR-0005`). Después, la ruta del backend de VS-1: `US-022` (registro e inicio de sesión), `US-023`, `US-024`, `US-025`, `US-045`, `US-046`.

## Decisiones de esta sesión

- **`DEC-085`** *Liquid Glass* con estilo 100 % Tailwind: vidrio en barras, diálogos, menús, toasts y tarjetas; tablas densas y proyector opacos; respaldo opaco con `prefers-reduced-transparency`, `prefers-contrast: more`, `data-transparency="reduced"` y proyector (`UI-UX.md` §3.3).
- **`DEC-086`** colas: retroceso exponencial desde 1 s; completados 24 h / 1 000; fallidos 7 días; concurrencia 1 en `pairing` y 5 en el resto; 30 s de gracia al apagar.
- **`DEC-087`** vidrio: 35 % / 55 % en claro y 40 % / 60 % en oscuro; desenfoque 24 / 40 px; fondo de marca al 18 %; radios 12 / 16 / 24 px.
- **`ADR-0002`** oRPC confirmado; errores de los *handlers* vuelven a Nest con `experimental_RethrowHandlerPlugin` (riesgo anotado).
- **`ADR-0005`** shadcn-vue portado a mano sobre Reka UI (sin CLI, sin `vaul-vue`, sin `tw-animate-css`).
- **Excepción `W1`** (`CONSTRAINTS.md` §4): contraseña ficticia en el commit `b2fb8ac`; vence el 2027-01-25.
- **Redis local:** Valkey de los paquetes de Ubuntu dentro de WSL, sin `sudo` (`pnpm dev:infra`).

## Entorno de esta máquina (lo que conviene saber)

- `pnpm dev:infra` levanta Postgres nativo (`127.0.0.1:55432`) y Valkey en WSL (`127.0.0.1:6379`). Si la herramienta de la sesión mata el Postgres al terminar un comando, se arranca aparte con `Start-Process pg_ctl …` (PowerShell).
- `.env` local tiene `TEST_DATABASE_ADMIN_URL` y `TEST_REDIS_URL=redis://127.0.0.1:6379/15`, que usan `pnpm test:e2e` sin Docker.
- `pnpm test:trace` lee `reports/vitest.json` (de `pnpm test:ci`) y `reports/vitest-e2e.json` (de `pnpm test:e2e`): correr los dos antes.
- Los *heredocs* largos en bash fallan con comillas: escribir archivos con la herramienta de escritura.

## Deuda y riesgos

- Sin Docker: Mailpit y S3 (`US-061`, `US-065`) y la ruta de Testcontainers (`US-007`) siguen pendientes. Repositorio sin remoto: la CI no ha corrido (`US-004`).
- `experimental_RethrowHandlerPlugin` de oRPC puede cambiar (`ADR-0002`).
- Respuestas de ASCUN pendientes (`docs/requests/SOLICITUD-ASCUN.md`); `OQ-033`, `OQ-034`, `OQ-035` antes de `US-015`, `US-035`, `US-042`.

## Antes de empezar la próxima sesión

1. Leer `CLAUDE.md`, `CONSTRAINTS.md`, este archivo y la historia elegida.
2. `pnpm dev:infra` y `pnpm infra:check --only postgres,redis`.
3. Trabajar en una rama por historia; `pnpm verify:fast` antes de cada commit.
