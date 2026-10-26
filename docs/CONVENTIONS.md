# CONVENTIONS.md — Convenciones de código, Git, API y errores

> Reglas para que el repositorio sea consistente sin importar quién (humano o IA) escriba. Estado: `[DECIDIDO]` (2026-10-26).

## 1. Idioma (`DEC-035`)

| Qué | Idioma |
|---|---|
| Identificadores, nombres de archivos, comentarios de código, mensajes de commit, nombres de ramas | **Inglés** |
| Documentación (`docs/`), textos de interfaz, emails, PDF | **Español** (con i18n; otros idiomas después) |
| Términos del dominio en código | Los de `docs/GLOSSARY.md` (columna "Código") |

## 2. TypeScript y estilo

- Configuración estricta de `ARCHITECTURE.md` §3.1. Prohibidos: `any`, `// @ts-ignore`, `as unknown as T`, `!` (salvo tests). Excepciones solo con comentario que cite la razón y una issue.
- `readonly` e inmutabilidad por defecto en el dominio; sin mutación de argumentos.
- Errores esperados del dominio se devuelven como `Result<T, DomainError>`; **no** se lanzan excepciones para flujo normal. Las excepciones se reservan para bugs/infra.
- Tipos de unión discriminados y `switch` exhaustivo (`never` en el `default`).
- Valores monetarios no existen en este alcance; los **puntajes son enteros en medios puntos** (`BR-NUM-01`).
- Tipos marcados (*branded*) para IDs (`TournamentId`, `PlayerId`…).
- Funciones pequeñas y puras en el dominio; efectos solo en la capa de aplicación/infraestructura.
- Formato con Prettier; imports ordenados; `import type` donde corresponda.
- Archivos de ≤ ~300 líneas como guía; si crece, dividir por responsabilidad.

### 2.1 Ejemplo de referencia (dominio y prueba)

Ilustra las reglas de §2, §3, §10 y §12 en un caso real (`BR-SCORE-01`, `BR-SCORE-02`, `BR-NUM-01`). Las firmas exactas de `Result`, `HalfPoints` y `DomainError` las fija `US-011`; si difieren, manda el código de `@torre/core` y este ejemplo se actualiza en ese mismo PR.

```ts
// packages/standings/src/points-for.ts
import { DomainError, err, ok } from '@torre/core';
import type { GameResult, HalfPoints, Result, Side } from '@torre/core';
import type { Scoring } from '@torre/rules';

/**
 * Points one side earns for one game, in half-points (BR-NUM-01).
 * Every value comes from the RuleSet (BR-SCORE-02): no magic numbers.
 *
 * @example pointsFor('DRAW', 'BLACK', scoring) // ok(scoring.draw)
 */
export function pointsFor(
  result: GameResult,
  side: Side,
  scoring: Readonly<Scoring>,
): Result<HalfPoints, DomainError> {
  const isWhite = side === 'WHITE';
  switch (result) {
    case 'WHITE_WINS':
      return ok(isWhite ? scoring.win : scoring.loss);
    case 'BLACK_WINS':
      return ok(isWhite ? scoring.loss : scoring.win);
    case 'DRAW':
      return ok(scoring.draw);
    case 'WHITE_WINS_BY_FORFEIT':
      return ok(isWhite ? scoring.forfeitWin : scoring.forfeitLoss);
    case 'BLACK_WINS_BY_FORFEIT':
      return ok(isWhite ? scoring.forfeitLoss : scoring.forfeitWin);
    case 'DOUBLE_FORFEIT':
      return ok(scoring.doubleForfeit);
    // Byes have no opponent, so the side is irrelevant (BR-SCORE-04, BR-WD-03).
    case 'PAIRING_BYE':
      return ok(scoring.pairingBye);
    case 'HALF_POINT_BYE':
      return ok(scoring.halfPointBye);
    case 'ZERO_POINT_BYE':
      return ok(scoring.zeroPointBye);
    case 'PENDING':
      // A pending game is an expected state, not a bug: return it, do not throw (US-012:AC3).
      return err(new DomainError('RESULT_PENDING', { result }));
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
```

