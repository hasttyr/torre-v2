# PRODUCT.md — Finalidad, alcance y planteamiento del producto

> Qué es el producto y para qué existe. **No** describe el comportamiento detallado (eso es `CORE-BUSINESS.md`) ni la tecnología (eso es `ARCHITECTURE.md`).

## 1. Resumen en una frase

Una plataforma que permite a universidades, ligas y organizadores **operar torneos de ajedrez de principio a fin** —inscripción, emparejamientos, registro de resultados, clasificaciones con desempates, ratings, reportes y comunicación— de forma **correcta, auditable y en vivo**, aplicando las reglas del campeonato universitario colombiano (ASCUN) y siendo extensible a otras reglas.

## 2. Naturaleza del producto (importante para quien implemente)

- Es un **sistema de cálculo y arbitraje**, no un juego. No se juega ajedrez dentro de la plataforma. Las partidas ocurren sobre tablero físico (o en otra plataforma) y **el sistema registra resultados y calcula todo lo demás**.
- El valor central: **que los emparejamientos, puntajes, desempates y clasificaciones sean correctos, reproducibles y defendibles** ante una reclamación.
- El producto debe poder justificar cada número que muestra (trazabilidad hasta los eventos que lo originan).

## 3. Problema que resuelve

| Dolor actual (hipótesis a validar) | Cómo lo resuelve el producto |
|---|---|
| Torneos manejados con hojas de cálculo o software de escritorio (errores manuales, clasificaciones discutibles) | Motor de emparejamiento y desempates automatizado, con reglas configurables y auditoría |
| Resultados que se publican tarde o por chat | Marcadores y clasificaciones en vivo, y notificaciones a suscriptores |
| Reglamentos distintos por competencia | Reglas modeladas como datos (`RuleSet`), no como código fijo |
| Documentos finales hechos a mano | Reportes PDF generados desde el estado oficial del torneo |
| Reclamaciones: "¿por qué quedé aquí?" | Cada puesto se explica con sus puntos y desempates; cada corrección deja rastro |
| Torneos por equipos (universidades) con puntuaciones complejas | Motor de equipos con tableros, puntos de partida y de match |

> Estas son hipótesis de partida. En esta fase **no se validan con usuarios** (`DEC-031`); el éxito se mide técnicamente (§9).

## 4. Usuarios y roles

| Perfil | Qué necesita | Rol del sistema (ver `AUTHORIZATION.md`) |
|---|---|---|
| Director/organizador del torneo (p. ej. coordinación deportiva de una universidad o liga) | Configurar el torneo y sus reglas, abrir inscripciones, generar rondas, publicar y cerrar | `tournament_director`, `org_admin`, `org_owner` |
| Árbitro | Registrar y corregir resultados rápido, con teclado, incluso bajo presión | `arbiter` |
| Capitán / delegado de universidad | Inscribir su equipo, gestionar la plantilla y alineaciones | `captain` |
| Jugador | Ver sus partidas, mesa, color, resultados y posición | `player` |
| Espectador / familia / entrenador | Seguir resultados en vivo y recibir un email con los resultados | `viewer` (público) / suscriptor |
| Administrador de plataforma | Operar la plataforma: roles y permisos, papelera, suspensión de cuentas, solicitudes de titulares (con auditoría) | `platform_admin` |

Toda cuenta nueva empieza como **espectador**. Los demás roles se asignan directamente o se solicitan con una razón, y los aprueba quien podría otorgarlos (`DEC-056`, `AUTHORIZATION.md` §9).

## 5. Propuesta de valor

1. **Corrección verificable:** el motor de emparejamiento y los desempates se prueban con propiedades, casos dorados y (cuando aplique) contra un motor de referencia.
2. **Reglas como datos:** ASCUN es el primer `RuleSet`; FIDE (Dutch) es el segundo; el sistema es reutilizable.
3. **Auditoría total:** cada resultado, corrección y emparejamiento es un evento inmutable.
4. **En vivo:** clasificaciones y marcadores actualizados en tiempo real.
5. **Comunicación automatizada:** PDF y emails con resultados a quien se suscriba.
6. **Experiencia profesional:** UI homogénea, accesible, con atajos de teclado para el árbitro y modo proyector.

