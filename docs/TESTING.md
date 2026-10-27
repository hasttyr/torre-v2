# TESTING.md — Estrategia de pruebas e invariantes

> En este proyecto **las pruebas son la especificación ejecutable**. Un error de cálculo es un error de arbitraje; por eso el dominio se verifica con propiedades, casos dorados independientes y, cuando es posible, un motor de referencia.
> Estado: `[DECIDIDO]` (`DEC-021`, `DEC-064`). El **plan de pruebas formal** del sistema (IEEE 829 / ISO/IEC/IEEE 29119-3) está en `TEST-PLAN.md`; este documento es la estrategia.

## 1. Principios

1. **Pruebas primero (o a la par) para el dominio.** Una historia de `EP-01` no se da por terminada sin sus propiedades.
2. **Los casos dorados deben ser independientes del código.** Se calculan a mano o con una herramienta/fuente externa; **nunca** copiando la salida del propio sistema (eso solo prueba que no cambió).
3. **No se debilita una prueba para que pase.** Si un invariante falla, se arregla el código o se discute el invariante con un cambio de documentación explícito.
4. **Determinismo.** Las pruebas son reproducibles: toda aleatoriedad usa semilla y la semilla se imprime ante un fallo.
5. **Sin pruebas frágiles.** Se prefiere afirmar propiedades y resultados de negocio, no detalles internos.
6. **Cada regla de negocio (`BR-*`) tiene al menos una prueba que la cita** (en el nombre o en un comentario `// BR-XXX-nn`).

## 2. Pirámide y herramientas

| Nivel | Qué prueba | Herramientas | Dónde |
|---|---|---|---|
| Unitarias del dominio | Funciones puras (puntajes, desempates, emparejamiento, ratings, equipos, decider) | Vitest, **fast-check** (propiedades) | `packages/*` |
| Basadas en modelo | Secuencias aleatorias de comandos sobre el *decider* | fast-check (modelo de comandos) | `packages/tournament` |
| Integración de API | Módulos Nest con PostgreSQL y Redis reales | Vitest + Supertest + Testcontainers | `apps/api/test` |
| Contratos | Respuestas cumplen esquemas Zod; OpenAPI consistente | Pruebas con `contracts` | api + web |
| Componentes de UI | Componentes y composables | Vitest + Vue Test Utils | `apps/web` |
| E2E de UI | Flujos completos | Playwright (multi-navegador) | `apps/web/e2e` |
| Carga | Tiempo real y API | k6 | `infra/k6` |
| Accesibilidad | Reglas automáticas | axe (Playwright) | web |
| Seguridad | IDOR, inyección, enumeración, CORS, límites | Pruebas e2e dedicadas | api |
| Rendimiento (benchmarks) | Presupuestos de `ARCHITECTURE.md` §17 y complejidad empírica | Vitest bench (`packages/*/test/bench/*.bench.ts`): modo reducido en cada `pnpm test`, completo con `pnpm bench` y en el nocturno | paquetes y api |
| Mutación (opcional) | Calidad de las pruebas del dominio | Stryker | `packages/*` |
| Humo | Que el sistema arranca y responde (infraestructura, API, web, clon limpio) | Scripts + Playwright | raíz, `apps/*` |
| Aceptación | Cada criterio de aceptación tiene una prueba etiquetada y verde; guion de demostración | `pnpm test:trace` + Playwright + ejecución manual | `tools/`, `apps/web/e2e` |
| Exploratoria (manual) | Defectos que las pruebas automáticas no anticipan | Sesión con *charter* | — |
| Regresión visual (opcional) | Cambios no deseados en componentes | Capturas con Playwright | `apps/web` |

La **regresión** no es un nivel aparte: es volver a ejecutar **todas** las suites anteriores en cada PR, cada noche y antes de entregar, más los casos dorados, los contraejemplos guardados y una prueba por cada defecto corregido (`TEST-PLAN.md` §6.1). La forma de comprobar los resultados (trazabilidad, manifiesto, evidencia y re-ejecución) está en `TEST-PLAN.md` §6.2.

