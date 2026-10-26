# EP-01 — Núcleo de dominio (paquetes puros)

> Fase F1. El corazón técnico del proyecto: puntajes, desempates, emparejamientos, ratings y equipos como **funciones puras** sin I/O (`ARCHITECTURE.md` §5). Aquí se demuestra la complejidad. **Cada historia termina con pruebas de propiedades** (`TESTING.md`).
>
> Regla de oro (`BR-GEN-03`): lo `[PENDIENTE-ASCUN]` se parametriza; no se inventa.

### US-010 — Esquema de `RuleSet`, validación y ciclo de vida
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** DONE
- **Historia:** Como director quiero definir las reglas de una competencia como datos versionados para aplicar el reglamento correcto sin cambiar código.
- **Contexto:** El esbozo está en `CORE-BUSINESS.md` §3. El `RuleSet` ASCUN no puede quedar `APPROVED` hasta recibir el reglamento.
- **Referencias:** BR-GEN-02, BR-GEN-03, BR-GEN-04, BR-NUM-01 · DEC-027 · OQ-001
- **Criterios de aceptación:**
  1. `packages/rules` define el esquema Zod completo (formato, sistema, rondas, puntuación, Suizo, desempates, política de desempates, equipos, elegibilidad, control de tiempo, rating).
  2. Validaciones cruzadas: el bloque `team` existe **solo** si `format = TEAM`; los IDs de desempate pertenecen al catálogo; la puntuación es coherente (`win ≥ draw ≥ loss`); `roundsPolicy` coherente con `system`; `organizationId` nulo solo en presets de plataforma (`DEC-047`).
  3. Función `listUnconfirmedFields(ruleSet)` devuelve los parámetros marcados "sin confirmar"; `canApprove(ruleSet)` es `false` mientras haya alguno o falte `source`.
  4. Presets incluidos: `fide-dutch-2026` (para referencia), `demo-round-robin` (marcado demo) y `ascun-chess-classical`/`ascun-chess-blitz` en `DRAFT`, con los valores `[ASCUN-2012]` de `SOURCES.md` §3 (citando el artículo) marcados "sin confirmar" (`OQ-001`) y sin lista de desempates (`OQ-023`).
  5. Versionado: una versión `APPROVED` es inmutable (la capa de servicio lo hará cumplir en `US-030`; aquí se provee la validación pura `assertImmutable(prev, next)`).
  6. Se exporta JSON Schema para documentación.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Esquema Zod completo y JSON Schema — criterios 1, 6 · M
  - (b) Validaciones cruzadas y ciclo de vida (`listUnconfirmedFields`, `canApprove`, `assertImmutable`) — criterios 2, 3, 5 · M
  - (c) Presets — criterios 4 · S
- **Pruebas requeridas:** unitarias de cada validación cruzada; pruebas de propiedades de coherencia (RuleSets aleatorios válidos pasan, mutaciones inválidas fallan).
- **Depende de:** US-011
- **Fuera de alcance:** persistencia y endpoints (`US-030`); contenido real de ASCUN (`OQ-001`).
- **Notas para la IA:** en los presets `ascun-chess-*` usa **solo** los valores de `SOURCES.md` §3 con su artículo; lo demás queda sin valor con `TODO(OQ-001)`/`TODO(OQ-023)`. No rellenes valores "razonables".

### US-011 — Tipos base del dominio y utilidades de medios puntos
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** DONE
- **Historia:** Como desarrollador quiero tipos y utilidades base compartidos para que todos los paquetes hablen el mismo lenguaje.
- **Referencias:** BR-NUM-01, BR-NUM-02, BR-TEAM-08 · DEC-036 · `GLOSSARY.md`
- **Criterios de aceptación:**
  1. `packages/core` exporta: identificadores tipados (*branded types*), `Result<T,E>`, `Competitor`, `Game`, `Round`, `Pairing`, `GameResult`, `CompletedRoundsHistory` y enumeraciones de resultados (`BR-SCORE-01`).
  2. Utilidades de unidades: conversión puntos↔unidades y formateo con `displayDivisor` sin usar `float` en el almacenamiento.
  3. Ordenamiento canónico determinista de competidores (por *seed* y luego id).
  4. Todo es inmutable (`readonly`) y sin dependencias externas salvo Zod si se usa.
