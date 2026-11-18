import presets from './theme-presets.json';

export const BRAND_PRESET_KEYS = [
  'indigo',
  'cobalt',
  'emerald',
  'amber',
  'slate',
  'rose',
] as const;
type BrandPresetKey = (typeof BRAND_PRESET_KEYS)[number];

export const FONT_PRESET_KEYS = [
  'system',
  'jakarta',
  'manrope',
  'outfit',
  'editorial',
] as const;
type FontPresetKey = (typeof FONT_PRESET_KEYS)[number];

export const RTL_FONT_PRESET_KEYS = [
  'vazirmatn',
  'noto-arabic',
  'iransans',
  'yekan-bakh',
  'peyda',
] as const;
type RtlFontPresetKey = (typeof RTL_FONT_PRESET_KEYS)[number];

export const SOCIAL_CARD_MODES = ['branded', 'artwork', 'default'] as const;
export const THEME_PRESETS = presets;

export interface BrandThemeInput {
  preset?: BrandPresetKey;
  themeColor: string;
  primaryColor?: string;
  accentColor?: string;
  fontPreset?: FontPresetKey;
  rtlFontPreset?: RtlFontPresetKey;
}

export interface OklchColor {
  /** Perceived lightness in [0, 1]. */
  l: number;
  /** Chroma (typically [0, 0.37]). */
  c: number;
  /** Hue angle in degrees [0, 360). */
  h: number;
}

export interface ResolvedBrandTheme {
  isCustomPalette: boolean;
  primaryHex: string;
  accentHex: string;
  light: Record<string, string>;
  dark: Record<string, string>;
  fonts: {
    sans: string;
    display: string;
    fa: string;
  };
}

const DEFAULT_INDIGO_HEX = '#4338ca';

