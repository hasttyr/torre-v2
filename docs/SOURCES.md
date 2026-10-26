# SOURCES.md — Fuentes externas consultadas

> Registro de las fuentes que respaldan reglas y datos externos (ASCUN, FIDE, licencias, legal, compatibilidad técnica). Las reglas de `CORE-BUSINESS.md` las citan como `SRC-nn Art. x`. **Si una regla cita una fuente, el valor sale de esa fuente, no de la memoria.**
>
> Fechas de consulta: **2026-10-25** para `SRC-01`–`SRC-03`; **2026-10-26** para los textos de FIDE leídos completos, la Ley 1581 y las fuentes técnicas (`SRC-04`–`SRC-22`). Antes de marcar un `RuleSet` como `APPROVED`, vuelve a comprobar la vigencia de la fuente.

## 1. Estado de las fuentes

| Estado | Significado |
|---|---|
| `VIGENTE` | Versión vigente confirmada en la fuente oficial |
| `DESACTUALIZADA` | Existe, pero hay evidencia de que fue reemplazada o modificada |
| `PARCIAL` | Solo se pudo leer un resumen o una parte del texto; **transcribir el texto oficial** antes de implementar |
| `NO-CONFIRMADA` | Dato sin verificar en la fuente primaria |

## 2. Registro