- **Pruebas requeridas:** unitarias y propiedades (ida y vuelta de conversión de unidades; ordenamiento estable).
- **Depende de:** US-001, US-002
- **Fuera de alcance:** lógica de puntuación, emparejamiento.

### US-012 — Cálculo de puntajes y clasificación base
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** DONE
- **Historia:** Como árbitro quiero que el sistema calcule los puntos de cada competidor a partir de los resultados para tener una clasificación confiable.
- **Referencias:** BR-SCORE-01..04, BR-NUM-01, BR-WD-01 · INV-S-1, INV-S-2
- **Criterios de aceptación:**
  1. `computeScores(history, ruleSet)` devuelve puntos por competidor en medios puntos; maneja victorias, tablas, derrotas, forfeits, doble forfeit, PAB, byes de medio punto y de cero puntos (`BR-SCORE-01`) y retirados.
  2. Todos los valores salen del `RuleSet.scoring` (sin números mágicos).
  3. Resultados con partida pendiente no cuentan y se reportan como tal.
  4. Ordenamiento por puntos con orden total determinista (desempate final por *seed* e id) — los desempates reales vienen en `US-013`.
  5. Rendimiento: 500 competidores × 9 rondas en ≤ 100 ms (benchmark registrado, objetivo `ARCHITECTURE.md` §17).
- **Pruebas requeridas:** propiedades `INV-S-1` (conservación de puntos), `INV-S-2` (orden total e invarianza a permutaciones); casos dorados con byes y forfeits.
- **Depende de:** US-010, US-011
- **Fuera de alcance:** desempates (US-013), equipos (US-020).
- **Notas para la IA:** puntos del bye y forfeits provienen del `RuleSet`; si el preset ASCUN no los tiene, falla con error explícito (`BR-GEN-03`).

### US-013 — Motor de desempates
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** PARTIAL(OQ-023)
- **Historia:** Como director quiero clasificaciones con desempates configurables y explicables para resolver empates de forma defendible.
- **Referencias:** BR-TIE-01..07, BR-NUM-02 · INV-S-2, INV-S-3 · GV-001 · OQ-023 · `SRC-04` (C.07 2026), `SRC-07`
- **Criterios de aceptación:**
  1. Interfaz `Tiebreak` con `(context) → entero + escala`; registro pluggable por ID.
  2. Implementados: `WIN`, `WON`, `BUCHHOLZ`, `BUCHHOLZ_CUT1`, `BUCHHOLZ_CUT2`, `BUCHHOLZ_MEDIAN1`, `SONNEBORN_BERGER`, `PROGRESSIVE`, `DIRECT_ENCOUNTER` (con re-aplicación, `SRC-04` Art. 6), `KOYA`, `BLACK_GAMES`, `BLACK_WINS`. (`AVG_OPPONENT_RATING` y `TPR` en `US-019`; `FORE_BUCHHOLZ`, `AVG_OPP_BUCHHOLZ`, `STANDARD_POINTS` y los de rendimiento se implementan después.)
  3. Refinamiento iterativo por grupos empatados (`BR-TIE-01`) y política `restartOnPartialSplit` con **ambos** comportamientos probados (`BR-TIE-04`).
  4. Política de empates sin resolver: `SHARE_RANK` y `DRAW_LOTS` (con semilla); `PLAYOFF` queda como señal para el decider (`BR-TIE-05`).
  5. `unplayedRoundContribution()` aislada. Mientras no existan casos dorados de `SRC-07` revisados contra C.07 2026 (`BR-TIE-03`), la política `FIDE_C07_2026` devuelve `NOT_IMPLEMENTED_POLICY` y la política `AS_AWARDED` funciona.
  6. Salida explicable: por competidor, el valor de cada desempate y el criterio que lo separó del vecino (`BR-TIE-07`).
  7. El caso dorado `GV-001` se reproduce exactamente (puntos, Buchholz, Cut-1, Median, SB, Progresivo y orden final).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Interfaz y registro de desempates; los de tipo B (`WIN`, `WON`, `PROGRESSIVE`, `BLACK_*`) — criterios 1, 2 (tipo B) · S
  - (b) Buchholz y variantes, Sonneborn-Berger y modificadores, con `AS_AWARDED` y `unplayedRoundContribution()` aislada — criterios 2 (BH y SB), 5 · M
  - (c) `DIRECT_ENCOUNTER`, refinamiento por grupos, `restartOnPartialSplit` y empates sin resolver — criterios 2 (DE), 3, 4 · M
  - (d) Salida explicable y `GV-001` — criterios 6, 7 · S