```ts
// packages/standings/src/points-for.spec.ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ok } from '@torre/core';
import { aScoring, PROPERTY_RUNS, PROPERTY_SEED } from '@torre/testing';
import { pointsFor } from './points-for.js'; // ESM + nodenext: relative imports carry .js (DEC-071)

const DECIDED = ['WHITE_WINS', 'BLACK_WINS', 'DRAW'] as const;

describe('pointsFor', () => {
  it('[US-012:AC2][BR-SCORE-02] should take the winner and loser points from the RuleSet when white wins', () => {
    const scoring = aScoring().build(); // builder from @torre/testing, never literals spread across tests

    expect(pointsFor('WHITE_WINS', 'WHITE', scoring)).toEqual(ok(scoring.win));
    expect(pointsFor('WHITE_WINS', 'BLACK', scoring)).toEqual(ok(scoring.loss));
  });

  it('[US-012:AC3] should report RESULT_PENDING when the game has no result yet', () => {
    const outcome = pointsFor('PENDING', 'WHITE', aScoring().build());

    expect(outcome.ok).toBe(false);
  });

  it('[US-012:AC1][INV-S-1][TC-006] should hand out win + loss or two draws for every decided game', () => {
    fc.assert(
      fc.property(fc.constantFrom(...DECIDED), (result) => {
        const scoring = aScoring().build();
        const white = pointsFor(result, 'WHITE', scoring);
        const black = pointsFor(result, 'BLACK', scoring);
        const expected = result === 'DRAW' ? 2 * scoring.draw : scoring.win + scoring.loss;

        expect(white.ok && black.ok && white.value + black.value).toBe(expected);
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED }, // 200 runs, fixed seed in PRs (TESTING.md §9)
    );
  });
});
```

Qué muestra: nombres en inglés y comentarios que citan reglas; `readonly` y sin mutación; error esperado como `Result`, no excepción; `switch` exhaustivo con `never`; valores solo del `RuleSet`; una prueba por comportamiento, con etiquetas `[US-nnn:ACk]`, `[TC-nnn]`, `[BR-…]` e `[INV-…]`, *builders* de `@torre/testing` y semilla fija.

## 3. Estructura y nombres

| Elemento | Convención |
|---|---|
| Archivos y carpetas | `kebab-case` (`standings-calculator.ts`) |
| Clases y tipos | `PascalCase` |
| Funciones y variables | `camelCase` |
| Constantes | `UPPER_SNAKE_CASE` solo para constantes verdaderas |
| Componentes Vue | `PascalCase.vue` |
| Composables | `useXxx` |
| Eventos de dominio | Pasado, `PascalCase` (`GameResultRecorded`) |
| Comandos | Imperativo, `PascalCase` (`RecordGameResult`) |
| Pruebas | `*.spec.ts` junto al código (unitarias) y `test/` (integración) |
| Módulos Nest | un directorio por módulo con `*.module.ts`, `*.controller.ts`, `*.service.ts` |
| Paquetes | `@torre/<nombre>` (`DEC-063`) |

Cada paquete expone una API pública desde `src/index.ts`; nadie importa rutas internas de otro paquete/módulo.

## 4. Git y ramas

- **Trunk-based** con ramas cortas desde `main`: `feat/US-015-swiss-v1`, `fix/…`, `chore/…`, `docs/…`.
- `main` siempre verde y desplegable; protegida (requiere CI verde y revisión).
- Una rama por historia (o sub-historia). PR pequeños (< ~400 líneas de diff netas como guía).
- Etiquetas de versión `vX.Y.Z` al cerrar rebanadas verticales.

## 5. Commits y Pull Requests

- **Conventional Commits** en inglés: `feat(pairing): add round-1 fold pairing (US-015)`; tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `build`, `ci`.
- Un commit = un cambio lógico. El cuerpo explica el *por qué* cuando no es obvio.
- Todo PR usa `docs/templates/pr-checklist.md`: historia, criterios cubiertos, pruebas, documentación actualizada, riesgos.
- Un PR no mezcla refactor con cambio de comportamiento.

## 6. Errores y códigos (`DEC-019`)

- Todo error expuesto tiene un **código estable** `UPPER_SNAKE_CASE`; el texto lo pone el front por i18n.
- Formato HTTP: `application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "Game already has a result",
  "status": 409,
  "code": "GAME_ALREADY_HAS_RESULT",
  "detail": "Use the correction endpoint.",
  "correlationId": "01HZX…",
  "errors": [{ "path": "result", "code": "…", "message": "…" }]
}
```

- Catálogo inicial (se amplía por historia; vive en `packages/contracts/src/errors.ts`):

