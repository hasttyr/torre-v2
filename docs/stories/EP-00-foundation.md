# EP-00 — Cimientos del proyecto

> Fase F0. Sin esto no se puede trabajar con seguridad. Cada historia sigue el formato de `docs/templates/story-template.md`.
> Estados: `READY` · `BLOCKED(OQ-xxx)` · `PARTIAL(OQ-xxx)` · `LATER` · `DONE`. Tamaños: S (sesión corta) · M (una sesión) · L (varias sesiones) · XL (dividir antes de empezar).

### US-001 — Estructura del monorepo y herramientas base
- **Epic:** EP-00 · **Fase:** F0 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** DONE
- **Historia:** Como desarrollador quiero un monorepo pnpm con la estructura acordada y scripts raíz estándar para que tanto yo como la IA ejecutemos lint, typecheck, pruebas y build con un solo comando.
- **Contexto:** `ARCHITECTURE.md` §4 define la estructura. Los paquetes pueden estar vacíos (con `package.json`, `tsconfig.json` y un `index.ts`), pero deben existir y compilar.
- **Referencias:** DEC-004, DEC-001, DEC-035 · `ARCHITECTURE.md` §4, §5 · `CONVENTIONS.md` §2–§3
- **Criterios de aceptación:**
  1. `pnpm install` en un clon limpio termina sin errores y con lockfile congelado en CI.
  2. Existen `apps/api`, `apps/web` y los paquetes `config, core, rules, standings, pairing, ratings, tournament, contracts, testing` con nombre `@torre/<paquete>` (`DEC-063`). Todos son ESM (`"type": "module"`; `nodenext` en la API y los paquetes, `bundler` en la web; `DEC-071`).
  3. Scripts raíz funcionan: `lint`, `typecheck`, `test`, `test:e2e`, `build`, `dev`, `verify:fast`, `check:floor`, `verify` y `verify:full` (`TEST-PLAN.md` §6.2.5, `CONSTRAINTS.md` §5); `verify:fast` termina en ≤ 90 s. `dev` puede levantar solo lo disponible hasta `US-003`; `test:e2e` y las partes de `verify:full` sin suites todavía pueden quedar vacías, pero el comando existe y termina en verde.
  4. `.nvmrc` y `engines` fijan la versión LTS de Node; `.editorconfig` y `.gitignore` presentes.
  5. Husky + lint-staged ejecutan lint/format en *pre-commit*; commitlint valida Conventional Commits en `commit-msg`.
  6. `dependency-cruiser` (o `eslint-plugin-boundaries`) está configurado con las reglas de `ARCHITECTURE.md` §5 y **falla** si `packages/core` importa `@nestjs/*` (hay una prueba que lo demuestra).
  7. Se crea `docs/adr/ADR-0001-stack-and-versions.md` con las versiones verificadas de cada dependencia principal (con fecha), partiendo de `SOURCES.md` §6: Node LTS vigente (`DEC-063`), TypeScript 6 o 7 con `experimentalDecorators` y `emitDecoratorMetadata` comprobados en `apps/api`, Nest 12, Prisma 7.x (por `@casl/prisma`) y la fuente y licencia de la lista de contraseñas comunes (`BR-AUTH-09`).
  8. `tools/floor-guard.mjs` (`pnpm check:floor`) implementa el piso de `CONSTRAINTS.md` §1 con salida 0/1/2; una prueba demuestra que un `@ts-ignore` nuevo y un umbral rebajado en `CONSTRAINTS.md` hacen fallar el guardia.
- **Pruebas requeridas:** prueba de "canario" de límites de dependencia (un import prohibido hace fallar el lint en CI).
- **Depende de:** —
- **Fuera de alcance:** lógica de negocio, configuración de Docker (`US-003`), pipeline CI (`US-004`).
- **Notas para la IA:** no inventes versiones: consulta la última estable al momento y regístrala en el ADR. No agregues dependencias que no estén listadas en `ARCHITECTURE.md` §3 sin justificarlo.

