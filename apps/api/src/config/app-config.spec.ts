import { readFileSync } from 'node:fs';
import { inspect, parseEnv as parseDotenv } from 'node:util';
import { Inject, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../app.module.js';
import { AppConfig } from './app-config.js';
import { InvalidEnvironmentError } from './env.schema.js';

const example = parseDotenv(readFileSync(new URL('../../../../.env.example', import.meta.url), 'utf8'));
const stubExample = (overrides: Record<string, string> = {}) => {
  for (const [key, value] of Object.entries({ ...example, ...overrides }))
    if (value !== undefined) vi.stubEnv(key, value);
};

/** A consumer that receives the configuration through constructor injection, as every module will. */
@Injectable()
class NeedsConfig {
  constructor(@Inject(AppConfig) readonly config: AppConfig) {}
}
/** Same, resolved from the constructor type alone: proves Vitest emits decorator metadata (ADR-0004). */
@Injectable()
class NeedsConfigByType {
  constructor(readonly config: AppConfig) {}
}
@Module({ providers: [NeedsConfig, NeedsConfigByType] })
class ConsumerModule {}

const compile = async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [await AppModule.forRoot({ ignoreEnvFile: true }), ConsumerModule],
  }).compile();
  return moduleRef.get(NeedsConfig).config;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('AppConfig', () => {
  it('[US-005:AC2] should hand typed, validated values to any provider through injection', async () => {
    stubExample({ PORT: '4100', CORS_ORIGINS: 'http://localhost:5173, https://torre.example' });
    const config = await compile();

    expect(config.get('PORT')).toBe(4100);
    expect(config.get('CORS_ORIGINS')).toEqual(['http://localhost:5173', 'https://torre.example']);
    expect(config.get('BODY_LIMIT')).toBe(1_048_576);
    expect(config.get('SENTRY_DSN')).toBeUndefined();
  });

  it('[US-005:AC2] should be injectable by its type, without an explicit token', async () => {
    stubExample();
    const moduleRef = await Test.createTestingModule({
      imports: [await AppModule.forRoot({ ignoreEnvFile: true }), ConsumerModule],
    }).compile();

    expect(moduleRef.get(NeedsConfigByType).config).toBeInstanceOf(AppConfig);
  });

  it('[US-005:AC1] should stop the application from starting when the environment is invalid', async () => {
    stubExample({ PORT: 'eighty', JWT_ACCESS_SECRET: '' });

    const start = AppModule.forRoot({ ignoreEnvFile: true });

    await expect(start).rejects.toBeInstanceOf(InvalidEnvironmentError);
    await expect(start).rejects.toThrow(/PORT: must be a whole number\n {2}- JWT_ACCESS_SECRET: is required/);
  });

  it('[US-005:AC3] should hide every secret when the configuration is logged or serialised', async () => {
    stubExample();
    const config = await compile();
    const outputs = [JSON.stringify(config), inspect(config, { depth: 5 }), JSON.stringify({ config })];

    for (const output of outputs) {
      expect(output).toContain('[redacted]');
      expect(output).toMatch(/PORT"?:\s?3000/);
      for (const secret of [
        'dev-only-jwt-access-secret-change-me',
        'torre_app_dev',
        'torre-dev-secret-change-me',
        'ZGV2LW9ubHktMzItYnl0ZS1rZXktY2hhbmdlLW1lISE=',
      ]) {
        expect(output).not.toContain(secret);
      }
    }
  });
});
