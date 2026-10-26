import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { envSchema, SECRET_VARIABLES } from './env.schema.js';
import type { Env, EnvVariable } from './env.schema.js';

const REDACTED = '[redacted]';
const VARIABLES = Object.keys(envSchema.shape) as EnvVariable[];

/**
 * Typed access to the validated environment (US-005:AC2): the only way the API reads configuration.
 * Serialising or inspecting it (a log line, `JSON.stringify`, `console.log`) hides every secret (US-005:AC3).
 */
@Injectable()
export class AppConfig {
  constructor(@Inject(ConfigService) private readonly config: ConfigService<Env, true>) {}

  get<K extends EnvVariable>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  toJSON(): Record<string, unknown> {
    return Object.fromEntries(VARIABLES.map((key) => [key, SECRET_VARIABLES.includes(key) ? REDACTED : this.get(key)]));
  }

  [Symbol.for('nodejs.util.inspect.custom')](): Record<string, unknown> {
    return this.toJSON();
  }
}
