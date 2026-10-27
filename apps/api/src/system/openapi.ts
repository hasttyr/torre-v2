import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { API_BASE_PATH, apiContract } from '@torre/contracts';

let document: Promise<unknown> | undefined;

/** The OpenAPI 3.1 document of every contract (US-008:AC2), generated once per process. */
export function openApiDocument(): Promise<unknown> {
  document ??= new OpenAPIGenerator({ schemaConverters: [new ZodToJsonSchemaConverter()] }).generate(apiContract, {
    info: { title: 'Torre API', version: '1' },
    servers: [{ url: API_BASE_PATH }],
  });
  return document;
}