## 6. Alcance

### 6.1 Dentro del alcance (ver épicas en `USER-STORIES.md`)

- Multi-organización (tenants) con roles y permisos por alcance; **permisos asignables** a los roles por el `platform_admin` (estilo Spatie, `DEC-058`).
- Autenticación estilo Fortify con 2FA opcional y confirmación de contraseña (`DEC-057`).
- Borrado lógico con papelera y restauración, solo por el `platform_admin` (`DEC-059`).
- Derechos del titular de datos (Ley 1581), centro de avisos en la app y consola de plataforma.
- Gestión de torneos **individuales** (ASCUN) y **por equipos** como capacidad genérica (`DEC-054`).
- Campeonatos que agrupan torneos por rama y modalidad, con **ranking institucional** "todo evento" (`DEC-042`).
- Sistemas de competencia: Suizo, todos contra todos (y doble), eliminación (si ASCUN lo exige), según `RuleSet`.
- Emparejamientos automáticos con ajuste manual auditado.
- Registro y corrección de resultados, byes, incomparecencias, retiros, inscripciones tardías.
- Premiación y reclamaciones con plazos auditados.
- Clasificaciones con desempates configurables; ratings Elo y TPR.
- Salas en vivo (tiempo real) y vistas públicas compartibles.
- Suscripciones, emails y reportes PDF.
- Importar/exportar (CSV, PGN, TRF cuando corresponda).
- i18n (es primero; en; pt después), modo oscuro, modo proyector, accesibilidad básica.
- Diferenciadores técnicos: modo offline para árbitro, programador de calendario (CSP), análisis opcional.

### 6.2 Fuera del alcance (por ahora)

- **Pagos, pasarelas, facturación, planes y suscripciones comerciales** (`DEC-028`).
- Validación con usuarios reales y métricas de negocio.
- Juego de ajedrez en línea, análisis de partidas como producto, matchmaking.
- Homologación oficial ante FIDE (envío de ratings oficiales, normas de título).
- Apps móviles nativas (se contempla PWA).
- SSO corporativo y white-label.
- Integración con federaciones externas.

### 6.3 Capacidades del sistema objetivo (verificación de completitud, 2026-10-25)

| Capacidad | Historias | Estado |
|---|---|---|
| Cuentas: registro, login, 2FA, sesiones, verificación y recuperación | US-022, US-027, US-107 | Cubierta |
| Roles por defecto, solicitudes y cambio directo | US-028, US-029 | Cubierta |
| Permisos asignables a roles (estilo Spatie) | US-024, US-108 | Cubierta |
| Borrado lógico, papelera, archivo y anonimización | US-109 | Cubierta |
| Consola de plataforma | US-110 | Agregada en esta revisión |
| Derechos del titular (Ley 1581) | US-111 | Agregada en esta revisión |
| Centro de avisos en la app | US-112 | Agregada (varias reglas decían "se avisa" sin mecanismo) |
| Directorio público de torneos | US-113 | Agregada |
| Métricas y alertas | US-114 | Agregada (`ARCHITECTURE.md` §15 no tenía historia) |
| Multi-tenant y RLS | US-023, US-025 | Cubierta |
| Reglas como datos y reglamento ASCUN | US-010, `SOURCES.md` | Cubierta; falta el reglamento vigente (`OQ-001`) |
| Motor: todos contra todos, Suizo, desempates, equipos, eliminación | US-012..US-020, US-042 | Cubierta; eliminación bloqueada por `OQ-013` |
| Operación del torneo: rondas, resultados, correcciones, byes, cierres | US-030..US-041 | Cubierta |
| Campeonato, ranking institucional, premiación, reclamaciones | US-100, US-101, US-103 | Cubierta |
| Ratings: importación y Elo interno | US-019, US-104 | Cubierta |
| Event store, proyecciones y auditoría | US-045..US-048 | Cubierta |
| Tiempo real | US-050..US-054 | Cubierta |
| Emails, suscripciones y PDF | US-060..US-065 | Cubierta |
| Interfaz y UX | US-066..US-079 | Cubierta |
| Interoperabilidad: TRF, CSV, PGN | US-080..US-082 | Cubierta |
| Offline, PWA, tablero, análisis, calendario | US-090..US-094 | Cubierta |
| Calidad, documentación, respaldos, seguridad, despliegue y pruebas | US-095..US-099, US-105, US-106 | Cubierta |
| Registro de asistencia (*check-in*) por ronda, opcional por torneo | US-115 | Cubierta (`DEC-068`) |
| 2FA obligatorio para `platform_admin` | US-107 | Cubierta (`OQ-031`) |
| Notificaciones *push* y SSO institucional (Google/Microsoft) | — | Fuera de alcance por ahora; Passport deja abierta la puerta al SSO |

