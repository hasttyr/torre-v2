# TEST-PLAN.md — Plan maestro de pruebas del sistema

> Plan de pruebas formal según la estructura de **IEEE 829** y **ISO/IEC/IEEE 29119-3**. La estrategia general, los invariantes y las convenciones están en `TESTING.md`; este documento fija **qué se prueba, cómo, con qué criterio se aprueba cada versión y cómo un tercero puede comprobar los resultados**. No fija fechas: los tiempos los gestiona el responsable del proyecto.

## 1. Identificación

| Campo | Valor |
|---|---|
| Identificador | `TP-MASTER` |
| Versión | 2.1 (borrador) |
| Fecha | 2026-10-26 |
| Proyecto | Plataforma de torneos de ajedrez universitarios (ASCUN) |
| Alcance | Sistema completo: todas las épicas de `USER-STORIES.md` |
| Responsable | Responsable del proyecto (1 persona) con Claude Code como asistente |
| Aprobación | Responsable del proyecto (§15) |

### Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-10-25 | Primera versión, centrada en una entrega MVP |
| 1.1 | 2026-10-25 | Regresión, verificabilidad, niveles de humo, contrato, componentes, aceptación y exploratoria |
| 1.2 | 2026-10-25 | Roles: cuenta espectador, cambio directo y solicitudes de rol |
| 2.0 | 2026-10-25 | Plan maestro del sistema completo, sin fechas ni MVP; casos para todas las historias; autenticación estilo Fortify, permisos estilo Spatie, borrado lógico y oRPC |
| 2.1 | 2026-10-26 | Parámetros de seguridad (`DEC-062`), check-in (`US-115`), navegadores (`DEC-066`) y barra de calidad (`DEC-064`, `CONSTRAINTS.md`) |

## 2. Introducción y alcance

**Propósito:** demostrar con evidencia automatizada que la plataforma calcula emparejamientos, puntajes, desempates y clasificaciones **correctos, reproducibles y auditables**, con aislamiento entre organizaciones, autorización en el servidor, borrado lógico y protección de datos personales.

**Principio de verificabilidad.** Todo resultado que se reporte debe poder:
1. **Re-ejecutarse** con un comando desde el commit etiquetado de la versión (§6.2.5).
2. **Rastrearse** hasta el requisito que prueba: historia y criterio de aceptación, regla `BR-*` o invariante `INV-*` (§6.2.1).
3. **Contrastarse** con un resultado esperado de fuente independiente del código: cálculo manual, `SRC-*` o motor de referencia (§6.2.3).
4. **Respaldarse** con artefactos guardados: resultados, cobertura, trazas, semillas y manifiesto (§6.2.4).

**Alcance:** todas las épicas (EP-00 a EP-09). Cada **versión** (`vX.Y.Z`) incluye las historias que el responsable decida; los criterios de salida (§7) se aplican a las historias incluidas en ella.

**Referencias:** `TESTING.md`, `CORE-BUSINESS.md` (reglas `BR-*`, casos dorados `GV-*`), `AUTHORIZATION.md`, `ARCHITECTURE.md` §16.5 y §17, `SOURCES.md`, `USER-STORIES.md`.

## 3. Ítems de prueba

| Ítem | Descripción |
|---|---|
| `@torre/core` | Tipos base, medios puntos, PRNG, hash canónico |
| `@torre/rules` | Esquema `RuleSet`, validaciones, presets |
| `@torre/standings` | Puntajes, desempates, equipos, ranking institucional |
| `@torre/pairing` | Todos contra todos, Suizo Dutch, matching, eliminación |
| `@torre/ratings` | Elo interno, TPR y ARO |
| `@torre/tournament` | Decider (`evolve`/`decide`) y esquemas de eventos |
| `@torre/scheduler` | Programador de calendario por restricciones |
| `@torre/contracts` | Contratos oRPC, esquemas Zod, catálogo de permisos y códigos de error |
| `@torre/testing` | Simulador y generadores (herramienta de prueba) |
| `apps/api` | API NestJS: autenticación, autorización, event store, proyecciones, RLS, borrado lógico, tiempo real, colas |
| `apps/web` | SPA Vue |
| `tools/` | Scripts de verificación (`test:trace`, `test:report`, manifiesto) |

La versión de cada dependencia queda en `ADR-0001` y la de cada ejecución en su manifiesto (§14.3).

## 4. Funcionalidades a probar

| Área | Historias | Reglas / invariantes | Casos |
|---|---|---|---|
| Cimientos, configuración y capa transversal | US-001..US-009, US-117 | `ARCHITECTURE.md` §3–§6 | TC-043..TC-046, TC-054, TC-063, TC-064, TC-080..TC-083, TC-209 |
| Dominio base y reglas | US-010..US-014, US-021 | `BR-NUM-*`, `BR-GEN-*`, `BR-TIE-*`, `INV-S-*`, `INV-RR-*` | TC-001..TC-012 |
| Suizo y matching | US-015..US-017 | `BR-PAIR-*`, `INV-P-*` | TC-013..TC-016, TC-061, TC-130, TC-131 |
| Eliminación, ratings y equipos | US-018..US-020 | `BR-KO-01`, `BR-RAT-*`, `BR-TEAM-*`, `INV-R-*`, `INV-TM-*` | TC-132..TC-135 |
| Decider del torneo | US-042 | `BR-LIFE-*`, `INV-S-4`, `INV-E-5`, `INV-E-6`, `INV-PRIV-1` | TC-017..TC-020 |
| Autenticación estilo Fortify | US-022, US-027, US-107 | `BR-AUTH-*`, `INV-A-*` | TC-036, TC-104, TC-152, TC-153, TC-207 |
| Organizaciones, roles, permisos y RLS | US-023..US-026, US-028, US-029, US-108, US-116 | `BR-ROLE-*`, `INV-T-*` | TC-034, TC-035, TC-047, TC-057, TC-105..TC-108, TC-150, TC-151, TC-173, TC-208 |
| Borrado lógico, consola y derechos del titular | US-109..US-111 | `BR-DEL-*`, `BR-PRIV-*`, `INV-D-*` | TC-174..TC-178 |
| Gestión del torneo | US-030..US-041, US-115 | `BR-REG-*`, `BR-SCORE-*`, `BR-AUD-*`, `BR-WD-*`, `BR-TEAM-*` | TC-037..TC-042, TC-048, TC-049, TC-100, TC-154..TC-156, TC-206 |
| Campeonato, premiación, reclamaciones, vista del jugador, ratings importados | US-100..US-104 | `BR-CHAMP-*`, `BR-PRZ-*`, `BR-AUD-07`, `INV-C-*` | TC-136, TC-137, TC-171, TC-172, TC-180 |
| Event store, proyecciones y auditoría | US-045..US-048 | `INV-E-*` | TC-030..TC-033, TC-101..TC-103, TC-157, TC-158 |
| Tiempo real | US-050..US-054 | `BR-LIVE-*`, `INV-L-*` | TC-159, TC-160, TC-181, TC-182, TC-200 |
| Suscripciones, emails, PDF y avisos | US-060..US-065, US-112 | `BR-NOTIF-*`, `BR-RPT-*`, `INV-N-*` | TC-161..TC-166, TC-179 |
| Interfaz y UX | US-066..US-079, US-113 | `UI-UX.md` | TC-050..TC-056, TC-066, TC-082, TC-167, TC-183..TC-190, TC-193 |
| Interoperabilidad | US-080..US-082 | — | TC-168..TC-170 |
| Diferenciadores | US-090..US-094 | `INV-O-1` | TC-138, TC-191, TC-192, TC-194 |
| Calidad y operación | US-095..US-099, US-105, US-106, US-114 | — | TC-021, TC-070, TC-090..TC-092, TC-201..TC-205 |

## 5. Funcionalidades que no se prueban

| Qué no se prueba | Razón |
|---|---|
| Pagos y facturación | Fuera del producto (`DEC-028`) |
| Usabilidad con usuarios reales | Sin validación con usuarios (`DEC-031`); se sustituye por la sesión exploratoria (TC-092) y el guion de aceptación (TC-091) |
| Homologación FIDE y envío de ratings oficiales | Fuera de alcance (`BR-RAT-06`) |
| Despliegue real en la nube | Opcional (`DEC-050`); el plan se revisa con TC-070 |
| Pentest externo | Fuera de alcance (`US-099`); hay pruebas de seguridad automatizadas y DAST opcional |

**Funcionalidades bloqueadas:** los casos de historias `BLOCKED` o `PARTIAL` (p. ej. TC-132, eliminación directa, `OQ-013`) se ejecutan cuando se resuelve su pregunta. Hasta entonces, la parte genérica se prueba y la bloqueada se reporta como "no ejecutable" con su `OQ-*`.

**Riesgo aceptado:** la política de rondas no jugadas `FIDE_C07_2026` queda en `NOT_IMPLEMENTED_POLICY` mientras no existan casos dorados de `SRC-07` revisados (`BR-TIE-03`); se usa `AS_AWARDED`.

