# AI-WORKFLOW.md — Cómo trabajar con la IA sin que falle nada

> Para el responsable del proyecto y para la IA (Claude Code). `CLAUDE.md` es el resumen que la IA lee siempre; este documento es el detalle. Estado: `[DECIDIDO]` (2026-10-26).

## 1. Principios

1. **La documentación es el contrato; el código es su consecuencia.** Si el código y el documento difieren, uno está mal y se corrige en el mismo cambio.
2. **Una historia por sesión.** Contexto pequeño y enfocado produce mejores resultados que sesiones largas con muchas cosas.
3. **Las pruebas expresan los criterios.** Primero (o junto con) el código: la IA no se evalúa a sí misma con su propia opinión sino con pruebas.
4. **La IA no inventa reglas.** Lo desconocido es un parámetro, una pregunta (`OQ-*`) o un `TODO(OQ-nnn)`, nunca una suposición silenciosa (`BR-GEN-03`).
5. **Verificación independiente para lo crítico.** Emparejamientos, desempates, Elo y autorización se verifican con oráculos, casos dorados y propiedades; no con "se ve bien".
6. **Humano en las decisiones, IA en la ejecución.** El responsable decide reglas, alcance y arquitectura; la IA propone, implementa y verifica.

## 2. Flujo por historia

```
Elegir historia → Definition of Ready → Plan corto → Pruebas → Implementación
  → Verificación local → Revisión (checklist §7) → Documentación → PR → Hecho
```

| Paso | Qué ocurre | Quién |
|---|---|---|
| 1. Elegir | Siguiente historia sin dependencias pendientes (nivel de `USER-STORIES.md`) respetando la rebanada vertical en curso | Humano |
| 2. Ready | Se comprueba la lista DoR (§6.1). Si falla, no se empieza | IA propone, humano decide |
| 3. Plan | La IA resume en ≤ 10 líneas: archivos a tocar, pruebas a escribir, riesgos, dudas | IA |
| 4. Pruebas | Se escriben las pruebas de los criterios de aceptación; deben **fallar** primero (rojo) | IA |
| 5. Implementar | Código mínimo para pasar (verde), luego refactor | IA |
| 6. Verificar | `lint`, `typecheck`, `test` del alcance; si toca contratos/DB, también regenerar y migrar | IA |
| 7. Revisar | Revisión con el checklist §7 (la IA se autorrevisa; el humano revisa lo crítico) | IA + humano |
| 8. Documentar | Actualizar docs afectados, estado de la historia, `DEC-*`/ADR si hubo decisión | IA |
| 9. PR | Plantilla `docs/templates/pr-checklist.md` | IA |

Modo de revisión según el riesgo:

| Tipo de cambio | Revisión humana |
|---|---|
| Dominio crítico (pairing, standings, ratings, decider, authz, RLS) | **Obligatoria**, línea por línea de pruebas y reglas citadas |
| Contratos, migraciones, eventos | **Obligatoria** |
| Infra y CI | Recomendada |
| UI de presentación, textos, estilos | Muestreo / revisión visual |

## 3. Plantillas de prompts

Sustituye lo que está entre `<…>`. Pega la historia o indica su ruta.

### 3.1 Iniciar una historia

```
Lee CLAUDE.md. Vamos a implementar <US-nnn> (docs/stories/<EP-xx>.md).
Lee solo lo que la historia referencia. Antes de escribir código:
1) confirma que cumple la Definition of Ready (AI-WORKFLOW §6.1);
2) lista dudas o contradicciones entre documentos;
3) propón un plan de ≤10 líneas (archivos, pruebas, riesgos).
No escribas código hasta que apruebe el plan.
```

### 3.2 Escribir primero las pruebas

```
Para <US-nnn>, escribe SOLO las pruebas que expresan los criterios de aceptación
(unitarias, propiedades con fast-check y casos dorados citados: <GV-nnn/INV-xxx>).
Ejecútalas y muéstrame que fallan por la razón correcta. No implementes todavía.
```

