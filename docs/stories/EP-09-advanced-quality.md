# EP-09 — Diferenciadores, calidad demostrable y operación

> Fases F5–F6. Aquí está parte importante del valor técnico "demostrable": modo offline, programación por restricciones, simulador, benchmarks y endurecimiento. Algunas historias son COULD/LATER y se priorizan según tiempo.

### US-090 — PWA: caché de lectura para espectadores
- **Epic:** EP-09 · **Fase:** F6 · **Prioridad:** COULD · **Tamaño:** M · **Estado:** LATER
- **Historia:** Como espectador quiero ver el último estado conocido del torneo aunque se corte mi conexión.
- **Referencias:** DEC-030 · BR-LIVE-03
- **Criterios de aceptación:**
  1. Service worker con estrategia *stale-while-revalidate* para vistas públicas; manifiesto instalable.
  2. Los datos desactualizados se marcan con la hora de la última sincronización.
  3. Nunca se cachean datos privados ni autenticados en el service worker.
  4. Actualización de versión del service worker controlada y comunicada.
- **Pruebas requeridas:** e2e con red simulada fuera de línea; verificación de que no se cachean rutas privadas.
- **Depende de:** US-053, US-070
- **Fuera de alcance:** escritura sin conexión (`US-091`).

### US-091 — Árbitro sin conexión: registro local y sincronización
- **Epic:** EP-09 · **Fase:** F6 · **Prioridad:** SHOULD · **Tamaño:** XL · **Estado:** LATER
- **Historia:** Como árbitro quiero seguir registrando resultados sin internet y sincronizarlos después sin perder nada.
- **Contexto:** Es el diferenciador técnico mayor (`PRODUCT.md` S8). Requiere decisiones tomadas desde ya: IDs generados por el cliente, comandos idempotentes y `@torre/tournament` utilizable en el navegador (`DEC-026`, `DEC-030`). **Dividir:** (a) cola local de comandos (IndexedDB) y validación local con el *decider*; (b) sincronización idempotente; (c) detección y resolución de conflictos; (d) UX de estado de sincronización.
- **Referencias:** DEC-026, DEC-030, DEC-007, DEC-062 · BR-SCORE-05, BR-AUD-01 · INV-O-1 · R10
- **Criterios de aceptación:**
  1. Los comandos se validan localmente con el *decider* sobre una copia del estado de la ronda y se guardan con `Idempotency-Key` y `occurredAt` locales.
  2. Al recuperar conexión, la cola se envía en orden; el servidor revalida y acepta o rechaza **cada comando** con motivo.
  3. Conflictos (otro árbitro registró primero, ronda cerrada mientras tanto) se detectan y se presentan al usuario con opciones claras; nada se descarta en silencio.
  4. Política de resolución documentada (p. ej. el servidor manda; las divergencias de resultado requieren decisión humana).
  5. Convergencia: tras sincronizar, el estado local coincide con el del servidor (`INV-O-1`).
  6. Indicador permanente del estado (en línea / sin conexión / pendiente N / conflicto).
  7. Los datos locales se protegen (solo del torneo asignado) y se limpian al cerrar sesión.
  8. Un comando encolado **caduca a los 7 días**, porque el servidor solo guarda las claves de idempotencia ese tiempo (`DEC-062`). La interfaz avisa antes de que caduque; un comando caducado no se reenvía solo: queda visible como caducado para que el árbitro lo revise y lo registre de nuevo.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Cola local (IndexedDB), validación local con el *decider* y protección de datos — criterios 1, 7 · M
  - (b) Sincronización idempotente, convergencia y caducidad de 7 días — criterios 2, 5, 8 · M
  - (c) Detección y resolución de conflictos — criterios 3, 4 · M
  - (d) Indicador de estado de sincronización — criterios 6 · S
- **Pruebas requeridas:** pruebas basadas en modelo con interrupciones de red, reordenamiento y duplicados; e2e con red simulada; pruebas de conflicto entre dos árbitros.
- **Depende de:** US-042, US-036, US-068
- **Fuera de alcance:** emparejamiento sin conexión (solo registro de resultados).
- **Notas para la IA:** NUNCA marques un resultado como "sincronizado" sin la confirmación explícita del servidor.