## 6. Enfoque

| Nivel | Técnica | Herramienta | Criterio mínimo |
|---|---|---|---|
| Unitario de dominio | Casos dorados verificados a mano (`GV-*`), particiones de equivalencia y valores límite (0, 1, 2 jugadores; impares; todos empatan; retiros) | Vitest | Cada `BR-*` del alcance tiene al menos una prueba que la cita |
| Propiedades | Invariantes `INV-*` sobre datos aleatorios, con *shrinking* y semilla impresa | fast-check (`@fast-check/vitest`) | ≥ 200 casos por propiedad en PR (semilla fija); ≥ 5 000 torneos de noche (semilla aleatoria registrada) |
| Oráculo | Fuerza bruta para *n* ≤ 10 (`INV-P-6`); matching contra una implementación de referencia | Vitest | Coincidencia total |
| Basado en modelo | Secuencias aleatorias de comandos sobre el decider; igualdad tras *replay* | fast-check | Sin violaciones de invariantes |
| Referencia externa | Comparación con bbpPairings (`SRC-08`) | Arnés de `US-016` | Divergencias analizadas y documentadas |
| Contrato | Respuestas de la API contra los contratos oRPC de `@torre/contracts`; OpenAPI regenerado sin diferencias | Vitest + Supertest | 0 diferencias |
| Integración de API | PostgreSQL y Redis reales, rol de aplicación sin `BYPASSRLS` ni `DELETE` | Vitest + Supertest + Testcontainers | Todas las suites verdes |
| Seguridad | Matriz de permisos, IDOR, RLS, sesiones, 2FA, borrado lógico, inyección, enumeración | Vitest + Supertest; DAST opcional (OWASP ZAP) | 0 fallas |
| Componentes de UI | Componentes y composables aislados, API simulada con MSW | Vitest + Vue Test Utils + MSW | Estados de carga, vacío y error; teclado y etiquetas |
| Humo | El sistema arranca y responde: infraestructura, API, web y clon limpio | Scripts + Playwright | Verdes antes de cualquier suite de integración o e2e |
| E2E de UI | Flujos completos con datos del simulador | Playwright en Chromium, Firefox y WebKit, más perfiles móviles (`DEC-066`) | Flujos de §13 verdes |
| Aceptación | Criterios de aceptación con prueba etiquetada y verde; guion de demostración | `pnpm test:trace` + Playwright + ejecución manual grabada | 0 criterios sin prueba (TC-090); guion completo (TC-091) |
| Exploratoria | Sesión con *charter* | Manual | Ejecutada y registrada (TC-092) |
| Accesibilidad | Reglas automáticas | `@axe-core/playwright` | 0 violaciones críticas (WCAG 2.2 AA) |
| Rendimiento | Benchmarks reproducibles | `pnpm bench` | Objetivos de `ARCHITECTURE.md` §17 medidos y reportados |
| Carga | Conexiones WebSocket y comandos | k6 | p95 ≤ 1 s con 2 000 conexiones (TC-200) |
| Respaldo y restauración | Simulacro automatizado | Scripts | Proyecciones iguales tras restaurar (TC-203) |
| Mutación (opcional) | Mutantes sobre el dominio | Stryker | Objetivo ≥ 70 % en `standings` y `pairing` |
| Regresión visual (opcional) | Capturas de componentes en los tres temas | Playwright | Sin diferencias no aprobadas |
| Estática | Lint, typecheck, límites de dependencias, código sin uso, auditoría de dependencias y secretos | ESLint, tsc, dependency-cruiser, knip, `pnpm audit`, gitleaks | 0 errores; 0 hallazgos críticos |
| Revisión | Inspección con lista de verificación | Manual | Lista completa (TC-070, TC-202) |

Principio: los casos dorados **nunca** se obtienen ejecutando el código que se prueba (`TESTING.md` §1).

### 6.1 Estrategia de regresión

**Qué es la suite de regresión:** todas las pruebas automatizadas existentes, no un subconjunto elegido a mano. Incluye en particular:
- los casos dorados (`packages/*/test/golden/`);
- los contraejemplos reducidos que haya encontrado fast-check, guardados con su semilla en `packages/*/test/regressions/`;
- una prueba etiquetada `[DEF-nnn]` por cada defecto corregido (un defecto no se cierra sin su prueba de regresión);
- los benchmarks con umbral (fallan si empeoran más de 30 %);
- las capturas visuales, si se implementan.

**Cuándo se ejecuta:**

| Momento | Qué corre | Bloquea |
|---|---|---|
| *Pre-commit* | lint y formato de los archivos cambiados | El commit |
| Cada PR | lint, typecheck, unitarias, propiedades (200, semilla fija), contrato, componentes, integración, humo y e2e en Chromium | La fusión a `main` |
| Nocturno (`main`) | todo lo anterior + propiedades (5 000, semilla aleatoria registrada) + e2e en los navegadores definidos + benchmarks + axe + mutación (opcional) | Abre un defecto si falla |
| Candidata de versión (`vX.Y.Z-rc.N`) | regresión completa + ensayo en clon limpio (TC-083) + sesión exploratoria (TC-092) + guion de aceptación (TC-091) + carga si la versión toca el tiempo real (TC-200) | La etiqueta `vX.Y.Z` |

**Selección de pruebas:** se ejecuta **todo** en cada PR mientras la suite dure menos de 10 minutos. Si dura más, las unitarias se filtran por paquetes afectados (`pnpm --filter "...[origin/main]"`); integración, humo y e2e siempre corren completos.

**Congelamiento:** desde `vX.Y.Z-rc.1` solo entran correcciones de defectos, cada una con su prueba de regresión y una nueva ejecución completa.

### 6.2 Verificabilidad de los resultados

#### 6.2.1 Trazabilidad automática

- Cada prueba lleva **etiquetas** al inicio de su nombre (`TESTING.md` §10): criterio de aceptación `[US-nnn:ACk]`, caso del plan `[TC-nnn]`, regla `[BR-…]`, invariante `[INV-…]`, defecto `[DEF-nnn]`.
- `pnpm test:trace` (script en `tools/`, sin dependencias nuevas; lee los reportes JSON de Vitest y Playwright) cruza los criterios de aceptación de `docs/stories/*.md`, los casos de §13 y los resultados de la última ejecución. Produce `reports/traceability.md` (§14.6).
- **Regla de CI:** falla si una historia en `DONE` tiene algún criterio sin prueba etiquetada y verde, o si un caso de prioridad A cuyas historias estén todas en `DONE` no tiene prueba. Para las demás historias, el reporte solo informa.

#### 6.2.2 Reproducibilidad

- Cada ejecución genera `reports/run-manifest.json` (§14.3): commit, etiqueta, versiones de Node y pnpm, sistema operativo, *digests* de las imágenes de Docker, versiones de los navegadores, zona horaria, semillas de fast-check y estado de cada suite.
- Las imágenes de Testcontainers y del `docker-compose.yml` se fijan por etiqueta y su *digest* queda en el manifiesto.
- Datos: solo sintéticos, generados con semilla (`pnpm seed:demo --seed 2026`, `US-095`); los archivos de datos de prueba (CSV de ejemplo, casos dorados) están versionados.
- Para reproducir un fallo de una propiedad: `FC_SEED=<semilla> FC_PATH=<ruta> pnpm --filter <paquete> test` (la semilla y la ruta salen en el log y en el manifiesto).
- Pruebas sensibles al tiempo: zona horaria fija (`TZ=UTC` y una corrida con `America/Bogota`) y reloj controlado (relojes inyectados en el dominio; `clock` de Playwright en la UI; reloj falso para TOTP).

#### 6.2.3 Resultados esperados independientes

- Cada caso dorado es un JSON con `description`, `input`, `expected`, `source` (`manual`, `SRC-nn` con artículo o herramienta externa con versión), `verifiedBy`, `verifiedAt` y `rules` (`TESTING.md` §7).
- El responsable revisa y firma (en el informe de cada versión) los casos dorados nuevos y la matriz de permisos por defecto: son los oráculos humanos del proyecto.
- La comparación con bbpPairings reporta el porcentaje de coincidencia y el análisis de cada divergencia (`US-016`).

#### 6.2.4 Evidencia y conservación

| Evidencia | Formato | Dónde |
|---|---|---|
| Resultados de pruebas | JSON (Vitest y Playwright) y JUnit XML | Artefacto de CI |
| Cobertura | lcov + HTML + `coverage-summary.json` | Artefacto de CI |
| E2E | Reporte HTML de Playwright con trazas, capturas y video de las fallidas | Artefacto de CI |
| Propiedades | Semillas, número de ejecuciones y contraejemplos reducidos | Manifiesto + `test/regressions/` |
| Benchmarks y carga | JSON + informe en `docs/reports/<versión>/` | Artefacto + repositorio |
| Mutación (opcional) | Reporte HTML de Stryker | Artefacto de CI |
| Trazabilidad | `reports/traceability.md` | Artefacto de CI |
| Exploratoria y guion de aceptación | Notas (§14.4, §14.5) y grabación de pantalla | `docs/reports/<versión>/` |

