# ADR-0002 — Contratos de API con oRPC: resultado de la prueba previa

- **Estado:** Aceptado (decidido por la IA durante `US-008` con la lista de verificación de la historia; el responsable puede vetarlo)
- **Fecha:** 2026-10-27
- **Decide:** IA, con la instrucción del responsable de continuar sin parar
- **Relacionado:** `DEC-060`, `DEC-020`, `DEC-037`, `R2` (`ARCHITECTURE.md` §18), `US-008`, `ADR-0004`

## Contexto

`DEC-060` eligió oRPC para declarar la API una sola vez (contrato Zod con ruta y método) y obtener de ahí el servidor Nest, el cliente tipado y el OpenAPI, con la condición de una prueba previa. Si fallaba un punto sin solución razonable, se volvía a `nestjs-zod` + cliente propio (`DEC-020`). La prueba se hizo con oRPC 1.16.1 (`@orpc/contract`, `@orpc/server`, `@orpc/nest`, `@orpc/openapi`, `@orpc/zod`, `@orpc/client`, `@orpc/openapi-client`; MIT, verificadas en npm el 2026-10-27), Nest 12.2.0 sobre Express 5.3.0 y Zod 4.6.7.

## Resultado por punto (criterio 2 de `US-008`)

Todos los puntos se comprueban en `apps/api/src/system/contracts.spec.ts` con un contrato de prueba que existe solo en ese archivo y con el contrato real `ping`.

| Punto | Resultado | Cómo |
|---|---|---|
| Controlador Nest sobre Express con `@orpc/nest` | ✅ | `@Implement(contrato)` + `implement(contrato).handler(…)`; la ruta sale del contrato y recibe el prefijo global `/api/v1` |
| Autorización | ✅ | Un *guard* de Nest (`@UseGuards`) sobre el método con `@Implement` corre antes del *handler*; su rechazo sale como `403 FORBIDDEN` en `problem+json`. `AuthorizationService` (`US-024`) se usará igual |
| Errores `problem+json` con códigos estables | ✅ | `experimental_RethrowHandlerPlugin` devuelve a Nest todo error del *handler*; `ProblemDetailsFilter` (`US-006`) responde `ApiError`, `HttpException` y `ORPCError`. Un fallo de validación de entrada da `400 VALIDATION_FAILED` con `errors[]` por campo (`path`, `code`, `message`); una salida que rompe su contrato da `500 INTERNAL_ERROR` sin detalles |
| `Idempotency-Key`, `X-Correlation-Id` y cookies | ✅ | Con `inputStructure: 'detailed'` el contrato declara y valida la cabecera (`headers['idempotency-key']`) y el OpenAPI la documenta; `RequestHeadersPlugin` da `context.reqHeaders` (el *middleware* de correlación escribe el id resuelto en la cabecera) y `getCookie` de `@orpc/server/helpers` lee las cookies sin dependencias nuevas |
| `ETag` / `If-None-Match` | ✅ | El *handler* fija `etag` con `ResponseHeadersPlugin` (`context.resHeaders`); un `sendResponseInterceptor` deja que Express responda `304` cuando `If-None-Match` coincide (comparación débil, lista y `*`) |
| Validación estricta | ✅ | `z.strictObject` rechaza campos desconocidos: `errors[]` trae uno por campo con `code: 'unrecognized_keys'` |
| OpenAPI generado | ✅ | `OpenAPIGenerator` + `ZodToJsonSchemaConverter` de `@orpc/zod/zod4` produce OpenAPI 3.1.1 con `servers: [{ url: '/api/v1' }]`; se sirve en `/api/docs` fuera de producción (criterio 4) |
| Cliente tipado contra el servidor real (TC-046) | ✅ | `createORPCClient(new OpenAPILink(apiContract, { url }))` contra la app escuchando en un puerto real; los tipos salen de `ContractRouterClient<ApiContract>`; un error llega como `ORPCError` con su `status` |
| Cliente Vue con `@orpc/vue-query` y claves invalidables | ⏳ en `US-009` | La web no existe todavía. `@orpc/vue-query` es una capa sobre el mismo cliente (claves de consulta derivadas de la ruta del contrato); `US-009` (criterio 3) lo instala y prueba la invalidación. Si fallara, el cliente Vue usa `@tanstack/vue-query` con las claves escritas a mano sobre el mismo cliente tipado, sin cambiar los contratos |
| Compilación (el punto decía SWC) | ✅ | `ADR-0004` sacó SWC: se compila con `tsc` (metadatos de decoradores incluidos) y Vitest transforma con oxc. `pnpm build` y `node apps/api/dist/main.js` sirven `GET /api/v1/ping` y `/api/docs` |

## Decisión

Se confirma `DEC-060`: la API se declara con contratos oRPC en `@torre/contracts` y se implementa con `@orpc/nest`. `DEC-020` queda como alternativa no usada.

Reglas que salen de la prueba:

1. Toda operación de la API es un contrato de `apiContract`; una prueba recorre las rutas de Nest y falla si alguna no viene de un contrato (salvo `/health/live`, `/health/ready` y `/api/docs`) o si un contrato no está implementado.
2. Los objetos de entrada y salida son `z.strictObject`; las cabeceras se declaran con `inputStructure: 'detailed'` (el objeto de cabeceras no es estricto, porque el navegador añade otras).
3. Los *handlers* lanzan `ApiError` (`apiError(code)`); nunca `ORPCError` con códigos propios, para que el catálogo de `CONVENTIONS.md` §6 siga siendo la única fuente de códigos.
4. El contexto de oRPC solo lleva cabeceras; lo demás (usuario, tenant) llega por Nest (*guards* y `nestjs-cls`, `US-022`, `US-025`).

## Consecuencias

- **Positivas:** un solo origen para servidor, cliente y OpenAPI; validación de entrada y salida; errores con el mismo formato que el resto de la API.
- **Negativas / costos:** siete paquetes `@orpc/*` más; la ruta de errores depende de un *plugin* marcado como experimental.
- **Riesgos y mitigación:**
  - `experimental_RethrowHandlerPlugin` puede cambiar de nombre o de comportamiento. Las pruebas de errores de `contracts.spec.ts` fallan si deja de devolver los errores a Nest; la alternativa es un `customErrorResponseBodyEncoder` que escriba `problem+json` desde oRPC.
  - Después del interceptor de oRPC, Nest vuelve a llamar a `reply` con un cuerpo vacío. Es inocuo con una respuesta ya enviada, salvo en el `304`; por eso el `304` lo genera Express y no oRPC (comentado en `apps/api/src/common/orpc.module.ts`).
  - La documentación de oRPC en línea ya describe la versión 2 (otro nombre para el *plugin*, `context` como función). Al actualizar a la versión 2 se escribe un ADR nuevo.

## Verificación

- `apps/api/src/system/contracts.spec.ts` (9 pruebas, etiquetas `US-008:AC1`, `AC2`, `AC4`, `AC5` y `TC-046`), incluida la comparación del OpenAPI generado con `packages/contracts/openapi.json`, que se versiona: un cambio de contrato se ve en la revisión como un cambio de ese archivo (`vitest -u` lo reescribe).
- `tools/adr-0002.test.mjs` (`US-008:AC3`): cada punto de la lista tiene resultado y la decisión nombra la alternativa no usada.
- `pnpm build` y `node apps/api/dist/main.js`: `GET /api/v1/ping` → `200 {"pong":true}`; `/api/docs` → OpenAPI 3.1.1; `POST /api/v1/ping` → `404` en `problem+json`.