### 3.3 Implementar

```
Implementa lo mínimo para que pasen las pruebas de <US-nnn>, respetando
CLAUDE.md §3 y la dirección de dependencias. Después ejecuta lint, typecheck y
tests de los paquetes afectados y corrige. No toques nada fuera del alcance.
Si necesitas una dependencia nueva o una decisión, detente y pregunta.
```

### 3.4 Revisar (independiente)

```
Revisa el diff de <US-nnn> como un revisor escéptico que NO escribió el código.
Usa el checklist de AI-WORKFLOW §7. Para cada criterio de aceptación indica la
prueba que lo cubre (archivo y nombre). Señala reglas BR-* no cubiertas,
violaciones de CLAUDE.md §3 y cualquier cosa asumida sin fuente.
```

### 3.5 Corregir un bug de dominio

```
Hay un resultado incorrecto: <entrada → obtenido vs. esperado>. Primero escribe
una prueba mínima que lo reproduzca (si procede, un caso dorado nuevo con la
fuente del resultado esperado). Luego corrige. Explica qué regla BR-* aplica y
si la documentación necesita cambiar.
```

### 3.6 Cuando falta información

```
No avances con <tema>. Está marcado [PENDIENTE-ASCUN]/[VERIFICAR]. Haz lo que
sí está desbloqueado, deja el parámetro en el RuleSet con TODO(OQ-nnn) y
resume qué decisión necesitas de mí para cerrarlo.
```

### 3.7 Cierre de sesión

```
Cierra la sesión: resumen de lo hecho, pruebas añadidas y su estado, estado de
la historia, documentación actualizada, deuda o riesgos que quedan, y la
siguiente historia recomendada. Guarda el resumen en docs/HANDOFF.md.
```

## 4. Higiene de contexto (Claude Code Pro)

El plan Pro tiene límites de uso y de contexto; hay que gastarlos bien.

- **Una historia por sesión; sesión nueva por historia.** Empieza con `CLAUDE.md` + la historia + sus referencias, nada más.
- **No pegues documentos enteros**: señala la sección (`CORE-BUSINESS.md` §6, `BR-PAIR-03`). Los documentos están numerados para eso.
- **Divide los archivos grandes** (por eso hay un archivo por épica).
- **Pide resúmenes, no volcados**: "resume los cambios" en lugar de pegar diffs completos de vuelta.
- **Usa `docs/HANDOFF.md`** para continuar entre sesiones en lugar de reexplicar.
- **Ejecuta comandos acotados** (`pnpm --filter @torre/pairing test`) y no toda la suite en cada iteración.
- **Evita ráfagas largas de exploración**; si la IA necesita "entender el repositorio", falta un mapa: añádelo a la documentación.
- Para tareas grandes y repetitivas (p. ej. generar muchos casos de prueba), pide un **script generador** en lugar de salida manual extensa.

## 5. Guard rails

### 5.1 Automáticos (los que no dependen de que la IA "se acuerde")

| Guarda | Qué impide | Historia |
|---|---|---|
| `strict` + flags + ESLint `no-explicit-any` | Tipado flojo | US-001, US-002 |
| dependency-cruiser | Dependencias prohibidas entre paquetes (dominio puro) | US-001 |
| ESLint `no-restricted-globals/properties` en dominio | `Date.now`, `Math.random`, `process`, `fs` | US-002 |
| Trigger y privilegios de `events` | `UPDATE`/`DELETE` sobre eventos | US-045 |
| RLS forzado + prueba de cada tabla | Fugas entre tenants | US-025 |
| ESLint sobre importaciones de UI | Mezcla de librerías de UI | US-009 |
| Pruebas de paridad i18n | Claves faltantes | US-075 |
| Umbrales de cobertura/mutación por paquete | Dominio sin probar | US-004, `TESTING.md` §9 |
| CI obligatoria en `main` | Código roto en la rama principal | US-004 |
| Hooks pre-commit (lint-staged, commitlint) | Formato y mensajes de commit | US-001 |

