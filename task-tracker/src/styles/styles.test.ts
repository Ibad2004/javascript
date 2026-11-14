import { describe, expect, it } from 'vitest';

/**
 * Every .css file under src/, as plain text (Vite's ?raw import), keyed like "styles/tokens.css".
 * A new CSS file is picked up automatically.
 */
const files = Object.entries(
  import.meta.glob<string>('/src/**/*.css', { query: '?raw', import: 'default', eager: true }),
).map(([path, text]) => ({ path: path.replace(/^\/src\//, ''), text }));

function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

const tokensCss = withoutComments(files.find((f) => f.path === 'styles/tokens.css')?.text ?? '');
const componentsCss = withoutComments(
  files.find((f) => f.path === 'styles/components.css')?.text ?? '',
);
const baseCss = withoutComments(files.find((f) => f.path === 'styles/base.css')?.text ?? '');

/** "--name: value;" pairs inside one block of CSS. */
function readTokens(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) tokens.set(name, value.trim());
  }
  return tokens;
}

const darkStart = tokensCss.indexOf('@media (prefers-color-scheme: dark)');
const light = readTokens(tokensCss.slice(0, darkStart));
const dark = new Map([...light, ...readTokens(tokensCss.slice(darkStart))]);

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (match?.[1] === undefined) throw new Error(`Expected a 6-digit hex colour, got "${hex}"`);
  const n = Number.parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/** Text pairs (foreground on background) that must reach 4.5:1. Listed in the README. */
export const TEXT_PAIRS: [string, string][] = [
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface'],
  ['--color-text', '--color-surface-muted'],
  ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-surface'],
  ['--color-primary', '--color-surface'],
  ['--color-primary', '--color-bg'],
  ['--color-primary-hover', '--color-surface'],
  ['--color-on-primary', '--color-primary'],
  ['--color-on-primary', '--color-primary-hover'],
  ['--color-danger', '--color-surface'],
  ['--color-on-danger', '--color-danger'],
  ['--color-on-danger', '--color-danger-hover'],
  ['--color-danger-text', '--color-danger-bg'],
  ['--color-warning-text', '--color-surface'],
  ['--color-text', '--color-warning-bg'],
  ['--color-inverse-text', '--color-inverse-bg'],
  ['--badge-high-text', '--badge-high-bg'],
  ['--badge-medium-text', '--badge-medium-bg'],
  ['--badge-low-text', '--badge-low-bg'],
];

/** Non-text pairs (WCAG 1.4.11) that must reach 3:1. */
export const UI_PAIRS: [string, string][] = [
  ['--color-focus', '--color-surface'],
  ['--color-focus', '--color-bg'],
  ['--color-focus-on-inverse', '--color-inverse-bg'],
  ['--color-border-strong', '--color-surface'],
  ['--color-danger', '--color-danger-bg'],
];

describe('CSS rules', () => {
  it('finds every CSS file with its real text (so the checks below are not empty)', () => {
    expect(files.map((file) => file.path).sort()).toEqual([
      'index.css',
      'styles/base.css',
      'styles/components.css',
      'styles/layout.css',
      'styles/tokens.css',
    ]);
    for (const file of files) expect(file.text.length, file.path).toBeGreaterThan(100);
  });

  it('no CSS file except tokens.css uses a raw colour (hex, rgb(), hsl() ...)', () => {
    const offenders = files
      .filter((file) => file.path !== 'styles/tokens.css')
      .flatMap((file) =>
        [
          ...withoutComments(file.text).matchAll(
            /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab)\(/gi,
          ),
        ].map((match) => `${file.path}: ${match[0]}`),
      );
    expect(offenders).toEqual([]);
  });

  it('every var(--x) used is defined in tokens.css (no typo falls back to nothing)', () => {
    const used = new Set(
      files.flatMap((file) =>
        [...withoutComments(file.text).matchAll(/var\((--[\w-]+)/g)].map((m) => m[1] ?? ''),
      ),
    );
    const missing = [...used].filter((name) => !light.has(name) && !tokensCss.includes(`${name}:`));
    expect(missing).toEqual([]);
  });

  it('the focus ring is never removed', () => {
    for (const file of files) {
      expect(withoutComments(file.text)).not.toMatch(/outline\s*:\s*(?:none|0)\b/);
    }
    expect(baseCss).toMatch(
      /:focus-visible\s*\{[^}]*outline:\s*var\(--focus-width\) solid var\(--color-focus\)/,
    );
  });

  it('reduced motion turns off animations, transitions and smooth scroll', () => {
    const block = baseCss.slice(baseCss.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/animation-duration:\s*0\.01ms !important/);
    expect(block).toMatch(/transition-duration:\s*0\.01ms !important/);
    expect(block).toMatch(/scroll-behavior:\s*auto !important/);
    // The dialog animation only exists for users who did not ask for less motion.
    expect(componentsCss).toMatch(
      /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.confirm-dialog\[open\]/,
    );
  });

  it('long titles wrap in the dialog, the cards and the page heading', () => {
    for (const selector of ['.dialog-title', '.task-title', '.page-title']) {
      const rule = new RegExp(`\\${selector}\\s*\\{[^}]*overflow-wrap:\\s*anywhere`);
      expect(componentsCss, selector).toMatch(rule);
    }
  });
});

describe.each([
  ['light', light],
  ['dark', dark],
])('contrast in the %s theme', (_theme, tokens) => {
  function value(name: string): string {
    const v = tokens.get(name);
    if (v === undefined) throw new Error(`${name} is not defined`);
    return v;
  }

  it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(value(fg), value(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s on %s is at least 3:1 (borders, focus ring)', (fg, bg) => {
    expect(contrast(value(fg), value(bg))).toBeGreaterThanOrEqual(3);
  });
});

describe('contrast helper', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});
