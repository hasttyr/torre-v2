import type { App } from 'vue';
import type { Router } from 'vue-router';
import { toApiProblem } from '../shared/api/problem.js';

/**
 * Last resort for errors nobody handled (US-009:AC4): an API answer that says the user may not see the
 * resource goes to 403, anything else to 500 with the correlation id to quote to support. Expected
 * errors are handled where they happen (forms, toasts), never here.
 */
export function installErrorHandler(app: App, router: Router, report: (error: unknown) => void = console.error) {
  app.config.errorHandler = (error) => {
    report(error);
    const problem = toApiProblem(error);
    const current = router.currentRoute.value.name;
    if (current === 'server-error' || current === 'forbidden') return;
    if (problem.code === 'FORBIDDEN') {
      void router.replace({ name: 'forbidden' });
      return;
    }
    void router.replace({ name: 'server-error', query: problem.correlationId ? { ref: problem.correlationId } : {} });
  };
}
