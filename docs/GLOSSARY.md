# GLOSSARY.md — Vocabulario del dominio (ES ↔ código en inglés)

> El código usa la columna **Código** (`DEC-035`). La documentación y la UI usan el español. Si aparece un término nuevo, se agrega aquí primero.

## 1. Competencia

| Español | Código (EN) | Definición |
|---|---|---|
| Torneo | `Tournament` | Competencia de una rama y modalidad con un `RuleSet` fijado y un flujo de rondas |
| Campeonato / evento | `Championship` | Agrupa los torneos de un mismo evento (rama × modalidad) y calcula el ranking institucional (`BR-CHAMP-*`) |
| Rama | `Branch` | Femenina, masculina o mixta |
| Modalidad | `Modality` | Clásico, Rápido o Blitz, según el ritmo de juego |
| Nodo regional | `Node` | Unidad territorial de ASCUN que organiza la fase regional |
| Conjunto de reglas | `RuleSet` | Parámetros versionados que definen sistema, puntuación, desempates, equipos, etc. (`CORE-BUSINESS.md` §3) |
| Ronda | `Round` | Conjunto de partidas/enfrentamientos que se juegan en una jornada |
| Emparejamiento | `Pairing` | Asignación de dos competidores para una partida/enfrentamiento en una ronda |
| Partida | `Game` | Enfrentamiento entre dos jugadores sobre un tablero |
| Mesa / tablero | `Board` | Posición física/numérica de una partida en la sala; en equipos, el número de tablero dentro del enfrentamiento |
| Enfrentamiento (de equipos) | `Match` | Encuentro entre dos equipos compuesto por varias partidas (una por tablero) |
| Competidor | `Competitor` | Quien compite: un jugador (individual) o un equipo (por equipos) |
| Participante / inscripción | `Entry` / `Participant` | Competidor inscrito en un torneo |
| Semilla / ranking inicial | `Seed` | Orden inicial de los competidores; determina la ronda 1 |
| Sistema suizo | `Swiss` | Sistema en el que se empareja por puntaje similar sin repetir rivales |
| Todos contra todos | `RoundRobin` | Cada competidor juega contra todos los demás (simple o doble) |
| Eliminación directa | `Knockout` | Cuadro en el que el perdedor sale |
| Tablas de Berger / método circular | `Berger` / circle method | Procedimiento para generar el calendario de todos contra todos |
| Grupo de puntaje | `ScoreGroup` | Conjunto de competidores con el mismo puntaje en una ronda Suiza |
| Flotante | `Floater` | Competidor que se empareja fuera de su grupo de puntaje (*downfloater* / *upfloater*) |
| Bye (descanso) | `Bye` | Ronda sin rival; asignada por emparejamiento o solicitada |
| Bye por emparejamiento (PAB) | `PairingBye` | Bye que asigna el motor cuando el número de jugadores es impar; vale los puntos de una victoria salvo regla distinta (`BR-SCORE-04`) |
| Bye de medio punto / de cero puntos | `HalfPointBye` / `ZeroPointBye` | Byes solicitados (`BR-WD-03`); toda ronda posterior a un retiro cuenta como bye de cero puntos |
| Número de emparejamiento (TPN) | `PairingNumber` | Posición del jugador en el ranking que se usa para emparejar |
| *Topscorer* | `Topscorer` | Al emparejar la última ronda, jugador con más del 50 % del máximo posible (`BR-PAIR-11`) |
| W.O. (*walkover*) | `Forfeit` | Término de ASCUN para la incomparecencia que da la victoria al rival |
| Reclamación | `Claim` | Solicitud formal sobre un emparejamiento, un resultado o un desempate (`BR-AUD-07`) |
| Incomparecencia | `NoShow` | El jugador no se presenta; lleva a forfeit |
| Forfeit | `Forfeit` | Resultado asignado sin jugar |
| Retiro | `Withdrawal` | El competidor deja el torneo |
| Inscripción tardía | `LateEntry` | Alta con el torneo en curso |
| Ritmo de juego / control de tiempo | `TimeControl` | Tiempo asignado a las partidas |
| Check-in | `CheckIn` | Confirmación de presencia antes de emparejar una ronda; opcional por torneo (`BR-WD-06`) |
| Tolerancia | `ForfeitTolerance` | Minutos de espera antes de declarar incomparecencia |

## 2. Resultados y clasificación