- Los artefactos de CI se conservan **90 días**.
- Los de la ejecución final de cada versión se **adjuntan a su release** y se copian a `docs/reports/<versión>/`.

#### 6.2.5 Re-ejecución por terceros

Requisitos: Docker, Node según `.nvmrc` y `corepack enable` (pnpm). Desde un clon del commit etiquetado de la versión:

| Comando | Qué ejecuta | Tiempo objetivo |
|---|---|---|
| `pnpm verify:fast` | Control rápido sobre lo que tocó el cambio: piso, lint, typecheck, límites, secretos y pruebas relacionadas (`CONSTRAINTS.md` §5) | ≤ 90 s |
| `pnpm check:floor` | Guardia de piso sobre el diff (`CONSTRAINTS.md` §1) | ≤ 10 s |
| `pnpm verify` | lint, typecheck, unitarias, propiedades (200, semilla fija), contrato, componentes | ≤ 5 min |
| `pnpm verify:full` | `verify` + humo + integración (Testcontainers) + e2e en Chromium | ≤ 20 min |
| `pnpm test:smoke` | TC-080..TC-083 | ≤ 3 min |
| `pnpm test:nightly` | propiedades (5 000), e2e en todos los navegadores definidos, benchmarks, mutación (opcional) | ≤ 60 min |
| `pnpm test:trace` | Matriz de trazabilidad (§6.2.1) | ≤ 30 s |
| `pnpm test:report` | Informe a partir de los resultados JSON y el manifiesto (§14.2) | ≤ 30 s |

Los comandos se crean en `US-001` y `US-004` (`CLAUDE.md` §6).

#### 6.2.6 Evidencia de que las pruebas detectan errores

- **Pruebas primero:** cada PR de dominio enlaza la ejecución en rojo previa a la implementación (`AI-WORKFLOW.md` §2, paso 4).
- **Mutación (opcional):** el puntaje de Stryker sobre `standings` y `pairing` (TC-065).
- **Fixtures negativas** de lint y de base de datos demuestran que las reglas estáticas y los privilegios sí fallan (TC-064, TC-174).

#### 6.2.7 Integridad del informe

- Las cifras del informe de cada versión las genera `pnpm test:report` a partir de los resultados JSON y del manifiesto **del commit etiquetado**; no se escriben a mano. Solo las secciones de análisis, exploratoria y riesgos son manuales.
- **Pruebas inestables:** 0 reintentos en dominio y API; como máximo 1 en e2e. Una prueba que solo pasa al reintentar se reporta como *flaky* y **cuenta como fallo**.
- Ninguna prueba se omite (`skip`) sin una referencia a un defecto o a una `OQ-*`; el informe lista todas las omitidas.

## 7. Criterios de aprobación y fallo

**Por caso de prueba:** aprueba si el resultado observado coincide con el esperado (o el invariante se cumple en todas las ejecuciones). Una prueba inestable cuenta como fallo hasta corregirse.

**Criterios de salida de una versión `vX.Y.Z`** (sobre las historias incluidas en ella):
1. 100 % de los casos de prioridad **A** aprueban.
2. ≥ 90 % de los casos de prioridad **M** aprueban; los que fallen quedan registrados como defectos con su análisis.
3. Cobertura de los paquetes de dominio ≥ 90 % de líneas y ramas; `apps/api` ≥ 80 % de líneas (`TESTING.md` §9).
4. 0 defectos abiertos de severidad **Crítica** o **Alta** (§12).
5. Lint, typecheck, límites de dependencias y auditoría de seguridad en verde.
6. **Trazabilidad completa** (TC-090): ningún criterio de aceptación de las historias incluidas queda sin prueba etiquetada y verde.
7. **Clon limpio** (TC-083): `pnpm verify:full` en verde en una máquina o *runner* sin caché.
8. Si la versión incluye flujos de UI: guion de aceptación (TC-091) ejecutado y grabado y sesión exploratoria (TC-092) registrada.
9. Informe generado desde los datos del commit etiquetado, con su manifiesto, y artefactos adjuntos al release (§6.2.4).

## 8. Criterios de suspensión y reanudación

- **Suspender** la ejecución de un nivel si: la CI está rota más de un día; aparece un defecto crítico en el dominio (cálculo incorrecto) o de aislamiento que invalida las pruebas posteriores; falla el humo (TC-080..TC-082); o el entorno de Testcontainers no arranca.
- **Reanudar** cuando el defecto bloqueante esté corregido con su prueba de regresión `[DEF-nnn]` y la CI vuelva a verde.

## 9. Entregables de prueba

| Entregable | Ubicación |
|---|---|
| Este plan | `docs/TEST-PLAN.md` |
| Especificación de casos | §13 + pruebas en el código (`*.spec.ts`, `apps/api/test`, `apps/web/e2e`) |
| Casos dorados con fuente | `packages/*/test/golden/*.json` |
| Contraejemplos de propiedades | `packages/*/test/regressions/*.json` |
| Matriz de trazabilidad | `reports/traceability.md` (artefacto) + copia en `docs/reports/<versión>/` |
| Manifiesto de ejecución | `reports/run-manifest.json` (artefacto) + copia en `docs/reports/<versión>/` |
| Resultados, cobertura y reporte de Playwright | Artefactos de CI y release de la versión |
| Benchmarks, carga y simulacro de restauración | `docs/reports/<versión>/` |
| Notas de exploratoria y guion de aceptación (con grabación) | `docs/reports/<versión>/` |
| Registro de defectos | Issues con etiqueta `defect` (plantilla en §14.1) |
| Informe de la versión | `docs/reports/<versión>/test-summary.md` (§14.2) |

## 10. Entorno de pruebas

| Elemento | Detalle |
|---|---|
| Máquina de desarrollo | Windows 11 + Docker Desktop; Node LTS fijado en `.nvmrc` |
| Servicios locales | `docker-compose.yml`: PostgreSQL (con `pg_trgm` y `unaccent`), Redis (Valkey), Mailpit, S3 local (RustFS, `ADR-0003`) (`US-003`); imágenes fijadas por etiqueta y *digest* |
| Integración | Testcontainers con PostgreSQL y Redis reales; rol de aplicación sin `BYPASSRLS` ni `DELETE`; base limpia por suite |
| CI | GitHub Actions (`OQ-007`), *runners* Linux; ejecución por PR, nocturna y por candidata de versión |
| Navegadores | Chromium, Firefox y WebKit, más los perfiles móviles de Playwright (`DEC-066`). Las versiones las fija la versión de Playwright del *lockfile* |
| Carga | Entorno local o dedicado con k6 (`infra/k6`, `US-054`) |
| Datos | Solo sintéticos, generados con semilla por `@torre/testing` (`US-095`); **nunca** personas reales |
| Zona horaria | `TZ=UTC` y una corrida con `America/Bogota` |

**Orquestación de los e2e (`US-066`):**
1. Playwright `webServer` levanta la API compilada (`NODE_ENV=test`) y la web compilada (`vite preview`) contra los servicios del `docker-compose.yml`, en puertos fijos documentados.
2. `globalSetup` aplica las migraciones a una base exclusiva (`torre_e2e`) con el rol de migración, la vacía y carga `pnpm seed:demo --seed 2026` (usuarios demo con cada rol).
3. **Aislamiento:** cada archivo de prueba crea su propia organización mediante la API pública; el aislamiento multi-tenant evita interferencias sin reiniciar la base entre pruebas.
4. No hay *endpoints* solo para pruebas en builds de producción. Si hicieran falta, van detrás de `E2E_TEST_HOOKS=true`, y la validación de entorno (`US-005`) impide arrancar con esa variable si `NODE_ENV=production`.
5. 2FA en e2e: el secreto TOTP del usuario de prueba se genera con semilla y el reloj de la API se controla, para calcular códigos válidos.
6. Trazas `retain-on-failure`, capturas y video de las pruebas fallidas (§6.2.4).

## 11. Responsabilidades

| Rol | Responsabilidad |
|---|---|
| Responsable del proyecto | Aprueba el plan; decide qué historias entran en cada versión; revisa línea por línea las pruebas de dominio crítico, permisos, RLS y borrado (`AI-WORKFLOW.md` §2); firma la revisión de casos dorados y de la matriz de permisos; ejecuta la exploratoria y el guion; aprueba el informe |
| Claude Code (asistente) | Escribe pruebas primero y las etiqueta; ejecuta las suites; reporta resultados y defectos con evidencia; no modifica expectativas para "hacer pasar" (`AI-WORKFLOW.md` §10) |

## 12. Severidad de defectos

