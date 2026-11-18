import { describe, it, expect } from 'vitest';
import {
  BRAND_PRESET_KEYS,
  buildBrandThemeCss,
  contrastRatio,
  oklchToRgb,
  parseHexRgb,
  pickContrastForeground,
  resolveBrandTheme,
  rgbToOklch,
} from './theme';

function parseOklchString(str: string) {
  const m = str.match(/^oklch\(([0-9.]+)%\s+([0-9.]+)\s+([0-9.]+)\)$/);
  if (!m) throw new Error(`Invalid oklch string: ${str}`);
  return { l: Number(m[1]) / 100, c: Number(m[2]), h: Number(m[3]) };
}

describe('src/libs/config/theme.ts', () => {
  it('round-trips sRGB through OKLCH with high accuracy', () => {
    const samples: [number, number, number][] = [
      [67, 56, 202],
      [4, 120, 87],
      [190, 18, 60],
      [15, 23, 42],
      [250, 204, 21],
    ];
    for (const rgb of samples) {
      const roundTripped = oklchToRgb(rgbToOklch(rgb));
      expect(Math.abs(roundTripped[0] - rgb[0])).toBeLessThanOrEqual(2);
      expect(Math.abs(roundTripped[1] - rgb[1])).toBeLessThanOrEqual(2);
      expect(Math.abs(roundTripped[2] - rgb[2])).toBeLessThanOrEqual(2);
    }
  });

  it('picks high-contrast foreground ink (>= 4.5:1 WCAG AA) across presets and extreme colors', () => {
    const testColors = ['#facc15', '#0f172a', '#ec4899', '#10b981', '#ffffff', '#000000'];
    for (const hex of testColors) {
      const rgb = parseHexRgb(hex)!;
      const bgOklch = rgbToOklch(rgb);
      const fgOklch = parseOklchString(pickContrastForeground(bgOklch));
      const ratio = contrastRatio(rgb, oklchToRgb(fgOklch));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }

    for (const preset of BRAND_PRESET_KEYS) {
      const resolved = resolveBrandTheme({
        preset,
        themeColor: '#4338ca',
      });
      if (!resolved.isCustomPalette) continue;
      for (const modeVars of [resolved.light, resolved.dark]) {
        const pairs: [string, string][] = [
          ['--theme-primary', '--theme-primary-fg'],
          ['--theme-secondary', '--theme-secondary-fg'],
          ['--theme-accent', '--theme-accent-fg'],
        ];
        for (const [bgKey, fgKey] of pairs) {
          const bgRgb = oklchToRgb(parseOklchString(modeVars[bgKey]));
          const fgRgb = oklchToRgb(parseOklchString(modeVars[fgKey]));
          expect(contrastRatio(bgRgb, fgRgb)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('emits empty CSS when using the default indigo preset and system/vazirmatn fonts', () => {
    const css = buildBrandThemeCss({
      preset: 'indigo',
      themeColor: '#4338ca',
      fontPreset: 'system',
      rtlFontPreset: 'vazirmatn',
    });
    expect(css).toBe('');
  });

  it('emits light, dark, and font variable overrides for customized presets', () => {
    const css = buildBrandThemeCss({
      preset: 'emerald',
      themeColor: '#047857',
      fontPreset: 'editorial',
      rtlFontPreset: 'noto-arabic',
    });
    expect(css).toContain(':root{');
    expect(css).toContain(':root[data-theme="dark"]{');
    expect(css).toContain('--theme-primary:');
    expect(css).toContain('--theme-primary-fg:');
    expect(css).toContain('--font-sans:');
    expect(css).toContain('--font-display:');
    expect(css).toContain('Fraunces Variable');
    expect(css).toContain('--font-fa:');
    expect(css).toContain('--font-ar:');
    expect(css).toContain('Noto Sans Arabic');
  });

  it('supports commercial Persian RTL font presets (IRANSansX, Yekan Bakh, Peyda) with Vazirmatn fallback', () => {
    for (const preset of ['iransans', 'yekan-bakh', 'peyda'] as const) {
      const css = buildBrandThemeCss({
        preset: 'indigo',
        themeColor: '#4338ca',
        rtlFontPreset: preset,
      });
      expect(css).toContain('--font-fa:');
      expect(css).toContain('Vazirmatn Variable');
    }
  });
});
