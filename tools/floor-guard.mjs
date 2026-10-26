#!/usr/bin/env node
// floor-guard.mjs: diff-scoped enforcement of the CONSTRAINTS.md floor (§1).
// Adapted from the constraint-driven-development reference implementation.
// Usage: node tools/floor-guard.mjs [--base <ref>]   (default: $FLOOR_GUARD_BASE, origin/main, then main)
// Exit codes: 0 clean · 1 at least one floor violation · 2 the guard could not run.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// `git diff --no-index` exits 1 whenever the two sides differ, which is the normal case for a
// new file, so that output is kept. Any other failure is null, and null never reads as clean.
const git = (args, { diffExit = false } = {}) => {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    return diffExit && e.status === 1 && typeof e.stdout === 'string' ? e.stdout : null;
  }
};
const bail = (msg) => {
  console.error('floor-guard: ' + msg);
  process.exit(2);
};

const top = git(['rev-parse', '--show-toplevel'])?.trim();
if (!top) bail('not inside a git work tree');
process.chdir(top);

const argBase = (() => {
  const i = process.argv.indexOf('--base');
  return i > -1 ? process.argv[i + 1] : undefined;
})();
const candidates = [argBase, process.env.FLOOR_GUARD_BASE, 'origin/main', 'main'].filter(Boolean);
const base = argBase ?? candidates.find((ref) => git(['rev-parse', '--verify', '--quiet', ref + '^{commit}']) !== null);
if (!base) bail('no base ref found (tried ' + candidates.join(', ') + ')');

const mergeBase = git(['merge-base', base, 'HEAD'])?.trim();
if (!mergeBase) bail('no merge base against ' + base);

const tracked = git(['diff', '--unified=0', mergeBase, '--']);
if (tracked === null) bail('could not diff against ' + mergeBase);
const untrackedFiles = git(['ls-files', '--others', '--exclude-standard']);
if (untrackedFiles === null) bail('could not list untracked files');
const untracked = untrackedFiles
  .split('\n')
  .filter(Boolean)
  .map((f) => {
    const d = git(['diff', '--no-index', '--unified=0', '/dev/null', f], { diffExit: true });
    if (d === null) bail('could not diff untracked file ' + f);
    return d;
  })
  .join('\n');
const diff = tracked + '\n' + untracked;