### US-002 — Configuración compartida: TypeScript estricto, ESLint y Prettier
- **Epic:** EP-00 · **Fase:** F0 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** DONE
- **Historia:** Como desarrollador quiero configuraciones compartidas y estrictas para que ningún paquete relaje las reglas de calidad.
- **Contexto:** `ARCHITECTURE.md` §3.1 lista los flags estrictos. `apps/api` añade decoradores; `packages/*` **no**.
- **Referencias:** DEC-001 · `CONVENTIONS.md` §2
- **Criterios de aceptación:**
  1. `packages/config` expone `tsconfig.base.json`, un preset de ESLint (flat config) y una configuración de Prettier.
  2. Todos los paquetes extienden la base; `apps/api` habilita decoradores solo allí.
  3. ESLint prohíbe `any` explícito, aserciones no nulas (salvo tests), promesas flotantes, `switch` no exhaustivo y exige `import type` donde corresponda. En `packages/*` prohíbe además `Date.now`, `new Date()` sin argumentos, `Math.random`, `process` y los módulos de Node con I/O (`no-restricted-globals`/`no-restricted-syntax`/`no-restricted-imports`; `ARCHITECTURE.md` §5).
  4. Una prueba de configuración (archivo de ejemplo con `any`) falla el lint y está documentada como fixture.
  5. `pnpm lint` y `pnpm typecheck` pasan en todo el repo.
- **Pruebas requeridas:** fixture negativa de lint; `tsc --noEmit` en CI.
- **Depende de:** US-001
- **Fuera de alcance:** reglas de estilo subjetivas más allá de lo definido.
- **Notas para la IA:** si una regla genera demasiado ruido, **no** la desactives: propón la excepción puntual con comentario y razón.

### US-003 — Entorno local con Docker Compose
- **Epic:** EP-00 · **Fase:** F0 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** IN_PROGRESS
- **Historia:** Como desarrollador quiero levantar las dependencias de infraestructura con un comando para trabajar sin instalar nada a mano.
- **Contexto:** PostgreSQL con extensiones (`pg_trgm`, `unaccent`), Redis (Valkey), Mailpit (SMTP de pruebas) y un S3 local (RustFS, `ADR-0003`; MinIO dejó de publicar binarios).
- **Referencias:** DEC-023, DEC-016, DEC-015 · `ARCHITECTURE.md` §16.3
- **Criterios de aceptación:**
  1. `docker-compose.yml` define `postgres`, `redis`, `mailpit` y `s3` con *healthchecks* y volúmenes nombrados.
  2. Un script de inicialización crea las extensiones, el rol de aplicación (sin `BYPASSRLS`) y el rol de migración.
  3. El *bucket* del S3 local se crea automáticamente.
  4. `pnpm dev:infra` levanta todo y `pnpm dev:infra:down` lo detiene; los puertos están documentados.
  5. `.env.example` completo para API y web (según `ARCHITECTURE.md` §16.2) funciona con este compose.
- **Pruebas requeridas:** script de verificación que comprueba conectividad a cada servicio (`pnpm infra:check`).
- **Depende de:** US-001
- **Fuera de alcance:** Dockerfiles de producción de api/web (se hacen con `US-004`/despliegue).
- **Notas para la IA:** no pongas credenciales reales; usa valores de desarrollo claramente identificables.
- **Avance sin Docker (2026-10-27):** el modo nativo levanta Postgres y, en Windows con WSL, Valkey 7.2 desempaquetado de los paquetes firmados de Ubuntu sin `sudo` (decisión del responsable). `pnpm infra:check` da verde para `postgres` y `redis`; Mailpit y S3 siguen pendientes de Docker.