| Severidad | Definición | Ejemplo |
|---|---|---|
| Crítica | Resultado de arbitraje incorrecto, fuga entre organizaciones, escalada de privilegios o pérdida de datos | Emparejamiento repetido; clasificación errónea; un rol no admin borra; lectura de datos de otro tenant |
| Alta | Una funcionalidad del alcance no se puede usar | No se puede registrar un resultado |
| Media | Funciona con un rodeo o falla en un caso límite no crítico | Mensaje de error genérico en lugar del código estable |
| Baja | Cosmético | Alineación de una tabla |

## 13. Casos de prueba (alto nivel) y trazabilidad

Prioridad: **A** = Alta (obligatoria), **M** = Media. Tipo: U = unitaria, P = propiedad, O = oráculo, MB = basada en modelo, C = contrato, I = integración, S = seguridad, CO = componente, SM = humo, E = e2e, AC = aceptación, EX = exploratoria, R = rendimiento, L = carga, MU = mutación, X = estática, V = revisión.

Rangos de IDs: 001–029 y 130–149 dominio · 030–049, 100–129 y 150–180 API e integración · 050–059 y 181–199 interfaz · 060–069 y 200–219 no funcionales y estática · 070–079 revisión · 080–089 humo · 090–099 aceptación y exploratoria.

### 13.1 Dominio

| ID | Caso | Tipo | Prio | Historia | Regla / invariante | Resultado esperado |
|---|---|---|---|---|---|---|
| TC-001 | Conversión puntos ↔ medios puntos (ida y vuelta) | P | A | US-011 | `BR-NUM-01` | Identidad; nunca `float` almacenado |
| TC-002 | Orden canónico de competidores | P | A | US-011 | `BR-GEN-01` | Orden total y estable |
| TC-003 | PRNG con semilla: misma secuencia en Node y navegador | U | A | US-021 | `BR-GEN-01` | Secuencias idénticas |
| TC-004 | Hash canónico estable ante el reordenamiento de claves | P | A | US-021 | `BR-PAIR-13` | Mismo hash |
| TC-005 | Validaciones cruzadas del `RuleSet`; `canApprove` es falso con valores `[ASCUN-2012]` | U+P | A | US-010 | `BR-GEN-03`, `BR-GEN-04` | Mutaciones inválidas rechazadas; preset ASCUN no aprobable |
| TC-006 | Conservación de puntos | P | A | US-012 | `INV-S-1` | Σ repartida = Σ otorgada |
| TC-007 | Orden total e invarianza a permutaciones | P | A | US-012 | `INV-S-2` | Misma clasificación |
| TC-008 | `GV-001`: BH, BH-C1, BH-M1, SB, PS y orden final | U | A | US-013 | `BR-TIE-02` | Valores de `CORE-BUSINESS.md` §18 |
| TC-009 | División parcial: ambos valores de `restartOnPartialSplit` | U | M | US-013 | `BR-TIE-04` | Comportamientos distintos y documentados |
| TC-010 | `SHARE_RANK` y `DRAW_LOTS` con semilla | U | A | US-013 | `BR-TIE-05` | Puesto compartido; sorteo reproducible |
| TC-011 | `FIDE_C07_2026` sin casos dorados → error explícito | U | A | US-013 | `BR-TIE-03` | `NOT_IMPLEMENTED_POLICY` |
| TC-012 | Todos contra todos para *n* = 2..40, `GV-003` y comparación con las tablas de Berger de FIDE (3 a 16) | P+U | A | US-014 | `INV-RR-1..4` | Cada par una vez; colores ≤ 1; un descanso con *n* impar; igual a las tablas oficiales |
| TC-013 | Ronda 1 Suiza: `GV-004` (colores por Art. 5.2.5) y *n* = 5 | U | A | US-015 | `BR-PAIR-03` | Mesas y colores esperados; PAB al 5 |
| TC-014 | Invariantes del Suizo en torneos simulados | P | A | US-015, US-016 | `INV-P-1..P-10` | Sin violaciones en ≥ 200 torneos |
| TC-015 | Completitud contra fuerza bruta (*n* ≤ 10) | O | A | US-015 | `INV-P-6` | Si existe un emparejamiento válido, el motor lo encuentra |
| TC-016 | Determinismo e `inputHash` | P | A | US-015 | `INV-P-5` | Misma salida y mismo hash |
| TC-017 | Modelo de comandos aleatorios e igualdad tras *replay* | MB | A | US-042 | `BR-LIFE-*` | Estado idéntico; transiciones inválidas rechazadas |
| TC-018 | Corregir y revertir restituye la clasificación | P | A | US-042, US-037 | `INV-S-4` | Clasificación original |
| TC-019 | Instantánea oficial en `RoundClosed`; recalcular con otra versión no la cambia | U | A | US-042 | `INV-E-6`, `BR-AUD-05` | Lectura desde la instantánea; informe de diferencias |
| TC-020 | Esquemas de eventos sin datos personales | U | A | US-042 | `INV-PRIV-1`, `BR-AUD-06` | Ningún campo de nombre, email o documento |
| TC-021 | Simulador reproducible por semilla | P | M | US-095 | `BR-GEN-01` | Mismo torneo con la misma semilla |
| TC-130 | Matching de peso máximo contra fuerza bruta en grafos aleatorios pequeños; codificación lexicográfica exacta de pesos | O+P | A | US-017 | `BR-PAIR-10` | Mismo peso óptimo; sin pérdida de precisión |
| TC-131 | Dutch completo (C1–C21) contra bbpPairings e invariantes en el nuevo motor; 500 jugadores ≤ 3 s p95 | O+P+R | A | US-016, US-017 | `INV-P-*`, `SRC-05` | Divergencias analizadas; objetivo de tiempo medido |
| TC-132 | Eliminación directa: cuadro completo, byes hasta potencia de 2, cada competidor una vez por ronda | P | M | US-018 | `BR-KO-01` | Bloqueado hasta `OQ-013` |
| TC-133 | Elo interno: `INV-R-1..R-4`, `GV-002` y redondeo configurable | P+U | A | US-019 | `BR-RAT-01`, `BR-NUM-03` | Invariantes verdes; valores de `GV-002` |
| TC-134 | TPR y ARO con la tabla `dp` transcrita; error sin tabla; se descartan con jugadores sin rating | U | A | US-019 | `BR-RAT-02` | Valores de la tabla oficial; errores explícitos |
| TC-135 | Equipos: `INV-TM-1..TM-3`; alineación inválida rechazada; forfeits por tablero y por equipo incompleto | P+U | A | US-020 | `BR-TEAM-*` | Puntos coherentes; motivo de rechazo estable |
| TC-136 | Ranking institucional: `GV-006` e `INV-C-1..C-4`; endpoint con la explicación de los puntos; página pública y tope de visibilidad | U+P+I | A | US-100 | `BR-CHAMP-*` | Valores de `GV-006`; error explícito con puesto compartido; `VISIBILITY_EXCEEDS_TOURNAMENTS` |
| TC-137 | Premiación con puestos compartidos y no acumulación | U | A | US-101 | `BR-PRZ-*` | `PrizesAwarded` correcto o error explícito |
| TC-138 | Programador CSP: un validador independiente acepta todo horario producido; insatisfacibles con conjunto mínimo explicado; determinista | P+U | M | US-094 | — | Propiedad verde; explicación mínima |

### 13.2 API e integración