- **Pruebas requeridas:** `GV-001`; propiedades: invarianza a permutación de entrada, determinismo, cotas (p. ej. Buchholz ≥ 0 y ≤ máximo posible), escala entera sin pérdida.
- **Depende de:** US-012, US-021
- **Fuera de alcance:** desempates de equipos (US-020); orden definitivo de ASCUN (`OQ-023`).
- **Notas para la IA:** el "oponente virtual" ya no existe en FIDE (desde 2023). Implementa el Art. 16 de C.07 2026 solo desde el texto oficial (`SRC-04`), nunca de memoria.

### US-014 — Generador de todos contra todos (simple y doble)
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** MUST · **Tamaño:** M · **Estado:** READY
- **Historia:** Como director quiero generar el calendario de un todos contra todos para torneos pequeños.
- **Referencias:** BR-RR-01..03 · INV-RR-1..3 · GV-003
- **Criterios de aceptación:**
  1. Método circular (Berger) con *n* par e impar (descanso explícito para *n* impar).
  2. Cada par se enfrenta exactamente una vez (`INV-RR-1`); diferencia de blancas por competidor ≤ 1 (`INV-RR-2`); en *n* impar cada competidor descansa exactamente una vez (`INV-RR-3`).
  3. Doble ronda con colores invertidos en el segundo ciclo.
  4. `GV-003` se reproduce exactamente para *n = 4*.
  5. Soporta *n* de 2 a 40 como mínimo.
- **Pruebas requeridas:** propiedades para todo *n* de 2 a 40; caso dorado `GV-003`.
- **Depende de:** US-011
- **Fuera de alcance:** programación de salas/horarios (`US-094`).
- **Notas para la IA:** usar el algoritmo de `SOURCES.md` §5.2, que reproduce las tablas de Berger de FIDE; la prueba compara contra las tablas oficiales de 3 a 16 jugadores (`INV-RR-4`).

### US-015 — Motor Suizo v1 (base) con restricciones absolutas
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** MUST · **Tamaño:** XL · **Estado:** READY
- **Historia:** Como director quiero emparejamientos automáticos válidos y reproducibles para operar un torneo Suizo.
- **Contexto:** Primera implementación (`BR-PAIR-10` paso 1). Variante `FIDE_DUTCH` 2026 **por etapas** (`DEC-043`, `SRC-05`): la v1 cumple siempre C1–C4, aplica C5 y declara qué criterios de calidad implementa (como mínimo C6, C7, C12 y C13); la exactitud completa (C6–C21) se valida en `US-016/US-017`. **Dividir en sub-historias al empezar:** (a) ronda 1 y bye, (b) grupos de puntaje y flotantes, (c) colores, (d) restricción de institución y diagnósticos.
- **Referencias:** BR-PAIR-01..09, BR-PAIR-11..14 · INV-P-1..P-10 · GV-004 · DEC-034, DEC-043 · `SRC-05`
- **Criterios de aceptación:**
  1. Contrato `pair(...)` según `BR-PAIR-01`; retorna `Result` con `diagnostics` o `PairingError` explícito.
  2. Ronda 1: mitad superior vs inferior y bye al último del ranking si *n* es impar (`GV-004`, caso de 5 jugadores).
  3. Rondas 2+: grupos de puntaje, flotantes, selección del bye (`BR-PAIR-05`) y asignación de colores (`BR-PAIR-06`).
  4. Restricciones absolutas **nunca** se violan; si no hay solución → `NO_VALID_PAIRING` con motivo (`BR-PAIR-09`).
  5. Restricción de misma institución como criterio de calidad relajable con aviso (`BR-PAIR-07`).
  6. Competidores retirados excluidos.
  7. Entrada canónica ordenada; el hash de entrada y la versión del motor van en `diagnostics` (`BR-PAIR-13`).
  8. Torneos de hasta 200 competidores y 9 rondas se emparejan en ≤ 500 ms p95 (medido).
  9. `diagnostics.criteriaImplemented` lista los criterios de calidad aplicados; ningún criterio no implementado se reporta como cumplido.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Contrato `pair()`, ronda 1 y bye; retirados fuera; entrada canónica y hash — criterios 1, 2, 6, 7 · M
  - (b) Rondas 2+: *brackets*, flotantes y elección del bye (`BR-PAIR-04`, `BR-PAIR-05`); nunca viola C1–C4 — criterios 3 (grupos y bye), 4 · M
  - (c) Asignación de colores (`BR-PAIR-06`, historial con rondas no jugadas) — criterios 3 (colores) · M
  - (d) Restricción de institución, `diagnostics.criteriaImplemented` y rendimiento — criterios 5, 8, 9 · M