// Walk the diff. `---`/`+++` are headers only between a file's `diff` line and its first hunk.
const added = [];
const removed = [];
const deleted = [];
const pathOf = (s) => s.replace(/^[ab]\//, '');
let file = '';
let oldFile = '';
let inHeader = false;
for (const line of diff.split('\n')) {
  if (line.startsWith('diff ')) inHeader = true;
  else if (line.startsWith('@@')) inHeader = false;
  else if (inHeader) {
    if (line.startsWith('--- ')) oldFile = pathOf(line.slice(4));
    else if (line.startsWith('+++ ')) {
      const newFile = pathOf(line.slice(4));
      file = newFile === '/dev/null' ? oldFile : newFile;
      if (newFile === '/dev/null') deleted.push(file);
    }
  } else if (line.startsWith('+')) added.push({ file, text: line.slice(1) });
  else if (line.startsWith('-')) removed.push({ file, text: line.slice(1) });
}

// Paths exempt from the pattern checks (one glob per line): files that must spell the patterns out.
const globToRegExp = (g) =>
  new RegExp(
    '^' +
      g
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*\//g, '(?:.*/)?')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*') +
      '$',
  );
const ignored = existsSync('.constraintsignore')
  ? readFileSync('.constraintsignore', 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map(globToRegExp)
  : [];
const isCode = (f) => /\.(ts|tsx|mts|cts|js|mjs|cjs|vue|sql|prisma)$/.test(f) && !ignored.some((re) => re.test(f));
const isTest = (f) => /\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)test\//.test(f);
const isDomainSource = (f) => /^packages\/[^/]+\/src\//.test(f) && !isTest(f);
const isConstraints = (f) => /(^|\/)CONSTRAINTS\.md$/.test(f);

// Exceptions registered in CONSTRAINTS.md §4: `| W1 | rule | path | ... |`.
const constraintsText = existsSync('CONSTRAINTS.md') ? readFileSync('CONSTRAINTS.md', 'utf8') : '';
const registered = new Set([...constraintsText.matchAll(/^\| *(W\d+) *\|/gm)].map((m) => m[1]));
const hasRegisteredException = (text) => [...text.matchAll(/\[(W\d+)\]/g)].some((m) => registered.has(m[1]));

const findings = [];
const flag = (rule, f, text) => findings.push({ rule, file: f, text: text.trim().slice(0, 120) });

// 1. Silenced checker.
const SUPPRESSIONS =
  /@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|istanbul ignore|v8 ignore|c8 ignore|Stryker disable|gitleaks:allow|nosemgrep/;
// 4. Unfinished work. TODO is allowed only with a reference: TODO(OQ-nnn), TODO(US-nnn), TODO(DEF-nnn).
const STUBS =
  /throw new (Error|NotImplementedError)\([^)]*[Nn]ot implemented|catch\s*\(\s*\w*\s*\)\s*\{\s*\}|catch\s*\{\s*\}/;
const BARE_TODO = /\bTODO\b(?!\((OQ|US|DEF)-\d+\))/;
// 2. A test made easier, unless it cites a defect or an open question.
const SKIPS = /\.(skip|todo)\b|\bxit\(|\bxdescribe\(/;
const CITES_TICKET = /\b(DEF|OQ)-\d+\b/;
// Domain purity (CLAUDE.md rule 2): time and randomness arrive as parameters.
const IMPURE = /\bDate\.now\s*\(|\bMath\.random\s*\(|\bnew Date\(\s*\)/;
// Immutable tables (CLAUDE.md rule 5, DEC-077).
const MUTATES_IMMUTABLE = /\b(UPDATE\s+"?(events|audit_log)"?|DELETE\s+FROM\s+"?(events|audit_log)"?)\b/i;

for (const { file: f, text } of added) {
  if (isConstraints(f) && /^\| *W\d+ *\|/.test(text)) flag('new-exception', f, text);
  if (!isCode(f)) continue;
  if (SUPPRESSIONS.test(text) && !hasRegisteredException(text)) flag('silenced-checker', f, text);
  if (STUBS.test(text)) flag('unfinished-work', f, text);
  if (BARE_TODO.test(text)) flag('todo-without-reference', f, text);
  if (SKIPS.test(text) && !CITES_TICKET.test(text)) flag('test-made-easier', f, text);
  if (isDomainSource(f) && IMPURE.test(text)) flag('impure-domain', f, text);
  if (MUTATES_IMMUTABLE.test(text)) flag('mutates-immutable-table', f, text);
}

// 2b. A test file deleted, or an assertion removed from a test file that still exists.
for (const f of deleted) if (isTest(f)) flag('test-deleted', f, 'file deleted');
for (const { file: f, text } of removed) {
  if (isTest(f) && !deleted.includes(f) && /\b(expect|assert|should)\b/.test(text)) flag('assertion-removed', f, text);
}

// 1b/2c. A rule in CONSTRAINTS.md weakened or removed. Each number carries a direction read from
// the words around it; a number whose direction cannot be read is reported whenever it changes.
const ruleKey = (t) => {
  const s = t.trim();
  if (s.startsWith('|'))
    return (
      s
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean)[0] ?? ''
    );
  if (/^[-*] /.test(s)) return s.slice(2).split(':')[0].trim();
  return null;
};
const isException = (t) => /^\| *(W|E)\d+ *\|/.test(t.trim());
const MIN_BEFORE = /(>=|>|≥|at least|minimum|\bmin\b|no less than|not fall|not drop|al menos|m[ií]nimo)\s*$/;
const MAX_BEFORE =
  /(<=|<|≤|at most|maximum|\bmax\b|no more than|under|below|not grow|not exceed|como m[aá]ximo|m[aá]ximo)\s*$/;
const MIN_AFTER = /^\s*\S*\s*(or more|or higher|must not fall|must not drop|o m[aá]s)/;
const MAX_AFTER = /^\s*\S*\s*(or less|or lower|must not grow|must not exceed|o menos)/;
const thresholds = (t) => {
  const out = [];
  const re = /\d+(?:\.\d+)?/g;
  let m;
  while ((m = re.exec(t))) {
    const before = t.slice(Math.max(0, m.index - 24), m.index).toLowerCase();
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 40).toLowerCase();
    const dir =
      MIN_BEFORE.test(before) || MIN_AFTER.test(after)
        ? 'min'
        : MAX_BEFORE.test(before) || MAX_AFTER.test(after)
          ? 'max'
          : null;
    out.push({ n: Number(m[0]), dir });
  }
  return out;
};
const removedRules = removed.filter((l) => isConstraints(l.file) && ruleKey(l.text) !== null);
const addedRules = added.filter((l) => isConstraints(l.file) && ruleKey(l.text) !== null);
for (const r of removedRules) {
  const a = addedRules.find((x) => ruleKey(x.text) === ruleKey(r.text));
  if (!a) {
    if (!isException(r.text)) flag('rule-removed', r.file, r.text);
    continue;
  }
  const before = thresholds(r.text);
  const after = thresholds(a.text);
  let verdict = null;
  for (const dir of ['min', 'max', null]) {
    const was = before.filter((x) => x.dir === dir);
    const now = after.filter((x) => x.dir === dir);
    was.forEach((b, i) => {
      const n = now[i];
      if (verdict) return;
      if (!n) verdict = 'threshold-removed';
      else if (n.n === b.n) return;
      else if (dir === 'min' ? n.n < b.n : dir === 'max' ? n.n > b.n : true)
        verdict = dir ? 'threshold-loosened' : 'threshold-changed';
    });
  }
  if (verdict) flag(verdict, r.file, r.text + '  ->  ' + a.text);
}

if (findings.length === 0) {
  console.log('floor-guard: clean (base ' + base + ')');
  process.exit(0);
}
console.error('floor-guard: ' + findings.length + ' floor violation(s) against ' + base + ':');
for (const f of findings) console.error(`  [${f.rule}] ${f.file}: ${f.text}`);
if (findings.some((f) => f.rule === 'rule-removed')) {
  console.error(
    "\nA rule-removed finding can also mean the rule's label changed: rename a rule in one commit and change its thresholds in another.",
  );
}
console.error(
  '\nEach is a move that lowers the bar. Fix the code, or route it through an exception in CONSTRAINTS.md §4.',
);
process.exit(1);
