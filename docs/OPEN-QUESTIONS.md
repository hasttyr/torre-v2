# OPEN-QUESTIONS.md — Preguntas abiertas y a quién bloquean

> Mientras una pregunta esté abierta, lo que dependa de ella se implementa **como parámetro** y queda marcado `[PENDIENTE-ASCUN]`/`[ABIERTO]` (`BR-GEN-03`). Al responder: actualizar esta tabla, el documento afectado y el estado de las historias.
>
> Última revisión: **2026-10-26** (auditoría de preparación para implementar; fuentes en `docs/SOURCES.md`).

## 0. Resueltas

| ID | Pregunta (resumen) | Respuesta | Fecha | Impacto |
|---|---|---|---|---|
| OQ-002 | Estado de la app actual | **Empezar limpio.** La app anterior solo sirve como referencia de funcionalidades | 2026-10-25 | VS-1 sin migración |
| OQ-003 | Tiempo disponible y fecha objetivo | Los tiempos y el alcance de cada entrega los **gestiona el responsable**; la documentación no fija fechas ni cortes de alcance (`DEC-055` anulado) | 2026-10-25 | Orden por rebanadas y niveles (`USER-STORIES.md` §5, §7) |
| OQ-004 | Despliegue y presupuesto | **Demo local con Docker.** Se entrega un **plan de despliegue** (Vercel + Render + Neon), sin obligación de desplegar de verdad. RPO/RTO no aplican a la demo local | 2026-10-25 | `ARCHITECTURE.md` §16, `US-105` |
| OQ-005 | Autenticación y matriz de roles | **Confirmadas tal cual.** El jugador **no** reporta resultados | 2026-10-26 | `AUTHORIZATION.md` `[DECIDIDO]` |
| OQ-006 | Proveedor de email | **Mailpit por ahora**; el proveedor real se decide al desplegar | 2026-10-26 | `DEC-015`, US-061, US-105 |
| OQ-007 | Repositorio y CI | **GitHub Actions**; el monorepo se crea en esta misma carpeta | 2026-10-26 | `DEC-063`, US-004 |
| OQ-008 | Uso de rating | ASCUN siembra con ELO FIDE y luego nacional (`SRC-01` Art. 15). La plataforma **consume** esos ratings (`US-104`) y calcula un Elo **interno no oficial** con K por tramos (`BR-RAT-01`) | 2026-10-25 | `BR-RAT-*`, `DEC-049` |
| OQ-010 | Transporte de los espectadores | **WebSocket** (Socket.IO) | 2026-10-26 | `DEC-012`, US-050 |
| OQ-011 | Diseño del PDF | **Diseño neutro de Torre** con espacio para el logo de la organización; pdfmake | 2026-10-26 | `DEC-014`, US-064 |
| OQ-012 | Datos de inscripción y elegibilidad | La elegibilidad la verifican la IES y ASCUN en su plataforma (`SRC-02`). Aquí **solo se registra la marca de verificación**; sin datos académicos ni documentos | 2026-10-25 | `BR-REG-01`, `BR-PRIV-01`, `DEC-048` |
| OQ-014 | Desempates y su orden; reinicio; empates sin resolver | **Parcial → reemplazada.** FIDE C.07 2026 resuelve el reinicio (no hay, `BR-TIE-04`) y el sorteo final (`BR-TIE-05`). La lista de ASCUN pasa a `OQ-023` | 2026-10-25 | `BR-TIE-*` |
| OQ-015 | Ramas | **Femenina, masculina y mixta** | 2026-10-26 | `BR-REG-01`, `BR-PRZ-*`, US-032 |
| OQ-019 | Portugués | **Más adelante.** Por ahora `es` y `en` | 2026-10-26 | US-075 |
| OQ-020 | Retención de datos personales y responsable del tratamiento | **Sin eliminación automática**; se anonimiza solo cuando el titular lo pide. La organización es **responsable** y la plataforma **encargada**. Sin revisión jurídica: riesgo aceptado (`DEC-065`) | 2026-10-26 | `BR-PRIV-03`, `BR-PRIV-04`, US-111 |
| OQ-021 | Nombre del producto y de los paquetes | **Torre**; paquetes `@torre/*` | 2026-10-26 | `DEC-063`, US-001 |
| OQ-022 | Navegadores y dispositivos | Últimas 2 versiones de Chrome, Edge, Firefox y Safari de escritorio, Safari de iOS y Chrome de Android; e2e en Chromium, Firefox y WebKit | 2026-10-26 | `DEC-066`, US-079 |
| OQ-027 | Corrección con la ronda siguiente publicada | **Seguir a FIDE C.04.2 Art. 4.3:** antes del final de la ronda siguiente se recalcula la clasificación; después, la corrección cuenta solo para el rating | 2026-10-26 | `DEC-051`, `BR-AUD-03`, US-037 |
| OQ-029 | Ubicación de TRF-2026 | **TRF26**, Handbook C.02 Apéndice A, aplicado desde el 2025-09-01; anexos en el sitio de TEC | 2026-10-26 | `SRC-09`, US-080 |
| OQ-025 | Blitz a doble partida | **Decisión de producto:** dos partidas con colores invertidos y **cada partida puntúa** por separado. Si el reglamento vigente dice otra cosa, cambia el preset (`OQ-001`) | 2026-10-26 | `BR-SCORE-01`, `gamesPerPairing` |
| OQ-030 | *Check-in* por ronda | **Sí, opcional por torneo.** Lo abre y lo cierra el director; lo marcan el jugador vinculado y el árbitro o el director; quien no lo hace no se empareja y recibe bye de cero puntos | 2026-10-26 | `DEC-068`, `BR-WD-06`, US-115 |
| OQ-031 | 2FA para `platform_admin` | **Obligatorio**: sin 2FA activo no puede usar permisos reservados (`TWO_FACTOR_REQUIRED`) | 2026-10-26 | `BR-AUTH-06`, US-107 |
| OQ-032 | Valores de autenticación | **Confirmados**: confirmación de contraseña válida 15 min; 8 códigos de recuperación; ventana TOTP ±1; sin roles hasta verificar el email. Además se fijaron contraseña, tokens, CSRF, límites e idempotencia (`DEC-062`) | 2026-10-26 | `BR-AUTH-*` |

