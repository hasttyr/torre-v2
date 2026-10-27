// @vitest-environment node
// Reads the stylesheet as text: the tokens and their contrast are checked where they are written.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import webPackage from '../../package.json';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** `--name: value;` pairs of the first rule whose selector is `selector`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no rule for ${selector}`);
  const body = css.slice(start + selector.length + 2, css.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m): [string, string] => [m[1]!, m[2]!.trim()]),
  );
}

type Rgba = readonly [number, number, number, number];

function color(value: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16));
    return [r!, g!, b!, 1];
  }
  const rgb = /^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/.exec(value);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
  throw new Error(`not a colour: ${value}`);
}

/** `top` painted over an opaque `bottom`. */
const over = (top: Rgba, bottom: Rgba): Rgba => [
  top[0] * top[3] + bottom[0] * (1 - top[3]),
  top[1] * top[3] + bottom[1] * (1 - top[3]),
  top[2] * top[3] + bottom[2] * (1 - top[3]),
  1,
];

/** WCAG 2.x relative luminance and contrast ratio. */
const luminance = ([r, g, b]: Rgba) =>
  [r, g, b]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
const contrast = (a: Rgba, b: Rgba) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const themes = {
  light: block(':root'),
  dark: block("[data-theme='dark']"),
  projector: block("[data-theme='projector']"),
};
const tokenOf = (theme: Record<string, string>, name: string) => color(theme[name] ?? themes.light[name]!);

const COLOR_TOKENS = Object.keys(themes.light).filter((k) => /^#|^rgb/.test(themes.light[k]!));

describe('design tokens (US-069a)', () => {
  it('[US-069:AC1] should define every colour token in the light, dark and projector themes', () => {
    const projectorOwn = COLOR_TOKENS.filter((k) => !k.startsWith('--glass') && !k.startsWith('--backdrop'));

    expect(COLOR_TOKENS.length).toBeGreaterThan(30);
    expect(COLOR_TOKENS.filter((k) => !(k in themes.dark))).toEqual([]);
    expect(projectorOwn.filter((k) => !(k in themes.projector))).toEqual([]);
  });

  it('[US-069:AC1] should give the system dark preference exactly the dark theme', () => {
    const media = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
    const systemDark = Object.fromEntries(
      [...media.slice(0, media.indexOf('}')).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m): [string, string] => [
        m[1]!,
        m[2]!.trim(),
      ]),
    );

    expect(systemDark).toEqual(themes.dark);
  });

  it('[US-069:AC1] should keep the contrast of UI-UX.md §3.1: text ≥ 4.5:1 (≥ 7:1 projector), controls ≥ 3:1', () => {
    const textPairs = [
      ['--foreground', '--background'],
      ['--card-foreground', '--card'],
      ['--muted-foreground', '--background'],
      ['--muted-foreground', '--card'],
      ['--secondary-foreground', '--secondary'],
      ['--primary-foreground', '--primary'],
    ] as const;
    for (const [name, theme] of Object.entries(themes)) {
      const minimum = name === 'projector' ? 7 : 4.5;
      for (const [fg, bg] of textPairs) {
        expect(contrast(tokenOf(theme, fg), tokenOf(theme, bg)), `${name}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(
          minimum,
        );
      }
      for (const control of ['--input', '--ring']) {
        expect(
          contrast(tokenOf(theme, control), tokenOf(theme, '--background')),
          `${name}: ${control}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('[US-069:AC8] should keep text on glass readable over the worst backdrop (AA, UI-UX.md §3.3)', () => {
    for (const name of ['light', 'dark'] as const) {
      const theme = themes[name];
      const background = tokenOf(theme, '--background');
      // The backdrop at its plainest and at its most tinted, and the opaque cards that pass under the bars.
      const behind = [
        background,
        over(tokenOf(theme, '--backdrop-primary'), background),
        over(tokenOf(theme, '--backdrop-accent'), background),
        tokenOf(theme, '--card'),
      ];
      for (const glass of ['--glass-bg', '--glass-bg-strong']) {
        for (const under of behind) {
          const surface = over(tokenOf(theme, glass), under);
          for (const text of ['--foreground', '--muted-foreground']) {
            expect(contrast(tokenOf(theme, text), surface), `${name}: ${text} on ${glass}`).toBeGreaterThanOrEqual(4.5);
          }
          expect(contrast(tokenOf(theme, '--ring'), surface), `${name}: focus ring on ${glass}`).toBeGreaterThanOrEqual(
            3,
          );
        }
      }
    }
  });

  it('[US-069:AC8] should make glass opaque with reduced transparency, more contrast, the preference or the projector', () => {
    const opaque = {
      '--glass-bg': 'var(--card)',
      '--glass-bg-strong': 'var(--popover)',
      '--glass-highlight': 'transparent',
      '--glass-blur': '0px',
      '--glass-blur-strong': '0px',
    };
    // The :root rule inside the media query (the custom variant uses the same queries with @slot).
    const inMedia = (query: string) => {
      const head = `@media (${query}) {`;
      let at = css.indexOf(head);
      while (
        at >= 0 &&
        !css
          .slice(at + head.length)
          .trimStart()
          .startsWith(':root')
      )
        at = css.indexOf(head, at + 1);
      const rest = css.slice(at);
      return Object.fromEntries(
        [...rest.slice(0, rest.indexOf('}')).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m): [string, string] => [
          m[1]!,
          m[2]!.trim(),
        ]),
      );
    };

    expect(inMedia('prefers-reduced-transparency: reduce')).toEqual(opaque);
    expect(inMedia('prefers-contrast: more')).toEqual(opaque);
    expect(block("[data-transparency='reduced'],\n[data-theme='projector']")).toEqual(opaque);
    expect(css).toMatch(/@custom-variant reduced-transparency \{/);
  });

  it('[US-069:AC1] should fix the radii of DEC-087 and the 150–200 ms transitions, removed with reduced motion', () => {
    expect(css).toMatch(/--radius-control: 12px;\s*--radius-card: 16px;\s*--radius-panel: 24px;/);
    expect(themes.light['--duration-fast']).toBe('150ms');
    expect(themes.light['--duration-base']).toBe('200ms');
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{\s*--duration-fast: 0ms;\s*--duration-base: 0ms;/,
    );
  });

  it('[US-069:AC4] should use one icon set (Lucide) and one self-hosted font family (Fira Sans)', () => {
    const dependencies = Object.keys(webPackage.dependencies);
    const iconSets = dependencies.filter((d) => /icon|lucide|heroicons|phosphor|tabler|fontawesome|mdi/i.test(d));
    const fonts = dependencies.filter((d) => d.startsWith('@fontsource'));

    expect(iconSets).toEqual(['lucide-vue-next']);
    expect(fonts).toEqual(['@fontsource/fira-sans']);
    expect([...css.matchAll(/@import '(@fontsource\/[^/]+)/g)].map((m) => m[1])).toEqual(
      Array(4).fill('@fontsource/fira-sans'),
    );
    expect(css).toMatch(/--font-sans: 'Fira Sans',/);
  });
});
