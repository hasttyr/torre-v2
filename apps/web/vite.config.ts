import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// Web app (US-009). Workspace packages are read from their sources, like everywhere else (ADR-0001).
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // The repository-level .env (only VITE_* reach the browser).
  envDir: '../..',
  resolve: { conditions: ['@torre/source', 'module', 'browser', 'development|production'] },
  // Specs under `@vitest-environment node` resolve on the server side; without this they fall back to
  // dist/, which only exists after a build (a clean CI checkout has none).
  ssr: { resolve: { conditions: ['@torre/source', 'module', 'node', 'development|production'] } },
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist', sourcemap: true },
  // The `web` project of the root Vitest run (vitest.config.ts).
  test: {
    name: 'web',
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts'],
  },
});
