import { expect, test } from '@playwright/test';
import { contrast, READABLE, textOn } from '../src/site/contrast';
import { DEFAULT_THEME } from '../src/site/default-theme';
import { PALETTES } from '../src/site/palettes';
import { resolveTheme } from '../src/site/resolve-theme';
import type { Palette } from '../src/theme/theme';

/**
 * The ready-made palettes (GOV-04, D-036) are readable, and the website accepts them as they are.
 * No page and no API: these are checks of the colours themselves.
 */

/** The pairs a reader has to read: text, muted text, text on the brand colour, and the accent (small labels). */
const READ: [keyof Palette, keyof Palette][] = [
  ['ink', 'paper'],
  ['ink', 'surface'],
  ['muted', 'paper'],
  ['muted', 'surface'],
  ['onBrand', 'brand'],
  ['accent', 'paper'],
  ['accent', 'surface'],
];

test('[UC-AP-05] every ready-made palette reads well, the first is the default, and the website draws each one exactly', () => {
  expect(PALETTES[0].palette).toEqual(DEFAULT_THEME.palette);
  expect(new Set(PALETTES.map((choice) => choice.name)).size).toBe(PALETTES.length);
  expect(new Set(PALETTES.map((choice) => choice.label)).size).toBe(PALETTES.length);

  for (const { name, palette } of PALETTES) {
    for (const [text, background] of READ) {
      const ratio = contrast(palette[text], palette[background]);
      expect(ratio, `${name}: ${text} on ${background}`).not.toBeNull();
      expect(ratio!, `${name}: ${text} on ${background}`).toBeGreaterThanOrEqual(READABLE);
    }
    // Nothing the website would throw away: every colour is drawn as given.
    expect(resolveTheme({ palette }).palette, name).toEqual(palette);
  }
});

test('[UC-AP-05] contrast is measured the WCAG way, and text on a brand colour is the more readable of white and near-black', () => {
  expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  expect(contrast('#fff', '#ffffff')).toBeCloseTo(1, 5);
  expect(contrast('#1f4fd8', '#ffffff')).toBeCloseTo(6.63, 2);
  // Only plain hex is measured.
  expect(contrast('oklch(0.7 0.15 60)', '#ffffff')).toBeNull();

  expect(textOn('#1f4fd8')).toBe('#ffffff');
  expect(textOn('#f2c230')).toBe('#111111');
  expect(textOn('#8ab4ff', ['#ffffff', '#0f1115'])).toBe('#0f1115');
});