- **Pruebas requeridas:** `INV-P-1` a `INV-P-10`; oráculo de fuerza bruta para *n ≤ 10* (`INV-P-6`); propiedades con torneos aleatorios simulados (`@torre/testing`).
- **Depende de:** US-012, US-014 (solo para reutilizar utilidades), US-021
- **Fuera de alcance:** exactitud FIDE Dutch (US-016/017), equipos (US-020).
- **Notas para la IA:** empieza por las propiedades y el oráculo; el algoritmo puede mejorar después sin romper el contrato. NO ajustes los invariantes para que pasen.

### US-016 — Validación del Suizo: propiedades a escala y motor de referencia
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** MUST · **Tamaño:** L · **Estado:** READY
- **Historia:** Como responsable del proyecto quiero demostrar con evidencia objetiva que el emparejamiento es correcto.
- **Contexto:** Convierte la corrección en un artefacto (criterio de éxito S1 y S3 de `PRODUCT.md`).
- **Referencias:** BR-PAIR-10 · INV-P-1..P-10 · `TESTING.md` §5 · OQ-018
- **Criterios de aceptación:**
  1. Suite de propiedades ejecuta ≥ N torneos aleatorios completos (N configurable; objetivo ≥ 5 000 en CI nocturno, ≥ 200 en CI normal) con tamaños y resultados variados, incluyendo retiros y byes.
  2. Un *shrinking* útil: ante un fallo, se imprime el torneo mínimo reproducible (semilla incluida).
  3. Escritor mínimo de **TRF-2026** en `@torre/testing` para alimentar a bbpPairings (`SRC-08`, `SRC-09`; ubicación oficial del formato: `OQ-029`).
  4. Arnés opcional que, **si** el binario de referencia está presente (no se versiona en el repositorio), compara emparejamientos del preset `fide-dutch` y reporta diferencias. La CI normal lo omite con mensaje claro.
  5. Se documenta cómo obtener el motor de referencia y su licencia (bbpPairings v6.0.0: Apache-2.0; JaVaFo descartado, `DEC-072`).
  6. Informe: porcentaje de coincidencias y análisis de cada divergencia.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Propiedades a escala con *shrinking* y semilla — criterios 1, 2 · M
  - (b) Escritor TRF26 en `@torre/testing` — criterios 3 · M
  - (c) Arnés de comparación con bbpPairings, documentación e informe de divergencias — criterios 4, 5, 6 · M
- **Pruebas requeridas:** la propia suite es la entrega; incluir pruebas del escritor TRF.
- **Depende de:** US-015
- **Fuera de alcance:** exportación TRF pública (`US-080`).
- **Notas para la IA:** si no se dispone del motor de referencia, entrega las propiedades y deja el arnés listo; no simules su salida.