## 3. Qué se prueba en cada paquete

| Paquete | Mínimo exigible |
|---|---|
| `core` | Conversión de unidades, orden canónico, `Result`, PRNG, hash canónico |
| `rules` | Validaciones cruzadas, aprobación, inmutabilidad, presets |
| `standings` | Puntajes (`INV-S-*`), cada desempate con caso dorado, políticas de empate, equipos (`INV-TM-*`), ranking institucional (`INV-C-*`, `GV-006`) |
| `pairing` | `INV-P-*`, `INV-RR-*`, oráculo de fuerza bruta, benchmarks, comparación con referencia |
| `ratings` | `INV-R-*`, `GV-002`, redondeo |
| `tournament` | Modelo de comandos, *replay*, *upcasting* (`INV-E-5`), todas las transiciones, instantáneas oficiales (`INV-E-6`), eventos sin datos personales (`INV-PRIV-1`) |
| `contracts` | Esquemas aceptan/rechazan lo esperado |
| `scheduler` | Validez de horarios, insatisfacibles explicados |
| `apps/api` | Autorización (`INV-T-*`), permisos editables (`INV-T-6..T-8`), RLS, borrado lógico (`INV-D-*`), event store (`INV-E-*`), idempotencia, concurrencia, sesión y 2FA (`INV-A-*`), notificaciones (`INV-N-*`), live (`INV-L-*`) |
| `apps/web` | Guards, cliente HTTP, atajos, tablas, flujos e2e |

## 4. Catálogo de invariantes

> Cada invariante tiene un ID y se prueba con propiedades o pruebas de integración. Las historias citan estos IDs.

### 4.1 Emparejamiento (`INV-P-*`) — sobre torneos aleatorios y simulados

| ID | Invariante |
|---|---|
| INV-P-1 | Cada competidor aparece **a lo sumo una vez** por ronda; hay PAB si y solo si el número de competidores disponibles (activos y sin bye solicitado en esa ronda) es impar |
| INV-P-2 | Nadie juega dos veces contra el mismo rival (C1 de `SRC-05`; en la doble ronda de todos contra todos rige `INV-RR-1`). Una pareja que no jugó su partida puede volver a emparejarse (`SRC-12` Art. 3.5) |
| INV-P-3 | Nadie recibe el PAB si ya lo recibió o ya sumó los puntos de una victoria sin jugar (C2), ni más de `maxByesPerPlayer` |
| INV-P-4 | Ningún par de no-*topscorers* con la misma preferencia absoluta de color se enfrenta (C3, `BR-PAIR-06`, `BR-PAIR-11`) |
| INV-P-5 | **Determinismo:** misma entrada + misma semilla ⇒ misma salida y mismo `inputHash` |
| INV-P-6 | **Completitud:** si existe un emparejamiento válido (hallado por el oráculo de fuerza bruta en *n ≤ 10*), el motor devuelve uno; si no existe, devuelve error explícito |
| INV-P-7 | **Invarianza a permutaciones** del orden de entrada (la salida depende del contenido, no del orden del arreglo) |
| INV-P-8 | Los competidores retirados no aparecen |
| INV-P-9 | Si la restricción de misma institución es factible, se cumple; si se relaja, queda reportado en `diagnostics` |
| INV-P-10 | **Sin relajación silenciosa:** las restricciones absolutas jamás se relajan; toda relajación de calidad aparece en `diagnostics` |
| INV-P-11 | **Check-in:** con el check-in activo, ningún participante sin check-in en la ronda aparece emparejado; cada uno recibe `ZERO_POINT_BYE` en esa ronda (`BR-WD-06`) |

### 4.2 Todos contra todos (`INV-RR-*`)