| ID | Fuente | Versión / fecha | Qué respalda | Estado | Enlace |
|---|---|---|---|---|---|
| SRC-01 | ASCUN/Deportes — *Reglamentos Técnicos por Disciplina Deportiva, Juegos Universitarios Nacionales*, sección **Reglamento Técnico de Ajedrez** (Arts. 2–21) | Edición oct. 2012; los reglamentos se aprueban "a partir de 2011" (Art. 1) | Sistema, modalidades, cupos, ritmo, puntuación, W.O., bye, desempates, siembra, premiación, ranking institucional ("todo evento") | `DESACTUALIZADA` (en 2025 ya existe la modalidad Rápido, ver SRC-03); vigencia del resto **por confirmar** (`OQ-001`) | [PDF](https://caribe2014.ascundeportes.org/uploads/item/1-Consolidado%20Reglamentos%20Deportivos%20ASCUN-Deportes%20pdf.pdf) |
| SRC-02 | ASCUN DAF Nodo Antioquia — *Reglamento General Juegos Universitarios Regionales 2025* | 2025-05-22 | Fases (regional → nacional), inscripción en la plataforma de ASCUN, elegibilidad (Arts. 12–16), comisiones técnica y disciplinaria (Art. 2), premiación (Art. 34) | `VIGENTE` para JUR 2025 del Nodo Antioquia; no es el reglamento nacional | [PDF](https://antioquia2026.ascundeportes.org/uploads/item/dd15b5e94669e7719c0b2d6bd648d73830a4e7a5.pdf) |
| SRC-03 | ASCUN DAF Nodo Antioquia — Circular #24, clasificados individuales a JUN Santander 2025 | 2025-07-23 | Evidencia de modalidades **Clásico, Rápido y Blitz** y ramas F/M en 2025 | `VIGENTE` (evidencia, no reglamento). **Contiene datos personales: no copiar nombres** | [PDF](https://antioquia2026.ascundeportes.org/uploads/item/d2abccee2178684eeaf9ed9ca3cd2746a46e387f.pdf) |
| SRC-04 | FIDE Handbook **C.07 Play-Off and Tie-Break Regulations** | Aprobado por el Consejo el 2026-02-02; vigente desde **2026-03-01** (la versión anterior rigió 2024-08-01 → 2026-02-28) | Clasificación de empatados (Art. 2), aplicación secuencial (Art. 4), catálogo y códigos (Art. 5), encuentro directo (Art. 6), tipo B (Art. 7), Buchholz (Art. 8), SB y Koya (Art. 9), rating (Art. 10), equipos (Arts. 11–13), modificadores (Art. 14), rondas no jugadas (Arts. 15–16) | `VIGENTE`: texto oficial leído completo (Arts. 1–16). Cambios frente a 2024: aclaración en 6.1; nuevos 7.7 (STD), 7.8 (TPN) y 10.6 (RTNG); Buchholz prohibido en todos contra todos (nota del Art. 8); 15.2 y 16.4 (tope del *dummy*) reescritos | [2026](https://handbook.fide.com/chapter/TieBreakRegulations032026) · [2024](https://handbook.fide.com/chapter/TieBreakRegulations082024) · [anuncio](https://www.fide.com/fide-reminds-organizers-and-arbiters-of-updated-play-off-and-tie-break-regulations-effective-march-1-2026/) |
| SRC-05 | FIDE Handbook **C.04.3 FIDE (Dutch) System** | Aprobado 2025-10-28; aplicado desde **2026-02-01** | Orden (Art. 1.2), grupos y *brackets* (1.3), flotantes (1.4), PAB (1.5), colores (1.6–1.7), *topscorers* (1.8), criterios C1–C21 (Art. 2), procedimiento por *bracket* (Art. 3), generación secuencial: transposiciones, intercambios y conjuntos de MDP (Art. 4), asignación de colores (Art. 5) | `VIGENTE`: texto oficial leído completo (Arts. 0–5) | [Handbook](https://handbook.fide.com/chapter/C0403202602) |
| SRC-06 | FIDE Handbook **B.02 Rating Regulations** | Vigente desde 2024-03-01; enmienda Art. 8.3.1 desde **2025-10-01** | K = 40/20/10 y regla de menores (Art. 8.3.3), tope K×n ≤ 700, regla de 400 puntos (< 2650), tablas 8.1.1 (dp) y 8.1.2 (PD), rating inicial (8.2), redondeo (8.3.4) | `VIGENTE`: artículos leídos; tablas transcritas en §5.3 | [Handbook](https://handbook.fide.com/chapter/B022024) · [enmienda](https://www.fide.com/fide-council-approves-targeted-amendment-to-rating-regulation/) |
| SRC-07 | FIDE Arbiters' Commission — *C.07 2023 Tiebreak exercises* | 2024-04 (basado en C.07 2023) | Ejercicios de desempates con rondas no jugadas | `DESACTUALIZADA`: C.07 2026 cambió 15.2 y 16.4. Solo sirve para el ajuste de 16.3 (desempates de los rivales); los valores de los desempates propios se recalculan con el texto 2026 antes de usarlos | [PDF](https://arbiters.fide.com/wp-content/uploads/2024/04/C.07-2023-Tiebreak-exercises.pdf) |
| SRC-08 | **bbpPairings** (motor de emparejamiento) | v6.0.0 (2026-02-01) | Motor de referencia (`DEC-072`): licencia **Apache-2.0**; implementa las reglas Dutch aprobadas en 2025 y aplicadas desde 2026 (= SRC-05); soporte inicial de TRF-2026 (sin puntos libres ni valores ajustables para partidas aplazadas) | `VIGENTE` | [GitHub](https://github.com/BieremaBoyzProgramming/bbpPairings) |
| SRC-09 | FIDE **TRF26** (Handbook C.02, Apéndice A) y anexos de TEC; TRF16 (C.04 Annex 2) | TRF26 aprobado por el Consejo el 12/05/2025, aplicado desde el 01/09/2025; TRF16 de 2016 | Formato de intercambio de torneos para FIDE, para probar emparejamientos y desempates, e intercambio durante el torneo (ITDX) (`US-016`, `US-080`). Anexos: *MandatoryTieBreaks-TRF26* y *TournamentTypeCodeTable(192)-TRF26* | `VIGENTE` (`OQ-029` resuelta) | [TRF26](https://handbook.fide.com/files/handbook/TRF26.pdf) · [TEC](https://tec.fide.com/trf-2026/) · [TRF16](https://fide.com/FIDE/handbook/C04Annex2_TRF16.pdf) |
| SRC-10 | **Ley 1581 de 2012** y **Decreto 1377 de 2013** (compilado en el Decreto 1074 de 2015) | — | Autorización previa, expresa e informada; aviso de privacidad; política de tratamiento; datos sensibles y de menores; plazos de consultas (Art. 14) y reclamos (Art. 15) | Texto de la ley leído (Arts. 14–17); sin revisión jurídica: riesgo legal aceptado (`DEC-065`) | [Ley 1581](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981) · [Decreto 1377](https://www.funcionpublica.gov.co/eva/gestornormativo/norma_pdf.php?i=53646) |
| SRC-11 | FIDE Handbook **C.04.1 Basic rules for Swiss Systems** | Aprobado 2025-10-28; aplicado desde 2026-02-01 | Rondas declaradas (1), sin repetir rival (2), PAB (3–4), colores (6–8) | `VIGENTE`: leído completo | [Handbook](https://handbook.fide.com/chapter/C0401202507) |
| SRC-12 | FIDE Handbook **C.04.2 General handling rules for Swiss Tournaments** | Aprobado 2025-10-28; aplicado desde 2026-02-01 | Orden inicial y TPN (Art. 2), tardíos (2.4), retirados y ausentes (3.2–3.3), historial de color (3.4), parejas no jugadas (3.5), orden de mesas (3.6), correcciones (4.3), cambios a emparejamientos publicados (4.4) | `VIGENTE`: leído completo; resumen en §5.1 | [Handbook](https://handbook.fide.com/chapter/GeneralHandlingRulesForSwissTournaments202602) |
| SRC-13 | FIDE Handbook **C.04.6 Swiss Team Pairing System** | Vigente desde 2026-02-01 | Color del equipo = color del tablero 1 (Art. 1.6.1); preferencias de color tipo A y B (1.7); asignación de colores (Art. 4); PAB de equipos con puntos de tablas por defecto (1.5) | `VIGENTE`: secciones citadas leídas | [Handbook](https://handbook.fide.com/chapter/SwissTeamPairingSystem202602) |
| SRC-14 | FIDE Handbook **C.05, Anexo 1: tablas de Berger** | — | Calendario de todos contra todos de 3 a 16 jugadores; con número impar, el número más alto descansa; recomendación para doble vuelta | `VIGENTE`: tablas leídas y comparadas con el algoritmo de §5.2 | [Handbook](https://handbook.fide.com/chapter/C05Annex1) |
| SRC-15 | FIDE **Leyes del Ajedrez** | Vigentes desde 2023-01-01 (última versión publicada en el Handbook) | Tiempo de espera por defecto: cero si el reglamento no fija otro (Art. 6.7.1) | `VIGENTE` | [Handbook](https://handbook.fide.com/chapter/E012023) |
| SRC-16 | FIDE — *Regulations for the FIDE Chess Olympiad 2026, Main Competition* | 2026 | El equipo que va primero en la lista de emparejamiento juega con blancas en los tableros impares (Art. 4.1) | `VIGENTE` (reglamento de un evento; se usa como práctica de FIDE para `BR-TEAM-05`) | [PDF](https://handbook.fide.com/files/handbook/Olympiad2026MainCompetition.pdf) |
| SRC-17 | **JaVaFo** (motor de emparejamiento) | 2.2 (2018-09-15) | "JaVaFo is free of charge"; pide citar rrweb.org/javafo en productos comerciales; sin texto de licencia. Anterior al Dutch 2026 | `VIGENTE`, **descartado** como referencia (`DEC-072`) | [Página](http://www.rrweb.org/javafo/JaVaFo.htm) |
| SRC-18 | Registro de npm (licencias y versiones) | Consulta del 2026-10-26 | Licencias y fechas de las librerías de §6 | `VIGENTE` a esa fecha; las versiones se fijan en `ADR-0001` | [npm](https://www.npmjs.com/) |
| SRC-19 | NestJS — guía de migración de v11 a v12 | Nest 12.0.0 publicado el 2026-08-27; 12.2.0 el 2026-10-19 | Paquetes solo ESM, versiones de Node, TypeScript 6 en los *schematics*, Vitest por defecto en ESM, `@nestjs/config` con Standard Schema, `@nestjs/terminus` | `VIGENTE` | [Guía](https://docs.nestjs.com/migration-guide) |
| SRC-20 | Neon — extensiones y ventana de historial | Consulta del 2026-10-26 | `pg_trgm` 1.6 y `unaccent` 1.1 en PG14–PG18; ventana de restauración por plan | `VIGENTE` | [Extensiones](https://neon.com/docs/extensions/pg-extensions) · [Historial](https://neon.com/docs/postgres/backup-restore/history-window) |
| SRC-21 | Render — Key Value y WebSocket | Consulta del 2026-10-26 | Valkey 8, política `noeviction`, persistencia solo en planes pagos; WebSocket sin duración máxima, cierre en cada despliegue | `VIGENTE` | [Key Value](https://render.com/docs/key-value) · [WebSocket](https://render.com/docs/websocket) |
| SRC-22 | BullMQ — *Going to production* | Consulta del 2026-10-26 | Redis con `maxmemory-policy noeviction`, persistencia AOF recomendada, `maxRetriesPerRequest: null` en los *workers* | `VIGENTE` | [Guía](https://docs.bullmq.io/guide/going-to-production) |

## 3. Datos extraídos de SRC-01 (ASCUN 2012)

Los valores se marcan `[ASCUN-2012]` en `CORE-BUSINESS.md`. **Son reales pero pueden no estar vigentes**: el `RuleSet` `ascun-chess` los usa en estado `DRAFT` (`DEC-027`, `BR-GEN-04`).

| Art. | Tema | Contenido (resumen fiel) |
|---|---|---|
| 2 | Sistema | Sistema Suizo |
| 3 | Categoría | Ambas ramas; modalidades Clásico y Blitz. Parágrafo: el Blitz lo juegan los primeros seis clasificados; en Clásico, las primeras seis damas y los primeros seis varones clasificados |
| 4 | Cupos | Cada nodo regional inscribe hasta seis varones y cinco damas en Clásico |
| 5 | Software y reclamos | Swiss Perfect o Swiss Manager. Los emparejamientos no admiten reclamo salvo por mala digitación, antes de iniciar la ronda; los reclamos por desempate, antes de la premiación |
| 6 | Ritmo Clásico | 6 rondas; 90 minutos + 30 segundos por jugada desde el inicio |
| 7 | Ritmo Blitz | 6 rondas de **doble partida** con el mismo adversario; 3 minutos + 2 segundos por jugada |
| 8 | Planilla | Obligatoria en Clásico |
| 9 | Puntuación | 1 victoria · ½ tablas · 0 derrota |
| 10 | W.O. | Cero (0) minutos de espera |
| 11 | Bye | Solo bye de **medio punto** en la **primera ronda** de Clásico, por caso fortuito comprobado |
| 12 | Digitación | Ganadores y quienes hagan tablas con negras deben digitar la partida |
| 13 | Desempates | "De acuerdo con las características técnicas del software utilizado" (**no define la lista**, `OQ-023`) |
| 14 | Días | Cuatro días (tres de Clásico, uno de Blitz); máximo dos rondas de Clásico por día |
| 15 | Siembra | ELO FIDE; luego ELO nacional |
| 16 | Arbitraje | Designado por FECODAZ, con título FIDE (AF o AI) |
| 18 | Sanciones | El árbitro principal puede imponer penas de tiempo, pérdida y retiro |
| 19 | Premiación | Medallas oro, plata y bronce a los tres primeros por rama, en Clásico y Blitz |
| 20 | "Todo evento" | Campeón institucional por rama: Clásico 1.º 20 · 2.º 15 · 3.º 10 · 4.º 5; Blitz 1.º 15 · 2.º 10 · 3.º 6 · 4.º 2. Gana la institución con más puntos |
| 21 | Supletoria | Lo no previsto se rige por FIDE, según lo adopte FECODAZ |

## 4. Datos extraídos de SRC-02 (elegibilidad, JUR 2025)

| Art. | Contenido |
|---|---|
| 4–6 | Inscripción en el sistema de información de ASCUN: preinscripción y verificación por la IES; aprobación por el nodo; auditoría de inscritos |
| 12 | Estar matriculado en un programa conducente a título (técnico, tecnólogo, profesional o posgrado) |
| 13 | Una disciplina y una IES por estudiante |
| 14 | Promedio acumulado mínimo 3.3 (pregrado) y 3.5 (posgrado); primer semestre solo en fase regional |
| 15 | Sin límite de edad |
| 16 | Identificación con el carné oficial; sin carné puede declararse W.O. |
| 2 | Comisión Técnica (reglamentos, programación) y Comisión Disciplinaria (reclamaciones) |

Decisión derivada: la plataforma **no** almacena datos académicos; solo registra que la elegibilidad fue verificada externamente (`DEC-048`, `BR-REG-01`).

## 5. Datos transcritos de FIDE

### 5.1 C.04.2 — reglas generales del Suizo (`SRC-12`)

| Art. | Contenido (resumen fiel) | Regla destino |
|---|---|---|
| 2.1–2.2 | Antes de la ronda 1 se ordena por fuerza (normalmente el rating), luego por título FIDE (GM, IM, WGM, FM, WIM, CM, WFM, WCM, sin título) en torneos individuales, y luego alfabéticamente (salvo que se haya anunciado otro criterio). Sin rating fiable, el árbitro principal lo estima | `BR-REG-04` |
| 2.3 | Ese orden da el TPN (el primero recibe el #1). Si los datos eran incorrectos, se pueden ajustar y reasignar los TPN, pero **no después de emparejar la ronda 4** | `BR-REG-04` |
| 2.4–2.5 | Un tardío solo se empareja desde que llega; no recibe puntos por las rondas no jugadas (salvo regla del torneo); los TPN son provisionales hasta cerrar la lista | `BR-WD-02` |
| 3.1 | Las partidas aplazadas cuentan como tablas solo para emparejar | — |
| 3.2–3.3 | Los retirados ya no se emparejan. Quien se sabe de antemano que no jugará una ronda no se empareja en ella y suma cero (salvo regla del torneo) | `BR-WD-01`, `BR-WD-06` |
| 3.4 | Para el color solo cuentan las partidas jugadas: las rondas no jugadas se corren al inicio del historial (BWBuW se trata como uBWBW; WBuWB como uWBWB; BWWuBuW como uuBWWBW) | `BR-PAIR-06` |
| 3.5 | Dos participantes emparejados que no jugaron su partida pueden volver a emparejarse | `BR-PAIR-02` |
| 3.6 | Orden recomendado de las mesas: (1) mayor puntaje del mejor clasificado de la pareja; (2) mayor suma de puntajes; (3) menor TPN del mejor clasificado | `BR-PAIR-14` |
| 4.1 | Quien no confirma su presencia antes del sorteo queda excluido, salvo decisión del árbitro principal | `BR-WD-06` |
| 4.3 | Si un resultado se anotó mal, una partida se jugó con colores cambiados o hay que corregir un rating, y se avisa dentro del plazo fijado de antemano tras publicar los resultados, el dato nuevo se usa para la clasificación y el siguiente emparejamiento. Si se avisa después de emparejar pero antes del final de la ronda siguiente, afecta al siguiente emparejamiento por hacer. Si se avisa después del final de la ronda siguiente, se corrige **después del torneo y solo para el rating** | `BR-AUD-03`, `DEC-051` |
| 4.4 | Un emparejamiento publicado no se cambia salvo: dos que ya jugaron entre sí; el reglamento lo permite; dos cercanos en la clasificación sin rival aceptan jugar; un tardío admitido con cambios mínimos aceptados; imprevistos que afectan los primeros tableros de la última ronda | `BR-PAIR-08`, `BR-AUD-03` |

### 5.2 Tablas de Berger (`SRC-14`)

Con *n* par (si *n* es impar se añade el número *n+1*, que significa descanso), rondas *r* = 0, …, *n−2* y posiciones *k* = 0, …, *n−2*:

- El jugador en la posición *k* de la ronda *r* es `((k + r·n/2) mod (n−1)) + 1`.
- Mesa 1: la posición 0 contra el jugador *n*. El jugador *n* lleva negras en las rondas pares (contando desde 0) y blancas en las impares.
- Mesas 2 en adelante: la posición *k* (con blancas) contra la posición *n−1−k*, para *k* = 1, …, *n/2 − 1*.

Este algoritmo se comparó el 2026-10-26 con **todas** las tablas oficiales (3 a 16 jugadores): coinciden ronda por ronda y color por color. Para torneos de doble vuelta, FIDE recomienda invertir el orden de las dos últimas rondas del primer ciclo, para evitar tres partidas seguidas con el mismo color.

### 5.3 Tablas de B.02 (`SRC-06`)

Se copian a un archivo de datos de `@torre/ratings` en `US-019`; una prueba compara el archivo con esta sección. Verificación del 2026-10-26: 101 valores de *p*, `dp(p) = −dp(1−p)`, crecientes; 51 rangos de *D* contiguos con `H + L = 1`.

**Tabla 8.1.1 (p → dp).** Para 0 y 1, dp es indeterminado y se muestra nocionalmente como ∓800.

| p | dp | p | dp | p | dp | p | dp | p | dp |
|---|---|---|---|---|---|---|---|---|---|
| 1.00 | 800 | .90 | 366 | .80 | 240 | .70 | 149 | .60 | 72 |
| .99 | 677 | .89 | 351 | .79 | 230 | .69 | 141 | .59 | 65 |
| .98 | 589 | .88 | 336 | .78 | 220 | .68 | 133 | .58 | 57 |
| .97 | 538 | .87 | 322 | .77 | 211 | .67 | 125 | .57 | 50 |
| .96 | 501 | .86 | 309 | .76 | 202 | .66 | 117 | .56 | 43 |
| .95 | 470 | .85 | 296 | .75 | 193 | .65 | 110 | .55 | 36 |
| .94 | 444 | .84 | 284 | .74 | 184 | .64 | 102 | .54 | 29 |
| .93 | 422 | .83 | 273 | .73 | 175 | .63 | 95 | .53 | 21 |
| .92 | 401 | .82 | 262 | .72 | 166 | .62 | 87 | .52 | 14 |
| .91 | 383 | .81 | 251 | .71 | 158 | .61 | 80 | .51 | 7 |

Con *p* = .50, dp = 0. Para *p* < .50, `dp(p) = −dp(1−p)` (por ejemplo, dp(.49) = −7 y dp(.00) = −800).

**Tabla 8.1.2 (D → PD).** H = probabilidad del de mayor rating; L = la del de menor rating (L = 1 − H).

| D | H | D | H | D | H | D | H | D | H |
|---|---|---|---|---|---|---|---|---|---|
| 0–3 | .50 | 92–98 | .63 | 198–206 | .76 | 345–357 | .89 | 518–559 | .97 |
| 4–10 | .51 | 99–106 | .64 | 207–215 | .77 | 358–374 | .90 | 560–619 | .98 |
| 11–17 | .52 | 107–113 | .65 | 216–225 | .78 | 375–391 | .91 | 620–735 | .99 |
| 18–25 | .53 | 114–121 | .66 | 226–235 | .79 | 392–411 | .92 | 736 o más | 1.00 |
| 26–32 | .54 | 122–129 | .67 | 236–245 | .80 | 412–432 | .93 | | |
| 33–39 | .55 | 130–137 | .68 | 246–256 | .81 | 433–456 | .94 | | |
| 40–46 | .56 | 138–145 | .69 | 257–267 | .82 | 457–484 | .95 | | |
| 47–53 | .57 | 146–153 | .70 | 268–278 | .83 | 485–517 | .96 | | |
| 54–61 | .58 | 154–162 | .71 | 279–290 | .84 | | | | |
| 62–68 | .59 | 163–170 | .72 | 291–302 | .85 | | | | |
| 69–76 | .60 | 171–179 | .73 | 303–315 | .86 | | | | |
| 77–83 | .61 | 180–188 | .74 | 316–328 | .87 | | | | |
| 84–91 | .62 | 189–197 | .75 | 329–344 | .88 | | | | |

### 5.4 Colores en encuentros por equipos (`SRC-13`, `SRC-16`)

- Un equipo "tiene blancas" en un *match* si el jugador de su tablero 1 debía jugar con blancas (C.04.6 Art. 1.6.1).
- En Suizo por equipos, el color del equipo sale de C.04.6 Art. 4: el equipo de referencia es el de mayor puntaje primario, luego secundario, luego menor TPN; en la primera ronda recibe el color inicial sorteado si su TPN es impar; después rigen las preferencias de color (tipo A por defecto).
- El equipo con blancas juega con blancas en los tableros impares y con negras en los pares (Olimpiada 2026, Art. 4.1).

## 6. Compatibilidad técnica verificada (2026-10-26)

Datos para `ADR-0001` y `ADR-0002`. Son de esa fecha: al iniciar `US-001` se vuelven a comprobar las versiones.

| Tema | Hallazgo | Fuente | Efecto en la documentación |
|---|---|---|---|
| NestJS 12 | Versión actual 12.2.0. Paquetes solo ESM; para ejecutar, Node 20.19+ o 22.12+; el CLI pide Node 22.22.3+, 24.15+ o 26+; los *schematics* piden TypeScript 6; Vitest por defecto en proyectos ESM; `@nestjs/config` valida con Standard Schema; `@nestjs/terminus` usa `HealthIndicatorService` | SRC-19 | ESM en todo el monorepo (`DEC-071`); versiones en `ADR-0001` |
| TypeScript | La última versión es la 7.0.2; los *schematics* de Nest 12 piden la 6 | SRC-18, SRC-19 | `ADR-0001` elige entre 6 y 7 y comprueba `experimentalDecorators` y `emitDecoratorMetadata` |
| oRPC | 1.16.1. `@orpc/nest` pide `@nestjs/*` ≥ 11 y Express ≥ 5; `@orpc/zod` admite Zod ≥ 3.25 (la actual es 4.6.7); `@orpc/vue-query` pide Vue ≥ 3.3 y `@tanstack/vue-query` ≥ 5.80.2 | SRC-18 | Compatible en el papel; la prueba de `US-008` lo confirma (`ADR-0002`) |
| Vitest con decoradores | Vitest 5.0.5; `unplugin-swc` 2.0.0 solo pide `@swc/core` ≥ 1.2.108 y Node 20.19+ o 22.12+ | SRC-18 | Se mantiene `unplugin-swc` en `apps/api` |
| CASL con Prisma | `@casl/prisma` 2.0.2 admite `@prisma/client` de la 4 a la 7 (última estable: 7.10.1; Prisma 8 está en versión candidata) | SRC-18 | Prisma 7.x mientras CASL no admita la 8 |
| Neon | `pg_trgm` 1.6 y `unaccent` 1.1 en PG14–PG18. Restauración: gratuito 6 h; Launch 1 día por defecto (hasta 7); Scale 1 día (hasta 30) | SRC-20 | Plan de despliegue (§16.5) |
| Redis para BullMQ | Render Key Value usa Valkey 8 (derivado de Redis 7.2.4); admite `noeviction`; sin persistencia en el plan gratuito. BullMQ exige `noeviction`, recomienda AOF y `maxRetriesPerRequest: null` en los *workers* | SRC-21, SRC-22 | Plan de despliegue: con el plan gratuito, las colas se pierden al reiniciar |
| WebSocket en Render | Sin duración máxima; las conexiones se cierran en cada despliegue (SIGTERM con 30 s, ampliable a 300 s); se recomienda ping/pong y reconexión con retroceso | SRC-21 | Coincide con la reconexión de `US-051` |
| Licencias | `cm-chessboard` 8.15.4 MIT · `chess.js` 1.4.0 BSD-2-Clause · `otplib` 13.5.0 MIT · `qrcode` 1.5.4 MIT · `speakeasy` 2.0.0 sin versiones desde 2016 · `@graph-algorithm/maximum-matching` 3.0.0 **AGPL-3.0**, sin versiones desde 2021 · `stockfish` 19.0.1 **GPL-3.0** | SRC-18 | Tablero: `cm-chessboard`; oráculo AGPL descartado (`DEC-072`); motor de análisis pendiente (`OQ-018`, `US-093`) |
| Ley 1581 | Consultas: 10 días hábiles, prorrogables 5. Reclamos: 15 días hábiles desde el día siguiente a la recepción, prorrogables 8; si el reclamo está incompleto, se pide completarlo dentro de 5 días y, tras 2 meses sin respuesta, se entiende desistido; la leyenda "reclamo en trámite" se pone dentro de 2 días hábiles | SRC-10 | `US-111` cuenta la fecha límite en días calendario (`DEC-073`) |
