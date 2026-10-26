# EP-03 — Gestión de torneos (comandos del dominio)

> Fase F2. Aquí se materializan los comandos del torneo sobre el *decider* de `@torre/tournament` y el event store. Los nombres de eventos son los de `ARCHITECTURE.md` §7.3. Todos los comandos mutantes exigen `Idempotency-Key` y autorización (`US-024`).

### US-030 — Crear y configurar un torneo
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como director quiero crear un torneo eligiendo un `RuleSet` aprobado para que todas las reglas queden fijadas y auditables.
- **Referencias:** BR-GEN-02, BR-GEN-04, BR-LIFE-01, BR-PRIV-02 · DEC-027
- **Criterios de aceptación:**
  1. API de `rulesets` (listar, ver, crear versión nueva); un `APPROVED` es inmutable (el servicio lo impide); los presets de plataforma (`organization_id NULL`) solo los aprueba `platform_admin` (`DEC-047`).
  2. `POST /tournaments`: nombre, `slug` único por organización (la URL pública lleva también el de la organización, `DEC-083`), fechas, sede, visibilidad (`PUBLIC`/`UNLISTED`/`PRIVATE`), formato, rama, modalidad, `RuleSet` y versión.
  3. Solo `RuleSet APPROVED` es seleccionable salvo que el torneo se marque `demo`; los demo quedan identificados y no pueden publicarse como oficiales.
  4. Se emiten `TournamentCreated` y `TournamentConfigured`; este último **incrusta el snapshot** del `RuleSet`.
  5. Mientras el torneo esté en `DRAFT`, `PATCH` permite reconfigurar (nuevo `TournamentConfigured`); después de iniciar, solo metadatos (`BR-LIFE-07`).
  6. La proyección `tournament_summaries` queda actualizada en la misma transacción.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) API de `rulesets` — criterios 1 · S
  - (b) Crear torneo con `RuleSet` aprobado o demo; eventos con la instantánea del `RuleSet` — criterios 2, 3, 4 · M
  - (c) Reconfiguración en `DRAFT` y proyección — criterios 5, 6 · S
- **Pruebas requeridas:** e2e; prueba de que el snapshot del `RuleSet` en el evento no cambia si el `RuleSet` evoluciona; autorización por rol.
- **Depende de:** US-010, US-024, US-042, US-045, US-046
- **Fuera de alcance:** inscripciones (US-032).

