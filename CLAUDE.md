# CLAUDE.md — Reglas para la IA en este repositorio

> Léelo completo al inicio de cada sesión. Es corto a propósito. El detalle vive en `docs/`.

## 1. Qué es este proyecto

Plataforma multi-organización para **operar torneos de ajedrez universitarios en Colombia** (reglas de ASCUN Deportes): emparejamientos, desempates, ratings, torneos individuales y por equipos, resultados en vivo, reportes PDF y emails a suscriptores.

**No es un juego de ajedrez.** Es un sistema de cálculo y arbitraje: su valor está en que los resultados, emparejamientos y clasificaciones sean **correctos, reproducibles y auditables**.

Objetivo actual: demostrar **profundidad técnica**. Sin pagos, sin facturación, sin validación con usuarios. Equipo: 1 persona + IA.

## 2. Stack (resumen; fuente de verdad: `docs/ARCHITECTURE.md`)

- Node + **TypeScript estricto** en todo el monorepo (pnpm workspaces), con módulos **ESM** (`DEC-071`).
- Backend: **NestJS** sobre Express, PostgreSQL (Prisma + SQL crudo para el event store), Redis, BullMQ.
- Frontend: **Vue 3** + Vite + Pinia + TanStack Query + shadcn-vue (Reka UI) + Tailwind.
- Núcleo de dominio en **paquetes puros** (`packages/*`), sin Nest, sin base de datos, sin I/O.
- Eventos como fuente de verdad para el torneo (event sourcing) + proyecciones de lectura (CQRS).
- Autenticación estilo Fortify (Passport + JWT), roles y permisos estilo Spatie (CASL), contratos de API con oRPC.

## 3. Reglas absolutas

1. **NUNCA inventes reglas de ajedrez, de ASCUN ni de FIDE.** Si una regla no está en `docs/CORE-BUSINESS.md` como confirmada, no la asumas: déjala como parámetro del `RuleSet`, márcala `TODO(OQ-xxx)` y pregunta. Lo marcado `[PENDIENTE-ASCUN]` o `[VERIFICAR]` no es información confiable; lo marcado `[ASCUN-2012]` es real pero puede no estar vigente (solo va en presets `DRAFT`). Las fuentes externas están en `docs/SOURCES.md`.
2. **El dominio es puro y determinista.** Sin `Date.now()`, `Math.random()`, acceso a red, disco ni base de datos dentro de `packages/*`. La aleatoriedad usa un PRNG con semilla que se guarda en el evento.
3. **TypeScript estricto.** Prohibido `any`, `// @ts-ignore` y `as unknown as X` sin un comentario que justifique y referencie una issue. Sin `!` (non-null assertion) salvo en tests.
4. **Los puntos se guardan como enteros en medios puntos** (1 punto = 2). Nunca `float` para puntajes ni desempates (ver `BR-NUM-01`, `BR-NUM-02`).
5. **Los eventos son inmutables.** Nunca `UPDATE`/`DELETE` sobre la tabla de eventos. Las correcciones son eventos compensatorios (`BR-AUD-01`).
6. **Multi-tenant siempre.** Toda tabla con datos de organización lleva `organization_id` y RLS. Toda consulta pasa por el contexto de tenant.
7. **La autorización se valida en el servidor**, con condiciones sobre el recurso (no solo el rol). La UI solo oculta botones.
8. **Tests primero** para dominio: propiedades (`fast-check`) y casos dorados antes o junto a la implementación. Una historia no termina sin sus pruebas.
9. **Una historia por sesión.** Cambios pequeños y verificables. Las historias L y XL traen su **plan de división**: una parte por sesión. Si el alcance crece, para y propón dividir.
10. **No agregues dependencias nuevas** sin justificarlo en un ADR (`docs/adr/`) o en la descripción de la historia.
11. **No dejes la documentación desactualizada.** Si cambias una decisión o regla, actualiza el documento fuente en el mismo cambio.
12. **Idioma:** identificadores de código y mensajes de commit en **inglés**; documentación y textos de UI en **español** (con i18n). Ver `docs/CONVENTIONS.md`.
13. **Nada se borra físicamente.** El borrado es lógico y solo lo hace el `platform_admin` (`docs/AUTHORIZATION.md` §10). Única excepción: los datos técnicos que vencen (claves de idempotencia, tokens vencidos) los purga la cola `maintenance` con su propio rol de base de datos (`DEC-078`). Los permisos salen del catálogo (§4.1), nunca de `if (role === …)`.

## 4. Cómo trabajar (bucle por historia)

1. Identifica la historia (`US-xxx`) en `docs/USER-STORIES.md` y abre su archivo en `docs/stories/`.
2. Lee **solo** lo que la historia referencia (reglas `BR-*`, decisiones `DEC-*`, invariantes `INV-*`). Mapa abajo.
3. Si la historia está `BLOCKED` por una pregunta abierta (`OQ-*`), **no improvises**: dilo y propón avanzar con lo desbloqueado.
4. Escribe/ajusta las pruebas que expresan los criterios de aceptación.
5. Implementa en el paquete o módulo correcto respetando la dirección de dependencias.
6. Ejecuta lint, typecheck y tests del alcance afectado. Corrige hasta que pasen.
7. Actualiza documentación afectada y el estado de la historia.
8. Cierra con un resumen breve: qué cambió, qué verificaste, qué queda pendiente.

