// Traceability between acceptance criteria, test-plan cases and test results (TEST-PLAN.md §6.2.1).
// Rule: every acceptance criterion of a DONE story needs at least one passing test tagged
// [US-nnn:ACk], and every priority-A case whose stories are all DONE needs a passing test tagged
// [TC-nnn]. Everything else is reported, not enforced.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Stories with their state and acceptance-criterion numbers, from docs/stories/*.md. */
export function parseStories(dir) {
  const stories = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const text = readFileSync(join(dir, file), 'utf8');
    for (const block of text.split(/^### /m).slice(1)) {
      const id = block.match(/^(US-\d+) — (.+)/);
      if (!id) continue;
      const state = block.match(/\*\*Estado:\*\* (\S+)/)?.[1] ?? 'UNKNOWN';
      const criteria = [];
      const start = block.indexOf('**Criterios de aceptación:**');
      if (start > -1) {
        for (const line of block.slice(start).split('\n').slice(1)) {
          const ac = line.match(/^ {2}(\d+)\. /);
          if (ac) criteria.push(Number(ac[1]));
          else if (/^- \*\*/.test(line)) break;
        }
      }
      stories.set(id[1], {
        id: id[1],
        title: id[2].trim(),
        state,
        criteria: [...new Set(criteria)].sort((a, b) => a - b),
      });
    }
  }
  return stories;
}

/** Test-plan cases (id, priority, stories) from the tables of TEST-PLAN.md §13. */
export function parsePlanCases(planFile) {
  const cases = new Map();
  for (const line of readFileSync(planFile, 'utf8').split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (!/^TC-\d+$/.test(cells[1] ?? '')) continue;
    const priority = cells[4];
    if (!['A', 'M', 'B'].includes(priority)) continue;
    cases.set(cells[1], {
      id: cells[1],
      priority,
      stories: [...(cells[5] ?? '').matchAll(/US-\d+/g)].map((m) => m[0]),
    });
  }
  return cases;
}

/** Flattens Vitest (Jest-style) and Playwright JSON reports into { file, title, status }. */
export function parseResults(files, root) {
  const tests = [];
  for (const file of files.filter((f) => existsSync(f))) {
    const report = JSON.parse(readFileSync(file, 'utf8'));
    if (Array.isArray(report.testResults)) {
      for (const suite of report.testResults) {
        for (const a of suite.assertionResults ?? []) {
          tests.push({ file: relative(root, suite.name).replaceAll('\\', '/'), title: a.title, status: a.status });
        }
      }
    }
    if (Array.isArray(report.suites)) {
      const walk = (suite) => {
        for (const spec of suite.specs ?? []) {
          const ok = (spec.tests ?? []).every((t) => (t.results ?? []).some((r) => r.status === 'passed'));
          tests.push({ file: spec.file, title: spec.title, status: ok ? 'passed' : 'failed' });
        }
        for (const child of suite.suites ?? []) walk(child);
      };
      report.suites.forEach(walk);
    }
  }
  return tests;
}

const tagsOf = (title) => [...title.matchAll(/\[([A-Z]+-\d+(?::AC\d+)?)\]/g)].map((m) => m[1]);

/** Builds the criterion and case rows plus the list of violations of the CI rule. */
export function trace({ stories, cases, tests }) {
  const byTag = new Map();
  for (const t of tests) {
    for (const tag of tagsOf(t.title)) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(t);
    }
  }
  const criterionRows = [];
  const violations = [];
  for (const story of [...stories.values()].sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)))) {
    for (const ac of story.criteria) {
      const found = byTag.get(`${story.id}:AC${ac}`) ?? [];
      const passing = found.filter((t) => t.status === 'passed');
      const covered = passing.length > 0;
      criterionRows.push({ story: story.id, state: story.state, ac, tests: found, covered });
      if (story.state === 'DONE' && !covered) {
        violations.push(
          `${story.id} AC${ac}: ${found.length ? 'sus pruebas no están en verde' : 'sin prueba etiquetada'}`,
        );
      }
    }
  }
  const caseRows = [];
  for (const c of [...cases.values()].sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)))) {
    const found = byTag.get(c.id) ?? [];
    const covered = found.some((t) => t.status === 'passed');
    const enforced =
      c.priority === 'A' && c.stories.length > 0 && c.stories.every((s) => stories.get(s)?.state === 'DONE');
    caseRows.push({ ...c, tests: found, covered, enforced });
    if (enforced && !covered)
      violations.push(`${c.id} (prioridad A, historias en DONE): sin prueba etiquetada y en verde`);
  }
  return { criterionRows, caseRows, violations };
}

/** Renders reports/traceability.md (TEST-PLAN.md §14.6). */
export function renderTraceability({ criterionRows, caseRows, violations }) {
  const cell = (tests) =>
    tests.length ? tests.map((t) => `${t.file} › ${t.title.replaceAll('|', '\\|')}`).join('<br>') : '—';
  const mark = (row) => (row.covered ? '✅' : row.tests.length ? '❌ en rojo' : '❌ sin prueba');
  const lines = [
    '# Matriz de trazabilidad',
    '',
    violations.length ? `**${violations.length} incumplimiento(s) de la regla de CI.**` : '**Regla de CI cumplida.**',
    '',
    '| Historia | Estado | AC | Pruebas (archivo › nombre) | Resultado |',
    '|---|---|---|---|---|',
    ...criterionRows.map((r) => `| ${r.story} | ${r.state} | AC${r.ac} | ${cell(r.tests)} | ${mark(r)} |`),
    '',
    '| Caso | Prio | Exigido | Pruebas | Resultado |',
    '|---|---|---|---|---|',
    ...caseRows.map(
      (r) => `| ${r.id} | ${r.priority} | ${r.enforced ? 'sí' : 'no'} | ${r.tests.length} prueba(s) | ${mark(r)} |`,
    ),
    '',
  ];
  if (violations.length) lines.push('## Incumplimientos', '', ...violations.map((v) => `- ${v}`), '');
  return lines.join('\n');
}