| ID | Caso | Tipo | Prio | Historia | Regla / invariante | Resultado esperado |
|---|---|---|---|---|---|---|
| TC-030 | N escritores concurrentes sobre un stream | I | A | US-045 | `INV-E-1` | Secuencia monótona sin huecos; reintentos con revalidación |
| TC-031 | Misma `Idempotency-Key` con el mismo cuerpo, con otro cuerpo y en paralelo mientras la primera sigue en curso; vencimiento a los 7 días | I | A | US-045 | `INV-E-2`, `DEC-062` | Misma respuesta / `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD` / `409 IDEMPOTENCY_REQUEST_IN_PROGRESS`; un solo efecto |
| TC-032 | `UPDATE`/`DELETE` sobre `events` | I | A | US-045 | `INV-E-4` | Rechazado por trigger y privilegios |
| TC-033 | Reconstrucción de proyecciones = filas vivas | I | A | US-046 | `INV-E-3` | Filas idénticas |
| TC-034 | RLS en todas las tablas con `organization_id`; sin tenant ⇒ cero filas | S | A | US-025 | `INV-T-1` | Ninguna fila ajena; la prueba falla si una tabla no tiene política |
| TC-035 | Matriz de autorización e IDOR | S | A | US-024 | `INV-T-2`, `INV-T-3` | Matriz exacta; cambiar un ID no da acceso |
| TC-036 | Refresh reutilizado; contraseñas fuera de logs; hash argon2id con los parámetros configurados; búsqueda de datos sembrados en los logs de un e2e completo | S | A | US-022, US-006 | `INV-A-1`, `INV-A-2`, `INV-PRIV-2` | Familia revocada; sin secretos ni datos personales en logs; el hash declara m=19456, t=2, p=1 |
| TC-037 | Todas las combinaciones estado × comando del torneo | I | A | US-034 | `BR-LIFE-01` | Solo las transiciones válidas; `INVALID_TRANSITION` en el resto |
| TC-038 | Generar (trabajo en cola: `202`, estados, un trabajo activo por torneo, recálculo si cambia el *stream*), descartar y publicar ronda; el borrador no es visible al público | I | A | US-035 | `BR-LIFE-02`, `BR-LIVE-02`, `DEC-079` | Visibilidad correcta; `NO_VALID_PAIRING` deja el trabajo en `FAILED` sin reintentos |
| TC-039 | Registrar resultado: validaciones y `RoundCompleted`; dos árbitros a la vez | I | A | US-036 | `BR-SCORE-05` | Errores con código estable; ronda completa al último resultado; sin duplicados |
| TC-040 | Corrección en los tres momentos de FIDE C.04.2 Art. 4.3: antes de publicar la ronda siguiente, con ella publicada y después de su final | I | A | US-037 | `BR-AUD-03`, `DEC-051`, `INV-S-5` | `RoundMarkedStale` y `RoundStandingsReissued` en los dos primeros; la ronda publicada no cambia; en el tercero, `scope: RATING_ONLY` y la clasificación intacta; el árbitro no hace correcciones administrativas |
| TC-041 | Bye solicitado, forfeit y retiro | I | A | US-038 | `BR-WD-01`, `BR-WD-03` | Puntos según `RuleSet`; retirado no emparejado |
| TC-042 | Cierre de ronda y de torneo; mensajes en el *outbox* | I | A | US-039 | `BR-LIFE-05` | Instantáneas y mensajes esperados |
| TC-043 | Formato `problem+json` y `correlationId` | I | M | US-006 | `CONVENTIONS.md` §6 | Formato exacto; sin detalles internos |
| TC-044 | Variables de entorno inválidas al arrancar | U | M | US-005 | — | El arranque falla y lista todas las faltantes |
| TC-045 | Migraciones desde una base vacía + CRUD mínimo; el rol de aplicación no puede migrar | I | A | US-007 | `CONVENTIONS.md` §9 | Esquema completo; permisos separados |
| TC-046 | Contratos oRPC: cada respuesta valida contra su contrato; OpenAPI regenerado sin diferencias; campos desconocidos rechazados; errores en `problem+json`; cliente tipado contra el servidor real | C | A | US-008 | `DEC-060` | 0 diferencias; `VALIDATION_FAILED` ante campos desconocidos |
| TC-047 | Solo `platform_admin` crea organizaciones directamente (otra cuenta recibe 403); quien la crea queda como `org_owner`; no se puede quitar al último `org_owner` | I+S | A | US-023 | `DEC-056` | Membresía correcta; 403; error al quitar al último |
| TC-048 | Crear y configurar torneo: solo `RuleSet` `APPROVED` (o demo); el snapshot no cambia si el `RuleSet` evoluciona; tras iniciar solo metadatos | I | A | US-030 | `BR-GEN-02`, `BR-GEN-04`, `BR-LIFE-07` | Snapshot intacto; cambios no permitidos rechazados |
| TC-049 | Jugadores e importación CSV en dos pasos: errores por fila, duplicados probables sin fusión, tildes, límites | I | A | US-031 | `BR-PRIV-01` | Vista previa correcta; nada se importa sin confirmar |
| TC-100 | Inscripción: ventana abierta, unicidad, marca de elegibilidad, cupos, siembra y `SeedingAdjusted`; un capitán solo inscribe de su institución | I+S | A | US-032 | `BR-REG-01..06` | Errores con código estable; IDOR bloqueado |
| TC-101 | *Upcasting* de un evento `v1 → v2` | U | M | US-045 | `INV-E-5` | Mismo significado tras el *upcast* |
| TC-102 | Atomicidad: si falla una proyección o el *outbox*, no queda ningún evento | I | A | US-045, US-046 | `DEC-038` | Transacción revertida completa |
| TC-103 | Lecturas con `ETag`/`If-None-Match` y `streamVersion` | I | M | US-046 | `ARCHITECTURE.md` §9.1 | 304 cuando no cambió |
| TC-104 | Login: 10 intentos cada 15 min por IP y por cuenta, bloqueo de 15 min tras 10 fallos seguidos, 300/min en la API; sin enumeración de usuarios; eventos en `audit_log`; cuenta suspendida rechazada | S | A | US-022 | `BR-AUTH-07`, `BR-AUTH-08` | 429 en el intento 11; respuestas indistinguibles; `ACCOUNT_SUSPENDED` |
| TC-105 | Cambio directo de rol: cuenta nueva sin membresías; razón obligatoria; regla del subconjunto; nunca `platform_admin` por API; último `org_owner`; confirmación de contraseña; efecto inmediato; auditoría | I+S | A | US-022, US-028 | `BR-ROLE-01`, `BR-ROLE-02`, `INV-T-4`, `INV-T-5` | Solo los cambios permitidos; registro completo en `audit_log` |
| TC-106 | Solicitud de rol: razón de 30 a 1 000 caracteres, pendiente duplicada, rol ya poseído, `platform_admin` no solicitable, límite diario | I | A | US-029 | `BR-ROLE-03` | `VALIDATION_FAILED`, `ROLE_REQUEST_DUPLICATE`, `ROLE_ALREADY_GRANTED`, `RATE_LIMITED` |
| TC-107 | Resolución: solo un revisor elegible; el autor no se autoaprueba; aprobar crea la membresía (o la organización) en la misma transacción y es idempotente; rechazar exige razón; una vencida o retirada no se aprueba | I+S | A | US-029 | `BR-ROLE-04`, `BR-ROLE-05`, `INV-T-5` | Estados y membresías correctos; `ROLE_REQUEST_NOT_PENDING` |
| TC-108 | RLS de `role_requests`: el autor ve las suyas, el revisor las de su alcance; las de nueva organización solo el autor y `platform_admin` | S | A | US-029 | `INV-T-1`, `BR-ROLE-05` | Ninguna solicitud ajena visible |
| TC-150 | Permisos desde la base: semilla = matriz (`INV-T-8`); reservados solo en `platform_admin` (`INV-T-6`); ningún conjunto aleatorio de permisos salta las reglas de estado (`INV-T-7`); caché invalidada al cambiar un rol; `accessibleBy` filtra listados | I+S+P | A | US-024 | `DEC-058` | Invariantes verdes; listados sin filas no permitidas |
| TC-151 | Invitaciones: token de un solo uso, expiración, reuso, escalada | I+S | M | US-026 | `BR-ROLE-02` | Rechazos correctos; membresía creada al aceptar |
| TC-152 | 2FA: activar con confirmación, códigos de recuperación de un solo uso, desafío en el login, límite de intentos, desactivar con confirmación; acciones sensibles sin confirmación reciente → 423; `platform_admin` sin 2FA usando un permiso reservado → 403; secreto cifrado y re-cifrado al rotar la clave | I+S | A | US-107 | `BR-AUTH-05`, `BR-AUTH-06`, `BR-AUTH-10`, `INV-A-3`, `INV-A-5` | Sin sesión sin segundo factor; `PASSWORD_CONFIRMATION_REQUIRED`; `TWO_FACTOR_REQUIRED` |
| TC-153 | Verificación de email y recuperación: tokens hasheados de un solo uso con expiración; sin enumeración; restablecer revoca las demás sesiones | I+S | A | US-027 | `BR-AUTH-04` | Flujos con Mailpit verdes |
| TC-154 | Equipos y plantillas: un jugador en un solo equipo por torneo, plazos, IDOR | I+S | M | US-033 | `BR-TEAM-01`, `BR-REG-02` | Rechazos con motivo |
| TC-155 | Alineaciones y resultados por tablero; `MatchResultRecorded` derivado y coherente | I | M | US-040 | `INV-TM-1`, `INV-TM-2` | Puntos de enfrentamiento correctos |
| TC-156 | Ajuste manual: validación de `BR-PAIR-02`, `OVERRIDE` con permiso especial, restaurar el original | I | M | US-041 | `BR-PAIR-08` | Borrador válido o marcado `OVERRIDE` |
| TC-157 | Línea de tiempo de auditoría: filtros, correcciones con valor anterior y nuevo, solo con permiso | I+S | M | US-047 | `BR-AUD-04` | Contenido y permisos correctos |
| TC-158 | *Snapshots*: estado con *snapshot* = estado por *replay* (si se implementan) | I | M | US-048 | `INV-E-3` | Equivalencia exacta |
| TC-159 | Gateway WebSocket: público, privado sin token rechazado, borradores nunca emitidos, límites (10 salas, 4 KB, 30/min), reautenticación en caliente, token vencido y membresía revocada | I+S | A | US-050 | `INV-L-2`, `INV-L-3` | Ningún dato no autorizado emitido; el socket revocado sale de inmediato |
| TC-160 | *Outbox relay*: orden, coalescencia, caída y reanudación sin pérdidas | I | A | US-051 | `INV-L-1` | Mensajes completos y ordenados |
| TC-161 | Suscripciones con doble confirmación; sin consentimiento no se envía | I | A | US-060 | `INV-N-2` | Solo suscripciones confirmadas reciben |
| TC-162 | Email: deduplicación con reintentos forzados, plantillas por idioma, `List-Unsubscribe` | I | A | US-061 | `INV-N-1` | Un solo envío por `dedup_key` |
| TC-163 | Emails al cerrar ronda y torneo, avisos de corrección, torneos privados | I | A | US-062 | `BR-NOTIF-02` | Emails en Mailpit; ninguno a no autorizados |
| TC-164 | Baja con token, idempotente; cancela envíos pendientes | I | A | US-063 | `BR-NOTIF-04` | Baja inmediata y auditada |
| TC-165 | PDF: contenido extraído esperado y `sha256` determinista | U+I | A | US-064 | `BR-RPT-02` | Mismo hash con los mismos datos |
| TC-166 | Reportes asíncronos: reutilización por `params_hash`, URL firmada, autorización entre organizaciones | I+S | A | US-065 | `BR-RPT-04` | Reporte reutilizado; descarga ajena rechazada |
| TC-167 | Búsqueda: tildes, errores tipográficos, homónimos, visibilidad, 50 000 jugadores sintéticos | I+R | M | US-072 | `DEC-039` | Resultados y tiempos esperados |
| TC-168 | TRF: exportar → importar → exportar idéntico; campos ausentes vacíos | U+I | M | US-080 | `SRC-09` | Archivo idéntico |
| TC-169 | CSV/JSON: escape, inyección de fórmulas, solo campos públicos | U+I | M | US-081 | `BR-PRIV-02` | Sin fórmulas ejecutables; campos correctos |
| TC-170 | PGN: válido, inválido, inconsistente con el resultado, límites | U+I | M | US-082 | `DEC-032` | Aviso explícito; puntos intactos |
| TC-171 | Reclamaciones: plazos, `CLAIM_OUT_OF_TIME`, resolución enlazada a la corrección | I+S | A | US-103 | `BR-AUD-07` | Estados y plazos correctos |
| TC-172 | Vinculación jugador ↔ cuenta y `GET /me/games` sin IDOR | I+S | M | US-102 | `INV-T-3` | Solo datos propios |
| TC-173 | Gestión de roles (solo `platform_admin`): roles propios por organización, `RESERVED_PERMISSION`, razón y confirmación, auditoría antes/después, reset a la matriz, efecto inmediato | I+S | A | US-108 | `DEC-058`, `INV-T-6`, `INV-T-7` | Cambios correctos; nadie más accede |
| TC-174 | Borrado lógico: el rol de la app no puede `DELETE` en ninguna tabla de negocio; lo borrado no aparece en consultas normales; borrar → restaurar idéntico por lote; `RESTORE_CONFLICT`; `HAS_ACTIVE_TOURNAMENTS`; solo `platform_admin` | I+S | A | US-109 | `INV-D-1..D-3`, `BR-DEL-*` | Invariantes verdes; 403 para cualquier otro rol |
| TC-175 | Archivar torneo: eventos intactos, oculto en listados y vistas públicas, desarchivar | I | A | US-109 | `BR-DEL-06` | Mismos eventos; visibilidad correcta |
| TC-176 | Anonimización: sin datos personales residuales (búsqueda en todas las tablas), resultados y clasificaciones intactos, irreversible, auditada | I+S | A | US-109, US-111 | `INV-D-4`, `BR-DEL-07` | 0 coincidencias de los datos originales |
| TC-177 | Consola de plataforma: suspender corta sesiones y acceso; reactivar; instituciones; auditoría; ningún otro rol entra | I+S | M | US-110 | `BR-AUTH-08` | Acciones correctas y auditadas |
| TC-178 | Derechos del titular: aceptación versionada de la política, exportar mis datos, solicitar revocación o supresión con fechas, resolución por anonimización | I | A | US-111 | `BR-PRIV-04` | Solicitudes con fechas; datos exportados completos |
| TC-179 | Centro de avisos: llegan solo al destinatario; leídos y no leídos; los generan las solicitudes, `STALE`, reclamaciones y reportes; vencimiento de solicitudes | I+S | A | US-112 | `INV-N-3` | Sin fuga entre usuarios |
| TC-180 | Importación de ratings y títulos: emparejado por FIDE ID, revisión de dudosos, instantánea al inscribir, siembra FIDE → nacional → título → alfabético; `TPN_LOCKED` tras emparejar la ronda 4 | I | M | US-104 | `BR-RAT-07`, `BR-REG-04` | Siembra esperada |
| TC-208 | Logo: PNG, JPEG y WebP aceptados; SVG, extensión falsa y > 512 KB rechazados; solo dueño o admin de la organización; reemplazo sin borrar el anterior | I+S | M | US-116 | `DEC-076` | `UNSUPPORTED_MEDIA_TYPE`, `PAYLOAD_TOO_LARGE`; IDOR rechazado |
| TC-209 | Colas y *worker*: reintentos, apagado ordenado, RLS en trabajos con y sin tenant, rol de mantenimiento limitado, `audit_log` solo inserción, comprobación de `noeviction` | I+S | A | US-117, US-025 | `INV-T-9`, `INV-E-7` | Cero filas sin tenant; el rol de mantenimiento no accede a otras tablas; `UPDATE` sobre `audit_log` rechazado |
| TC-206 | Check-in: abrir y cerrar por el director; marcar y deshacer por el jugador (solo el propio), el árbitro y el director; emparejar con el check-in sin cerrar; ausentes con bye de cero puntos | I+S | M | US-115 | `BR-WD-06`, `INV-P-11` | `CHECK_IN_NOT_CLOSED`, `CHECK_IN_CLOSED`; nadie sin check-in emparejado; IDOR rechazado |
| TC-207 | Política de contraseña y CSRF: longitudes 14/15/64/65 sin y con 2FA, lista de comunes, sin reglas de composición; cookie `__Host-refresh` con sus atributos; refresh y logout cross-site rechazados (con y sin `Sec-Fetch-Site`); sesión vencida a las 24 h aunque se haya rotado | I+S | A | US-022 | `BR-AUTH-09`, `INV-A-4` | `PASSWORD_POLICY_VIOLATION` donde corresponde; 403 cross-site; refresh rechazado tras 24 h |