## 7. Contexto: Colombia y ASCUN

- Contexto geográfico: Colombia. Zona horaria `America/Bogota`, locale `es-CO` (`DEC-025`).
- Reglas de competencia: las de **ASCUN Deportes** (Asociación Colombiana de Universidades) para ajedrez, tanto individual como por equipos *según lo que ASCUN defina* (`DEC-027`).
- **Estado (2026-10-25):** se encontró el reglamento técnico de ajedrez de ASCUN de 2012 (`SRC-01`): Suizo, Clásico y Blitz por rama, W.O. sin tiempo de espera y ranking institucional "todo evento". Está desactualizado (en 2025 ya existe la modalidad Rápido, `SRC-03`), así que el `RuleSet` de ASCUN sigue en `DRAFT` (`BR-GEN-04`) hasta tener la versión vigente (`OQ-001`).
- **Estructura de ASCUN** (`SRC-02`): la competencia se organiza por nodos regionales, y la fase regional clasifica a los Juegos Universitarios Nacionales. La inscripción y la verificación de elegibilidad ocurren en la plataforma propia de ASCUN; este sistema solo registra la marca de verificación (`DEC-048`).
- Protección de datos personales: Ley 1581 de 2012 (Habeas Data) y Decreto 1377 de 2013 (`SRC-10`); sin revisión jurídica, riesgo aceptado (`DEC-029`, `DEC-065`).

## 8. Restricciones y supuestos

| Tipo | Detalle |
|---|---|
| Equipo | Una persona + IA (Claude Code, plan Pro). Implica historias pequeñas, contexto acotado y mucha documentación explícita. |
| Objetivo | Demostrar complejidad técnica, no obtener ingresos. |
| Presupuesto de infraestructura | Demo local con Docker y plan de despliegue documentado (Vercel + Render + Neon), sin despliegue obligatorio (`DEC-050`). |
| Aplicación previa | La persona ya tiene una app con BE y FE independientes (campeonatos universitarios, salas en vivo, PDF y emails). **No se reutiliza:** se empieza limpio (`OQ-002`). |
| Tamaño esperado | Torneos de decenas a cientos de jugadores; miles de espectadores como meta técnica de pruebas de carga (objetivos en `ARCHITECTURE.md` §17). |
| Supuesto | Los torneos son presenciales con árbitro; el sistema registra resultados, no moderación de partidas. |

## 9. Criterios de éxito (técnicos y verificables)

Se consideran logros del proyecto **cuando existan los artefactos que los demuestran**:

