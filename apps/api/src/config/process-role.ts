import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { ENV_FILES } from './config.module.js';

/**
 * Whether this process is the worker (`WORKER=true`, US-117), read before Nest builds anything, with
 * the precedence of the configuration module: the process environment, then the first `.env` file
 * that sets it. The full validation still happens when the application is created (US-005).
 */
export function isWorkerProcess(env: NodeJS.ProcessEnv = process.env, files: readonly string[] = ENV_FILES): boolean {
  const fromFiles = files
    .filter((file) => existsSync(file))
    .map((file) => parseEnv(readFileSync(file, 'utf8'))['WORKER'])
    .find((value) => value !== undefined);
  return (env['WORKER'] ?? fromFiles) === 'true';
}