export function parseHexRgb(hex: string): [number, number, number] | null {
  const match = hex.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function srgbChannelToLinear(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb: readonly [number, number, number]): number {
  const [r, g, b] = rgb.map(srgbChannelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(
  rgbA: readonly [number, number, number],
  rgbB: readonly [number, number, number]
): number {
  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Converts sRGB [0..255] to OKLCH using Björn Ottosson's exact OKLab matrices.
 */
export function rgbToOklch(rgb: readonly [number, number, number]): OklchColor {
  const r = srgbChannelToLinear(rgb[0]);
  const g = srgbChannelToLinear(rgb[1]);
  const b = srgbChannelToLinear(rgb[2]);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.hypot(a, B);
  const h = c < 1e-4 ? 0 : ((Math.atan2(B, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

function linearToSrgb255(linear: number): number {
  const clamped = Math.max(0, Math.min(1, linear));
  const encoded =
    clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
}

export function oklchToRgb(color: OklchColor): [number, number, number] {
  const hRad = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(hRad);
  const B = color.c * Math.sin(hRad);

  const l_ = color.l + 0.3963377774 * a + 0.2158037573 * B;
  const m_ = color.l - 0.1055613458 * a - 0.0638541728 * B;
  const s_ = color.l - 0.0894841775 * a - 1.291485548 * B;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [linearToSrgb255(r), linearToSrgb255(g), linearToSrgb255(b)];
}

function formatOklch(color: OklchColor): string {
  const pct = (Math.max(0, Math.min(1, color.l)) * 100).toFixed(1);
  const chroma = Math.max(0, color.c).toFixed(3);
  const hue = (((color.h % 360) + 360) % 360).toFixed(1);
  return `oklch(${pct}% ${chroma} ${hue})`;
}

/**
 * Picks either light ink or dark ink foreground to maximize WCAG contrast against `bg`.
 */
export function pickContrastForeground(bg: OklchColor): string {
  const bgRgb = oklchToRgb(bg);
  const lightInk: OklchColor = { l: 0.985, c: 0.004, h: bg.h };
  const darkInk: OklchColor = { l: 0.15, c: 0.02, h: bg.h };
  const lightRatio = contrastRatio(bgRgb, oklchToRgb(lightInk));
  const darkRatio = contrastRatio(bgRgb, oklchToRgb(darkInk));
  return darkRatio > lightRatio ? formatOklch(darkInk) : formatOklch(lightInk);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveBrandTheme(input: BrandThemeInput): ResolvedBrandTheme {
  const presetSpec = input.preset ? presets.palettes[input.preset] : undefined;
  const primaryHex = (
    input.primaryColor ??
    presetSpec?.primary ??
    input.themeColor
  ).toLowerCase();
  const primaryRgb = parseHexRgb(primaryHex) ?? [67, 56, 202];
  const primaryOklch = rgbToOklch(primaryRgb);

  const accentHex = (input.accentColor ?? presetSpec?.accent ?? '').toLowerCase();
  const parsedAccent = accentHex ? parseHexRgb(accentHex) : null;
  const accentOklch = parsedAccent
    ? rgbToOklch(parsedAccent)
    : {
        l: 0.65,
        c: clamp(Math.max(primaryOklch.c, 0.12), 0.1, 0.18),
        h: (primaryOklch.h + 290) % 360,
      };
  const resolvedAccentHex = parsedAccent
    ? accentHex
    : (() => {
        const [r, g, b] = oklchToRgb(accentOklch);
        return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
      })();

  const isDefaultColor =
    primaryHex === DEFAULT_INDIGO_HEX &&
    (!input.preset || input.preset === 'indigo') &&
    !input.primaryColor &&
    !input.accentColor;

  const lightPrimary: OklchColor = {
    l: clamp(primaryOklch.l, 0.36, 0.56),
    c: clamp(primaryOklch.c, 0, 0.22),
    h: primaryOklch.h,
  };
  const darkPrimary: OklchColor = {
    l: clamp(Math.max(primaryOklch.l + 0.18, 0.68), 0.66, 0.78),
    c: clamp(primaryOklch.c * 0.85, 0, 0.18),
    h: primaryOklch.h,
  };

  const lightSecondary: OklchColor = {
    l: 0.53,
    c: clamp(primaryOklch.c * 0.82, 0.04, 0.17),
    h: (primaryOklch.h + 55) % 360,
  };
  const darkSecondary: OklchColor = {
    l: 0.74,
    c: clamp(primaryOklch.c * 0.72, 0.04, 0.14),
    h: (primaryOklch.h + 55) % 360,
  };

  const lightAccent: OklchColor = {
    l: clamp(accentOklch.l, 0.52, 0.7),
    c: clamp(accentOklch.c, 0.04, 0.19),
    h: accentOklch.h,
  };
  const darkAccent: OklchColor = {
    l: clamp(Math.max(accentOklch.l + 0.08, 0.72), 0.7, 0.82),
    c: clamp(accentOklch.c * 0.9, 0.04, 0.16),
    h: accentOklch.h,
  };

  const latinSpec = presets.latinFonts[input.fontPreset ?? 'system'] ?? presets.latinFonts.system;
  const rtlSpec =
    presets.rtlFonts[input.rtlFontPreset ?? 'vazirmatn'] ?? presets.rtlFonts.vazirmatn;

  return {
    isCustomPalette: !isDefaultColor,
    primaryHex,
    accentHex: resolvedAccentHex,
    light: isDefaultColor
      ? {}
      : {
          '--theme-primary': formatOklch(lightPrimary),
          '--theme-primary-fg': pickContrastForeground(lightPrimary),
          '--theme-secondary': formatOklch(lightSecondary),
          '--theme-secondary-fg': pickContrastForeground(lightSecondary),
          '--theme-accent': formatOklch(lightAccent),
          '--theme-accent-fg': pickContrastForeground(lightAccent),
          '--theme-shadow-floating': [
            '0 0 0 1px oklch(20% 0.02 250 / 0.08)',
            '0 -6px 24px -6px oklch(20% 0.025 250 / 0.12)',
            '0 24px 56px -12px oklch(20% 0.03 250 / 0.34)',
            `0 10px 24px -6px ${formatOklch(lightPrimary).replace(')', ' / 0.16)')}`,
          ].join(', '),
        },
    dark: isDefaultColor
      ? {}
      : {
          '--theme-primary': formatOklch(darkPrimary),
          '--theme-primary-fg': pickContrastForeground(darkPrimary),
          '--theme-secondary': formatOklch(darkSecondary),
          '--theme-secondary-fg': pickContrastForeground(darkSecondary),
          '--theme-accent': formatOklch(darkAccent),
          '--theme-accent-fg': pickContrastForeground(darkAccent),
          '--theme-shadow-floating': [
            '0 0 0 1px oklch(100% 0 0 / 0.16)',
            '0 -8px 28px -6px oklch(0% 0 0 / 0.65)',
            '0 28px 64px -12px oklch(0% 0 0 / 0.88)',
            `0 10px 28px -6px ${formatOklch(darkPrimary).replace(')', ' / 0.22)')}`,
          ].join(', '),
        },
    fonts: {
      sans: latinSpec.body,
      display: latinSpec.display,
      fa: rtlSpec.stack,
    },
  };
}

/**
 * Generates compact `<style>` rules overriding `--theme-*` and `--font-*` tokens
 * when a client customizes brand colors or font pairings in `app.config.json`.
 */
export function buildBrandThemeCss(input: BrandThemeInput): string {
  const resolved = resolveBrandTheme(input);
  const rootEntries: [string, string][] = Object.entries(resolved.light);

  if (input.fontPreset && input.fontPreset !== 'system') {
    rootEntries.push(['--font-sans', resolved.fonts.sans]);
    rootEntries.push(['--font-display', resolved.fonts.display]);
  }
  if (input.rtlFontPreset && input.rtlFontPreset !== 'vazirmatn') {
    rootEntries.push(['--font-fa', resolved.fonts.fa]);
    rootEntries.push(['--font-ar', resolved.fonts.fa]);
  }

  const darkEntries = Object.entries(resolved.dark);
  const blocks: string[] = [];
  if (rootEntries.length > 0) {
    blocks.push(`:root{${rootEntries.map(([k, v]) => `${k}:${v}`).join(';')}}`);
  }
  if (darkEntries.length > 0) {
    blocks.push(
      `:root[data-theme="dark"]{${darkEntries.map(([k, v]) => `${k}:${v}`).join(';')}}`
    );
  }
  return blocks.join('');
}
