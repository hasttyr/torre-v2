#!/usr/bin/env node
// pnpm test:report — writes reports/test-summary.md with the automatic sections of TEST-PLAN.md §14.2
// from the JSON results, the coverage summary, the run manifest and the traceability matrix.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlanCases, parseResults, parseStories, trace } from './lib/trace.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const at = (p) => join(root, p);
const readJson = (p) => (existsSync(at(p)) ? JSON.parse(readFileSync(at(p), 'utf8')) : null);

// Coverage thresholds of CONSTRAINTS.md §2 (lines and branches, in %).
const THRESHOLDS = [
  { scope: /^packages\/[^/]+$/, lines: 90, branches: 90 },
  { scope: /^apps\/api$/, lines: 80, branches: 0 },
];

const manifest = readJson('reports/run-manifest.json') ?? {};
const tests = parseResults(
  [at('reports/vitest.json'), at('reports/vitest-e2e.json'), at('reports/playwright.json')],
  root,
);
const stories = parseStories(at('docs/stories'));
const cases = parsePlanCases(at('docs/TEST-PLAN.md'));
const traced = trace({ stories, cases, tests });
const done = [...stories.values()].filter((s) => s.state === 'DONE');

const count = (status) => tests.filter((t) => t.status === status).length;
const lines = [];
const h = (title) => lines.push('', `## ${title}`, '');

lines.push(
  '# Informe de pruebas (secciones automáticas)',
  '',
  '> Generado por `pnpm test:report`. Las secciones 8 a 13 de `TEST-PLAN.md` §14.2 se completan a mano.',
);

h('1. Resumen');
lines.push(
  `- Versión: ${manifest.tag ?? 'sin etiqueta'} · commit \`${(manifest.commit ?? 'desconocido').slice(0, 12)}\` · rama ${manifest.branch ?? '—'}`,
  `- Ejecución: ${manifest.runId ?? '—'} · inicio ${manifest.startedAt ?? '—'} · Node ${manifest.node ?? '—'} · pnpm ${manifest.pnpm ?? '—'} · ${manifest.os ?? '—'}`,
  `- Historias en DONE (${done.length}): ${done.map((s) => s.id).join(', ') || 'ninguna'}`,
  '- Manifiesto: `reports/run-manifest.json`',
);

h('2. Resultados');
lines.push(
  '| Total | Aprobadas | Fallidas | Omitidas | Pendientes |',
  '|---|---|---|---|---|',
  `| ${tests.length} | ${count('passed')} | ${count('failed')} | ${count('skipped')} | ${count('pending') + count('todo')} |`,
  '',
  '| Caso | Prio | Pruebas | Aprobadas | Fallidas |',
  '|---|---|---|---|---|',
  ...traced.caseRows
    .filter((r) => r.tests.length > 0)
    .map(
      (r) =>
        `| ${r.id} | ${r.priority} | ${r.tests.length} | ${r.tests.filter((t) => t.status === 'passed').length} | ${r.tests.filter((t) => t.status === 'failed').length} |`,
    ),
);

h('3. Trazabilidad');
const perStory = new Map();
for (const row of traced.criterionRows.filter((r) => r.state === 'DONE')) {
  const s = perStory.get(row.story) ?? { covered: 0, total: 0 };
  s.total++;
  if (row.covered) s.covered++;
  perStory.set(row.story, s);
}
lines.push(
  '| Historia | Criterios cubiertos |',
  '|---|---|',
  ...[...perStory].map(([id, s]) => `| ${id} | ${s.covered} / ${s.total} |`),
);
lines.push(
  '',
  traced.violations.length
    ? `Incumplimientos: ${traced.violations.join('; ')}`
    : 'Regla de CI cumplida (matriz completa en `reports/traceability.md`).',
);

h('4. Cobertura');
const summary = readJson('coverage/coverage-summary.json');
if (!summary) lines.push('Sin `coverage/coverage-summary.json`: ejecuta `pnpm test:ci`.');
else {
  const scopes = new Map();
  for (const [file, data] of Object.entries(summary)) {
    if (file === 'total') continue;
    const rel = relative(root, file).replaceAll('\\', '/');
    const scope = rel.split('/').slice(0, 2).join('/');
    const s = scopes.get(scope) ?? { lines: [0, 0], branches: [0, 0] };
    s.lines[0] += data.lines.covered;
    s.lines[1] += data.lines.total;
    s.branches[0] += data.branches.covered;
    s.branches[1] += data.branches.total;
    scopes.set(scope, s);
  }
  const pct = ([c, t]) => (t === 0 ? 100 : (100 * c) / t);
  lines.push('| Ámbito | Líneas | Ramas | Umbral | Cumple |', '|---|---|---|---|---|');
  for (const [scope, s] of [...scopes].sort()) {
    const th = THRESHOLDS.find((t) => t.scope.test(scope));
    const ok = !th || (pct(s.lines) >= th.lines && pct(s.branches) >= th.branches);
    lines.push(
      `| ${scope} | ${pct(s.lines).toFixed(1)} % | ${pct(s.branches).toFixed(1)} % | ${th ? `≥ ${th.lines} % líneas${th.branches ? `, ≥ ${th.branches} % ramas` : ''}` : '—'} | ${ok ? '✅' : '❌'} |`,
    );
  }
}

h('5. Propiedades');
const fc = manifest.fastCheck;
lines.push(
  fc
    ? `Modo ${fc.mode}: ${fc.numRuns} ejecuciones por propiedad, semilla ${fc.seed}.`
    : 'Sin datos de fast-check en el manifiesto.',
);

h('6. Benchmarks y carga');
lines.push(
  existsSync(at('reports/benchmarks.json'))
    ? 'Ver `reports/benchmarks.json`.'
    : 'Aún no hay benchmarks (llegan con `US-048` y `US-096`).',
);

h('7. Mutación');
lines.push(existsSync(at('reports/mutation')) ? 'Ver `reports/mutation/`.' : 'No se ejecutó (opcional, `TC-065`).');

mkdirSync(at('reports'), { recursive: true });
writeFileSync(at('reports/test-summary.md'), lines.join('\n') + '\n');
console.log('test:report: reports/test-summary.md');