| Código | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Esquema Zod inválido |
| `UNAUTHENTICATED` | 401 | Sin sesión válida |
| `FORBIDDEN` | 403 | Sin permiso para la acción/recurso |
| `NOT_FOUND` | 404 | Recurso inexistente o fuera del tenant |
| `VERSION_CONFLICT` | 409 | Conflicto de concurrencia no resuelto por reintento |
| `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD` | 422 | Misma clave, distinto cuerpo |
| `INVALID_TRANSITION` | 409 | Transición de estado no permitida (`BR-LIFE-*`) |
| `ROUND_NOT_PUBLISHED` | 409 | Resultado sobre ronda no publicada |
| `ROUND_CLOSED` | 409 | Cambio sobre ronda cerrada |
| `GAME_ALREADY_HAS_RESULT` | 409 | Resultado ya registrado |
| `NO_VALID_PAIRING` | 422 | El motor no encuentra emparejamiento válido (`BR-PAIR-09`) |
| `RULESET_NOT_APPROVED` | 422 | Uso de `RuleSet` no aprobado |
| `RULESET_PARAMETER_MISSING` | 422 | Parámetro del `RuleSet` sin definir (`BR-GEN-03`) |
| `NOT_IMPLEMENTED_POLICY` | 501 | Política declarada pero no implementada (p. ej. rondas no jugadas `FIDE_C07_2026` sin casos dorados) |
| `ELIGIBILITY_NOT_VERIFIED` | 422 | Inscripción sin marca de elegibilidad cuando el `RuleSet` la exige (`BR-REG-01`) |
| `ENTRY_QUOTA_EXCEEDED` | 422 | Cupo de inscripción superado (`BR-REG-06`) |
| `CLAIM_OUT_OF_TIME` | 422 | Reclamación fuera de plazo (`BR-AUD-07`) |
| `ROLE_REQUEST_DUPLICATE` | 409 | Ya hay una solicitud pendiente para ese rol y alcance (`BR-ROLE-03`) |
| `ROLE_ALREADY_GRANTED` | 409 | La cuenta ya tiene ese rol en ese alcance (`BR-ROLE-03`) |
| `ROLE_REQUEST_NOT_PENDING` | 409 | La solicitud ya fue resuelta, retirada o venció (`BR-ROLE-04`) |
| `PASSWORD_CONFIRMATION_REQUIRED` | 423 | Acción sensible sin confirmación de contraseña reciente (`BR-AUTH-05`) |
| `TWO_FACTOR_CODE_INVALID` | 422 | Código TOTP o de recuperación inválido (`BR-AUTH-06`) |
| `ACCOUNT_SUSPENDED` | 403 | Cuenta suspendida o anonimizada (`BR-AUTH-08`) |
| `RESERVED_PERMISSION` | 422 | Intento de asignar un permiso reservado a un rol distinto de `platform_admin` (`AUTHORIZATION.md` §4.1) |
| `RESTORE_CONFLICT` | 409 | Restaurar violaría una restricción de unicidad (`BR-DEL-05`) |
| `HAS_ACTIVE_TOURNAMENTS` | 409 | No se puede borrar una organización con torneos en curso (`BR-DEL-04`) |
| `IDEMPOTENCY_REQUEST_IN_PROGRESS` | 409 | Llega un duplicado mientras la primera petición con esa clave sigue en curso (`DEC-062`) |
| `TWO_FACTOR_REQUIRED` | 403 | `platform_admin` sin 2FA activo intenta usar un permiso reservado (`BR-AUTH-06`) |
| `PASSWORD_POLICY_VIOLATION` | 422 | La contraseña no cumple `BR-AUTH-09` |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Archivo de un tipo no permitido, comprobado por su firma (`DEC-076`) |
| `PAYLOAD_TOO_LARGE` | 413 | Cuerpo, importación o archivo por encima del límite (`DEC-075`, `DEC-076`) |
| `VISIBILITY_EXCEEDS_TOURNAMENTS` | 422 | Un campeonato visible tendría un torneo privado (`BR-CHAMP-06`) |
| `TPN_LOCKED` | 409 | Se intenta cambiar el orden inicial después de emparejar la ronda 4 (`BR-REG-04`) |
| `CHECK_IN_NOT_CLOSED` | 409 | Se intenta emparejar una ronda cuyo check-in no se abrió o sigue abierto (`BR-WD-06`) |
| `CHECK_IN_CLOSED` | 409 | Se intenta marcar el check-in con la ventana cerrada (`BR-WD-06`) |
| `RATE_LIMITED` | 429 | Límite de tasa |
| `INTERNAL_ERROR` | 500 | Error inesperado (con `correlationId`) |