### US-092 — Registro de partidas: tablero, PGN y FEN
- **Epic:** EP-09 · **Fase:** F6 · **Prioridad:** COULD · **Tamaño:** L · **Estado:** LATER
- **Historia:** Como árbitro quiero registrar las jugadas de una partida para conservarla.
- **Referencias:** DEC-032 · `SOURCES.md` §6
- **Criterios de aceptación:**
  1. Componente de tablero `cm-chessboard` (MIT, `SOURCES.md` §6), envuelto en `shared/ui`.
  2. Validación de jugadas con `chess.js`; exporta/importa PGN y FEN.
  3. Accesible por teclado y con alternativa textual.
  4. Los datos de jugadas se almacenan como adjunto de la partida y no afectan puntos.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Tablero `cm-chessboard` envuelto en `shared/ui` y accesible — criterios 1, 3 · M
  - (b) Validación con `chess.js`, PGN y FEN como adjunto — criterios 2, 4 · M
- **Pruebas requeridas:** unitarias de validación; e2e de captura de una partida corta.
- **Depende de:** US-068, US-069
- **Fuera de alcance:** transmisión en vivo de jugadas.

### US-093 — Análisis con motor de ajedrez (opcional)
- **Epic:** EP-09 · **Fase:** F6 · **Prioridad:** COULD · **Tamaño:** L · **Estado:** LATER
- **Historia:** Como usuario quiero analizar una partida registrada con un motor.
- **Referencias:** DEC-013 · OQ-018
- **Criterios de aceptación:**
  1. Motor ejecutado en un *worker* aislado (cliente con WASM o cola en servidor) con límites de tiempo/recursos.
  2. El análisis nunca bloquea la interfaz ni afecta el torneo.
  3. Revisión de licencia del motor antes de incluirlo (`OQ-018`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Elegir el motor y resolver su licencia (`OQ-018`) — criterios 3 · S
  - (b) *Worker* aislado con límites y cancelación — criterios 1, 2 · M
- **Pruebas requeridas:** pruebas de aislamiento, de límites y de cancelación.
- **Depende de:** US-092
- **Fuera de alcance:** detección de trampas.

### US-094 — Programador de calendario por restricciones (CSP)
- **Epic:** EP-09 · **Fase:** F6 · **Prioridad:** COULD · **Tamaño:** XL · **Estado:** LATER
- **Historia:** Como director quiero asignar rondas, salas y tableros a franjas horarias respetando restricciones.
- **Contexto:** Problema de satisfacción de restricciones/optimización (paquete `@torre/scheduler`). **Dividir:** modelo de restricciones, solucionador (retroceso con propagación + heurísticas), validador independiente, UI.
- **Referencias:** `PRODUCT.md` §6.1 · `ARCHITECTURE.md` §4
- **Criterios de aceptación:**
  1. Modelo: franjas, salas/mesas, descansos mínimos por competidor, restricciones por institución y árbitros disponibles.
  2. El solucionador devuelve un horario válido o un conjunto mínimo explicado de restricciones en conflicto.
  3. Un **validador independiente** comprueba cualquier horario (propiedad: lo que produce el solucionador siempre es válido).
  4. Determinista con semilla; medición de tiempo para 200 partidas.
  5. UI para visualizar y ajustar manualmente con verificación inmediata.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Modelo de restricciones — criterios 1 · M
  - (b) Validador independiente — criterios 3 · S
  - (c) Solucionador determinista con conflicto mínimo explicado — criterios 2, 4 · M
  - (d) Interfaz para ver y ajustar — criterios 5 · M
- **Pruebas requeridas:** propiedades (validez), casos insatisfacibles con explicación, benchmarks.
- **Depende de:** US-014, US-069
- **Fuera de alcance:** optimización multiobjetivo avanzada.

### US-095 — Simulador de torneos y datos de demostración
- **Epic:** EP-09 · **Fase:** F1+ (se usa desde F1) · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como responsable quiero generar torneos completos sintéticos para probar y demostrar el sistema.
- **Referencias:** PRODUCT S7 · `TESTING.md` §6 · BR-GEN-01
- **Criterios de aceptación:**
  1. `@torre/testing` incluye: generador de competidores (con ratings, instituciones, tildes), generador de resultados con modelos configurables (basado en Elo, aleatorio uniforme, con empates), retiros, byes y forfeits.
  2. Reproducible por semilla; puede producir torneos individuales y por equipos.
  3. Simulación de un torneo completo contra la API (script) y contra el *decider* (en memoria).
  4. Semillas de datos de demostración cargables en el entorno local (`pnpm seed:demo --seed <n>`; la misma semilla produce los mismos datos); los torneos demo están marcados como demo. Incluye el CSV de ejemplo de 8 jugadores del guion de aceptación (`TEST-PLAN.md` §14.5) y usuarios demo con cada rol, más un espectador con una solicitud de rol pendiente.
  5. Se usa como fuente en las pruebas de propiedades, e2e, carga y demos.
- **Pruebas requeridas:** pruebas del propio simulador (reproducibilidad, distribución de resultados).
- **Depende de:** US-011, US-012
- **Fuera de alcance:** datos reales de personas.

### US-096 — Informe de complejidad y benchmarks
- **Epic:** EP-09 · **Fase:** F5 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como responsable quiero un informe que demuestre con datos la complejidad algorítmica y el rendimiento.
- **Referencias:** PRODUCT S1–S5 · `ARCHITECTURE.md` §17
- **Criterios de aceptación:**
  1. Benchmarks reproducibles (`pnpm bench`) para: clasificación y desempates, Suizo v1 vs matching, generación round-robin, plegado de eventos, proyecciones.
  2. Crecimiento empírico vs *n* (gráficas) contrastado con la complejidad teórica.
  3. Informe en `docs/reports/` con metodología, entorno, resultados y conclusiones.
  4. Los benchmarks corren en CI (modo reducido) para detectar regresiones grandes.
- **Pruebas requeridas:** los benchmarks son la entrega; umbral de regresión en CI.
- **Depende de:** US-012, US-013, US-015, US-017
- **Depende (parcial):** US-048 (benchmarks de plegado de eventos y proyecciones)
- **Fuera de alcance:** optimización sin evidencia.

### US-097 — Diagramas, ADRs y documentación técnica viva
- **Epic:** EP-09 · **Fase:** F5 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como revisor del proyecto quiero entender las decisiones y la arquitectura de un vistazo.
- **Referencias:** PRODUCT S9 · `docs/adr/README.md`
- **Criterios de aceptación:**
  1. ADRs para cada decisión significativa tomada durante la implementación (al menos `ADR-0001` versiones y los que surjan: RLS con Prisma, PDF, transporte en vivo).
  2. Diagramas C4 (contexto, contenedores, componentes) y de secuencia de los flujos clave en Mermaid, versionados con el código.
  3. Documento de modelo de datos generado/actualizado desde el esquema.
  4. Revisión de consistencia entre `docs/` y el código (lista de verificación).
- **Pruebas requeridas:** verificación de enlaces y de IDs referenciados (script de CI).
- **Depende de:** —
- **Fuera de alcance:** sitio web de documentación.

### US-098 — Copias de seguridad, restauración y simulacro
- **Epic:** EP-09 · **Fase:** F5 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como operador quiero poder restaurar los datos tras un fallo.
- **Referencias:** `ARCHITECTURE.md` §17 · OQ-004
- **Criterios de aceptación:**
  1. Procedimiento documentado y script para respaldo de PostgreSQL (incluyendo `events`) y del almacenamiento de objetos.
  2. **Simulacro de restauración** en entorno limpio con verificación: las proyecciones reconstruidas coinciden (`INV-E-3`).
  3. RPO/RTO objetivo definidos (la demo local no los requiere, `OQ-004`; aplicarían a un despliegue según `ARCHITECTURE.md` §16.5).
  4. Cifrado de copias y política de retención.
- **Pruebas requeridas:** el simulacro automatizado se ejecuta en CI nocturno con datos sintéticos.
- **Depende de:** US-046
- **Fuera de alcance:** alta disponibilidad multi-zona.

### US-099 — Endurecimiento de seguridad y revisión final
- **Epic:** EP-09 · **Fase:** F5 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como responsable quiero verificar que se cumplen los controles de seguridad definidos antes de dar por cerrado el proyecto.
- **Referencias:** `ARCHITECTURE.md` §14 · INV-T-1..T-3, INV-A-1
- **Criterios de aceptación:**
  1. Lista de verificación de `ARCHITECTURE.md` §14 completada con evidencia (pruebas o configuración).
  2. `pnpm audit` y escaneo de secretos sin hallazgos críticos; dependencias actualizadas.
  3. Pruebas de seguridad automatizadas: inyección SQL en parámetros, enumeración de usuarios, IDOR, cabeceras, CORS, límites de tasa.
  4. Revisión de datos personales: qué se guarda, dónde, quién accede (`BR-PRIV-*`, `DEC-029`).
  5. Informe con riesgos residuales aceptados.
- **Pruebas requeridas:** las del criterio 3, ejecutadas en CI.
- **Depende de:** US-022, US-024, US-025, US-060
- **Fuera de alcance:** pruebas de penetración externas.

### US-105 — Plan de despliegue documentado (Vercel + Render + Neon)
- **Epic:** EP-09 · **Fase:** F5 · **Prioridad:** MUST · **Tamaño:** S · **Estado:** READY
- **Historia:** Como responsable quiero un plan de despliegue revisado, aunque la demo corra en local.
- **Contexto:** `OQ-004` resuelta: no es obligatorio desplegar de verdad (`DEC-050`).
- **Referencias:** `ARCHITECTURE.md` §16.5 · DEC-050 · R14 · `TEST-PLAN.md` TC-070
- **Criterios de aceptación:**
  1. `ARCHITECTURE.md` §16.5 completo: servicios, variables de entorno por servicio, orden de despliegue y migraciones.
  2. Decisión documentada sobre las cookies entre dominios (reescritura `/api` o dominio propio).
  3. Dockerfiles multi-stage de `api` y `web` que construyen en CI (base para Render).
  4. Lista de verificación de §16.5 revisada (TC-070) y riesgos residuales anotados.
  5. Opcional: despliegue de prueba con la URL anotada en `HANDOFF.md`.
- **Pruebas requeridas:** build de imágenes en CI; revisión TC-070.
- **Depende de:** US-003, US-004
- **Fuera de alcance:** alta disponibilidad; dominio propio pagado.

### US-106 — Ejecución del plan de pruebas e informe final
- **Epic:** EP-09 · **Fase:** F5 · **Prioridad:** MUST · **Tamaño:** S · **Estado:** READY
- **Historia:** Como responsable quiero ejecutar el plan de pruebas y publicar un informe con evidencia en cada versión.
- **Referencias:** `TEST-PLAN.md` · `TESTING.md` §9
- **Criterios de aceptación:**
  1. Todos los casos de `TEST-PLAN.md` §13 del alcance ejecutados sobre el commit etiquetado de la versión (`vX.Y.Z`), con su resultado.
  2. Informe `docs/reports/<versión>/test-summary.md` según la plantilla de `TEST-PLAN.md` §14.2: las cifras salen de `pnpm test:report`, no se escriben a mano.
  3. Matriz de trazabilidad completa de las historias incluidas en la versión (TC-090) y manifiesto de ejecución adjuntos.
  4. Ensayo en clon limpio (TC-083), sesión exploratoria (TC-092) y guion de aceptación grabado (TC-091), con sus notas en `docs/reports/<versión>/`.
  5. Artefactos (resultados, cobertura, reporte de Playwright, benchmarks, trazabilidad, manifiesto) adjuntos al release de la versión y copiados a `docs/reports/<versión>/`.
  6. Evaluación criterio por criterio contra los criterios de salida (`TEST-PLAN.md` §7).
- **Pruebas requeridas:** el informe es la entrega; `pnpm test:trace` y `pnpm test:report` en verde sobre la versión etiquetada.
- **Depende de:** US-039, US-068
- **Fuera de alcance:** pruebas de penetración externas.

### US-114 — Métricas y alertas de operación
- **Epic:** EP-09 · **Fase:** F5 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como operador quiero métricas y alertas para detectar problemas antes de que los vean los usuarios.
- **Contexto:** `ARCHITECTURE.md` §15 pedía métricas y alertas, pero ninguna historia las implementaba.
- **Referencias:** `ARCHITECTURE.md` §15 · DEC-024
- **Criterios de aceptación:**
  1. `GET /metrics` (formato Prometheus con `prom-client`), protegido, con: duración de comandos, tamaño de colas y trabajos `failed`, retraso del *outbox*, conexiones WebSocket y respuestas 5xx.
  2. Las alertas mínimas de §15 (relay atrasado, cola `failed` creciente, 5xx) quedan documentadas con sus umbrales.
  3. Panel opcional (Grafana en el `docker-compose.yml` de desarrollo).
  4. Las etiquetas de las métricas no contienen datos personales.
- **Pruebas requeridas:** `TEST-PLAN.md` TC-205.
- **Depende de:** US-006, US-051, US-061
- **Fuera de alcance:** trazas distribuidas (OpenTelemetry, después).