| ID | Invariante |
|---|---|
| INV-RR-1 | Cada par se enfrenta exactamente una vez (dos en doble ronda) |
| INV-RR-2 | La diferencia entre partidas con blancas y con negras por competidor es ≤ 1 en la vuelta simple |
| INV-RR-3 | Con *n* impar, cada competidor descansa exactamente una vez |
| INV-RR-4 | Para 3 a 16 competidores, el calendario coincide ronda por ronda y color por color con las tablas de Berger de FIDE (`SRC-14`, `BR-RR-01`) |

### 4.3 Clasificación y desempates (`INV-S-*`)

| ID | Invariante |
|---|---|
| INV-S-1 | **Conservación de puntos:** la suma de puntos repartidos coincide con la suma de los puntos que el `RuleSet` otorga por cada partida/bye/forfeit |
| INV-S-2 | El orden de clasificación es **total, determinista** e invariante a permutaciones |
| INV-S-3 | Los valores de desempate son enteros en su escala declarada y respetan cotas (p. ej. Buchholz entre 0 y el máximo posible) |
| INV-S-4 | Corregir un resultado y luego revertir la corrección restituye exactamente la clasificación anterior |
| INV-S-5 | Una corrección avisada después del final de la ronda siguiente (`scope: RATING_ONLY`) no cambia ninguna clasificación del torneo; solo cambia el TRF y el Elo interno (`BR-AUD-03`) |

### 4.4 Ratings (`INV-R-*`)

| ID | Invariante |
|---|---|
| INV-R-1 | Los puntajes esperados de los dos jugadores suman 1 |
| INV-R-2 | Con igual `K`, las variaciones de ambos jugadores suman 0 (antes de redondear) |
| INV-R-3 | La variación es monótona en el resultado y en la diferencia de rating |
| INV-R-4 | Aplicar la actualización de un torneo dos veces no cambia nada (idempotencia) |

### 4.5 Equipos (`INV-TM-*`)

| ID | Invariante |
|---|---|
| INV-TM-1 | Los puntos de enfrentamiento son coherentes con los puntos de tablero según `team.matchScoring` |
| INV-TM-2 | Una alineación válida respeta tableros, plantilla y orden; una inválida se rechaza con motivo |
| INV-TM-3 | Conservación de puntos a nivel de equipos |

### 4.5.1 Campeonato (`INV-C-*`)

| ID | Invariante |
|---|---|
| INV-C-1 | La suma de puntos institucionales es igual a la suma de los puntos que la tabla otorga por los puestos ocupados (`BR-CHAMP-02`, `GV-006`) |
| INV-C-2 | El ranking institucional es determinista e invariante al orden de los torneos y de los jugadores |
| INV-C-3 | Solo cuentan torneos `CLOSED`; con un puesto individual compartido y sin regla (`OQ-028`), el cálculo falla de forma explícita |
| INV-C-4 | Ningún campeonato `PUBLIC` o `UNLISTED` contiene un torneo `PRIVATE` (`BR-CHAMP-06`) |

### 4.6 Event store y proyecciones (`INV-E-*`)

| ID | Invariante |
|---|---|
| INV-E-1 | La secuencia por *stream* es monótona y sin huecos |
| INV-E-2 | Añadir con la misma `Idempotency-Key` no duplica eventos y devuelve la misma respuesta; con otro cuerpo devuelve `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD` (`DEC-046`) |
| INV-E-3 | **Reconstruir proyecciones** desde los eventos produce exactamente las mismas filas que las vivas |
| INV-E-4 | La base de datos rechaza `UPDATE`/`DELETE` sobre `events` |
| INV-E-5 | Los *upcasters* preservan el significado (ida y vuelta o equivalencia semántica) |
| INV-E-6 | La clasificación de una ronda `CLOSED` sale de la instantánea del evento; recalcular con otra `computation_version` no la cambia y produce un informe de diferencias (`BR-AUD-05`) |
| INV-E-7 | La base de datos rechaza `UPDATE`/`DELETE` sobre `audit_log` (`DEC-077`) |
| INV-PRIV-1 | Ningún esquema de evento contiene campos de datos personales (nombre, email, documento); se prueba sobre los esquemas Zod (`BR-AUD-06`) |
| INV-PRIV-2 | Ningún log contiene emails, nombres, contraseñas, tokens ni códigos: tras un e2e completo con datos sembrados, buscar esos valores en los logs capturados da cero coincidencias (`DEC-080`) |