### US-017 — Motor Suizo basado en emparejamiento de peso máximo (Blossom)
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** SHOULD · **Tamaño:** XL · **Estado:** READY
- **Historia:** Como responsable del proyecto quiero un motor polinomial que reproduzca la calidad del Suizo FIDE para demostrar dominio algorítmico y escalar a torneos grandes.
- **Contexto:** `BR-PAIR-10` paso 3. **Dividir:** (a) emparejamiento perfecto de peso máximo (Edmonds) con verificación por fuerza bruta en grafos pequeños; (b) codificación lexicográfica de criterios en pesos exactos; (c) integración en el contrato `pair()` con variante `FIDE_DUTCH`.
- **Referencias:** BR-PAIR-10, BR-PAIR-02..06, BR-PAIR-11 · INV-P-1..P-10 · DEC-034
- **Criterios de aceptación:**
  1. Implementación del algoritmo de matching de peso máximo O(V³) en `@torre/pairing/matching`, verificada contra fuerza bruta en grafos aleatorios pequeños.
  2. Codificación de pesos exacta (enteros grandes) para criterios por prioridad; documentada con ejemplo.
  3. La variante `FIDE_DUTCH` produce emparejamientos válidos según `INV-P-*` y coincide con el motor de referencia en los casos donde éste esté disponible (`US-016`), o los desvíos están explicados.
  4. Rendimiento: 500 competidores en ≤ 3 s p95; benchmark comparativo con `US-015` guardado.
  5. Mismo contrato `pair()` y mismos `diagnostics`.
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Emparejamiento perfecto de peso máximo (Edmonds) verificado contra fuerza bruta — criterios 1 · M
  - (b) Codificación exacta de los criterios en pesos — criterios 2 · M
  - (c) Integración en `pair()` con `FIDE_DUTCH`, comparación con la referencia y rendimiento — criterios 3, 4, 5 · M
- **Pruebas requeridas:** matching vs fuerza bruta; todas las propiedades de `US-015` aplicadas al nuevo motor; benchmarks.
- **Depende de:** US-015, US-016
- **Fuera de alcance:** otras variantes (Burstein) salvo que el `RuleSet` las requiera.
- **Notas para la IA:** cualquier mejora debe pasar primero por las propiedades; el texto oficial de FIDE (`SRC-05`) manda sobre este documento.

### US-018 — Generador de eliminación directa
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** COULD · **Tamaño:** M · **Estado:** BLOCKED(OQ-013)
- **Historia:** Como director quiero un cuadro de eliminación si el reglamento lo exige para fases finales.
- **Referencias:** BR-KO-01 · OQ-013
- **Criterios de aceptación:**
  1. Solo se inicia cuando `OQ-013` confirme que ASCUN usa eliminación (y cómo se desempata un duelo).
  2. Cuadro con siembra, byes hasta potencia de 2 y avance de ganadores; reglas de desempate del duelo parametrizadas.
  3. Propiedades: cada competidor aparece una vez por ronda; el cuadro es un árbol completo.
- **Pruebas requeridas:** propiedades y casos dorados definidos al desbloquear.
- **Depende de:** US-011
- **Fuera de alcance:** todo hasta tener la regla.

### US-019 — Ratings: Elo, rendimiento (TPR) y redondeo
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** SHOULD · **Tamaño:** M · **Estado:** READY
- **Historia:** Como director quiero calcular variaciones de rating y rendimiento para clasificar y sembrar con datos.
- **Referencias:** BR-RAT-01..07, BR-NUM-03 · INV-R-1..R-4 · GV-002 · DEC-033, DEC-049 · `SRC-04` Art. 10, `SRC-06`
- **Criterios de aceptación:**
  1. Interfaz `RatingSystem` con un Elo **interno no oficial** (fórmula logística, `DEC-049`), con `K` configurable por política (constante o por rangos/partidas). No implementa el Elo FIDE oficial (tabla 8.1.2, `BR-RAT-01`).
  2. Tope de diferencia de rating configurable.
  3. Función de redondeo configurable y probada.
  4. `performanceRating()` usa la tabla `dp` 8.1.1 transcrita en `SOURCES.md` §5.3, copiada a un archivo de datos con una prueba que compara ambos; sin la tabla, la función falla con error explícito.
  5. Desempates `AVG_OPPONENT_RATING` y `TPR` se registran en el motor de `US-013`.
  6. `GV-002` se reproduce.
