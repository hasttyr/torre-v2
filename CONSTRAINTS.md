# CONSTRAINTS.md — Barra de calidad del proyecto

Última revisión: 2026-10-26, por el responsable del proyecto (`DEC-064`).

> Este archivo define qué significa "listo para integrar". **Todo control bloquea**: un control que solo advierte no cuenta. Cada fila nombra el comando que da el veredicto; una regla sin comando es una aspiración, no una restricción. **Este archivo no se debilita para que un cambio pase**: bajar un umbral, quitar una fila o añadir una excepción va en un cambio propio, con razón, y lo aprueba el responsable.
>
> Los comandos se crean en `US-001` y `US-004`. Hasta entonces, este archivo es la especificación que esas historias cumplen.

## 1. Piso (siempre, sin configuración)

El guardia de piso (`pnpm check:floor`, script `tools/floor-guard.mjs`, solo Node y git, sin dependencias nuevas) revisa el diff contra la rama principal (líneas añadidas y quitadas, más archivos nuevos). Sale con 0 si está limpio, 1 si hay una violación y 2 si no pudo correr; un 2 nunca cuenta como limpio. Informa la regla y el lugar, nunca el valor de un secreto.

- Sin supresiones nuevas: `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`, `eslint-disable`, `istanbul ignore`, `v8 ignore`, `Stryker disable`, `gitleaks:allow`. Única salvedad: un comentario que justifica y referencia una issue (`CLAUDE.md` regla 3), registrado en §4.
- Sin `any`, sin `as unknown as X` y sin `!` (*non-null assertion*) fuera de las pruebas (`CLAUDE.md` regla 3; ESLint los marca como error).
- Sin trabajo a medias: nada de `throw new Error('Not implemented')`, `catch {}` vacío ni `TODO` sin referencia `TODO(OQ-nnn)` o `TODO(US-nnn)` (`CONVENTIONS.md`).
- Sin pruebas debilitadas: ningún `.skip`, `.todo`, `xit` ni `xdescribe` sin `DEF-nnn` u `OQ-*`; ningún archivo de prueba borrado ni aserción quitada de una prueba que sigue existiendo, salvo con razón en el mensaje del commit.
- Dominio puro: sin `Date.now()`, `Math.random()`, red, disco ni base de datos en `packages/*` (`CLAUDE.md` regla 2).
- Sin `UPDATE` ni `DELETE` sobre la tabla de eventos (`CLAUDE.md` regla 5) y sin `DELETE` físico en las tablas de negocio: se borra de forma lógica (`CLAUDE.md` regla 13). Solo la cola `maintenance`, con su rol, purga datos técnicos vencidos (`DEC-078`).
- Sin `float` para puntajes ni desempates (`CLAUDE.md` regla 4).
- Sin secretos en el código.
- Este archivo no cambia en el mismo commit que la funcionalidad que estaba fallando.

## 2. Controles con número

"Corre en": **rápido** = `pnpm verify:fast`, al terminar cada tarea, en ≤ 90 s, solo sobre lo que tocó el cambio · **verify** = `pnpm verify`, antes de abrir el PR, en ≤ 5 min · **PR** = CI en cada PR (`pnpm verify:full`) · **nocturno** = CI programada sobre `main` (`pnpm test:nightly`) · **versión** = antes de etiquetar `vX.Y.Z`.