### 13.3 Interfaz (componentes y extremo a extremo)

| ID | Caso | Tipo | Prio | Historia | Resultado esperado |
|---|---|---|---|---|---|
| TC-050 | Flujo VS-1: crear organización → torneo demo todos contra todos → inscribir → rondas → resultados → cerrar | E | A | US-066..US-068 | Clasificación final correcta y torneo `CLOSED` |
| TC-051 | Suizo de 8 jugadores, 3 rondas, con una corrección administrativa | E | A | US-068, US-037 | Ronda posterior marcada `STALE`; clasificación recalculada |
| TC-052 | Ronda completa solo con teclado | E | M | US-068 | Todos los resultados registrados sin ratón |
| TC-053 | axe en el flujo del árbitro | E | M | US-069, US-068 | 0 violaciones críticas (WCAG 2.2 AA) |
| TC-054 | Cliente: `problem+json` → mensaje por `code`; 401 → refresh → reintento; `X-Correlation-Id` | CO | M | US-009, US-066 | Mensajes correctos; una sola renovación concurrente |
| TC-055 | Componentes base de `shared/ui`: estados de carga, vacío y error; teclado y etiquetas | CO | M | US-069 | Comportamiento y accesibilidad esperados |
| TC-056 | Formularios de torneo e inscripción validan con los mismos contratos de `@torre/contracts` | CO | M | US-067 | Mismos errores en UI y API |
| TC-057 | Un espectador solicita `arbiter` de un torneo con razón; el director la aprueba desde la bandeja; el nuevo árbitro registra un resultado en ese torneo y en ningún otro | E | A | US-028, US-029 | Flujo completo; 403 en otro torneo |
| TC-181 | Cliente en vivo con pérdidas, duplicados y desconexiones converge al estado del servidor | P+CO | A | US-052 | `INV-L-1` verde |
| TC-182 | Vistas en vivo entre dos pestañas; etiqueta provisional/oficial; indicador de conexión; modo proyector | E | A | US-053 | Cambio visible sin recargar |
| TC-183 | Páginas públicas y endpoint de metadatos OG escapado | E+I | A | US-070 | Contenido OG correcto; sin datos privados |
| TC-184 | Tablas: estado en la URL, 500 filas, explicar puesto | E+CO | A | US-071 | Estado restaurado; scroll fluido |
| TC-185 | Atajos y paleta de comandos; no se activan en campos de texto | CO+E | A | US-073 | Atajos correctos |
| TC-186 | Temas claro, oscuro y proyector sin parpadeo; contraste AA | E | M | US-074 | Capturas y contraste verdes |
| TC-187 | i18n: paridad de claves es/en; fechas en UTC y Bogotá | U | M | US-075 | Sin claves faltantes |
| TC-188 | Seguir: almacenamiento local con fallo simulado; sincronización con sesión | CO+E | M | US-076 | Sin errores con almacenamiento bloqueado |
| TC-189 | Microinteracciones (toasts, copiar, ir arriba) y autoguardado de borradores con expiración | CO | M | US-077, US-078 | Accesibles; nunca en formularios de resultados |
| TC-190 | Accesibilidad y navegadores: axe en flujos públicos y del árbitro; Playwright en los navegadores definidos | E | A | US-079 | 0 violaciones críticas |
| TC-191 | PWA: lectura sin conexión; nunca cachea rutas privadas | E | M | US-090 | Última versión visible; privadas fuera de la caché |
| TC-192 | Árbitro sin conexión: modelo con cortes de red, reordenamiento y duplicados; conflictos entre dos árbitros | MB+E | A | US-091 | `INV-O-1`; nada se descarta en silencio |
| TC-193 | Directorio público: solo `PUBLIC` no archivados; filtros en la URL | E | M | US-113 | Ningún `UNLISTED`, `PRIVATE`, demo ni archivado |
| TC-194 | Tablero, PGN y FEN; análisis con motor aislado, con límites y cancelación | CO+E | M | US-092, US-093 | Jugadas válidas; la UI no se bloquea |