### 4.7 Tenant, autorización y sesión (`INV-T-*`, `INV-A-*`)

| ID | Invariante |
|---|---|
| INV-T-1 | Ninguna consulta con el tenant A devuelve ni modifica filas del tenant B (probado sobre **todas** las tablas con `organization_id`); sin tenant ⇒ cero filas |
| INV-T-2 | La matriz de autorización (rol × acción × recurso × estado) se cumple exactamente |
| INV-T-3 | No hay IDOR: cambiar un ID en la petición no otorga acceso a recursos ajenos |
| INV-T-4 | Ninguna cuenta obtiene una membresía sin una asignación directa con razón o una solicitud aprobada por un revisor elegible; cada membresía tiene su registro en `audit_log` (`BR-ROLE-01..05`) |
| INV-T-5 | Ninguna asignación ni aprobación produce escalada: el rol otorgado nunca supera lo que el actor puede otorgar en ese alcance (`AUTHORIZATION.md` §3, `BR-ROLE-05`) |
| INV-T-6 | Ningún permiso reservado está asignado a un rol distinto de `platform_admin` (`AUTHORIZATION.md` §4.1) |
| INV-T-7 | Para cualquier conjunto de permisos (generado al azar), las reglas de estado del dominio no se pueden saltar (propiedad) |
| INV-T-8 | La semilla de permisos de los roles del sistema coincide con la matriz de `AUTHORIZATION.md` §4 |
| INV-T-9 | Un trabajo en segundo plano solo ve los datos de su `organizationId`; sin él, cero filas. El rol de mantenimiento no lee ni escribe tablas fuera de su lista (`DEC-078`) |
| INV-A-1 | Reutilizar un refresh token ya rotado revoca toda su familia |
| INV-A-2 | Las contraseñas se almacenan con argon2id y nunca aparecen en logs |
| INV-A-3 | Con 2FA activo no hay sesión sin segundo factor; los códigos de recuperación son de un solo uso; el secreto TOTP nunca aparece en logs ni en respuestas (`BR-AUTH-06`) |
| INV-A-4 | Ninguna petición cross-site renueva ni cierra una sesión: `/auth/refresh` y `/auth/logout` la rechazan por `Sec-Fetch-Site` o, si falta, por `Origin`/`Referer` (`DEC-062`) |
| INV-A-5 | Un `platform_admin` sin 2FA activo no ejecuta ninguna acción con permiso reservado (`TWO_FACTOR_REQUIRED`, `BR-AUTH-06`) |

### 4.8 En vivo, notificaciones y offline (`INV-L-*`, `INV-N-*`, `INV-O-*`)

| ID | Invariante |
|---|---|
| INV-L-1 | Con pérdidas, duplicados y desconexiones, el cliente converge al estado del servidor |
| INV-L-2 | Los borradores y los datos no autorizados **nunca** se emiten |
| INV-L-3 | Un socket sin token válido (vencido o revocado) no recibe avisos de salas privadas; revocar una membresía lo saca de inmediato (`DEC-074`) |
| INV-N-1 | No se envía dos veces el mismo aviso a la misma suscripción (`dedup_key`) |
| INV-N-2 | No se envía nada sin consentimiento confirmado |
| INV-N-3 | Un aviso en la app solo llega a su destinatario y no expone datos que él no podría ver (`US-112`) |
| INV-O-1 | La sincronización offline es idempotente y convergente |

### 4.9 Borrado lógico (`INV-D-*`)

| ID | Invariante |
|---|---|
| INV-D-1 | El rol de la aplicación no puede ejecutar `DELETE` en ninguna tabla de negocio (la prueba enumera las tablas desde el catálogo) |
| INV-D-2 | Lo borrado no aparece en ninguna consulta normal de ninguna tabla; solo en la papelera |
| INV-D-3 | Borrar y restaurar un lote deja los datos idénticos a como estaban antes de borrar |
| INV-D-4 | Tras anonimizar a un titular no queda ningún dato personal suyo en ninguna tabla, y las clasificaciones y resultados no cambian |