| Dimensión | Regla | Comprobado por | Corre en | Por qué este número |
|---|---|---|---|---|
| Piso | 0 violaciones | `pnpm check:floor` | rápido, PR | Es la barra mínima |
| Tipos | 0 errores | `pnpm typecheck` (`tsc --noEmit`) | rápido (paquetes afectados), PR | TypeScript estricto (`DEC-001`) |
| Lint | 0 errores, incluidas las reglas de §3.1 de `ARCHITECTURE.md` | `pnpm lint` (ESLint) | rápido (archivos afectados), PR | Ídem |
| Límites entre paquetes | 0 violaciones; el dominio no importa Nest, Prisma ni I/O | `dependency-cruiser` | rápido, PR | Dominio puro (`DEC-007`) |
| Secretos | 0 hallazgos | `gitleaks` con `--redact` | rápido (diff), PR | Un secreto publicado está comprometido |
| Pruebas unitarias y de propiedades | 0 fallos; ≥ 200 casos por propiedad con semilla fija | `pnpm test` (Vitest + fast-check) | rápido (pruebas relacionadas), verify, PR | `TESTING.md` §9 |
| Cobertura del dominio | ≥ 90 % de líneas y de ramas en `packages/*` | Vitest con cobertura v8 | verify, PR | `TESTING.md` §9 |
| Cobertura de la API | ≥ 80 % de líneas en `apps/api` | Vitest con cobertura v8, unitarias e integración combinadas (`pnpm test:coverage`) | verify, PR | `TESTING.md` §9; medición en `DEC-094` |
| Contrato | 0 diferencias entre la API y `packages/contracts` (OpenAPI) | pruebas de contrato | verify, PR | `US-008` |
| Trazabilidad | 0 criterios de aceptación sin prueba etiquetada y en verde en historias `DONE` | `pnpm test:trace` | verify, PR | `TEST-PLAN.md` TC-090 |
| Código sin uso | 0 hallazgos | `knip` | PR | Evita código muerto escrito por la IA |
| Integración y e2e | 0 fallos (Testcontainers; Playwright en Chromium) | `pnpm verify:full` | PR | `TEST-PLAN.md` §6.2.5 |
| Pruebas inestables | 0 reintentos en dominio y API; ≤ 1 en e2e; una prueba que solo pasa al reintentar cuenta como fallo | configuración de Vitest y Playwright | PR, nocturno | `TESTING.md` §9 |
| Dependencias | 0 vulnerabilidades críticas o altas alcanzables sin mitigar | `pnpm audit` contra el *lockfile* | PR, versión | `TESTING.md` §9 |
| Accesibilidad | 0 violaciones críticas o graves de WCAG 2.2 AA en páginas públicas y flujo del árbitro | `@axe-core/playwright` | PR (flujos e2e), nocturno | `DEC-053` |
| Navegadores | 0 fallos e2e en Chromium, Firefox, WebKit y perfiles móviles | Playwright | nocturno, versión | `DEC-066` |
| Propiedades a escala | 0 fallos con ≥ 5 000 torneos simulados (semilla aleatoria registrada) | `pnpm test:nightly` | nocturno | `TESTING.md` §9 |
| Motor de referencia | 0 diferencias sin explicar con bbpPairings en `fide-dutch-2026` | comparación de `US-016` | nocturno, versión | `DEC-072` |
| Rendimiento del dominio | regresión ≤ 30 % frente a la línea base; objetivos de `ARCHITECTURE.md` §17 (p. ej. clasificación de 500 jugadores ≤ 100 ms p95) | benchmarks de `US-096` | nocturno, versión | `ARCHITECTURE.md` §17 |
| Tiempo real | ≤ 1 s p95 del *commit* al cliente con 2 000 conexiones por instancia | k6 (`US-054`) | versión | `ARCHITECTURE.md` §17 |
| Mutación (si está activada) | ≥ 70 % en `standings` y `pairing` | Stryker, solo sobre los archivos cambiados en PR | nocturno | `TESTING.md` §9 |

En el nocturno, "bloquea" significa: abre un defecto (`DEF-nnn`) y la versión no se etiqueta hasta cerrarlo (`TEST-PLAN.md` §7).

Controles externos (no los juzga el propio código del proyecto): `gitleaks`, `pnpm audit`, axe (WCAG) y bbpPairings.

## 3. Medido, sin bloquear todavía

| Métrica | Hoy | Dirección |
|---|---|---|
| — | Aún no hay código | Al crearse `US-001`, cualquier métrica nueva entra aquí con su valor real y la dirección "no debe empeorar" |

## 4. Excepciones

| ID | Regla | Ruta | Razón | Dueño | Vence |
|---|---|---|---|---|---|
| W1 | Secretos: 0 hallazgos de gitleaks (§2) | `apps/api/src/common/logging.spec.ts` en el commit `b2fb8ac` (solo historial); huella en `.gitleaksignore` | Contraseña ficticia de una prueba (no es una credencial) que la regla `generic-api-key` marca; el árbol actual usa otro valor desde `7291f7e`. El responsable eligió no reescribir el historial (2026-10-27) | Responsable del proyecto | 2027-01-25 |

Una excepción lleva dueño y fecha de vencimiento (máximo 90 días) y la aprueba el responsable del proyecto.

## 5. Implementación (`US-001`, `US-004`)

- `pnpm verify:fast` = `check:floor` + lint y typecheck de los paquetes afectados + `dependency-cruiser` + `gitleaks` sobre el diff + `vitest related` sobre los archivos cambiados. Presupuesto: ≤ 90 s; si lo supera, se recorta lo que corre en "rápido" y se mueve a "verify", nunca se quita el control.
- `tools/floor-guard.mjs` se adapta de la referencia de la skill *constraint-driven-development* (`references/floor-guard.md`): mismo contrato de salida (0/1/2), detección de umbrales debilitados en este archivo y, como cambio local, `TODO` permitido solo con referencia.
- Los scripts de `package.json` reflejan este archivo; si se desvían, manda este archivo.