- **Pruebas requeridas:** `INV-R-1` (esperados suman 1), `INV-R-2` (suma cero con igual K), `INV-R-3` (monotonía), `INV-R-4` (idempotencia al aplicar por torneo).
- **Depende de:** US-011, US-013
- **Fuera de alcance:** Glicko-2 (`BR-RAT-04`, futuro), normas de título.
- **Notas para la IA:** no pegues la tabla `dp` de memoria.

### US-020 — Motor de torneos por equipos
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** SHOULD · **Tamaño:** L · **Estado:** PARTIAL(OQ-009)
- **Historia:** Como director quiero clasificar equipos universitarios según puntos de partida y de enfrentamiento para premiar a las universidades.
- **Referencias:** BR-TEAM-01..09 · INV-TM-1..TM-3 · OQ-009 · DEC-054 (genérico: ASCUN 2012 no tiene equipos)
- **Criterios de aceptación:**
  1. Validación pura de alineaciones: tableros, número de jugadores, orden según `RuleSet.team.boardOrder` (cuando esté definido), duplicados y jugadores fuera de plantilla.
  2. Cálculo del resultado del enfrentamiento: puntos de partida por equipo y puntos de enfrentamiento según `team.matchScoring`.
  3. Forfeits por tablero vacío y por equipo incompleto parametrizados (`BR-TEAM-06`).
  4. Clasificación de equipos con desempates propios (`team.teamTiebreaks`) reutilizando el motor de `US-013` mediante la abstracción `Competitor` (`BR-TEAM-08`).
  5. Soporte para que `@torre/pairing` empareje equipos con el puntaje base elegido.
  6. Todo parámetro sin confirmar se rechaza al aprobar el `RuleSet` (`US-010`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Validación pura de alineaciones — criterios 1 · S
  - (b) Resultado del *match* y forfeits por tablero o equipo — criterios 2, 3 · M
  - (c) Clasificación de equipos y emparejamiento de equipos — criterios 4, 5 · M
  - (d) Rechazo de parámetros sin confirmar al aprobar — criterios 6 · S
- **Pruebas requeridas:** `INV-TM-1` (puntos de enfrentamiento coherentes con tableros), `INV-TM-2` (alineación válida), `INV-TM-3` (conservación); casos dorados de equipos (`CORE-BUSINESS.md` §18).
- **Depende de:** US-012, US-013, US-015
- **Fuera de alcance:** UI y persistencia (`US-033`, `US-040`).

### US-042 — Decider del torneo (`@torre/tournament`): estado, `evolve`, `decide` y esquemas de eventos
- **Epic:** EP-01 · **Fase:** F1 (integración en F2) · **Prioridad:** MUST · **Tamaño:** XL · **Estado:** PARTIAL(OQ-001)
- **Historia:** Como responsable quiero toda la lógica comandos→eventos del torneo como funciones puras para probarla sin base de datos y reutilizarla en el cliente (modo offline).
- **Contexto:** Patrón *decider* (`ARCHITECTURE.md` §7.4). **Dividir** por grupos: (a) creación, configuración e inscripción; (b) rondas y emparejamientos; (c) resultados, correcciones, forfeits y byes; (d) cierres, reaperturas e instantáneas oficiales; (e) equipos y alineaciones; (f) reclamaciones y premiación. El Suizo del grupo (b) depende de `US-015`, y el grupo (e) de `US-020`.
- **Referencias:** BR-LIFE-01..05, BR-SCORE-05, BR-AUD-01..03, BR-GEN-01 · DEC-007, DEC-008 · INV-E-1, INV-E-5, INV-S-4 · `ARCHITECTURE.md` §7.2–§7.4
- **Criterios de aceptación:**
  1. Esquemas Zod de **comandos** y **eventos** (catálogo de `ARCHITECTURE.md` §7.3), cada evento con `schemaVersion`.
  2. `evolve(state, event)` es total y determinista; el estado resultante expone lo necesario para decidir (rondas, partidas, participantes, equipos, `RuleSet` incrustado).
  3. `decide(state, command, ctx)` valida **todas** las reglas del ciclo de vida y de resultados y devuelve `Result<Event[], DomainError>` con códigos estables.
  4. `ctx` inyecta `now`, generador de ids, semilla y versiones de motor; nada se lee de globales (`BR-GEN-01`).
  5. Infraestructura de *upcasting* y una prueba de ejemplo.
  6. El paquete funciona en Node y en el navegador (sin APIs de Node de I/O).
  7. Pruebas **basadas en modelo**: secuencias aleatorias de comandos válidos mantienen los invariantes de estado; `replay` de los eventos reproduce el mismo estado; corregir y revertir restituye la clasificación (`INV-S-4`).
  8. Comandos y eventos según el catálogo de `ARCHITECTURE.md` §7.3–§7.3.1; `RoundClosed`/`TournamentClosed` incluyen la instantánea oficial (`INV-E-6`) y ningún *payload* contiene datos personales (`INV-PRIV-1`).
- **Plan de división** (una parte por sesión y por PR; cada parte cierra los criterios indicados con sus pruebas y deja `pnpm verify` en verde):
  - (a) Base transversal (esquemas, `ctx`, *upcasting*, funciona en el navegador) y grupo de creación, configuración e inscripción — criterios 1–6 para el grupo; 7 con sus comandos · M
  - (b) Rondas, emparejamientos y check-in (`CheckInOpened`, `CheckInClosed`, `PlayerCheckedIn`, `PlayerCheckInRevoked`; `US-115`) — criterios 1–3, 7, 8 para el grupo · M
  - (c) Resultados, correcciones (`scope`), forfeits y byes — criterios 1–3, 7, 8 para el grupo · M
  - (d) Cierres, reaperturas e instantáneas oficiales — criterios 1–3, 7, 8 (instantánea, `INV-E-6`) · M
  - (e) Equipos y alineaciones (depende de `US-020`) — criterios 1–3, 7, 8 para el grupo · M
  - (f) Reclamaciones y premiación — criterios 1–3, 7, 8 para el grupo · S
- **Pruebas requeridas:** modelo con `fast-check` (comandos aleatorios); *replay equality*; flujos dorados de torneo completo (round-robin y Suizo simulados con `@torre/testing`).
- **Depende de:** US-010, US-012, US-014, US-021
- **Depende (parcial):** US-013 (desempates en la instantánea), US-015 (grupo b, Suizo), US-020 (grupo e)
- **Fuera de alcance:** persistencia, autorización, proyecciones.
- **Notas para la IA:** avanza por grupos pequeños; cada grupo se entrega con su suite. Los comandos que dependan de reglas `[PENDIENTE-ASCUN]` fallan de forma explícita si el `RuleSet` no define el parámetro.

### US-021 — PRNG determinista y hash canónico de entradas
- **Epic:** EP-01 · **Fase:** F1 · **Prioridad:** MUST · **Tamaño:** S · **Estado:** DONE
- **Historia:** Como responsable quiero azar reproducible y huellas de entrada estables para cumplir el determinismo.
- **Referencias:** BR-GEN-01, BR-PAIR-13, BR-TIE-05
- **Criterios de aceptación:**
  1. PRNG con semilla (algoritmo documentado, sin dependencias de entorno) y utilidades `shuffle`, `pick`, `drawLots`.
  2. Serialización canónica (orden de claves estable, sin `undefined`) y hash SHA-256 para `inputHash`. El hash usa una función provista por el entorno (inyectada) para no violar la pureza del paquete.
  3. Misma semilla ⇒ misma secuencia en Node y navegador (prueba).
- **Pruebas requeridas:** reproducibilidad; sanidad de distribución (no es criptográfico); estabilidad del hash ante reordenamiento de claves.
- **Depende de:** US-011
- **Fuera de alcance:** sorteos con valor legal (se registran como evento; ver `BR-TIE-05`).