| Español | Código (EN) | Definición |
|---|---|---|
| Resultado | `Result` | Resultado de una partida (`WHITE_WINS`, `BLACK_WINS`, `DRAW`, …) |
| Puntos / unidades | `Points` / `units` | Puntaje en enteros; por defecto 1 unidad = ½ punto (`BR-NUM-01`) |
| Clasificación | `Standings` | Orden de los competidores con puntos y desempates |
| Cuadro cruzado | `Crosstable` | Matriz de resultados entre competidores |
| Desempate | `Tiebreak` | Criterio para ordenar a quienes empatan en puntos |
| Buchholz (y variantes Cut-1, Cut-2, Median-1) | `BUCHHOLZ*` | Suma de los puntajes de los oponentes (con recortes) |
| Victorias (WIN / WON) | `WIN` / `WON` | Rondas con los puntos de una victoria, jugadas o no / partidas ganadas sobre el tablero |
| Sonneborn-Berger | `SONNEBORN_BERGER` | Suma de los puntajes de los oponentes vencidos más la mitad de los empatados |
| Progresivo / acumulativo | `PROGRESSIVE` | Suma de los puntajes acumulados tras cada ronda |
| Encuentro directo | `DIRECT_ENCOUNTER` | Resultado de las partidas entre los empatados |
| Koya | `KOYA` | Puntos contra oponentes con al menos el 50 % |
| Oponente virtual (obsoleto) | — | Técnica de FIDE eliminada en 2023; la reemplaza el *dummy opponent* de C.07 Art. 16 |
| *Dummy opponent* | `DummyOpponent` | Rival ficticio con el mismo puntaje del participante, usado para sus rondas no jugadas en los desempates (`BR-TIE-03`) |
| VUR | `VoluntaryUnplayedRound` | Ronda voluntariamente no jugada: bye solicitado o derrota por forfeit (`SRC-04` Art. 16) |
| Ranking institucional / todo evento | `InstitutionStanding` | Suma de puntos por institución según los puestos individuales (`BR-CHAMP-02`) |
| Instantánea oficial | `OfficialStandingsSnapshot` | Clasificación congelada en el evento de cierre (`BR-AUD-05`) |
| Provisional / oficial | `PROVISIONAL` / `OFFICIAL` | Clasificación antes/después de cerrar la ronda |
| Obsoleto | `STALE` | Ronda posterior emparejada que podría cambiar tras una corrección |
| Premio | `Prize` | Reconocimiento derivado de la clasificación final |

## 3. Ratings

| Español | Código (EN) | Definición |
|---|---|---|
| Elo | `Elo` | Sistema de calificación; `E = 1/(1+10^((Rb−Ra)/400))` |
| Factor K | `K` | Sensibilidad de la variación de rating |
| Rendimiento (TPR) | `PerformanceRating` | Rating equivalente al desempeño en un torneo |
| Sin rating | `Unrated` | Jugador sin rating (`BR-RAT-05`) |
| Glicko-2 | `Glicko2` | Sistema alternativo (futuro) |

## 4. Equipos

| Español | Código (EN) | Definición |
|---|---|---|
| Equipo | `Team` | Representación de una institución en un torneo por equipos |
| Plantilla / nómina | `Roster` | Jugadores inscritos de un equipo |
| Alineación | `Lineup` | Jugadores ordenados por tablero para un enfrentamiento |
| Capitán / delegado | `Captain` | Responsable del equipo |
| Puntos de partida | `GamePoints` | Suma de puntos de los tableros |
| Puntos de enfrentamiento | `MatchPoints` | Puntos derivados del resultado del enfrentamiento |

## 5. Plataforma