### US-031 — Registro de jugadores e instituciones, e importación CSV
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como director quiero cargar jugadores en masa con validación para no digitarlos uno por uno.
- **Referencias:** BR-PRIV-01, BR-REG-05 · `ARCHITECTURE.md` §8.1 · DEC-048
- **Criterios de aceptación:**
  1. Catálogo de `institutions` con búsqueda; creación de instituciones nuevas por el administrador de plataforma.
  2. Alta, edición y consulta de `players` por organización con campos mínimos (nombre, institución, rama) y FIDE ID opcional; sin datos académicos ni documentos (`DEC-048`). El borrado es lógico y solo del `platform_admin` (`US-109`).
  3. Importación CSV en dos pasos: vista previa con errores por fila → confirmación. Reporta duplicados probables (similitud de nombre con `pg_trgm`) sin fusionarlos automáticamente.
  4. Límites: ≤ 2 MB y ≤ 5 000 filas (`DEC-075`); codificación UTF-8 con tildes; plantilla CSV descargable.
  5. No se piden documentos de identidad, fechas de nacimiento ni datos académicos (`BR-PRIV-01`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Instituciones y CRUD de jugadores con datos mínimos — criterios 1, 2, 5 · M
  - (b) Importación CSV en dos pasos con límites — criterios 3, 4 · M
- **Pruebas requeridas:** e2e de importación (válidos, errores, duplicados, tildes); RLS (`INV-T-1`).
- **Depende de:** US-025
- **Fuera de alcance:** vinculación de jugador con cuenta de usuario (se puede añadir luego).

### US-032 — Inscripción de participantes (individual)
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como director o capitán quiero inscribir jugadores en un torneo para conformar el cuadro de participantes.
- **Referencias:** BR-REG-01..06, BR-RAT-07 · DEC-048
- **Criterios de aceptación:**
  1. Comandos `RegistrationOpened/Closed` y `ParticipantRegistered` con validaciones de ventana (`REGISTRATION_OPEN`).
  2. Unicidad de jugador por torneo (`BR-REG-02`).
  3. Marca de elegibilidad verificada externamente (`BR-REG-01`, `DEC-048`): sin ella, `ELIGIBILITY_NOT_VERIFIED` si el `RuleSet` lo exige; cupos por institución o nodo (`BR-REG-06`).
  4. *Seed* inicial calculado según `RuleSet.seeding.order` con la instantánea de ratings (`BR-REG-04`, `BR-RAT-07`) y modificable por el director con `SeedingAdjusted` y razón.
  5. Listado `participants_view` ordenable y filtrable.
  6. Un capitán solo inscribe jugadores de **su** institución/equipo (autorización con condición).
- **Pruebas requeridas:** e2e; autorización por rol; invariantes de unicidad.
- **Depende de:** US-030, US-031
- **Fuera de alcance:** equipos (US-033), retiros (US-038).

### US-033 — Equipos y plantillas
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** SHOULD · **Tamaño:** L · **Estado:** PARTIAL(OQ-009)
- **Historia:** Como capitán quiero inscribir mi equipo y gestionar su plantilla para participar en un torneo por equipos.
- **Referencias:** BR-TEAM-01, BR-REG-02 · OQ-009
- **Criterios de aceptación:**
  1. Comandos `TeamRegistered` y `RosterUpdated` con tamaño de plantilla y restricciones declaradas en el `RuleSet`.
  2. Un jugador pertenece a un solo equipo por torneo (`BR-REG-02`); validaciones de institución.
  3. Plazos de modificación de plantilla desde el `RuleSet` `[PENDIENTE-ASCUN]`.
  4. `teams_view` con plantilla y estado.
  5. Solo el capitán del equipo (membresía con alcance `TEAM`) o roles superiores pueden modificarlo.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Comandos de equipo y plantilla con sus validaciones y plazos — criterios 1, 2, 3 · M
  - (b) Proyección y autorización del capitán — criterios 4, 5 · S
- **Pruebas requeridas:** e2e; IDOR sobre equipos ajenos.
- **Depende de:** US-032, US-020
- **Fuera de alcance:** alineación por enfrentamiento (US-040).

### US-034 — Máquina de estados del torneo
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como director quiero que el torneo solo pueda avanzar por transiciones válidas para evitar estados corruptos.
- **Referencias:** BR-LIFE-01, BR-LIFE-05 · `CORE-BUSINESS.md` §4.1
- **Criterios de aceptación:**
  1. Comandos: abrir/cerrar inscripción, iniciar, finalizar, cerrar, cancelar, reabrir (con razón).
  2. Cada transición no listada devuelve `INVALID_TRANSITION`.
  3. Iniciar valida: `RuleSet` aprobado (o demo), ≥ 2 competidores, número de rondas determinado.
  4. Tabla de pruebas que recorre **todas** las combinaciones estado × comando.
- **Pruebas requeridas:** prueba exhaustiva de transiciones (tabla); autorización.
- **Depende de:** US-030, US-045
- **Fuera de alcance:** cierre de rondas (US-039).

### US-035 — Generar, revisar y publicar una ronda
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como director quiero generar los emparejamientos de la siguiente ronda, revisarlos y publicarlos.
- **Referencias:** BR-PAIR-01..13, BR-LIFE-02, BR-LIFE-03 · INV-P-5
- **Criterios de aceptación:**
  1. `POST /tournaments/{id}/rounds` encola el trabajo en la cola `pairing` y responde `202` con su id (`DEC-079`). El *worker* invoca el motor del `RuleSet` (todos contra todos, Suizo…) y emite `RoundPaired` como **borrador** (con semilla, versión del motor, hash de entrada, `diagnostics` y el actor que lo pidió). `GET /tournaments/{id}/pairing-jobs/{jobId}` informa `QUEUED`, `RUNNING`, `DONE` o `FAILED`. Hay un solo trabajo activo por torneo; si el *stream* cambia mientras corre, se recalcula.
  2. Solo se puede generar la ronda *n+1* cuando la *n* esté `CLOSED` (Suizo, `BR-LIFE-03`).
  3. Los errores del motor (`NO_VALID_PAIRING`) dejan el trabajo en `FAILED` con detalle accionable, sin cambiar el estado del torneo y sin reintentos.
  4. Descartar y regenerar un borrador es posible mientras no esté publicado.
  5. `POST …/rounds/{n}/publish` emite `RoundPublished`; solo entonces los emparejamientos son visibles al público (`BR-LIVE-02`).
  6. Reproducibilidad: regenerar con la misma semilla produce el mismo borrador.
  7. Programación de la ronda (`RoundScheduled`, `BR-LIFE-06`) y descarte del borrador (`RoundDraftDiscarded`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Encolar y generar el borrador en el *worker*; estados del trabajo; reproducibilidad — criterios 1, 3, 6 · M
  - (b) Regla de la ronda *n+1*, descartar y regenerar, publicar y programar — criterios 2, 4, 5, 7 · M
- **Pruebas requeridas:** e2e del flujo con el *worker* en marcha; prueba de reproducibilidad; autorización.
- **Depende de:** US-014, US-034, US-117
- **Depende (parcial):** US-015 (solo para Suizo)
- **Fuera de alcance:** ajustes manuales (US-041).

### US-036 — Registrar resultados
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como árbitro quiero registrar el resultado de una partida de forma rápida y segura.
- **Referencias:** BR-SCORE-01..06, BR-LIFE-02 · INV-E-2
- **Criterios de aceptación:**
  1. `PUT /tournaments/{id}/games/{gid}/result` con `Idempotency-Key`; valida `BR-SCORE-05` (ronda `PUBLISHED`, partida `PENDING`, valor permitido, permiso).
  2. Se emite `GameResultRecorded`; la clasificación se recalcula en la misma transacción (proyección síncrona).
  3. Al registrarse el último resultado de la ronda se emite `RoundCompleted`.
  4. Repetir la misma petición (misma clave) devuelve el resultado original sin duplicar eventos.
  5. Conflictos de versión por concurrencia se reintentan y revalidan (`ARCHITECTURE.md` §7.5); se prueba con peticiones simultáneas.
  6. Latencia p95 ≤ 300 ms con 200 competidores (medida).
  7. Aviso de tolerancia de W.O. según la hora programada y `forfeitToleranceMinutes` (ASCUN: 0 minutos), sin registrar el forfeit automáticamente (`BR-SCORE-06`).
- **Pruebas requeridas:** e2e; concurrencia (varios árbitros); idempotencia; autorización por torneo.
- **Depende de:** US-035, US-046
- **Fuera de alcance:** correcciones (US-037), equipos (US-040).

### US-037 — Corregir un resultado
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como árbitro quiero corregir un resultado mal registrado dejando rastro para mantener la integridad.
- **Referencias:** BR-AUD-01..05, BR-LIFE-04 · INV-S-4, INV-S-5, INV-E-6 · DEC-051 · `SRC-12` Arts. 4.3–4.4
- **Criterios de aceptación:**
  1. `POST …/games/{gid}/result-corrections` con `reason` obligatorio y valor nuevo; emite `GameResultCorrected` que referencia el evento original.
  2. Sobre rondas `CLOSED`, o con la ronda siguiente publicada, solo el director (o un rol superior) la hace como **corrección administrativa** (`BR-AUD-03`, `DEC-051`); si la ronda estaba cerrada se emite además `RoundStandingsReissued`.
  3. Antes del final de la ronda siguiente, la clasificación se recalcula (`scope: STANDINGS`) y la ronda siguiente se marca `STALE` (`RoundMarkedStale`): un borrador se regenera o se mantiene (`StaleRoundAcknowledged`); una ronda publicada no se cambia y el dato entra en el emparejamiento posterior.
  4. Después del final de la ronda siguiente, la corrección queda con `scope: RATING_ONLY`: no cambia ninguna clasificación del torneo y solo cuenta para el TRF y el Elo interno (`INV-S-5`).
  5. El plazo de aviso de errores (`RuleSet.corrections.noticeDeadline`) se muestra al publicar cada ronda.
  6. Corregir y volver a corregir al valor original restablece la clasificación original (`INV-S-4`).
  7. La línea de tiempo de auditoría muestra la corrección con actor, hora, razón y alcance.
- **Pruebas requeridas:** propiedades `INV-S-4` e `INV-S-5`; e2e de los tres momentos (`TEST-PLAN.md` TC-040); autorización.
- **Depende de:** US-036
- **Fuera de alcance:** regeneración automática de rondas.

### US-038 — Byes, forfeits, retiros, inscripciones tardías y reincorporación
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** PARTIAL(OQ-001)
- **Historia:** Como director quiero gestionar las situaciones irregulares de un torneo con reglas claras.
- **Referencias:** BR-WD-01..05, BR-SCORE-03, BR-SCORE-04, BR-SCORE-06 · OQ-016, OQ-017
- **Criterios de aceptación:**
  1. Comandos: `ParticipantWithdrawn`, `ParticipantReinstated`, `ForfeitRecorded`, `ByeRequested`/`ByeRequestWithdrawn` (antes de emparejar).
  2. Un retiro con ronda emparejada sin resultado convierte la partida en forfeit al rival (`BR-WD-01`).
  3. Inscripción tardía aplica la política del `RuleSet` para rondas perdidas (`BR-WD-02`).
  4. Los puntos y el tratamiento en desempates de byes/forfeits provienen del `RuleSet`; si faltan, el comando falla con `RULESET_PARAMETER_MISSING`.
  5. Los retirados no se emparejan (`INV-P-8`) pero sus resultados previos cuentan; para desempates, sus rondas posteriores son byes de cero puntos (`SRC-04` Art. 16.1.1).
  6. Byes solicitados según `RuleSet.requestedByes` (ASCUN: solo de medio punto en la R1 de Clásico `[ASCUN-2012]`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Retiros, reincorporación y forfeit al rival — criterios 1 (retiro, reincorporación, forfeit), 2, 5 · M
  - (b) Byes solicitados y parámetros del `RuleSet` — criterios 1 (byes), 4, 6 · M
  - (c) Inscripción tardía — criterios 3 · S
- **Pruebas requeridas:** e2e; propiedades de `US-012` con retiros; casos dorados con byes/forfeits.
- **Depende de:** US-036, US-013
- **Fuera de alcance:** descalificaciones disciplinarias.

### US-039 — Cerrar ronda y torneo; reabrir con razón
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como director quiero cerrar rondas y el torneo para oficializar resultados y disparar los procesos posteriores.
- **Referencias:** BR-LIFE-02..05, BR-RAT-03, BR-NOTIF-02 · INV-E-3
- **Criterios de aceptación:**
  1. `…/rounds/{n}/close` solo si la ronda está `COMPLETED`; emite `RoundClosed` con la instantánea oficial de la clasificación (`BR-AUD-05`).
  2. `…/rounds/{n}/reopen` exige rol, `reason` y marca rondas posteriores `STALE`.
  3. Cerrar la última ronda permite `TournamentFinished`; `TournamentClosed` incluye la instantánea final y dispara (vía *outbox*) premiación, Elo interno, reportes y notificaciones finales (`BR-NOTIF-02`).
  4. La clasificación se etiqueta oficial solo tras `RoundClosed` (`BR-LIVE-03`).
  5. Reabrir un torneo cerrado es excepcional: rol alto + razón + evento.
- **Pruebas requeridas:** e2e del ciclo completo; verificación de que *outbox* contiene los mensajes esperados.
- **Depende de:** US-036, US-045
- **Fuera de alcance:** envío de emails y generación de PDF (EP-06).

### US-040 — Alineaciones y resultados por equipos
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** SHOULD · **Tamaño:** L · **Estado:** PARTIAL(OQ-009)
- **Historia:** Como capitán quiero presentar la alineación de cada enfrentamiento y como árbitro registrar los resultados por tablero.
- **Referencias:** BR-TEAM-02..06 · INV-TM-1, INV-TM-2 · OQ-009
- **Criterios de aceptación:**
  1. `LineupSubmitted` validado por el motor de `US-020`; alineación inválida se rechaza con el motivo.
  2. Plazo de entrega de alineación según `RuleSet` (si no existe, no se aplica plazo y se avisa).
  3. El resultado de cada tablero se registra como `GameResultRecorded`; el `MatchResultRecorded` se **deriva** y valida con `INV-TM-1`.
  4. Forfeits por tablero vacío o equipo incompleto según `RuleSet`.
  5. La proyección de equipos muestra puntos de enfrentamiento y de partida.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Alineaciones con plazo — criterios 1, 2 · S
  - (b) Resultados por tablero, *match* derivado, forfeits y proyección — criterios 3, 4, 5 · M
- **Pruebas requeridas:** e2e de un enfrentamiento de punta a punta; propiedades de `US-020`.
- **Depende de:** US-033, US-036, US-020
- **Fuera de alcance:** sustituciones complejas hasta tener la regla.

### US-041 — Ajuste manual de emparejamientos con auditoría
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como director quiero intercambiar o reasignar emparejamientos en un borrador cuando haya una situación justificada.
- **Referencias:** BR-PAIR-08, BR-PAIR-09, BR-AUD-02
- **Criterios de aceptación:**
  1. Solo sobre rondas `PAIRED_DRAFT`; el sistema valida el cambio contra `BR-PAIR-02` y muestra qué criterios empeoran.
  2. Una violación absoluta exige permiso especial, razón y queda marcada `OVERRIDE`.
  3. `PairingAdjusted` registra el estado anterior y nuevo.
  4. Se puede restablecer el borrador original generado por el motor.
- **Pruebas requeridas:** e2e; propiedad: tras cualquier secuencia de ajustes válidos el borrador sigue cumpliendo `INV-P-1..4`.
- **Depende de:** US-035
- **Fuera de alcance:** edición de emparejamientos ya publicados (requiere reapertura).

### US-115 — Check-in por ronda (opcional por torneo)
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como director quiero que los jugadores confirmen su presencia antes de cada ronda para no emparejar a quien no está.
- **Contexto:** `OQ-030` resuelta (`DEC-068`). Se activa por torneo (`checkIn.enabled`); sin activarlo, el flujo de rondas no cambia.
- **Referencias:** BR-WD-06, BR-LIFE-07, BR-TIE-03, BR-AUD-01 · DEC-068 · INV-P-11 · `AUTHORIZATION.md` §4
- **Criterios de aceptación:**
  1. La configuración del torneo admite `checkIn.enabled` (por defecto `false`), editable solo antes de iniciar (`BR-LIFE-07`).
  2. `POST /tournaments/{id}/rounds/{n}/check-in/open` y `…/check-in/close` (director) emiten `CheckInOpened` y `CheckInClosed`; solo para la ronda siguiente a la última cerrada y antes de emparejarla.
  3. `PUT …/rounds/{n}/check-in/{participantId}` marca la presencia (`PlayerCheckedIn`, con el actor) y `DELETE` la deshace (`PlayerCheckInRevoked`). El jugador vinculado solo marca la suya (`US-102`); el árbitro y el director, la de cualquier participante. Con la ventana cerrada: `CHECK_IN_CLOSED`.
  4. Con el check-in activo, emparejar una ronda cuyo check-in no está cerrado devuelve `CHECK_IN_NOT_CLOSED`.
  5. Al emparejar, quien no hizo check-in no se empareja y recibe `ZERO_POINT_BYE` en esa ronda (`INV-P-11`); los retirados siguen sin emparejarse (`INV-P-8`).
  6. Pantallas: en la vista del árbitro, lista de participantes con su estado y acción rápida; en "Mi torneo", botón de check-in mientras la ventana esté abierta. Estados de carga, vacío y error.
  7. Todo aparece en la línea de tiempo de auditoría (`US-047`).
- **Pruebas requeridas:** `TEST-PLAN.md` TC-206; propiedad `INV-P-11`; IDOR (un jugador no marca a otro).
- **Depende de:** US-035, US-038
- **Depende (parcial):** US-102 (check-in del propio jugador), US-068 (pantalla del árbitro)
- **Fuera de alcance:** check-in por código QR o geolocalización; check-in de equipos.
- **Notas para la IA:** el check-in no es una inscripción: no cambia el ranking inicial ni los datos del participante.

### US-100 — Campeonatos y ranking institucional "todo evento"
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** PARTIAL(OQ-024, OQ-028)
- **Historia:** Como organizador quiero agrupar los torneos de un evento (rama × modalidad) y obtener el ranking institucional para premiar a la universidad campeona.
- **Contexto:** ASCUN premia por rama a la institución con más puntos, según los puestos individuales en Clásico y Blitz (`SRC-01` Art. 20). Decisión `DEC-042`.
- **Referencias:** BR-CHAMP-01..06, BR-AUD-05 · DEC-042, DEC-084 · INV-C-1..C-4 · GV-006 · OQ-024, OQ-026, OQ-028
- **Criterios de aceptación:**
  1. Alta, edición y consulta de `championships` con sus torneos (`championship_tournaments`: rama y modalidad); RLS por organización; borrado solo del `platform_admin` (`US-109`).
  2. Función pura `computeInstitutionStandings(finalStandings[], config)` en `@torre/standings/championship`, con la tabla de puntos por modalidad tomada de la configuración (preset ASCUN `[ASCUN-2012]`).
  3. Solo cuentan torneos `CLOSED`, a partir de sus instantáneas oficiales (`BR-AUD-05`); se guardan los hashes usados.
  4. Los empates institucionales se muestran como puesto compartido; con un puesto individual compartido y sin regla, el cálculo falla de forma explícita (`BR-CHAMP-03`, `OQ-028`).
  5. `GET /championships/{id}/institution-standings` explica los puntos de cada institución (torneo y puesto de origen).
  6. `GV-006` se reproduce exactamente.
  7. El campeonato tiene `slug` y visibilidad (`BR-CHAMP-06`): `PUBLIC` o `UNLISTED` solo si todos sus torneos lo son; la API rechaza con `VISIBILITY_EXCEEDS_TOURNAMENTS` tanto ese cambio como hacer privado un torneo de un campeonato visible (`INV-C-4`).
  8. `GET /public/championships/{orgSlug}/{slug}` y la página pública SCR-08 muestran el ranking institucional con su explicación; los `UNLISTED` no aparecen en el directorio.
- **Pruebas requeridas:** `GV-006`; propiedades `INV-C-1..C-4`; e2e de los endpoints, incluido el público; RLS.
- **Depende de:** US-039, US-046
- **Fuera de alcance:** clasificación de un torneo a otro (`BR-CHAMP-04`, `OQ-026`); modalidad Rápido (`OQ-024`).

### US-101 — Premiación: medallas por rama y modalidad
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** SHOULD · **Tamaño:** S · **Estado:** PARTIAL(OQ-001)
- **Historia:** Como director quiero que las medallas se asignen automáticamente desde la clasificación final para no hacerlo a mano.
- **Referencias:** BR-PRZ-01, BR-PRZ-02, BR-TIE-05, BR-AUD-05 · `SRC-01` Art. 19
- **Criterios de aceptación:**
  1. Configuración de premios por torneo (cantidad y tipo; preset ASCUN: oro, plata y bronce a los tres primeros `[ASCUN-2012]`).
  2. Al cerrar el torneo, el decider emite `PrizesAwarded` a partir de la instantánea final.
  3. Con un puesto compartido en zona de premio, la asignación sigue `tiebreakPolicy.unresolved`; si no hay regla, error explícito (`BR-GEN-03`).
  4. Reglas de no acumulación (`BR-PRZ-02`) parametrizadas.
  5. Proyección `prizes_view` con lectura pública según la visibilidad del torneo.
- **Pruebas requeridas:** unitarias con puestos compartidos; e2e del cierre.
- **Depende de:** US-039
- **Fuera de alcance:** premios en dinero; diplomas en PDF (EP-06).

### US-103 — Reclamaciones: registro, plazos y resolución auditada
- **Epic:** EP-03 · **Fase:** F2 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** PARTIAL(OQ-001)
- **Historia:** Como capitán o jugador quiero presentar una reclamación dentro del plazo, y como director quiero resolverla dejando rastro.
- **Referencias:** BR-AUD-07, BR-PAIR-15, BR-AUD-03 · `SRC-01` Art. 5 · `SRC-02` Art. 2
- **Criterios de aceptación:**
  1. Comando `FileClaim` (tipo: emparejamiento, resultado, desempate u otro; objeto; descripción) → `ClaimFiled`.
  2. Plazos del `RuleSet` (ASCUN: emparejamientos antes de iniciar la ronda y solo por mala digitación; desempates antes de la premiación `[ASCUN-2012]`); fuera de plazo, `CLAIM_OUT_OF_TIME`.
  3. `ResolveClaim` (aceptada o rechazada, con razón) → `ClaimResolved`; si se acepta y requiere corrección, enlaza el evento que la aplica.
  4. Proyección `claims_view`; las reclamaciones aparecen en la línea de tiempo de auditoría.
  5. Autorización según `AUTHORIZATION.md` (presentar: capitán o jugador, sobre lo propio; resolver: `TD+`).
- **Pruebas requeridas:** e2e con plazos (dentro y fuera); autorización; IDOR.
- **Depende de:** US-037, US-046
- **Fuera de alcance:** el procedimiento disciplinario completo de la comisión.