### US-004 — Pipeline de integración continua
- **Epic:** EP-00 · **Fase:** F0 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** DONE
- **Historia:** Como equipo quiero un pipeline que bloquee cambios que rompan calidad para detectar problemas antes de integrar.
- **Contexto:** Etapas definidas en `ARCHITECTURE.md` §16.4. Plataforma: GitHub Actions (`OQ-007` resuelta, `DEC-063`).
- **Referencias:** DEC-022 · `ARCHITECTURE.md` §16.4 · `TESTING.md` §9
- **Criterios de aceptación:**
  1. Workflow ejecuta: instalar con lockfile congelado → lint → typecheck → pruebas unitarias → build.
  2. Caché de pnpm configurada; versión de Node tomada de `.nvmrc`.
  3. Job de integración con Testcontainers (se activa cuando existan pruebas de integración).
  4. Job de seguridad: `pnpm audit` y `gitleaks` con `--redact`; job del piso: `pnpm check:floor` (`CONSTRAINTS.md`).
  5. Un PR con un error de lint/tipos/prueba **no** puede fusionarse (documentar la regla de protección de rama).
  6. Los informes de cobertura se suben como artefactos.
  7. **Evidencia por ejecución:** reporters JSON y JUnit de Vitest y Playwright, cobertura, reporte de Playwright con trazas y `reports/run-manifest.json` (commit, versiones, *digests* de imágenes, semillas; `TEST-PLAN.md` §14.3), publicados como artefactos con retención de 90 días.
  8. **Trazabilidad:** `pnpm test:trace` (script en `tools/`, sin dependencias nuevas) genera `reports/traceability.md` y hace fallar la CI si una historia en `DONE` tiene un criterio sin prueba etiquetada y verde; también si un caso de prioridad A del plan cuyas historias estén todas en `DONE` no tiene prueba.
  9. **Ejecución nocturna** (`pnpm test:nightly`) sobre `main`: propiedades con 5 000 casos y semilla aleatoria registrada, e2e en los navegadores disponibles y benchmarks; si falla, abre un defecto.
  10. `pnpm test:report` genera las secciones automáticas del informe de pruebas (`TEST-PLAN.md` §14.2) a partir de los resultados JSON y el manifiesto.
- **Pruebas requeridas:** PR de prueba con fallo deliberado que demuestra el bloqueo (documentado en el PR); prueba de `test:trace` con una historia ficticia con un criterio sin prueba (debe fallar).
- **Depende de:** US-001, US-002
- **Fuera de alcance:** despliegue (`OQ-004`), e2e de UI (se añade con US-067/US-068).
- **Notas para la IA:** si `OQ-007` resulta en GitLab u otro, adapta sin cambiar las etapas.
- **Cierre en GitHub (2026-10-27):** repositorio `hasttyr/torre-v2`. La primera ejecución sobre `main` falló por dos diferencias con la máquina local (resolución SSR de los paquetes del *workspace* en las pruebas de la web y GHSA-q7qp-rjg7-q26m en `multer`); el PR #1 las corrige y deja los cuatro trabajos en verde ([ejecución 40554155024](https://github.com/hasttyr/torre-v2/actions/runs/40554155024)). Protección de `main` activa: PR obligatorio, `quality`, `security`, `infra` e `integration` obligatorios, rama al día y `enforce_admins`. El PR #2 (fallo deliberado en una prueba) quedó `BLOCKED` con solo `quality` en rojo y se cerró sin fusionar ([ejecución 40569807383](https://github.com/hasttyr/torre-v2/actions/runs/40569807383)).

### US-005 — Módulo de configuración con validación de entorno (API)
- **Epic:** EP-00 · **Fase:** F0 · **Prioridad:** MUST · **Tamaño:** S · **Estado:** DONE
- **Historia:** Como operador quiero que la API falle al arrancar si falta o es inválida una variable de entorno para evitar comportamientos silenciosos.
- **Referencias:** DEC-037 · `ARCHITECTURE.md` §16.2
- **Criterios de aceptación:**
  1. Un esquema Zod describe todas las variables; el arranque falla con mensaje claro que lista **todas** las faltantes/inválidas.
  2. Los valores validados se exponen mediante un servicio tipado (sin `process.env` suelto en el código).
  3. Los secretos no se imprimen en logs.
  4. `.env.example` se mantiene sincronizado (prueba que compara claves del esquema con el ejemplo).