### 13.4 No funcionales, estática y revisión

| ID | Caso | Tipo | Prio | Historia | Resultado esperado |
|---|---|---|---|---|---|
| TC-060 | Clasificación con 500 jugadores y 9 rondas | R | M | US-012 | ≤ 100 ms p95 (medido y reportado) |
| TC-061 | Ronda Suiza con 200 jugadores | R | M | US-015 | ≤ 500 ms p95 (medido y reportado) |
| TC-062 | Comando de resultado de extremo a extremo | R | M | US-036 | ≤ 300 ms p95 (medido y reportado) |
| TC-063 | `pnpm audit`, gitleaks, límites de dependencias y knip | X | A | US-001, US-004 | 0 hallazgos críticos; un import prohibido rompe el lint |
| TC-064 | Fixtures negativas: `any`, `!`, `Date.now`, `Math.random` e import de `@nestjs/*` en `packages/*`; librería de UI fuera de `shared/ui`; decisión por nombre de rol | X | A | US-001, US-002, US-009 | Cada fixture falla con la regla esperada |
| TC-065 | Mutación sobre `@torre/standings` y `@torre/pairing` (opcional) | MU | M | US-012..US-015 | Puntaje reportado; objetivo ≥ 70 % |
| TC-066 | Regresión visual de `shared/ui` en los tres temas (opcional) | E | M | US-069 | Sin diferencias no aprobadas |
| TC-070 | Revisión del plan de despliegue (lista de `ARCHITECTURE.md` §16.5) | V | A | US-105 | Las consideraciones están resueltas o tienen mitigación |
| TC-200 | Carga con k6: p95 ≤ 1 s con 2 000 conexiones por instancia; 0 mensajes perdidos tras *resync* | L | A | US-054 | Informe publicado |
| TC-201 | Informe de complejidad: crecimiento empírico frente a *n* y umbral de regresión en CI | R | M | US-096 | Informe publicado |
| TC-202 | Documentación viva: enlaces e IDs referenciados válidos (script de CI) | X+V | M | US-097 | 0 referencias rotas |
| TC-203 | Respaldo y restauración: simulacro automatizado; `INV-E-3` tras restaurar | I | A | US-098 | Proyecciones idénticas |
| TC-204 | Endurecimiento: inyección SQL, enumeración, cabeceras, CORS, límites de tasa; DAST opcional | S | A | US-099 | 0 hallazgos críticos |
| TC-205 | Métricas: `/metrics` protegido expone las métricas definidas sin datos personales; alertas documentadas | I | M | US-114 | Métricas presentes; acceso no autorizado rechazado |

### 13.5 Humo

| ID | Caso | Tipo | Prio | Historia | Resultado esperado |
|---|---|---|---|---|---|
| TC-080 | `pnpm dev:infra` + `pnpm infra:check` | SM | A | US-003 | Todos los servicios sanos |
| TC-081 | La API arranca con los valores de `.env.example`; `/health/live` y `/health/ready` responden 200; `/api/docs` disponible fuera de producción | SM | A | US-005, US-006, US-008 | Respuestas esperadas |
| TC-082 | La web carga; inicio de sesión con el usuario semilla; se ve el torneo demo sembrado | SM | A | US-009, US-066, US-095 | Pantalla del torneo demo |
| TC-083 | Clon limpio: `pnpm install --frozen-lockfile` + `pnpm verify:full` sin caché | SM | A | US-001, US-004 | Todo en verde |

### 13.6 Aceptación y exploratoria

| ID | Caso | Tipo | Prio | Historia | Resultado esperado |
|---|---|---|---|---|---|
| TC-090 | Trazabilidad: cada criterio de aceptación de las historias de la versión en `DONE` tiene ≥ 1 prueba etiquetada `[US-nnn:ACk]` y en verde | AC | A | US-106 | `pnpm test:trace` sin faltantes |
| TC-091 | Guion de demostración de aceptación (§14.5) ejecutado de punta a punta y grabado | AC | A | US-029..US-039, US-066..US-068, US-106 | Todos los pasos con su resultado esperado |
| TC-092 | Sesión exploratoria con *charter* (§14.4), 90 minutos | EX | M | US-106 | Hallazgos registrados; cada defecto con su `DEF-nnn` y su prueba de regresión |

### 13.7 Matriz historia → casos

| Historia | Casos |
|---|---|
| US-001 | TC-063, TC-064, TC-083 |
| US-002 | TC-064 |
| US-003 | TC-080 |
| US-004 | TC-063, TC-083 |
| US-005 | TC-044, TC-081 |
| US-006 | TC-036, TC-043, TC-081 |
| US-007 | TC-045 |
| US-008 | TC-046, TC-081 |
| US-009 | TC-054, TC-064, TC-082 |
| US-010 | TC-005 |
| US-011 | TC-001, TC-002 |
| US-012 | TC-006, TC-007, TC-060, TC-065 |
| US-013 | TC-008, TC-009, TC-010, TC-011, TC-065 |
| US-014 | TC-012 |
| US-015 | TC-013, TC-014, TC-015, TC-016, TC-061, TC-065 |
| US-016 | TC-014, TC-131 |
| US-017 | TC-130, TC-131 |
| US-018 | TC-132 |
| US-019 | TC-133, TC-134 |
| US-020 | TC-135 |
| US-021 | TC-003, TC-004 |
| US-022 | TC-036, TC-104, TC-207, TC-105 |
| US-023 | TC-047 |
| US-024 | TC-035, TC-150 |
| US-025 | TC-209, TC-034 |
| US-026 | TC-151 |
| US-027 | TC-153 |
| US-028 | TC-057, TC-105 |
| US-029 | TC-057, TC-091, TC-106, TC-107, TC-108 |
| US-030 | TC-048, TC-091 |
| US-031 | TC-049, TC-091 |
| US-032 | TC-100, TC-091 |
| US-033 | TC-154 |
| US-034 | TC-037 |
| US-035 | TC-038, TC-091 |
| US-036 | TC-039, TC-062, TC-091 |
| US-037 | TC-018, TC-040, TC-051, TC-091 |
| US-038 | TC-041 |
| US-039 | TC-042, TC-091 |
| US-040 | TC-155 |
| US-041 | TC-156 |
| US-042 | TC-017, TC-018, TC-019, TC-020 |
| US-045 | TC-030, TC-031, TC-032, TC-101, TC-102 |
| US-046 | TC-033, TC-102, TC-103 |
| US-047 | TC-157 |
| US-048 | TC-158 |
| US-050 | TC-159 |
| US-051 | TC-160 |
| US-052 | TC-181 |
| US-053 | TC-182 |
| US-054 | TC-200 |
| US-060 | TC-161 |
| US-061 | TC-162 |
| US-062 | TC-163 |
| US-063 | TC-164 |
| US-064 | TC-165 |
| US-065 | TC-166 |
| US-066 | TC-050, TC-054, TC-082 |
| US-067 | TC-050, TC-056 |
| US-068 | TC-050, TC-051, TC-052, TC-053 |
| US-069 | TC-053, TC-055, TC-066 |
| US-070 | TC-183 |
| US-071 | TC-184 |
| US-072 | TC-167 |
| US-073 | TC-185 |
| US-074 | TC-186 |
| US-075 | TC-187 |
| US-076 | TC-188 |
| US-077 | TC-189 |
| US-078 | TC-189 |
| US-079 | TC-190 |
| US-080 | TC-168 |
| US-081 | TC-169 |
| US-082 | TC-170 |
| US-090 | TC-191 |
| US-091 | TC-192 |
| US-092 | TC-194 |
| US-093 | TC-194 |
| US-094 | TC-138 |
| US-095 | TC-021, TC-082 |
| US-096 | TC-201 |
| US-097 | TC-202 |
| US-098 | TC-203 |
| US-099 | TC-204 |
| US-100 | TC-136 |
| US-101 | TC-137 |
| US-102 | TC-172 |
| US-103 | TC-171 |
| US-104 | TC-180 |
| US-105 | TC-070 |
| US-106 | TC-083, TC-090, TC-091, TC-092 |
| US-107 | TC-152 |
| US-108 | TC-173 |
| US-109 | TC-174, TC-175, TC-176 |
| US-110 | TC-177 |
| US-111 | TC-176, TC-178 |
| US-112 | TC-179 |
| US-113 | TC-193 |
| US-114 | TC-205 |
| US-115 | TC-206 |
| US-116 | TC-208 |
| US-117 | TC-209 |