- Errores de dominio: clase `DomainError { code, details }` dentro de `Result`; el filtro global los mapea a HTTP.
- **Nunca** devolver trazas ni mensajes internos al cliente.

## 7. i18n

- Claves jerárquicas por funcionalidad: `tournament.round.closeConfirm.title`. Nunca texto literal en componentes.
- `es` es la fuente; `en` debe tener las mismas claves (prueba de paridad). `pt` se difiere (`OQ-019`).
- Mensajes de error por `code`: `errors.GAME_ALREADY_HAS_RESULT`.
- Pluralización y formatos con `vue-i18n`/`Intl`; fechas con zona `America/Bogota`.
- Emails y PDF reciben `locale` como parámetro.

## 8. Convenciones de API (resumen; detalle `ARCHITECTURE.md` §9)

- `/api/v1/<recurso-plural>`; verbos HTTP semánticos; comandos de torneo como sub-recursos (`…/rounds/{n}/publish`).
- Fechas ISO-8601 UTC; IDs UUID; puntos como enteros en medios puntos **más** campo de presentación solo cuando haga falta.
- Mutaciones del torneo: cabecera `Idempotency-Key` obligatoria; respuesta incluye `streamVersion`.
- Listados con cursor; filtros `filter[campo]`, orden `sort=-campo`.
- Respuestas de lectura con `ETag` y `streamVersion`.

## 9. Base de datos y migraciones

- Tablas y columnas en `snake_case`; PK UUID v7; `timestamptz` UTC; `organization_id` en toda tabla de tenant con RLS (`US-025`).
- **Migraciones hacia adelante** y revisadas; nunca editar una migración ya aplicada en un entorno compartido.
- Cambios destructivos en dos pasos (expandir → migrar datos → contraer).
- `events` es **append-only**: sin `UPDATE`/`DELETE` (trigger + privilegios).
- **Sin `DELETE` físico** en las tablas de negocio: borrado lógico con `deleted_at`, `deleted_by`, `delete_reason` y `deletion_batch_id`; restricciones de unicidad como índices parciales `WHERE deleted_at IS NULL` (`BR-DEL-02`, `ARCHITECTURE.md` §8.4).
- Los permisos se consultan por clave del catálogo (`AUTHORIZATION.md` §4.1); **prohibido** decidir por nombre de rol en el código (`if (role === 'arbiter')`).
- Consultas crudas siempre parametrizadas.
- Seeds idempotentes; datos demo marcados como demo.

## 10. Logging

- `pino` JSON; nivel por entorno; campos: `requestId/correlationId`, `userId`, `organizationId`, `tournamentId`.
- **Prohibido** registrar contraseñas, tokens, emails completos, cuerpos completos de peticiones sensibles.
- Mensajes en inglés, con datos estructurados en lugar de concatenar cadenas.

## 11. Dependencias

- Agregar una dependencia requiere justificarla (historia o ADR): licencia revisada, mantenimiento, tamaño, alternativa evaluada.
- Versiones exactas en el lockfile; actualizaciones por PR automatizado y con CI verde.
- Prohibido introducir dependencias dentro de `packages/core`, `rules`, `standings`, `pairing`, `ratings`, `tournament` salvo Zod y utilidades puras justificadas.

## 12. Comentarios y documentación

- El código explica el **qué**; los comentarios el **por qué**. Referencian reglas: `// BR-PAIR-05: bye goes to the lowest eligible…`.
- Pendientes: `TODO(OQ-nnn): …` o `TODO(US-nnn): …`. Prohibido `TODO` sin referencia.
- Funciones públicas de los paquetes de dominio tienen TSDoc con ejemplo mínimo y las reglas que implementan.
- Cambios de comportamiento actualizan `docs/` en el mismo PR.

## 13. Seguridad en el código

- Validar toda entrada con Zod (modo estricto) en el borde.
- No confiar en IDs del cliente para autorizar; cargar el recurso y comprobar condiciones.
- Sin secretos en el repo; solo variables de entorno validadas.
- Escapar/sanear salidas (HTML de emails, PDF, CSV con protección contra inyección de fórmulas).
- Comparaciones de tokens en tiempo constante; tokens aleatorios con fuente criptográfica (solo en capa de infraestructura, no en dominio).