### 5.2 De proceso

- Estado `BLOCKED` explícito en historias que dependen de `OQ-*`.
- Revisión humana obligatoria en los cambios críticos (§2).
- Cada decisión nueva se registra (`DEC-*` o ADR) en el mismo PR.
- Casos dorados con **fuente del valor esperado** anotada; nunca derivados ejecutando el código que se prueba.

## 6. Definition of Ready / Definition of Done

### 6.1 Definition of Ready (para empezar)

- [ ] Todas las historias de "Depende de" están `DONE`.
- [ ] La historia no está `BLOCKED` por una `OQ-*` o la parte bloqueada está fuera de este alcance.
- [ ] Los criterios de aceptación son verificables (se pueden convertir en una prueba).
- [ ] Las referencias (`BR-*`, `DEC-*`, `INV-*`) existen y no están en conflicto.
- [ ] Se sabe en qué paquete/módulo va cada cosa (no hay duda de dirección de dependencias).
- [ ] Tamaño razonable: S o M. Una L se divide al empezar en sub-historias de una sesión (§8); una XL se divide antes de planificarla.

### 6.2 Definition of Done (para cerrar)

**Siempre**
- [ ] Cada criterio de aceptación tiene al menos una prueba automática que pasa, etiquetada `[US-nnn:ACk]` (y `[TC-nnn]` si corresponde); `pnpm test:trace` lo confirma para la historia.
- [ ] `lint` y `typecheck` sin errores; **sin** supresiones nuevas (`any`, `@ts-ignore`, `eslint-disable`) salvo justificadas con issue.
- [ ] Sin cambios fuera del alcance de la historia.
- [ ] Documentación afectada actualizada (reglas, decisiones, contratos, GLOSSARY si hay términos nuevos).
- [ ] Estado de la historia actualizado a `DONE` con enlace al PR/commit; `USER-STORIES.md` regenerado si cambió algún dato del índice.
- [ ] Sin secretos, datos personales reales ni `console.log` olvidados.

**Dominio (`packages/*`)**
- [ ] Propiedades `INV-*` relevantes probadas con `fast-check` (semilla reproducible en el fallo).
- [ ] Casos dorados con `source`, `verifiedBy` y `verifiedAt`; contraejemplos de fast-check guardados en `test/regressions/`.
- [ ] Sin `Date.now`, `Math.random`, I/O; dependency-cruiser en verde.
- [ ] Cobertura/mutación sobre el umbral del paquete (`TESTING.md`).
- [ ] Cada regla implementada cita su `BR-*` en comentario o nombre de prueba.

**API / backend**
- [ ] Esquemas Zod en `packages/contracts` y OpenAPI regenerado.
- [ ] Autorización con prueba de acceso permitido, denegado y de otro tenant (IDOR).
- [ ] Errores con código estable (`CONVENTIONS.md` §6); idempotencia en mutaciones de torneo.
- [ ] Migración revisada y reversible en estrategia (expandir/contraer).
- [ ] Sin `DELETE` físico: borrado lógico y solo `platform_admin` (`BR-DEL-*`); permisos por clave del catálogo, no por nombre de rol.
- [ ] Prueba de integración con base de datos real (Testcontainers).

**UI**
- [ ] Estados de carga, vacío y error.
- [ ] Textos por i18n (es y en con las mismas claves).
- [ ] Teclado, foco y contraste verificados; sin color como único canal.
- [ ] Solo componentes de `shared/ui`.
- [ ] Prueba de componente y, si es flujo crítico, e2e.

## 7. Checklist de revisión

