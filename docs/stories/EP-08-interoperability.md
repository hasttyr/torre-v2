# EP-08 — Interoperabilidad (importar/exportar)

> Fase F5. Formatos estándar para integrarse con herramientas externas y para validar el motor. Todo formato externo se implementa **desde su especificación oficial** (`SOURCES.md`).

### US-080 — Exportación e importación mínima de TRF (formato de torneo FIDE)
- **Epic:** EP-08 · **Fase:** F5 · **Prioridad:** SHOULD · **Tamaño:** L · **Estado:** READY
- **Historia:** Como director quiero exportar mi torneo en el formato estándar para usar otras herramientas y validar emparejamientos con un motor de referencia.
- **Referencias:** BR-PAIR-10 · US-016 · OQ-018
- **Criterios de aceptación:**
  1. Implementación basada en la **especificación oficial vigente**: TRF26 (Handbook C.02, Apéndice A, aplicado desde el 2025-09-01, `SRC-09`), con sus anexos de desempates obligatorios y códigos de tipo de torneo; se cita versión y fuente en el código y en el ADR.
  2. Exportación de un torneo individual: datos generales, jugadores, resultados por ronda y colores; validación de campos de ancho fijo con pruebas.
  3. Importación mínima suficiente para cargar torneos de ejemplo y alimentar pruebas (`US-016`), con archivos ≤ 2 MB (`DEC-075`).
  4. Ida y vuelta: exportar→importar→exportar produce el mismo archivo.
  5. Campos que el sistema no tiene se dejan vacíos según la especificación (no se inventan).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Exportación TRF26 con campos de ancho fijo y vacíos según la especificación — criterios 1, 2, 5 · M
  - (b) Importación mínima e ida y vuelta — criterios 3, 4 · M
- **Pruebas requeridas:** casos con archivos de ejemplo oficiales o generados por herramientas de referencia; propiedad de ida y vuelta.
- **Depende de:** US-046
- **Fuera de alcance:** TRF de equipos si la especificación lo trata distinto; se evalúa luego.
- **Notas para la IA:** consulta la especificación; no reconstruyas columnas de memoria.

### US-081 — Exportaciones CSV/JSON de clasificación, mesas y resultados
- **Epic:** EP-08 · **Fase:** F5 · **Prioridad:** SHOULD · **Tamaño:** S · **Estado:** READY
- **Historia:** Como director quiero exportar datos a hojas de cálculo.
- **Referencias:** BR-PRIV-02 · `ARCHITECTURE.md` §9
- **Criterios de aceptación:**
  1. Descarga de clasificación (con desempates), emparejamientos y resultados por ronda en CSV (UTF-8 con BOM opcional para Excel) y JSON.
  2. Respeta permisos y visibilidad; las exportaciones públicas contienen solo campos públicos.
  3. Valores de puntos formateados de forma consistente (`½`) y también como número en columna técnica.
  4. Escape correcto de campos (comas, comillas, saltos de línea) y protección contra inyección de fórmulas en CSV.
- **Pruebas requeridas:** unitarias de escape y de inyección de fórmulas; e2e de descarga.
- **Depende de:** US-046
- **Fuera de alcance:** importación (jugadores en `US-031`).

### US-082 — Importación y exportación de PGN vinculadas a partidas
- **Epic:** EP-08 · **Fase:** F5 · **Prioridad:** COULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como árbitro quiero asociar la notación de una partida a su resultado.
- **Referencias:** DEC-032 · US-092
- **Criterios de aceptación:**
  1. Importar PGN válido (con `chess.js`) y vincularlo a una partida existente por jugadores/ronda; rechazar PGN inconsistente con el resultado registrado (con aviso, no silencio).
  2. Exportar PGN por partida, ronda o torneo con cabeceras estándar (evento, sitio, fecha, ronda, jugadores, resultado).
  3. Límite de tamaño (≤ 2 MB, `DEC-075`) y saneamiento de entrada.
  4. Los PGN no alteran puntos ni clasificación; son información adjunta.
- **Pruebas requeridas:** casos válidos/ inválidos; PGN con variantes y comentarios; límites.
- **Depende de:** US-092, US-036
- **Fuera de alcance:** análisis con motor (`US-093`).

### US-104 — Importación de ratings FIDE y nacionales para la siembra
- **Epic:** EP-08 · **Fase:** F5 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como director quiero cargar los ratings FIDE y nacionales de los jugadores para sembrar como lo exige ASCUN.
- **Referencias:** BR-REG-04, BR-RAT-05, BR-RAT-07 · DEC-049, DEC-069, DEC-070 · `SRC-01` Art. 15 · `SRC-12` Art. 2
- **Criterios de aceptación:**
  1. Importación CSV (FIDE ID, título FIDE, rating FIDE, rating nacional, fecha de la lista) con vista previa y errores por fila; tabla `player_ratings` con fuente y fecha; el título va a `players.fide_title`.
  2. Emparejado por FIDE ID o, si falta, por nombre e institución con revisión manual (sin fusión automática).
  3. Al inscribir se toma una instantánea de los ratings, que va en `ParticipantRegistered` (`BR-RAT-07`).
  4. Siembra según `BR-REG-04`: `RuleSet.seeding.order` (ASCUN: FIDE y luego nacional), título FIDE, apellido y nombre, id.
  5. Descarga de la lista oficial de FIDE como mejora opcional, detrás de un adaptador y sin red en el dominio.
- **Pruebas requeridas:** unitarias de parseo y emparejado; e2e de importación; prueba de siembra.
- **Depende de:** US-031, US-032
- **Fuera de alcance:** sincronización automática periódica con FIDE o FECODAZ.
