# EP-04 — Event store y proyecciones

> Fase F2. Infraestructura de event sourcing y CQRS (`ARCHITECTURE.md` §7). Estas historias se desarrollan **antes** de los comandos de `EP-03`, que dependen de ellas.

### US-045 — Event store: append, lectura, idempotencia y concurrencia
- **Epic:** EP-04 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** IN_PROGRESS
- **Historia:** Como responsable quiero un almacén de eventos inmutable y seguro ante concurrencia para tener una fuente de verdad confiable.
- **Referencias:** DEC-008, DEC-026, DEC-038 · BR-AUD-01, BR-GEN-05 · INV-E-1, INV-E-2, INV-E-4 · `ARCHITECTURE.md` §7.2, §7.5, §7.7, §8.1
- **Criterios de aceptación:**
  1. Tablas `events` y `outbox` según `ARCHITECTURE.md` §8.1 con restricciones y *trigger* que rechaza `UPDATE`/`DELETE`; el rol de aplicación no tiene esos privilegios (`INV-E-4`).
  2. `append(streamId, expectedSequence, events[], idempotencyKey)` es atómico; si hay conflicto de versión devuelve `VERSION_CONFLICT`.
  3. Tabla `idempotency_keys` (`DEC-046`): repetir la clave con el mismo cuerpo devuelve la respuesta original; con otro cuerpo, `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD` (`INV-E-2`).
  4. Lectura de stream completo y desde una secuencia; secuencias sin huecos y monótonas (`INV-E-1`).
  5. Servicio de aplicación genérico `executeCommand` que: carga eventos → `evolve` → `decide` → `append` con reintento (máx. 3) y **revalidación** tras conflicto.
  6. La inserción en `outbox` ocurre en la misma transacción del append.
  7. Mecanismo de *upcasting* por `schemaVersion` con una prueba de ejemplo (`INV-E-5`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Tablas, *trigger*, *append* atómico con conflicto de versión y lectura — criterios 1, 2, 4 · M
  - (b) Idempotencia — criterios 3 · M
  - (c) `executeCommand` con reintento, *outbox* y *upcasting* — criterios 5, 6, 7 · M
- **Pruebas requeridas:** integración con Postgres real: concurrencia (N escritores), idempotencia, rechazo de `UPDATE`/`DELETE`, atomicidad con proyecciones y *outbox*.
- **Depende de:** US-007, US-021
- **Fuera de alcance:** proyecciones concretas (US-046), publicación a Redis (US-051).
- **Notas para la IA:** SQL parametrizado; no uses el ORM para el *append*. Cuida el aislamiento de transacción.
- **Implementación (a), 2026-10-28 (`DEC-108`, `PROPUESTO`):** migración `event_store` con `events` (restricciones, `REVOKE UPDATE`, *triggers* que rechazan `UPDATE`, `DELETE` y `TRUNCATE` incluso al dueño, RLS por organización) y `outbox` (índice parcial de pendientes); `appendEvents` y `readStream` en `apps/api/src/events/event-store.ts` con SQL parametrizado. Pruebas de integración en `apps/api/test/event-store.spec.ts`: lote atómico, conflicto de versión, N escritores concurrentes (`TC-030`), lectura completa y desde una secuencia con una propiedad de `INV-E-1`, inmutabilidad (`TC-032`, `INV-E-4`) y aislamiento por tenant.

### US-046 — Proyecciones síncronas y reconstrucción
- **Epic:** EP-04 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como árbitro quiero ver mesas, resultados y clasificación actualizados inmediatamente tras cada cambio.
- **Referencias:** DEC-038 · BR-TIE-07 · INV-E-3, INV-S-1 · `ARCHITECTURE.md` §7.6
- **Criterios de aceptación:**
  1. Proyecciones `tournament_summaries`, `participants_view`, `teams_view`, `rounds_view`, `pairings_view`, `games_view`, `standings_view`, `crosstable_view` con `stream_version` y `computation_version`.
  2. Se actualizan **en la misma transacción** que el *append*; la clasificación usa `@torre/standings` (recalculo completo).
  3. Endpoints de lectura (`standings`, `pairings`, `crosstable`) con `ETag` y `streamVersion`; filtros por ronda.
  4. Comando `projections:rebuild --tournament <id>` que reconstruye todo desde los eventos y produce **filas idénticas** a las vivas (`INV-E-3`).
  5. Si una proyección falla, la transacción entera falla (no hay estados parciales).
  6. Las lecturas respetan RLS y la visibilidad pública (`BR-PRIV-02`).
  7. Las rondas `CLOSED` se leen de la instantánea oficial del evento (`BR-AUD-05`, `INV-E-6`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Proyecciones en la misma transacción, fallo atómico — criterios 1, 2, 5 · M
  - (b) Lecturas con `ETag`, RLS, visibilidad e instantáneas de rondas cerradas — criterios 3, 6, 7 · M
  - (c) Reconstrucción con filas idénticas — criterios 4 · S
- **Pruebas requeridas:** `INV-E-3` con torneos simulados; lecturas con `ETag`; rendimiento (p95 ≤ 150 ms).
- **Depende de:** US-045, US-012
- **Depende (parcial):** US-013 (columnas de desempate)
- **Fuera de alcance:** proyecciones asíncronas de notificaciones/reportes (EP-06).

### US-047 — Línea de tiempo de auditoría
- **Epic:** EP-04 · **Fase:** F2 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como director quiero ver quién hizo qué, cuándo y por qué para resolver reclamaciones.
- **Referencias:** BR-AUD-02, BR-AUD-04
- **Criterios de aceptación:**
  1. Proyección `audit_view` con descripción legible por evento (i18n), actor, rol, hora (`America/Bogota`) y razón.
  2. Filtros por tipo, actor, ronda y partida; paginación por cursor.
  3. Exportación a CSV/PDF (PDF vía EP-06).
  4. Solo visible para roles con permiso (`AUTHORIZATION.md`).
- **Pruebas requeridas:** e2e; autorización; verificación de que correcciones muestran el valor anterior y el nuevo.
- **Depende de:** US-046
- **Fuera de alcance:** auditoría de acciones fuera del torneo (ya en `audit_log` de US-022/US-026).

### US-048 — Medición de rendimiento y *snapshots*
- **Epic:** EP-04 · **Fase:** F2 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como responsable quiero saber si el costo de reproducir eventos y recalcular proyecciones es aceptable antes de optimizar.
- **Referencias:** `ARCHITECTURE.md` §7.6, §17 · R3, R8
- **Criterios de aceptación:**
  1. Benchmarks: tiempo de plegado de un stream de 5 000 eventos; tiempo del comando de resultado con 200 y 500 competidores; tiempo de recálculo de clasificación.
  2. Se publica un informe con los datos y la decisión: ¿se necesitan *snapshots*?
  3. Solo si el informe lo justifica: implementar *snapshots* cada N eventos con verificación de equivalencia (estado con *snapshot* == estado por replay).
- **Pruebas requeridas:** benchmarks reproducibles (`pnpm bench`); prueba de equivalencia de *snapshot* si se implementa.
- **Depende de:** US-045, US-046
- **Fuera de alcance:** optimizaciones sin datos.