Detalle del flujo, plantillas de prompts y criterios de revisión: `docs/AI-WORKFLOW.md`.

## 5. Mapa de documentos (qué leer según la tarea)

| Si la tarea toca… | Lee |
|---|---|
| Cualquier historia | su archivo en `docs/stories/` + `docs/CONVENTIONS.md` |
| Emparejamientos, desempates, puntajes, ratings, equipos | `docs/CORE-BUSINESS.md` + `docs/TESTING.md` (invariantes) |
| Estructura, módulos, base de datos, API, eventos | `docs/ARCHITECTURE.md` |
| Autenticación, roles, permisos, borrado, tenants | `docs/AUTHORIZATION.md` |
| Pantallas, componentes, atajos, tema | `docs/UI-UX.md` + `docs/SCREENS.md` (rutas y flujos) |
| Pruebas | `docs/TESTING.md` (estrategia) + `docs/TEST-PLAN.md` (plan de la entrega) |
| Fuentes externas (ASCUN, FIDE, licencias, compatibilidad) | `docs/SOURCES.md` |
| Seguridad, datos personales, nuevas entradas de datos | `docs/THREAT-MODEL.md` |
| Umbrales de calidad y qué bloquea | `CONSTRAINTS.md` |
| Términos del dominio | `docs/GLOSSARY.md` |
| Dudas de reglas o alcance | `docs/OPEN-QUESTIONS.md` |
| Visión y alcance del producto | `docs/PRODUCT.md` |
| Qué está implementado y qué falta | `docs/PROGRESS.md` |

## 6. Comandos

Los comandos existen desde `US-001` (pnpm 12 por Corepack, Node 24). Los que dependen de historias posteriores lo dicen al ejecutarse. Avance real: `docs/PROGRESS.md`.

```
pnpm install
pnpm lint            # ESLint en todos los paquetes
pnpm typecheck       # tsc --noEmit en todos los paquetes
pnpm test            # unitarias (Vitest) de todos los paquetes
pnpm test:e2e        # e2e de API (Testcontainers) y UI (Playwright)
pnpm verify:fast     # control rápido (≤ 90 s) sobre lo que tocó el cambio (CONSTRAINTS.md §5)
pnpm check:floor     # guardia de piso sobre el diff (CONSTRAINTS.md §1)
pnpm verify          # lint + typecheck + unitarias + propiedades + contrato + componentes
pnpm verify:full     # verify + humo + integración + e2e (lo que corre la CI en cada PR)
pnpm test:trace      # matriz criterio de aceptación → prueba (TEST-PLAN.md §6.2.1)
pnpm test:report     # informe de pruebas desde los resultados JSON y el manifiesto
pnpm test:ci         # pruebas con cobertura y reportes JSON/JUnit (lo que usa la CI)
pnpm test:manifest   # reports/run-manifest.json (commit, versiones, semillas)
pnpm test:smoke      # casos de humo (TC-080…)
pnpm test:nightly    # 5 000 ejecuciones por propiedad con semilla aleatoria + benchmarks completos
pnpm bench           # benchmarks con presupuesto en modo completo (pnpm test ya los corre en modo reducido)
pnpm dev:infra       # infraestructura local (Docker o Postgres nativo); infra:check la comprueba
pnpm db:migrate      # crea y aplica una migración SQL en local (prisma migrate dev; nunca db push)
pnpm db:deploy       # aplica las migraciones pendientes (prisma migrate deploy, rol de migraciones)
pnpm db:status       # estado de las migraciones
pnpm secrets         # gitleaks sobre el diff (--all: todo el historial)
pnpm build
pnpm dev             # levanta api + web con docker compose para dependencias
```

Si un comando no existe todavía, no lo inventes en otro lugar: impleméntalo según `US-001`/`US-003`/`US-004`.

**Lee `CONSTRAINTS.md` antes de escribir código. No lo debilites para que un cambio pase.** Al terminar cada tarea corre `pnpm verify:fast`; antes de abrir un PR, `pnpm verify`.

## 7. Definition of Done (resumen)

- Criterios de aceptación cubiertos por pruebas automáticas que pasan, etiquetadas `[US-nnn:ACk]` (`pnpm test:trace`).
- Lint + typecheck sin errores ni supresiones nuevas.
- Sin cambios fuera del alcance de la historia.
- Documentación y estado de la historia actualizados.
- Para dominio: invariantes `INV-*` relevantes probados con propiedades.
- Para API: OpenAPI y contratos (`packages/contracts`) actualizados.
- Para UI: estados de carga/vacío/error, i18n, teclado y contraste verificados.

Versión completa: `docs/AI-WORKFLOW.md` §6.

## 8. Cuándo parar y preguntar

- La historia depende de una regla `[PENDIENTE-ASCUN]`.
- Dos documentos se contradicen.
- Un cambio requiere tocar más de un paquete de dominio no previsto.
- Necesitas una dependencia, un servicio externo o una decisión de infraestructura nueva.
- Hay riesgo de pérdida de datos o de romper la inmutabilidad de eventos.
