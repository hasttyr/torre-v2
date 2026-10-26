# Torre — Plataforma de torneos de ajedrez universitarios

Documentación completa para implementar una **plataforma de gestión y arbitraje de torneos de ajedrez universitarios (Colombia, reglas ASCUN)** con la mayor parte del trabajo de implementación hecha por IA (Claude Code) y supervisada por una persona.

Estado del paquete: **v0.3 — especificación lista para implementar** (auditoría de preparación del 2026-10-26; ver "Qué falta confirmar").

## Cómo usar este repositorio

Esta carpeta **es** el monorepo (`DEC-063`): la documentación ya está en su sitio y `US-001` crea el código al lado.

1. Lee `CLAUDE.md`, `CONSTRAINTS.md` y `docs/HANDOFF.md`.
2. Revisa `docs/OPEN-QUESTIONS.md`: lo que sigue abierto depende de ASCUN y no bloquea el arranque.
3. Implementa siguiendo `docs/USER-STORIES.md` (orden, rebanadas verticales y dependencias). El avance real está en `docs/PROGRESS.md`.

### Puesta en marcha

Requisitos: Node 24 (`.nvmrc`), Git y Corepack (`corepack enable pnpm`, o `corepack enable --install-directory ~/bin pnpm` sin permisos de administrador). Docker es opcional pero recomendado.

```
pnpm install
cp .env.example .env
pnpm dev:infra        # levanta la infraestructura local
pnpm infra:check      # comprueba cada servicio
pnpm verify           # lint, tipos, límites y pruebas
```

### Infraestructura local

| Servicio | Imagen (Docker) | Puerto (variable en `.env`) |
|---|---|---|
| PostgreSQL 18 con `pg_trgm` y `unaccent`; roles `torre_app` y `torre_migrator` | `postgres:18` | 5432 (`POSTGRES_PORT`) |
| Redis (Valkey 8, `noeviction`, AOF) | `valkey/valkey:8.1.10` | 6379 (`REDIS_PORT`) |
| Mailpit: SMTP y bandeja web | `axllent/mailpit:v1.31.5` | 1025 (`MAILPIT_SMTP_PORT`) y 8025 (`MAILPIT_UI_PORT`) |
| S3 local (RustFS, `ADR-0003`) y su consola; *bucket* `torre-dev` | `rustfs/rustfs:1.0.1` | 9000 (`S3_PORT`) y 9001 (`S3_CONSOLE_PORT`) |

- Con Docker, `pnpm dev:infra` usa `docker-compose.yml` y `pnpm dev:infra:down` lo detiene.
- Sin Docker (modo nativo), `pnpm dev:infra` levanta solo PostgreSQL con los binarios instalados en el equipo (`PG_BIN` o `C:\Program Files\PostgreSQL\<versión>\bin`), con los datos en `.tools/infra/postgres`. Si el puerto 5432 está ocupado, cambia `POSTGRES_PORT` y el puerto de las URL de la base en `.env`.
- Todas las credenciales son de desarrollo y están marcadas como tales.

## Orden de lectura recomendado (humano)

| # | Documento | Para qué |
|---|---|---|
| 1 | `docs/PRODUCT.md` | Finalidad, alcance, usuarios, criterios de éxito |
| 2 | `docs/CORE-BUSINESS.md` | Reglas duras del dominio: puntos, emparejamientos, desempates, ratings, equipos |
| 3 | `docs/ARCHITECTURE.md` | Tecnologías, estructura, eventos, datos, API, tiempo real, decisiones |
| 4 | `docs/AUTHORIZATION.md` | Autenticación (estilo Fortify), roles y permisos (estilo Spatie), solicitudes de rol, borrado lógico |
| 5 | `docs/UI-UX.md` | Librerías de UI, tokens, atajos, qué funciones de UX sí y cuáles no |
| 6 | `docs/TESTING.md` | Estrategia de pruebas e invariantes verificables |
| 6b | `docs/TEST-PLAN.md` | Plan de pruebas formal de la entrega (IEEE 829 / ISO 29119-3) |
| 7 | `docs/CONVENTIONS.md` | Código, Git, API, errores, i18n |
| 8 | `docs/USER-STORIES.md` + `docs/stories/` | Backlog completo por épicas |
| 9 | `docs/AI-WORKFLOW.md` | Cómo trabajar con la IA sin que falle nada |
| 10 | `docs/OPEN-QUESTIONS.md` | Preguntas pendientes y a quién bloquean |
| — | `docs/GLOSSARY.md` | Vocabulario ES ↔ EN usado en código |
| — | `CONSTRAINTS.md` | Barra de calidad: piso y controles con número; todo bloquea |
| — | `docs/THREAT-MODEL.md` | Modelo de amenazas (STRIDE) y clasificación de datos |
| — | `docs/SCREENS.md` | Pantallas, rutas y flujos por rol |
| — | `docs/requests/SOLICITUD-ASCUN.md` | Solicitud formal de información a ASCUN (la envía el responsable) |
| — | `docs/SOURCES.md` | Fuentes externas (ASCUN, FIDE, licencias, legal) con versión y fecha de consulta |
| — | `docs/HANDOFF.md` | Estado para la siguiente sesión (se sobrescribe al cerrar cada sesión) |
| — | `docs/adr/`, `docs/templates/` | ADR, plantillas de historia y checklist de PR |