## 1. Pendientes de ASCUN

Se piden con la carta de `docs/requests/SOLICITUD-ASCUN.md`, que envía el responsable. Mientras no haya respuesta, los presets `ascun-chess-*` siguen en `DRAFT` con los valores de 2012 y las demos usan `fide-dutch-2026`.

| ID | Pregunta | Por qué importa | Bloquea / afecta | Mientras tanto |
|---|---|---|---|---|
| **OQ-001** | **Reglamento técnico de ajedrez vigente** (Juegos Universitarios Nacionales). Se encontró la **edición 2012** (`SRC-01`), pero está desactualizada: en 2025 ya existe la modalidad Rápido (`SRC-03`). ¿Cuál es la versión vigente, o qué artículos de 2012 siguen en vigor? | Es la fuente de todos los valores `[ASCUN-2012]` y `[PENDIENTE-ASCUN]` | US-010 (`ascun-chess` `APPROVED`), US-013, US-015, US-038, US-100, US-101 | Presets en `DRAFT` con valores 2012 |
| **OQ-023** | **Desempates:** el reglamento dice "según las características técnicas del software" (Swiss Manager). ¿Qué lista y orden configuran los árbitros? ¿Los empates finales se comparten o se sortean? | Sin lista no hay clasificación oficial ASCUN | `BR-TIE-02`, `BR-TIE-05`, preset `ascun-chess-*` | Lista del preset `fide-dutch-2026` en las demos |
| OQ-009 | **Torneo por equipos:** ¿existe en el reglamento vigente? Si existe: tamaño, suplentes, puntuación y desempates | Define si el motor de equipos tiene preset ASCUN | `BR-TEAM-*`, US-020, US-033, US-040 | Motor genérico con prioridad SHOULD (`DEC-054`); colores por tablero según FIDE (`BR-TEAM-05`) |
| OQ-013 | **Eliminación directa:** ¿se usa en alguna fase o modalidad? ¿Con qué desempate (armagedón, partidas rápidas)? | Sin regla no se implementa | `BR-KO-01`, US-018 (bloqueada) | Suizo; 6 rondas en Clásico y Blitz `[ASCUN-2012]` |
| OQ-016 | **Ritmo y tolerancia** vigentes | Valores del preset | `BR-SCORE-06`, `BR-WD-04` | Clásico 90'+30"; Blitz 3'+2"; W.O. con 0 minutos `[ASCUN-2012]` |
| OQ-017 | **Puntuación y byes** vigentes | Valores del preset | `BR-SCORE-*`, US-038 | 1 / ½ / 0; bye de ½ solo en R1 de Clásico `[ASCUN-2012]`; rondas no jugadas en desempates según FIDE C.07 Art. 16 |
| OQ-024 | **Modalidad Rápido:** ritmo, número de rondas y puntos en el ranking institucional | Preset de Rápido | `timeControl`, `BR-PAIR-12`, `BR-CHAMP-02` | Sin preset de Rápido; no entra al ranking institucional |
| OQ-026 | **Clasificación entre torneos y cupos** (Arts. 3 y 4 de 2012): ¿siguen vigentes? ¿Desde qué fase se clasifica? | Cupos y clasificación | `BR-CHAMP-04`, `BR-REG-06` | Cupo como parámetro; clasificación entre torneos sin implementar |
| OQ-028 | **Ranking institucional:** desempate entre instituciones y reparto de puntos con puestos individuales compartidos | Cálculo del campeón institucional | `BR-CHAMP-03`, US-100 | Puesto institucional compartido; con puesto individual compartido, el cálculo falla de forma explícita |
| OQ-033 | **Bye con doble partida** (`gamesPerPairing = 2`, Blitz): ¿el PAB vale los puntos de una partida o de las dos? (`OQ-025` decidió que cada partida puntúa por separado, pero no dice nada del bye) | Puntos del PAB en Blitz | `BR-SCORE-01`, `BR-SCORE-04`, US-015 (PAB con doble partida), preset `ascun-chess-blitz` | `computeScores` (US-012) suma cada entrada `BYE` tal como la registra la ronda, sin suponer cuántas son; cuántas entradas genera el emparejamiento se decide antes de US-015 |
| OQ-034 | **Números de Berger en todos contra todos:** ¿se asignan por sorteo o por orden de *seed*? | Qué jugador ocupa cada número de la tabla (`SRC-14` no lo dice) | `BR-RR-01`, US-035 (generar el calendario), US-042 | `roundRobinSchedule` (US-014) recibe la lista ya ordenada: el número *i* es la posición *i* |
| OQ-035 | **Descanso en todos contra todos con número impar:** ¿cómo se registra en la historia y cuántos puntos da? (no es un PAB del Suizo) | Puntos y desempates del que descansa | `BR-RR-01`, `BR-SCORE-01`, `BR-TIE-03`, US-042, US-035 | El calendario (US-014) marca el descanso en `resting`, sin convertirlo en una entrada `BYE` |