## 5. Pruebas del emparejamiento Suizo (`US-015`, `US-016`, `US-017`)

1. **Generación de torneos aleatorios:** tamaños (2–200), número de rondas, resultados con distribuciones configurables (incluye empates), retiros, byes solicitados, rating ausente, instituciones repetidas.
2. **Propiedades** `INV-P-1..P-11` evaluadas en **cada ronda** de cada torneo simulado.
3. **Oráculo de fuerza bruta** para *n ≤ 10*: enumera todos los emparejamientos válidos para decidir si el motor debió encontrar uno (`INV-P-6`).
4. **Reducción (*shrinking*):** ante un fallo se imprime el torneo mínimo reproducible con su semilla.
5. **Comparación con bbpPairings** (preset `fide-dutch-2026`; `SRC-08`: Apache-2.0, reglas Dutch 2026, entrada TRF-2026):
   - El binario **no** se versiona en el repositorio; el arnés lo busca por variable de entorno y se omite con mensaje si no está.
   - Se exportan torneos a TRF-2026 (`US-016`/`US-080`, `OQ-029`), se invoca la referencia y se comparan emparejamientos ronda a ronda.
   - Cada divergencia se analiza y se documenta (bug propio, interpretación de la regla o diferencia aceptada).
6. **Benchmarks:** crecimiento vs *n* y número de rondas; comparación base vs matching (`US-096`).

## 6. Simulador y datos de prueba (`US-095`)

- `@torre/testing` exporta: *builders* de competidores/torneos/historias, *arbitraries* de fast-check, generador de resultados con modelos (Elo, uniforme, con sesgo de empates), simulador de torneo completo y datos demo.
- Todo es **reproducible por semilla**.
- Los datos de prueba nunca contienen personas reales.
- Los *builders* producen datos válidos por defecto y permiten sobrescribir un campo (patrón *test data builder*).

## 7. Casos dorados

- Ubicación: `packages/<paquete>/test/golden/*.json` con: `description`, `input`, `expected`, **`source`** (`manual`, `SRC-nn` con artículo, o herramienta externa con versión), `verifiedBy`, `verifiedAt` y `rules` (`BR-*`).
- Los contraejemplos que encuentre fast-check se guardan ya reducidos, con su semilla y ruta, en `packages/<paquete>/test/regressions/*.json`, y se ejecutan siempre como parte de la regresión.
- `GV-001..GV-007` están en `CORE-BUSINESS.md` §18 y se transcriben como casos dorados.
- Desempates con rondas no jugadas: ejercicios oficiales de FIDE (`SRC-07`), revisados contra C.07 2026 (`SRC-04`).
- Los casos que dependen de FIDE `[VERIFICAR]` solo se agregan cuando existe una fuente (texto oficial o herramienta de referencia), anotándola.
- Un caso dorado **no** se actualiza con la salida del código para "hacerlo pasar"; se revisa a mano y se justifica en el PR.

## 8. Integración, e2e, carga, seguridad y accesibilidad