| # | Pregunta | Dónde mirar |
|---|---|---|
| 1 | ¿Cada criterio de aceptación tiene una prueba y esa prueba fallaría si el código estuviera mal? | Pruebas |
| 2 | ¿Se implementó exactamente lo que dice la regla `BR-*`, o una versión "razonable" distinta? | Código vs. `CORE-BUSINESS.md` |
| 3 | ¿Hay valores, órdenes o umbrales fijos que deberían ser parámetros del `RuleSet`? | Constantes |
| 4 | ¿Se usó `float`, `Date.now`, `Math.random` o iteración con orden no determinista (p. ej. `Set` sin ordenar) en dominio? | Dominio |
| 5 | ¿Los empates de ordenación tienen desempate total y estable? | `sort` |
| 6 | ¿Hay un `any`, `as`, `!` o supresión nuevos? | Diff |
| 7 | ¿El caso límite está probado (0, 1, 2 jugadores; impares; todos empatan; retiros; bye)? | Pruebas |
| 8 | ¿Se respetan las dependencias entre paquetes y la API pública (`index.ts`)? | Imports |
| 9 | ¿Toda consulta de tenant pasa por el contexto RLS? ¿Hay prueba cruzada de tenants? | Repositorios |
| 10 | ¿La autorización comprueba el recurso, no solo el rol? | Guards/CASL |
| 11 | ¿Los eventos nuevos tienen versión, `reason` si aplica y carga mínima? | Esquemas |
| 12 | ¿Los errores devuelven código estable y no filtran detalles internos? | Filtros |
| 13 | ¿Se actualizó la documentación y no quedó contradicción entre documentos? | Docs |
| 14 | ¿Se añadió dependencia sin justificar? | `package.json` |
| 15 | ¿El PR hace una sola cosa? | Diff |

## 8. Cuándo dividir una historia

Divide si ocurre cualquiera de estas:
- Toca **más de un paquete de dominio** de forma sustancial.
- Necesita más de ~**una sesión** o su plan tiene más de ~10 pasos.
- Mezcla **dominio + API + UI** (separa por capas verticales: primero dominio con pruebas, luego API, luego UI).
- Los criterios de aceptación pasan de ~**8**.
- Aparecen decisiones de reglas sin confirmar a mitad del trabajo (separa lo desbloqueado).

Cómo: crear sub-historias `US-nnn-a/b` (o nuevas `US-nnn`) en el mismo archivo de épica, repartir criterios, ajustar dependencias y regenerar el índice.

## 9. Continuidad entre sesiones (`docs/HANDOFF.md`)

Al cerrar cada sesión se actualiza `HANDOFF.md` con: historia trabajada y estado, decisiones tomadas, pruebas añadidas, deuda técnica, preguntas abiertas nuevas, y siguiente paso recomendado. La sesión siguiente lo lee tras `CLAUDE.md`. No es historial: se **sobrescribe** (el historial vive en Git y en los PR).

## 10. Antipatrones de la IA (y contramedida)

| Antipatrón | Contramedida |
|---|---|
| Inventar una regla "estándar" de ajedrez o de ASCUN | `CLAUDE.md` §3.1; revisión #2; parámetros en `RuleSet` |
| Escribir la prueba a partir del resultado del propio código | Casos dorados con fuente; oráculo independiente |
| "Arreglar" una prueba que falla cambiando la expectativa | La revisión exige explicar por qué la expectativa estaba mal, citando la regla |
| Suprimir el error de tipos o de lint | Regla de cero supresiones; DoD |
| Sobreingeniería (abstracciones no pedidas) | Alcance de la historia; "Fuera de alcance" |
| Cambios en cascada fuera del alcance | PR de una sola cosa; revisión #15 |
| Duplicar utilidades que ya existen | Buscar antes de crear; índice de paquetes en `ARCHITECTURE.md` §5 |
| Dar por hecho que un comando existe | `CLAUDE.md` §6 |
| Marcar `DONE` sin ejecutar nada | Evidencia obligatoria en el PR (salida de comandos) |
| Perder el hilo en sesiones largas | §4 higiene de contexto, `HANDOFF.md` |
| Mezclar idiomas en el código | `CONVENTIONS.md` §1 |
| Introducir aleatoriedad o tiempo en el dominio | ESLint + dependency-cruiser; revisión #4 |