## Orden de lectura para la IA

`CLAUDE.md` → (historia) `docs/stories/EP-xx-*.md` → solo las reglas/decisiones que esa historia cita. Evita cargar todo: gasta contexto sin aportar.

## Convenciones de estado y marcas (úsalas en todo el repo)

| Marca | Significado |
|---|---|
| `[DECIDIDO]` | Lo dijo explícitamente la persona responsable del proyecto |
| `[PROPUESTO]` | Valor por defecto recomendado, **aún no confirmado**; se puede cambiar |
| `[ABIERTO]` | Sin decisión; hay una pregunta en `OPEN-QUESTIONS.md` |
| `[PENDIENTE-ASCUN]` | Depende del reglamento de ASCUN vigente, que no se ha podido consultar |
| `[ASCUN-2012]` | Valor del reglamento de ASCUN de 2012 (`SRC-01`): real, pero puede no estar vigente; solo en presets `DRAFT` |
| `[VERIFICAR]` | Dato externo (FIDE, legal, proveedor) aún no transcrito o confirmado en la fuente oficial (`docs/SOURCES.md`); contrastarlo antes de implementarlo |

## Esquema de identificadores

| Prefijo | Qué es | Dónde se define |
|---|---|---|
| `DEC-nnn` | Decisión técnica o de producto | `docs/ARCHITECTURE.md` §20 |
| `BR-ÁREA-nn` | Regla de negocio | `docs/CORE-BUSINESS.md` (las de autenticación, roles y borrado — `BR-AUTH-*`, `BR-ROLE-*`, `BR-DEL-*` — en `docs/AUTHORIZATION.md`) |
| `INV-X-n` | Invariante verificable por pruebas | `docs/TESTING.md` §4 |
| `GV-nnn` | Caso dorado verificado a mano | `docs/CORE-BUSINESS.md` §18 |
| `SRC-nn` | Fuente externa | `docs/SOURCES.md` |
| `TC-nnn` | Caso de prueba del plan de la entrega | `docs/TEST-PLAN.md` §13 |
| `EP-nn` | Épica | `docs/USER-STORIES.md` |
| `US-nnn` | Historia de usuario | `docs/stories/EP-*.md` |
| `OQ-nnn` | Pregunta abierta | `docs/OPEN-QUESTIONS.md` |
| `ADR-nnnn` | Registro de decisión de arquitectura | `docs/adr/` |
| `VS-n` | Rebanada vertical (entrega de punta a punta) | `docs/USER-STORIES.md` |
| `SCR-nn` | Pantalla | `docs/SCREENS.md` |
| `RR-n` | Riesgo residual de seguridad | `docs/THREAT-MODEL.md` §6 |

## Qué falta confirmar (honestidad sobre el estado)

- **Reglamento de ASCUN:** se encontró el reglamento técnico de ajedrez de **2012** (`SRC-01`) y el reglamento regional 2025 (`SRC-02`). Sus valores se usan como `[ASCUN-2012]` en presets `DRAFT`. Faltan la versión vigente (`OQ-001`) y la lista real de desempates (`OQ-023`); lo demás sigue como **parámetros de un `RuleSet`**, no como código fijo.
- **Reglas de FIDE:** contrastadas con el Handbook vigente (Dutch C.04.3 del 2026-02-01, Tie-Break C.07 del 2026-03-01, Rating B.02 con la enmienda del 2025-10-01; `docs/SOURCES.md`). Los textos oficiales se leyeron completos el 2026-10-26 y lo que usa la plataforma está resumido o transcrito en `docs/SOURCES.md` §5. El "oponente virtual" ya no existe en FIDE.
- **App anterior:** no se reutiliza; se empieza limpio (`OQ-002` resuelta).
- **Decisiones técnicas:** todas confirmadas por el responsable el 2026-10-26 (`ARCHITECTURE.md` §20). Lo que sigue `[VERIFICAR]` es información externa por contrastar en su fuente.
- **Versiones de librerías:** no se fijan aquí. Al crear el repo se verifican las últimas estables y se registran en `ADR-0001`.

## Cómo verificar los resultados

Cuando exista el código (`US-001`, `US-004`), cualquier persona puede comprobar los resultados de cualquier versión desde su commit etiquetado (`vX.Y.Z`):

1. Requisitos: Docker, Node según `.nvmrc` y `corepack enable`.
2. `pnpm install --frozen-lockfile` y luego `pnpm verify:full`.
3. Comparar con el informe `docs/reports/<versión>/test-summary.md`, el manifiesto de ejecución y la matriz de trazabilidad adjuntos al release.

Detalle: `docs/TEST-PLAN.md` §6.2.

## Mantenimiento de la documentación

- Un cambio de decisión actualiza la fila de `DEC-nnn` y, si es relevante, genera un ADR.
- Un cambio de regla actualiza `BR-*` y los casos dorados de `docs/TESTING.md`.
- Una historia terminada cambia su `Estado` a `DONE` y enlaza el PR/commit.
- Este paquete es **fuente de verdad**: si el código y el documento difieren, se arregla uno de los dos en el mismo cambio.