- **Pruebas requeridas:** unitarias (válido, faltante, tipo incorrecto, valores por defecto).
- **Depende de:** US-001
- **Fuera de alcance:** gestor de secretos del entorno de producción.

### US-006 — Capa transversal de la API: logging, errores, salud y seguridad básica
- **Epic:** EP-00 · **Fase:** F0 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** DONE
- **Historia:** Como operador quiero logs estructurados, errores uniformes y endpoints de salud para operar y depurar la API.
- **Referencias:** DEC-024, DEC-019 · `ARCHITECTURE.md` §6.4, §14, §15 · `CONVENTIONS.md` §6
- **Criterios de aceptación:**
  1. Logging `pino` en JSON con `correlationId` (acepta `X-Correlation-Id`, genera si falta, lo devuelve). Los logs llevan solo ids: `pino` redacta `Authorization`, `Cookie`, `Set-Cookie`, contraseñas, códigos TOTP y de recuperación, tokens y emails (`DEC-080`, `INV-PRIV-2`).
  2. Filtro global que responde `application/problem+json` con `code`, `title`, `status`, `detail`, `correlationId`, `errors[]`.
  3. Catálogo de códigos de error en `packages/contracts` y utilidad para lanzarlos; los errores inesperados devuelven 500 sin detalles internos.
  4. `/health/live` y `/health/ready` (BD y Redis) con `@nestjs/terminus`.
  5. `helmet`, CORS con lista explícita desde configuración, `@nestjs/throttler` global, cuerpo JSON ≤ 1 MB (`BODY_LIMIT`, `DEC-075`) y `enableShutdownHooks()`.
  6. Prefijo `/api/v1`.
- **Pruebas requeridas:** e2e (Supertest): formato de error, `correlationId`, salud con dependencias caídas, rate limit.
- **Depende de:** US-005
- **Fuera de alcance:** métricas y trazas (F3+).
- **Notas para la IA:** NUNCA registres cuerpos de petición con contraseñas ni tokens.

### US-007 — Base de datos: Prisma, migraciones, seeds y utilidades de prueba
- **Epic:** EP-00 · **Fase:** F0 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** DONE
- **Historia:** Como desarrollador quiero un acceso a datos con migraciones versionadas y una base de pruebas aislada para evolucionar el esquema con seguridad.
- **Referencias:** DEC-005, DEC-009 · `ARCHITECTURE.md` §8 · R1 (§18)
- **Criterios de aceptación:**
  1. Prisma configurado; migraciones SQL versionadas; **prohibido** `db push` fuera de local.
  2. Conexión con el rol de aplicación (`DATABASE_URL`) y migración con otro rol (`DATABASE_MIGRATION_URL`).
  3. Helper de transacción único (`withTransaction`) preparado para recibir el contexto de tenant (`US-025`).
  4. Seeds idempotentes para desarrollo (instituciones de ejemplo, usuario admin local). El usuario admin local lo añade `US-028` (criterio 6) a este seed, porque necesita las tablas de usuarios, roles y membresías.
  5. Utilidad de pruebas: arranca Postgres con Testcontainers, aplica migraciones y expone un cliente limpio por suite.
  6. Documentado cómo ejecutar SQL crudo parametrizado para el event store.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Prisma, migraciones versionadas, los dos roles de conexión y la utilidad de pruebas (la prueba de integración exigida la necesita desde la primera migración) — criterios 1, 2, 5 · M
  - (b) `withTransaction` y guía de SQL crudo parametrizado — criterios 3, 6 · S
  - (c) Seeds idempotentes — criterio 4 · S