## 2. Pendientes de decisión técnica

Las licencias y fuentes revisadas el 2026-10-26 están en `SOURCES.md` §6.

| ID | Pregunta | Afecta | Estado |
|---|---|---|---|
| OQ-018 | **Motor de análisis** para `US-093`: Stockfish (GPL-3.0) u otro | US-093 | Se decide al llegar a `US-093` (prioridad COULD, F6). Lo demás quedó resuelto: tablero `cm-chessboard` (MIT), `chess.js` (BSD-2-Clause), bbpPairings (Apache-2.0); JaVaFo y el oráculo AGPL, descartados (`DEC-072`) |

## 3. Lista de extracción: qué sacar del reglamento de ASCUN

Completada con la **edición 2012** (`SRC-01`). La columna "Confirmado por" queda en "Pendiente (2012)" hasta resolver `OQ-001`.

| # | Dato a extraer | Campo/Regla destino | Artículo | Valor (2012) | Confirmado por |
|---|---|---|---|---|---|
| 1 | Individual y/o equipos; rama/categoría | `format`, `BR-REG-01` | Art. 3 | Individual; ramas F y M (la plataforma admite también mixta, `OQ-015`); modalidades Clásico y Blitz (en 2025 existe también Rápido, `SRC-03`) | Pendiente (2012) |
| 2 | Sistema de juego y número de rondas | `system`, `roundsPolicy` | Arts. 2, 6, 7 | Suizo; 6 rondas en Clásico; 6 rondas en Blitz | Pendiente (2012) |
| 3 | Variante de emparejamiento y reglas de color | `swiss.variant` | Art. 5 | Swiss Perfect o Swiss Manager (variante no explícita → FIDE Dutch, `DEC-043`) | Pendiente (2012) |
| 4 | Ritmo de juego | `timeControl` | Arts. 6, 7 | Clásico 90 min + 30 s por jugada; Blitz 3 min + 2 s por jugada | Pendiente (2012) |
| 5 | Tolerancia y forfeit | `forfeitToleranceMinutes`, `BR-WD-04` | Art. 10 | 0 minutos | Pendiente (2012) |
| 6 | Puntos por resultado, bye, forfeit | `scoring` | Arts. 9, 11, 21 | 1 / ½ / 0; bye de ½ solo en R1 de Clásico por caso fortuito; PAB según FIDE (supletoria) | Pendiente (2012) |
| 7 | Lista ordenada de desempates | `tiebreaks` | Art. 13 | "Según el software" → `OQ-023` | — |
| 8 | Política de empates sin resolver | `tiebreakPolicy.unresolved` | — | No regulado → `OQ-023` | — |
| 9 | Partidas no jugadas en desempates | `tiebreakPolicy.unplayedRounds` | Art. 21 | FIDE C.07 Art. 16 (supletoria) | Pendiente (2012) |
| 10 | Tamaño de equipo, suplentes, tableros | `team.*` | — | No existe torneo por equipos → `OQ-009` | Pendiente (2012) |
| 11 | Orden de tableros y alineaciones | `team.boardOrder` | — | No aplica | — |
| 12 | Puntos de enfrentamiento y de partida | `team.matchScoring` | — | No aplica | — |
| 13 | Desempates de equipos | `team.teamTiebreaks` | — | No aplica | — |
| 14 | Elegibilidad y datos de inscripción | `eligibility` | `SRC-02` Arts. 12–16 | Verificación externa (`DEC-048`) | Resuelta |
| 15 | Inscripciones tardías, retiros, byes solicitados | `BR-WD-*` | Art. 11 | Solo bye de ½ en R1; tardías y retiros no regulados | Pendiente (2012) |
| 16 | Uso de rating | `seeding` | Art. 15 | ELO FIDE, luego ELO nacional | Resuelta (`DEC-049`) |
| 17 | Premios y acumulación | `BR-PRZ-*` | Art. 19 | Medallas a los tres primeros por rama y modalidad | Pendiente (2012) |
| 18 | Reclamaciones | `BR-AUD-07` | Art. 5 | Emparejamientos: antes de iniciar la ronda, solo por mala digitación; desempates: antes de la premiación | Pendiente (2012) |
| 19 | Eliminación directa | `BR-KO-01` | — | No aparece → `OQ-013` | Pendiente (2012) |
| 20 | Días de juego y rondas por día | `schedule.maxRoundsPerDay` | Art. 14 | 4 días (3 de Clásico, 1 de Blitz); máximo 2 rondas de Clásico por día | Pendiente (2012) |
| 21 | Cupos de inscripción | `entryQuota` | Art. 4 | 6 varones y 5 damas por nodo regional (Clásico) | Pendiente (2012) |
| 22 | Ranking institucional "todo evento" | `BR-CHAMP-02` | Art. 20 | Clásico 20/15/10/5; Blitz 15/10/6/2 | Pendiente (2012) |
| 23 | Digitación de partidas | `BR-SCORE-07` | Art. 12 | Obligatoria para ganadores y para quienes hagan tablas con negras | Pendiente (2012) |

## 4. Cómo responder

- Puedes responder por ID (por ejemplo: "OQ-023: BH-C1, BH, SB; OQ-013: no hay eliminación directa…").
- Para **OQ-001**, adjunta el PDF vigente o confirma qué artículos de 2012 siguen en vigor: con eso se actualizan la tabla de §3, `SOURCES.md` y `CORE-BUSINESS.md`.
- Toda respuesta que cambie una decisión actualiza `ARCHITECTURE.md` §20 (y genera un ADR si es significativa).