| Español | Código (EN) | Definición |
|---|---|---|
| Organización | `Organization` | Tenant (universidad, liga, federación) |
| Institución | `Institution` | Universidad u otro ente participante |
| Membresía | `Membership` | Rol de un usuario dentro de un alcance |
| Alcance | `Scope` | `PLATFORM`, `ORGANIZATION`, `TOURNAMENT`, `TEAM` |
| Director del torneo | `tournament_director` | Configura y dirige un torneo |
| Árbitro | `arbiter` | Registra y corrige resultados |
| Espectador | `viewer` | Rol por defecto de toda cuenta nueva y de los visitantes: sin membresías, solo lectura pública (`BR-ROLE-01`) |
| Cambio directo de rol | `DirectRoleChange` | Asignación, cambio o revocación de un rol por un administrador, con razón (`BR-ROLE-02`) |
| Solicitud de rol | `RoleRequest` | Petición de un rol en un alcance, con razón, que aprueba quien podría otorgarlo (`BR-ROLE-03..05`) |
| Permiso | `Permission` | Capacidad del catálogo fijo (p. ej. `game.record`); un rol es un conjunto de permisos (`AUTHORIZATION.md` §4.1) |
| Permiso reservado | `ReservedPermission` | Permiso que solo puede tener `platform_admin` (borrar, papelera, roles, suspensión, anonimización) |
| Rol del sistema / rol propio | `SystemRole` / `CustomRole` | Uno de los 7 roles predefinidos (editables) / rol de una organización creado por `platform_admin` |
| Borrado lógico | `SoftDelete` | Marcar un registro como borrado (`deleted_at`) sin eliminarlo físicamente (`BR-DEL-02`) |
| Papelera | `Trash` | Vista de lo borrado, solo para `platform_admin`, desde donde se restaura por lotes (`BR-DEL-05`) |
| Archivar torneo | `ArchiveTournament` | Ocultar un torneo sin tocar sus eventos (`BR-DEL-06`) |
| Anonimización | `Anonymization` | Reemplazo irreversible de datos personales conservando resultados (`BR-DEL-07`) |
| Confirmación de contraseña | `PasswordConfirmation` | Volver a pedir la contraseña antes de una acción sensible (`BR-AUTH-05`) |
| Segundo factor (2FA, TOTP) | `TwoFactor` | Código temporal de una app autenticadora; con códigos de recuperación de un solo uso (`BR-AUTH-06`) |
| Sesión | `AuthSession` | Familia de refresh tokens de un dispositivo; se puede listar y cerrar (`BR-AUTH-02`) |
| Centro de avisos | `Notification` | Avisos en la app para un usuario (`US-112`) |
| Suscriptor | `Subscriber` | Quien recibe notificaciones con consentimiento |
| Sala en vivo | `LiveRoom` | Canal de tiempo real de un torneo |
| Modo proyector | `projector mode` | Tema de alto contraste y letra grande |
| Borrador de ronda | `PAIRED_DRAFT` | Emparejamientos generados y aún no publicados |

## 6. Arquitectura y calidad

| Término | Definición |
|---|---|
| Evento (`Event`) | Hecho inmutable que ocurrió en el torneo |
| Flujo (`Stream`) | Secuencia ordenada de eventos de un torneo |
| *Decider* | Par de funciones puras `evolve` y `decide` que definen el comportamiento de un agregado |
| Proyección (`Projection`) | Vista de lectura derivada de los eventos |
| CQRS | Separar el modelo de escritura del de lectura |
| *Outbox* | Tabla de mensajes a publicar escrita en la misma transacción que el cambio |
| Idempotencia | Repetir una operación con la misma clave no cambia el resultado |
| RLS | *Row-Level Security*: política de PostgreSQL que filtra filas por tenant |
| CASL | Librería de autorización por reglas |
| IDOR | Acceso a recursos ajenos cambiando un identificador |
| Propiedad (*property-based test*) | Prueba que afirma un invariante sobre muchas entradas generadas |
| Caso dorado (*golden*) | Caso con resultado esperado verificado de forma independiente |
| Oráculo | Implementación simple y obviamente correcta usada para verificar otra |
| ADR | Registro de decisión de arquitectura |
| DoD | *Definition of Done* |

## 7. Siglas y formatos externos

| Sigla | Significado |
|---|---|
| ASCUN | Asociación Colombiana de Universidades (su unidad deportiva organiza competencias universitarias) |
| SNIES | Sistema Nacional de Información de la Educación Superior (Colombia); código de institución |
| FIDE | Federación Internacional de Ajedrez |
| TRF | Formato de archivo de torneo de FIDE (TRF16, `SRC-09`; TRF-2026 en `OQ-029`) |
| FECODAZ | Federación Colombiana de Ajedrez; designa a los árbitros de ASCUN |
| JUN / JUR | Juegos Universitarios Nacionales / Regionales de ASCUN |
| IES | Institución de Educación Superior |
| PAB | *Pairing-allocated bye*: bye por emparejamiento |
| AF / AI | Árbitro FIDE / Árbitro Internacional |
| PGN | Notación de partidas |
| FEN | Notación de posiciones |
| Ley 1581 de 2012 | Ley colombiana de protección de datos personales (Habeas Data; `SRC-10`); riesgo legal aceptado (`DEC-065`) |