Además de esta matriz por historia, `pnpm test:trace` genera la matriz **por criterio de aceptación** (§14.6).

## 14. Plantillas

### 14.1 Reporte de defecto

```markdown
**ID:** DEF-nnn · **Severidad:** Crítica | Alta | Media | Baja · **Caso:** TC-nnn · **Historia:** US-nnn (AC k)
**Regla afectada:** BR-… / INV-…
**Entorno:** commit, Node, SO, semilla y ruta de fast-check (si es una propiedad) — o el run-manifest.json
**Pasos para reproducir:** …
**Resultado esperado (con fuente):** …
**Resultado obtenido:** …
**Evidencia:** log / traza de Playwright / contraejemplo mínimo de fast-check
**Prueba de regresión:** archivo › nombre con la etiqueta [DEF-nnn]
**Estado:** Abierto | En corrección | Verificado | Cerrado
```

### 14.2 Informe de la versión (`docs/reports/<versión>/test-summary.md`)

Las secciones marcadas (auto) las genera `pnpm test:report`; las demás son manuales.

1. Resumen: versión, commit, historias incluidas, fechas y enlace al manifiesto. (auto)
2. Resultados por nivel y por caso TC: ejecutados, aprobados, fallidos, *flaky*, omitidos y no ejecutables (con su `OQ-*`). (auto)
3. Trazabilidad: criterios de aceptación cubiertos / totales por historia incluida. (auto)
4. Cobertura por paquete contra el umbral. (auto)
5. Propiedades: ejecuciones y semillas de la corrida nocturna final; contraejemplos nuevos. (auto)
6. Benchmarks y carga contra los objetivos de `ARCHITECTURE.md` §17. (auto)
7. Mutación (si se ejecutó). (auto)
8. Comparación con bbpPairings: coincidencias y divergencias analizadas (si aplica).
9. Revisión humana: firma de los casos dorados nuevos y de la matriz de permisos.
10. Sesión exploratoria y guion de aceptación: hallazgos y enlace a la grabación.
11. Defectos abiertos y cerrados por severidad; riesgos residuales aceptados.
12. Desviaciones respecto de este plan y su justificación.
13. Evaluación criterio por criterio contra §7 y recomendación (apto / no apto).

### 14.3 Manifiesto de ejecución (`reports/run-manifest.json`)

```json
{
  "runId": "gha-<run-id>",
  "commit": "<sha>",
  "tag": "vX.Y.Z-rc.N",
  "startedAt": "<ISO-8601 UTC>",
  "node": "<versión>", "pnpm": "<versión>", "os": "<runner>",
  "timezone": "UTC",
  "images": { "postgres": "postgres:<tag>@sha256:<digest>", "redis": "redis:<tag>@sha256:<digest>" },
  "browsers": { "chromium": "<versión>" },
  "fastCheck": { "mode": "pr", "seed": 20261025, "numRuns": 200 },
  "suites": { "unit": "passed", "contract": "passed", "integration": "passed", "smoke": "passed", "e2e": "passed" },
  "artifacts": ["coverage/", "playwright-report/", "reports/traceability.md"]
}
```

### 14.4 *Charter* de la sesión exploratoria (TC-092)

```markdown
**Misión:** buscar resultados de arbitraje incorrectos, accesos indebidos o pérdidas de datos que las pruebas automáticas no anticipan.
**Duración:** 90 min · **Fecha:** · **Versión / commit:** · **Quién:**
**Áreas:**
1. Correcciones tardías y rondas STALE (varias correcciones seguidas; corregir y revertir).
2. Permisos: árbitro de otro torneo, capitán de otra institución, usuario sin membresía, rol propio con permisos recortados (cambiando IDs en la URL).
3. Borrado: intentar borrar sin ser platform_admin; borrar y restaurar un lote; restaurar con conflicto.
4. Datos extremos: 1, 2 y 3 jugadores; todos empatan; nombres con tildes y muy largos; CSV con errores.
5. Concurrencia: dos pestañas registrando la misma partida.
6. Teclado y mensajes de error: ¿se entiende qué pasó y qué hacer?
**Notas:** (qué se hizo, qué se observó)
**Hallazgos:** (cada uno → DEF-nnn con severidad)
```

### 14.5 Guion de demostración de aceptación (TC-091)

| Paso | Acción | Resultado esperado | Criterios |
|---|---|---|---|
| 1 | `pnpm dev` y `pnpm seed:demo --seed 2026` | Organización, director y árbitro demo disponibles | US-095 |
| 2 | Iniciar sesión como director y crear un torneo Suizo con `fide-dutch-2026` | Torneo en `DRAFT` con el snapshot del `RuleSet` | US-030 |
| 3 | Registrar una cuenta nueva (es espectador: no ve acciones de árbitro); solicitar el rol `arbiter` de este torneo con una razón; como director, aprobarla desde la bandeja | Solicitud `APPROVED`; la cuenta puede registrar resultados en este torneo y en ningún otro | US-022, US-028, US-029, `BR-ROLE-*` |
| 4 | Importar el CSV de ejemplo de 8 jugadores e inscribirlos con su marca de elegibilidad | Vista previa sin errores; 8 inscritos con siembra | US-031, US-032 |
| 5 | Iniciar el torneo y generar la ronda 1 | Mesas 1–5, 2–6, 3–7, 4–8; colores de `GV-004` según el color sorteado; semilla visible en el diagnóstico | US-035, `GV-004` |
| 6 | Publicar y, con la cuenta del árbitro aprobado en el paso 3, registrar los resultados solo con teclado | Ronda `COMPLETED` | US-036, US-068 |
| 7 | Cerrar la ronda 1; generar, publicar, jugar y cerrar la ronda 2; generar y publicar la ronda 3 | Clasificación oficial por ronda | US-039 |
| 8 | Corregir un resultado de la ronda 2 como director, con razón | La ronda 3 queda marcada `STALE`; clasificación recalculada; la línea de tiempo muestra actor, hora y razón | US-037, `DEC-051` |
| 9 | Como árbitro de otro torneo, intentar registrar un resultado aquí | 403; nada cambia | US-024, `INV-T-3` |
| 10 | Terminar y cerrar el torneo | Clasificación final con desempates y hash de la instantánea oficial | US-039, `BR-AUD-05` |
| 11 | Ejecutar `projections:rebuild` del torneo | Mismas filas y mismo hash de la clasificación | US-046, `INV-E-3` |
| 12 | Mostrar `reports/traceability.md` y el informe de la versión | Trazabilidad completa de las historias incluidas | US-106 |

Si la versión incluye la plataforma (VS-8), el guion agrega: borrar un jugador como `platform_admin` (con razón y confirmación de contraseña), comprobar que desaparece y restaurarlo desde la papelera; e intentar borrar con el director (403).

### 14.6 Formato de la matriz de trazabilidad (`reports/traceability.md`)

```markdown
| Historia | AC | Pruebas (archivo › nombre) | Estado |
|---|---|---|---|
| US-014 | AC2 | packages/pairing/src/round-robin.spec.ts › [US-014:AC2][INV-RR-1][TC-012] should … | ✅ |
| US-014 | AC5 | — | ❌ sin prueba |

| Caso | Prio | Pruebas | Estado |
|---|---|---|---|
| TC-012 | A | 3 pruebas | ✅ |
```

## 15. Hitos por rebanada y aprobación

No hay fechas: el responsable decide cuándo cerrar cada rebanada o versión. Para dar por cerrada una rebanada vertical (`USER-STORIES.md` §5):
1. Todos los casos de prioridad A de sus historias (§13.7) en verde.
2. Regresión completa en verde (§6.1).
3. TC-090 sobre sus historias.
4. TC-091 si la rebanada incluye pasos del guion, y TC-200 si incluye tiempo real (VS-3).
5. Informe de la rebanada o versión generado con `pnpm test:report`.

| Aprobación | Nombre | Fecha | Firma |
|---|---|---|---|
| Responsable del proyecto | | | |