| # | Criterio | Evidencia |
|---|---|---|
| S1 | El motor de emparejamiento cumple los invariantes en miles de torneos aleatorios | Suite de propiedades verde en CI (`INV-P-*`) |
| S2 | Desempates calculados correctamente en casos dorados | Casos dorados con valores verificados a mano / con herramienta de referencia |
| S3 | Con un `RuleSet` FIDE, el emparejamiento coincide con un motor de referencia | Comparación automatizada con bbpPairings (`US-016`, `SRC-08`) |
| S4 | Las proyecciones reconstruidas desde eventos igualan las vivas | Prueba `INV-E-3` |
| S5 | El sistema soporta N espectadores en vivo dentro del presupuesto de latencia | Informe de k6 (`US-054`) |
| S6 | Ninguna acción cruza el aislamiento entre organizaciones | Matriz de pruebas de autorización + RLS (`US-024`, `US-025`) |
| S7 | Un torneo completo se simula de punta a punta sin intervención | Simulador (`US-095`) |
| S8 | El árbitro puede trabajar sin conexión y sincronizar sin perder resultados | Pruebas de sincronización (`US-091`) |
| S9 | Todo cambio de regla o decisión está documentado | ADRs y `CORE-BUSINESS.md` actualizados |
| S10 | El plan de pruebas se ejecutó y cumple sus criterios de salida | `TEST-PLAN.md` + informe final (`US-106`) |
| S11 | Existe un plan de despliegue revisado | `ARCHITECTURE.md` §16.5 (`US-105`) |

## 10. Modelo de producto futuro (no implementar ahora)

Documentado solo para no cerrar puertas en el diseño (`DEC-028`):

- Planes por organización (gratis / pro / federación).
- Inscripciones con cobro y comisión por transacción.
- Patrocinadores en vistas en vivo y PDF.
- Premium para espectadores (notificaciones avanzadas, estadísticas históricas).
- Overlays para streaming; API pública.

Implicación de diseño actual: `organization_id` en todo; límites de uso configurables; sin acoplar el dominio a pagos.

## 11. Hoja de ruta (resumen)

| Fase | Contenido | Resultado demostrable |
|---|---|---|
| F0 | Especificación y cimientos (monorepo, CI, Docker, reglas del RuleSet) | Repo que compila, lintea y prueba en CI |
| F1 | Núcleo de dominio puro (puntajes, desempates, round-robin, Suizo, equipos, Elo/TPR) | Suite de propiedades + benchmarks |
| F2 | Backend de torneos (identidad, tenants, authz, event store, proyecciones) | API con e2e sobre BD real |
| F3 | Tiempo real, notificaciones, reportes | Prueba de carga + emails + PDF |
| F4 | Frontend completo y UX | Demo con simulador de torneo |
| F5 | Interoperabilidad y calidad demostrable | Exportaciones, informe de complejidad |
| F6 | Diferenciadores (offline, scheduler, análisis) | Árbitro offline con sincronización |

El detalle, las dependencias y las **rebanadas verticales** (entregas de punta a punta) están en `USER-STORIES.md`.

## 12. Riesgos del producto

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Reglamento ASCUN no disponible o ambiguo | Bloquea `RuleSet` oficial | Edición 2012 encontrada (`SRC-01`); `RuleSet` parametrizable en `DRAFT`; pedir la versión vigente (`OQ-001`) |
| Suizo FIDE difícil de implementar bien | Emparejamientos incorrectos | Propiedades + motor de referencia + implementación incremental (`BR-PAIR-10`) |
| Alcance excesivo para 1 persona + IA | Proyecto sin terminar | Rebanadas verticales entregables; priorización MUST/SHOULD/COULD |
| Deriva de documentación vs. código | La IA implementa mal | Reglas de mantenimiento en `README.md` y `AI-WORKFLOW.md` |
| Datos personales de estudiantes | Riesgo legal/privacidad | Minimización (`BR-PRIV-*`), consentimiento (`BR-NOTIF-01`) |
| Licencias de librerías (tablero, motores de referencia) | Restricciones de uso futuro | Revisión de licencia antes de adoptar (`OQ-018`) |