- **Integración de API:** Testcontainers (PostgreSQL con extensiones y roles reales, Redis, S3 local, Mailpit); cada suite parte de BD limpia; se prueba con el **rol de aplicación** (sin `BYPASSRLS`) para que RLS se ejerza.
  - Implementado en `US-007` (`apps/api/test/support`, `pnpm test:e2e` con `vitest.e2e.config.ts`): la preparación global arranca PostgreSQL y migra **una plantilla desde cero** con `prisma migrate deploy` y el rol de migraciones; cada suite llama a `createTestDatabase()`, que copia la plantilla (`CREATE DATABASE … TEMPLATE`) y entrega un Prisma Client con el rol de aplicación, y la borra al terminar.
  - Sin Docker, `TEST_DATABASE_ADMIN_URL` (en `.env`, comentada en `.env.example`) apunta al superusuario de un servidor existente, como el clúster nativo de `pnpm dev:infra`, que ya tiene los roles. La CI usa siempre Testcontainers.
  - Redis: la preparación global arranca también un contenedor `valkey/valkey:8.1.10` o usa `TEST_REDIS_URL` (en local, el Valkey nativo de `pnpm dev:infra` con su propio índice de base, `/15`); las suites lo leen con `inject('redis')`. Lo usa ya el humo `TC-081` (`apps/api/test/smoke.spec.ts`).
  - S3 y Mailpit entran en la utilidad con las historias que los usan (`US-065`, `US-061`).
  - `pnpm test:e2e` escribe `reports/vitest-e2e.json`, que `test:trace` y `test:report` leen junto con `reports/vitest.json`.
- **Concurrencia:** pruebas con varios escritores simultáneos sobre un mismo torneo (idempotencia, reintentos, `INV-E-1`).
- **E2E (Playwright):** VS-1 completo; ronda solo con teclado (`US-068`); en vivo entre pestañas (`US-053`); suscripción + email (`US-062`).
- **Carga (k6):** conexiones WebSocket y comandos (`US-054`).
- **Seguridad:** IDOR, inyección SQL, enumeración de usuarios, CORS, límites de tasa, reutilización de tokens (`US-099`).
- **Accesibilidad:** axe en flujos clave (`US-079`).

## 9. CI y umbrales (`DEC-064`)

| Control | Umbral |
|---|---|
| Lint, typecheck | 0 errores |
| Cobertura de paquetes de dominio | ≥ 90 % líneas y ramas |
| Cobertura de `apps/api` | ≥ 80 % líneas |
| Propiedades en CI normal | ≥ 200 casos por propiedad |
| Propiedades en CI nocturno | ≥ 5 000 torneos simulados |
| e2e | rama principal y nocturno |
| Regresión de benchmarks | falla si empeora > 30 % (modo reducido) |
| Mutación (opcional) | puntaje objetivo ≥ 70 % en `standings` y `pairing` |
| Seguridad | `pnpm audit` y escaneo de secretos sin hallazgos críticos |
| Trazabilidad | Historias en `DONE`: todos sus criterios con prueba etiquetada y verde (`pnpm test:trace`) |
| Reintentos | 0 en dominio y API; máximo 1 en e2e. Una prueba que solo pasa al reintentar se reporta como *flaky* y cuenta como fallo |
| Omisiones | Ningún `skip`/`todo` sin referencia a un `DEF-nnn` o una `OQ-*` |
| Evidencia | Cada ejecución de CI publica resultados JSON y JUnit, cobertura, reporte de Playwright con trazas y el manifiesto de ejecución (`TEST-PLAN.md` §6.2.4) |

Las pruebas flaky se **corrigen o eliminan** el mismo día; no se reintentan indefinidamente.

## 10. Convenciones de pruebas

- Nombre: `describe('<unidad>')` + `it('[etiquetas] should … when …')`. Las etiquetas van entre corchetes al inicio: criterio de aceptación `[US-nnn:ACk]`, caso del plan `[TC-nnn]`, regla `[BR-…]`, invariante `[INV-…]`, defecto `[DEF-nnn]`. Ejemplo: `it('[US-014:AC2][INV-RR-1][TC-012] should pair every couple exactly once when n is even')`. `pnpm test:trace` lee estas etiquetas (`TEST-PLAN.md` §6.2.1).
- Toda prueba de propiedades imprime su semilla y su ruta al fallar; en PR la semilla es fija y en la ejecución nocturna es aleatoria pero se registra en el manifiesto.
- Un `it` verifica un comportamiento. Datos construidos con *builders*.
- Sin dependencias del reloj ni del azar sin control (relojes y semillas inyectados).
- No se prueban detalles privados; se prueba la interfaz pública del paquete.
- Las pruebas de integración limpian su estado; no dependen del orden de ejecución.