- **Pruebas requeridas:** prueba de integración que aplica migraciones desde cero y ejecuta un CRUD mínimo.
- **Depende de:** US-003, US-005
- **Fuera de alcance:** tablas de negocio (cada historia añade las suyas); RLS (`US-025`).
- **Notas para la IA:** si Prisma estorba para el event store (R1), proponer un ADR antes de cambiar de herramienta.
- **Implementación (c), 2026-10-27:** `pnpm db:seed` compila la API y ejecuta `dist/database/seed.main.js` con el rol de aplicación; las instituciones demo tienen ids fijos y se insertan solo si faltan (no se pisan los cambios hechos a mano); se niega a correr con `NODE_ENV=production`.
- **Implementación (b), 2026-10-27:** `withTransaction` en `apps/api/src/database/transaction.ts` (y `DatabaseService.withTransaction`) recibe `{ organizationId, userId }` explícitos; `US-025` los sacará del contexto de la petición. Guía de SQL crudo en `CONVENTIONS.md` §9.1.
- **Implementación (a), 2026-10-27:** la utilidad usa Testcontainers (`postgres:18`, los scripts de `infra/postgres/init`) y, si `TEST_DATABASE_ADMIN_URL` está definida, un servidor existente (el clúster nativo de esta máquina, sin Docker). En los dos casos migra una plantilla una vez por ejecución y cada suite copia la plantilla. La ruta de Testcontainers corrió por primera vez en el trabajo `integration` de la CI de GitHub (2026-10-27, [ejecución 40554155024](https://github.com/hasttyr/torre-v2/actions/runs/40554155024): 8 archivos y 42 pruebas en verde con `postgres:18` y `valkey/valkey:8.1.10`).

### US-008 — Contratos de API con oRPC (prueba previa) y OpenAPI
- **Epic:** EP-00 · **Fase:** F0 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** DONE
- **Historia:** Como desarrollador quiero contratos tipados compartidos (servidor, cliente y OpenAPI desde un solo origen) para que API y web no se desincronicen.
- **Contexto:** `DEC-060`: oRPC con una prueba previa. Si la prueba falla, se usa `nestjs-zod` + cliente propio (`DEC-020`) y queda en un ADR.
- **Referencias:** DEC-060, DEC-020, DEC-037 · `ARCHITECTURE.md` §9 · R2
- **Criterios de aceptación:**
  1. `packages/contracts` exporta los contratos oRPC (esquemas Zod con ruta y método), los tipos inferidos, los mensajes WS y los códigos de error.
  2. **Prueba previa (`ADR-0002`)** con un endpoint real que comprueba: implementación en un controlador de Nest sobre Express con `@orpc/nest`; autorización (guard de Nest o middleware de oRPC + `AuthorizationService`); errores en `application/problem+json` con códigos estables; acceso a `Idempotency-Key`, `X-Correlation-Id` y cookies; `ETag`/`If-None-Match`; validación estricta (rechaza campos desconocidos); OpenAPI generado; cliente Vue con `@orpc/vue-query` y claves de caché invalidables; compilación con SWC.
  3. Si un punto de la lista falla sin solución razonable, el ADR registra la vuelta a `nestjs-zod` + cliente propio (`DEC-020`) y el resto de la historia sigue con esa opción.
  4. OpenAPI se sirve en `/api/docs` solo en entornos no productivos.
  5. Un endpoint de ejemplo (`GET /api/v1/ping`) demuestra el ciclo completo con prueba.
- **Pruebas requeridas:** prueba que falla si una operación de la API no proviene de `contracts`; rechazo de campos desconocidos; formato de errores; cliente tipado contra el servidor real (TC-046).
- **Depende de:** US-006
- **Fuera de alcance:** cliente HTTP del front (`US-009`).
- **Resultado (2026-10-27):** prueba superada (`ADR-0002`). El punto del cliente Vue con `@orpc/vue-query` pasó a `US-009` porque la web aún no existía y quedó comprobado en `US-009b` (`apps/web/src/shared/api/client.spec.ts`); el cliente tipado se probó contra el servidor real con `@orpc/client`. Los mensajes WebSocket del criterio 1 llegan con `US-050`. El punto "compilación con SWC" se cumple con `tsc` y oxc (`ADR-0004`).

### US-117 — Módulo de colas y proceso *worker* (BullMQ)
- **Epic:** EP-00 · **Fase:** F0 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** DONE
- **Historia:** Como sistema quiero un módulo de colas común y un proceso *worker* para hacer en segundo plano el trabajo pesado o con efectos externos.
- **Contexto:** Lo necesitan el emparejamiento asíncrono (`DEC-079`, VS-1), los emails, los reportes y el mantenimiento (`ARCHITECTURE.md` §11).
- **Referencias:** DEC-013, DEC-078, DEC-079 · `ARCHITECTURE.md` §11 · `SRC-22` · INV-T-9
- **Criterios de aceptación:**
  1. Módulo `jobs`: registro de colas BullMQ, conexión Redis (con `maxRetriesPerRequest: null` en los *workers*), política de reintentos por cola, estado consultable de un trabajo y utilidades de prueba.
  2. Proceso *worker* con el mismo código (`WORKER=true`) que arranca y se apaga ordenadamente, terminando los trabajos en curso.
  3. Cada trabajo lleva `organizationId`, `actor` y `correlationId`; el *worker* los pone en el contexto y abre cada transacción con `withTransaction`, así que rige RLS (`DEC-078`).
  4. La cola `maintenance` usa el rol de `DATABASE_MAINTENANCE_URL`, con `BYPASSRLS` y permisos solo sobre sus tablas (claves de idempotencia, tokens vencidos y solicitudes de rol).
  5. Al arrancar, el *worker* comprueba que Redis tenga `maxmemory-policy noeviction` y falla si no (`SRC-22`).
  6. Los trabajos que fallan de forma definitiva quedan en `failed` con su motivo; el reproceso manual está documentado.
- **Pruebas requeridas:** integración con Redis y Postgres (Testcontainers): reintentos, apagado ordenado, RLS en un trabajo con y sin tenant, y el rol de mantenimiento sin acceso a otras tablas (`TEST-PLAN.md` TC-209).
- **Depende de:** US-003, US-005, US-006
- **Depende (parcial):** US-025 (`withTransaction` y RLS)
- **Fuera de alcance:** panel de colas (Bull Board) y métricas de colas (`US-114`).
- **Implementación (2026-10-27):** BullMQ 6.4.2 con `@nestjs/bullmq` 12; parámetros de `DEC-086`. El contexto del trabajo se pasa explícito a `withTransaction` (fija `app.organization_id` y `app.user_id`); `US-025` lo llevará también a `nestjs-cls` y activará RLS, y entonces se prueba "cero filas sin tenant" (`TC-209`, `INV-T-9`). El rol `torre_maintenance` nace en `infra/postgres/init/01-roles.sql` con `BYPASSRLS` y sin privilegios sobre tablas: cada tabla que purga la cola `maintenance` (idempotencia `US-045`, tokens `US-022`, solicitudes de rol `US-029`) le concede los suyos en su migración. En producción el rol se crea con el plan de despliegue (`US-105`).

### US-009 — Esqueleto de la aplicación web
- **Epic:** EP-00 · **Fase:** F0 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** DONE
- **Historia:** Como usuario quiero una aplicación que cargue, navegue y muestre errores de forma consistente para tener una base sobre la cual construir pantallas.
- **Referencias:** DEC-003, DEC-017, DEC-018, DEC-019, DEC-040 · `ARCHITECTURE.md` §13 · `UI-UX.md`
- **Criterios de aceptación:**
  1. Vue 3 + Vite + TypeScript estricto con la estructura de `ARCHITECTURE.md` §13.1.
  2. Vue Router (rutas con carga diferida), Pinia, TanStack Vue Query y `vue-i18n` (solo `es` inicialmente) configurados como *providers*.
  3. Cliente central (oRPC + `@orpc/vue-query`, `ADR-0002`): base URL por entorno, `X-Correlation-Id`, mapeo de errores `problem+json` a mensajes i18n por `code`, manejo de 401 (refresh) preparado. Incluye el punto pendiente de la prueba de `US-008`: claves de consulta de `@orpc/vue-query` invalidables, con prueba.
  4. Páginas 404/403/500 y *layout* base; `app.config.errorHandler` global.
  5. Regla ESLint `no-restricted-imports` que impide importar librerías de UI fuera de `shared/ui` (se verifica con fixture).
  6. `pnpm --filter web dev` y `build` funcionan; pruebas con Vitest + Vue Test Utils configuradas.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Vite, estructura y *providers* (router, Pinia, Vue Query, i18n); `dev`, `build` y Vitest — criterios 1, 2, 6 · M
  - (b) Cliente central de la API, errores `problem+json` y páginas 404/403/500 — criterios 3, 4 · M
  - (c) Regla ESLint que limita las librerías de UI a `shared/ui` — criterios 5 · S
- **Pruebas requeridas:** unitarias del cliente (mapeo de errores) y de un componente de ejemplo, con MSW simulando el API.
- **Depende de:** US-002, US-008
- **Fuera de alcance:** sistema de diseño (`US-069`), pantallas de negocio.
- **Implementación (a), 2026-10-27:** Vite 8 + Vue 3.5 con `vue-tsc`; `installProviders` instala router (rutas con `import()`), Pinia, Vue Query y `vue-i18n` (`es`) igual en la app y en las pruebas; Vitest corre la web como proyecto propio (`apps/web/vite.config.ts`) con `happy-dom`; ESLint revisa los `.vue` con `eslint-plugin-vue` y las reglas de TypeScript sin tipos (el tipado lo da `vue-tsc`); `pnpm dev` levanta infraestructura, API con recarga y web. Las carpetas `shared/*` de `ARCHITECTURE.md` §13.1 llegan con (b) y (c), cuando tienen contenido.
- **Implementación (b), 2026-10-27:** `shared/api` crea el cliente tipado (`createApiClient` con `OpenAPILink`, base `VITE_API_BASE_URL` del `.env` de la raíz, `X-Correlation-Id` nuevo por petición, `credentials: 'include'` y un gancho `refreshSession` que ante un 401 renueva una vez y repite) y `orpc` con `@orpc/vue-query`. `toApiProblem` convierte cualquier fallo en `{ code, status, correlationId, errors }` (`NETWORK_ERROR` si no llegó a la API) y `errors.<CODE>` tiene mensaje en español para todos los códigos del catálogo. Hallazgo: el cliente oRPC solo lee como JSON `application/json`; el `fetch` del cliente reetiqueta `application/problem+json` y el cuerpo llega en `ORPCError.data.body`. *Layout* base con enlace para saltar al contenido, páginas 404/403/500 (la 500 muestra el `correlationId`) y `app.config.errorHandler`. Las pruebas del cliente corren en entorno `node` porque MSW no intercepta el `fetch` de `happy-dom`. Queda cerrado el punto pendiente de `US-008`: las claves de `@orpc/vue-query` se invalidan por contrato.
- **Implementación (c), 2026-10-27:** `no-restricted-imports` prohíbe en `apps/web/src` (salvo `shared/ui`) las librerías de UI de `UI-UX.md` §2.3 (`reka-ui`, `lucide-vue-next`, `vue-sonner`, `@tanstack/vue-table`, `@tanstack/vue-virtual`, `echarts`, `vue-echarts`, `cm-chessboard`, `@fullcalendar/*`), con *fixtures* que deben fallar y pasar. `shared/ui`, `shared/lib` y `shared/composables` nacen con `US-069` y las historias de pantallas.
