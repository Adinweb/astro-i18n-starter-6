import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import sharp from 'sharp';
import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js';
import { getLocaleMeta, type Locale } from '@/i18n/locales';
import { siteConfig } from '@/libs/config/app';
import {
  THEME_PRESETS,
  oklchToRgb,
  parseHexRgb,
  resolveBrandTheme,
  rgbToOklch,
  type BrandThemeInput,
} from '@/libs/config/theme';

export interface SocialCardContext {
  /** Deterministic ASCII-safe key used to address `/og/<routeKey>.png`. */
  routeKey: string;
  title: string;
  subtitle?: string;
  kicker?: string;
  locale: Locale;
}

export interface OgCardRenderOptions {
  width?: number;
  height?: number;
  siteName?: string;
  brand?: BrandThemeInput;
  /** Optional `data:image/...` badge embedded in the top opposite corner (`null` disables auto-logo lookup). */
  logoDataUri?: string | null;
  /** Caches rendered PNGs under `.astro/og-cache` by SVG + font fingerprint (default `true`). */
  cache?: boolean;
}

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function escapeXml(value: string): string {
  return value
    .replace(CONTROL_CHARS_RE, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Deterministic ASCII-safe route key shared between page/collection views and
 * `/og/[...slug].png.ts` so every meta tag points at the exact PNG asset emitted
 * at build time, even when a locale uses non-ASCII slugs.
 */
export function buildOgRouteKey(
  routeType: 'page' | 'blog-entry' | 'blog-index' | 'collection-entry' | 'collection-index',
  opts: { group?: string; contentType?: string; page?: number; locale: Locale }
): string {
  switch (routeType) {
    case 'page':
      return `pages/${opts.group}/${opts.locale}`;
    case 'blog-entry':
      return `blog/${opts.group}/${opts.locale}`;
    case 'blog-index':
      return `blog/index-${opts.locale}-p${opts.page ?? 1}`;
    case 'collection-entry':
      return `${opts.contentType}/${opts.group}/${opts.locale}`;
    case 'collection-index':
      return `${opts.contentType}/index-${opts.locale}-p${opts.page ?? 1}`;
  }
}

export function getBrandedOgHref(routeKey: string): string {
  const cleanKey = routeKey.replace(/^\/+|\/+$/g, '');
  return `/og/${cleanKey}.png`;
}

/**
 * Word-wraps copy cleanly for fixed-width SVG `<tspan>` blocks.
 */
export function wrapTextLines(text: string, maxChars: number, maxLines: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized || maxLines <= 0) return [];

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  const pushTruncated = (value: string) => {
    const clean = value.trimEnd();
    if (clean.length <= maxChars) return `${clean}…`;
    return `${clean.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
  };

  for (let i = 0; i < words.length; i += 1) {
    let word = words[i];
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
        if (lines.length === maxLines) {
          lines[maxLines - 1] = pushTruncated(lines[maxLines - 1]);
          return lines;
        }
      }
      while (word.length > maxChars && lines.length < maxLines) {
        if (lines.length === maxLines - 1) {
          lines.push(`${word.slice(0, Math.max(1, maxChars - 1))}…`);
          return lines;
        }
        lines.push(word.slice(0, maxChars));
        word = word.slice(maxChars);
      }
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      lines.push(current);
      if (lines.length === maxLines) {
        lines[maxLines - 1] = pushTruncated(lines[maxLines - 1]);
        return lines;
      }
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }
  return lines.slice(0, maxLines);
}

function rgbToHex(rgb: readonly [number, number, number]): string {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

const require = createRequire(import.meta.url);
const cachedFontBuffersMap = new Map<string, Promise<Buffer[]>>();
const cachedLogoDataUriMap = new Map<string, string | null>();

interface OgFontResolution {
  rtlFamily: string;
  latinFamily: string;
  rtlFontCss: string;
  latinFontCss: string;
  candidates: string[];
}

const OG_FONTSOURCE_FILES: Record<string, string[]> = {
  '@fontsource-variable/vazirmatn': [
    'node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2',
    'node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-latin-wght-normal.woff2',
  ],
  '@fontsource-variable/noto-sans-arabic': [
    'node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2',
    'node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-latin-wght-normal.woff2',
  ],
  '@fontsource-variable/plus-jakarta-sans': [
    'node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
  ],
  '@fontsource-variable/manrope': [
    'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
  ],
  '@fontsource-variable/outfit': [
    'node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2',
  ],
  '@fontsource-variable/dm-sans': [
    'node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2',
  ],
  '@fontsource-variable/fraunces': [
    'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2',
  ],
};

function extractPrimaryFamily(stack: string, fallback: string): string {
  const first = stack.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
  const normalized = first.replace(/\s+Variable$/i, '').trim();
  return normalized || fallback;
}

function resolveOgTypography(brand?: Pick<BrandThemeInput, 'fontPreset' | 'rtlFontPreset'>): OgFontResolution {
  const rawLatinKey = brand?.fontPreset ?? 'system';
  const effectiveLatinKey = rawLatinKey === 'system' ? 'jakarta' : rawLatinKey;
  const latinEntry =
    THEME_PRESETS.latinFonts[effectiveLatinKey as keyof typeof THEME_PRESETS.latinFonts] ??
    THEME_PRESETS.latinFonts.jakarta;

  const rawRtlKey = brand?.rtlFontPreset ?? 'vazirmatn';
  const rtlEntry =
    THEME_PRESETS.rtlFonts[rawRtlKey as keyof typeof THEME_PRESETS.rtlFonts] ??
    THEME_PRESETS.rtlFonts.vazirmatn;

  const rtlFamily = extractPrimaryFamily(rtlEntry.stack, 'Vazirmatn');
  const latinFamily = extractPrimaryFamily(latinEntry.display, 'Plus Jakarta Sans');

  const rtlFontCss = `${rtlEntry.stack}, 'Vazirmatn', 'Noto Naskh Arabic', 'Tahoma', sans-serif`;
  const latinFontCss = `${latinEntry.display}, 'Plus Jakarta Sans', 'Vazirmatn', 'Noto Sans', sans-serif`;

  const packageNames = [
    ...rtlEntry.packages,
    '@fontsource-variable/vazirmatn',
    ...latinEntry.packages,
    '@fontsource-variable/plus-jakarta-sans',
  ];
  const candidates = [...new Set(packageNames.flatMap((pkg) => OG_FONTSOURCE_FILES[pkg] ?? []))];

  return {
    rtlFamily,
    latinFamily,
    rtlFontCss,
    latinFontCss,
    candidates,
  };
}

function resolveBundledFontFiles(
  brand?: Pick<BrandThemeInput, 'fontPreset' | 'rtlFontPreset'>
): string[] {
  const roots = [process.cwd()];
  const { candidates } = resolveOgTypography(brand);

  const resolved: string[] = [];
  for (const rel of candidates) {
    for (const base of roots) {
      const candidate = path.join(base, rel);
      if (fs.existsSync(candidate)) {
        resolved.push(candidate);
        break;
      }
    }
  }
  return resolved;
}

export function loadDeterministicOgFonts(
  brand?: Pick<BrandThemeInput, 'fontPreset' | 'rtlFontPreset'>
): Promise<Buffer[]> {
  const cacheKey = `${brand?.fontPreset ?? 'system'}:${brand?.rtlFontPreset ?? 'vazirmatn'}`;
  const cached = cachedFontBuffersMap.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const fontFiles = resolveBundledFontFiles(brand);
    if (fontFiles.length === 0) return [];
    const decompress = require('wawoff2/decompress') as (
      input: Buffer | Uint8Array
    ) => Promise<Uint8Array>;

    const buffers: Buffer[] = [];
    for (const fontFile of fontFiles) {
      const woff2 = fs.readFileSync(fontFile);
      const ttf = await decompress(woff2);
      buffers.push(Buffer.from(ttf));
    }
    return buffers;
  })();

  cachedFontBuffersMap.set(cacheKey, promise);
  return promise;
}

async function resolveBrandLogoDataUri(logoPath?: string): Promise<string | null> {
  const clean = logoPath?.trim();
  if (!clean) return null;

  if (cachedLogoDataUriMap.has(clean)) {
    return cachedLogoDataUriMap.get(clean) ?? null;
  }

  const publicRoot = path.resolve(process.cwd(), 'public');
  const candidate = path.resolve(publicRoot, clean.replace(/^\/+/, ''));
  if (!candidate.startsWith(publicRoot + path.sep) || !fs.existsSync(candidate)) {
    cachedLogoDataUriMap.set(clean, null);
    return null;
  }

  try {
    const pngBadge = await sharp(candidate)
      .resize(72, 72, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const uri = `data:image/png;base64,${pngBadge.toString('base64')}`;
    cachedLogoDataUriMap.set(clean, uri);
    return uri;
  } catch {
    cachedLogoDataUriMap.set(clean, null);
    return null;
  }
}

/**
 * Renders a deterministic 1200x630 SVG card matching the brand theme, palette,
 * logo badge, and writing direction of the target route.
 *
 * Uses `text-anchor="end"` for RTL lines because SVG renderers (including `resvg`)
 * align RTL text's visual start edge on `x` when anchored to `end` under
 * `direction="rtl"`.
 */
export function renderBrandedOgSvg(
  context: SocialCardContext,
  options: OgCardRenderOptions = {}
): string {
  const width = options.width ?? siteConfig.ogImageWidth;
  const height = options.height ?? siteConfig.ogImageHeight;
  const siteName = options.siteName ?? siteConfig.name;
  const brandInput: BrandThemeInput = options.brand ?? {
    preset: siteConfig.preset,
    themeColor: siteConfig.themeColor,
    primaryColor: siteConfig.primaryColor,
    accentColor: siteConfig.accentColor,
    fontPreset: siteConfig.fontPreset,
    rtlFontPreset: siteConfig.rtlFontPreset,
  };

  const resolvedTheme = resolveBrandTheme(brandInput);
  const meta = getLocaleMeta(context.locale);
  const isRtl = meta.dir === 'rtl';

  const primaryRgb = parseHexRgb(resolvedTheme.primaryHex) ?? [67, 56, 202];
  const primaryOklch = rgbToOklch(primaryRgb);
  const deepBgHex = rgbToHex(oklchToRgb({ l: 0.16, c: Math.min(0.06, primaryOklch.c * 0.4), h: primaryOklch.h }));
  const deepBgEndHex = rgbToHex(oklchToRgb({ l: 0.21, c: Math.min(0.08, primaryOklch.c * 0.55), h: (primaryOklch.h + 24) % 360 }));
  const brightAccentHex = rgbToHex(oklchToRgb({ l: 0.74, c: 0.16, h: primaryOklch.h }));

  const marginX = 88;
  const textX = isRtl ? width - marginX : marginX;
  const textAnchor = isRtl ? 'end' : 'start';
  const accentX = isRtl ? width - marginX - 6 : marginX;
  const kickerTextX = isRtl ? textX - 20 : textX + 20;
  const glowPrimaryCx = isRtl ? Math.round(width * 0.18) : Math.round(width * 0.82);
  const glowAccentCx = isRtl ? Math.round(width * 0.76) : Math.round(width * 0.24);

  const typography = resolveOgTypography(brandInput);
  const fontFamily = isRtl ? typography.rtlFontCss : typography.latinFontCss;

  const rtlTextAttrs = isRtl ? ` direction="rtl" unicode-bidi="embed" xml:lang="${escapeXml(meta.htmlLang)}"` : '';

  const titleMaxChars = isRtl ? 28 : 26;
  const subtitleMaxChars = isRtl ? 52 : 54;
  const titleLines = wrapTextLines(context.title || siteName, titleMaxChars, 3);
  const subtitleLines = context.subtitle
    ? wrapTextLines(context.subtitle, subtitleMaxChars, 2)
    : [];
  const rawKicker = context.kicker?.trim() || siteName;
  const kickerText = rawKicker.length > 40 ? `${rawKicker.slice(0, 39).trimEnd()}…` : rawKicker;

  const titleStartY = subtitleLines.length > 0 ? 228 : 264;
  const titleLineHeight = 68;
  const subtitleStartY = titleStartY + titleLines.length * titleLineHeight + 24;
  const subtitleLineHeight = 40;

  const dotPatternId = 'og-dot-grid';
  const bgGradId = 'og-bg-grad';
  const glowAId = 'og-glow-a';
  const glowBId = 'og-glow-b';

  const kickerTspan = `<text x="${kickerTextX}" y="124" text-anchor="${textAnchor}"${rtlTextAttrs} font-family="${fontFamily}" font-size="22" font-weight="600" letter-spacing="${isRtl ? '0' : '2'}" fill="${brightAccentHex}">${escapeXml(isRtl ? kickerText : kickerText.toUpperCase())}</text>`;

  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<tspan x="${textX}" dy="${index === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  const subtitleMarkup =
    subtitleLines.length > 0
      ? `<text x="${textX}" y="${subtitleStartY}" text-anchor="${textAnchor}"${rtlTextAttrs} font-family="${fontFamily}" font-size="28" font-weight="400" fill="#cbd5e1">${subtitleLines
          .map(
            (line, index) =>
              `<tspan x="${textX}" dy="${index === 0 ? 0 : subtitleLineHeight}">${escapeXml(line)}</tspan>`
          )
          .join('')}</text>`
      : '';

  const logoDataUri = typeof options.logoDataUri === 'string' && options.logoDataUri.trim() ? options.logoDataUri.trim() : '';
  const logoBadgeBoxSize = 60;
  const logoBadgeX = isRtl ? marginX : width - marginX - logoBadgeBoxSize;
  const logoBadgeY = 86;
  const logoMarkup = logoDataUri
    ? `<rect x="${logoBadgeX}" y="${logoBadgeY}" width="${logoBadgeBoxSize}" height="${logoBadgeBoxSize}" rx="14" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1" />
  <image href="${escapeXml(logoDataUri)}" x="${logoBadgeX + 10}" y="${logoBadgeY + 10}" width="${logoBadgeBoxSize - 20}" height="${logoBadgeBoxSize - 20}" preserveAspectRatio="xMidYMid meet" />`
    : '';

  const siteFooterX = textX;
  const localeBadgeText = `${meta.name} · ${context.locale.toUpperCase()}`;
  const localeX = isRtl ? marginX : width - marginX;
  const localeAnchor = isRtl ? 'start' : 'end';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="${bgGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${deepBgHex}" />
      <stop offset="100%" stop-color="${deepBgEndHex}" />
    </linearGradient>
    <radialGradient id="${glowAId}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${resolvedTheme.primaryHex}" stop-opacity="0.45" />
      <stop offset="100%" stop-color="${resolvedTheme.primaryHex}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="${glowBId}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${resolvedTheme.accentHex}" stop-opacity="0.28" />
      <stop offset="100%" stop-color="${resolvedTheme.accentHex}" stop-opacity="0" />
    </radialGradient>
    <pattern id="${dotPatternId}" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#ffffff" fill-opacity="0.06" />
    </pattern>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#${bgGradId})" />
  <rect width="${width}" height="${height}" fill="url(#${dotPatternId})" />
  <circle cx="${glowPrimaryCx}" cy="170" r="360" fill="url(#${glowAId})" />
  <circle cx="${glowAccentCx}" cy="520" r="280" fill="url(#${glowBId})" />

  ${logoMarkup}
  <rect x="${accentX}" y="96" width="6" height="40" rx="3" fill="${resolvedTheme.accentHex}" />
  ${kickerTspan}

  <text x="${textX}" y="${titleStartY}" text-anchor="${textAnchor}"${rtlTextAttrs} font-family="${fontFamily}" font-size="54" font-weight="700" fill="#f8fafc">${titleMarkup}</text>
  ${subtitleMarkup}

  <line x1="${marginX}" y1="528" x2="${width - marginX}" y2="528" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1" />
  <text x="${siteFooterX}" y="572" text-anchor="${textAnchor}"${rtlTextAttrs} font-family="${fontFamily}" font-size="24" font-weight="600" fill="#e2e8f0">${escapeXml(siteName)}</text>
  <text x="${localeX}" y="572" text-anchor="${localeAnchor}"${rtlTextAttrs} font-family="${fontFamily}" font-size="18" font-weight="500" fill="#94a3b8">${escapeXml(localeBadgeText)}</text>
</svg>`;
}

export async function renderBrandedOgPng(
  context: SocialCardContext,
  options: OgCardRenderOptions = {}
): Promise<Buffer> {
  const logoDataUri =
    options.logoDataUri === null
      ? undefined
      : (options.logoDataUri ??
          (await resolveBrandLogoDataUri(siteConfig.logo?.dark || siteConfig.logo?.light)) ??
          undefined);

  const brandInput: Pick<BrandThemeInput, 'fontPreset' | 'rtlFontPreset'> = {
    fontPreset: options.brand?.fontPreset ?? siteConfig.fontPreset,
    rtlFontPreset: options.brand?.rtlFontPreset ?? siteConfig.rtlFontPreset,
  };
  const typography = resolveOgTypography(brandInput);
  const svg = renderBrandedOgSvg(context, { ...options, logoDataUri });
  const fontBuffers = await loadDeterministicOgFonts(brandInput);
  const isRtl = getLocaleMeta(context.locale).dir === 'rtl';

  const useCache = options.cache !== false;
  let cacheFile: string | null = null;
  if (useCache) {
    const fingerprint = createHash('sha256')
      .update(svg)
      .update('|')
      .update(brandInput.fontPreset ?? 'system')
      .update('|')
      .update(brandInput.rtlFontPreset ?? 'vazirmatn')
      .update('|')
      .update(fontBuffers.map((buf) => buf.byteLength).join(','))
      .digest('hex');
    cacheFile = path.join(process.cwd(), '.astro', 'og-cache', `${fingerprint}.png`);
    try {
      if (fs.existsSync(cacheFile)) {
        return fs.readFileSync(cacheFile);
      }
    } catch {
      // Ignore transient filesystem read errors and re-render cleanly.
    }
  }

  const fontOptions: NonNullable<ResvgRenderOptions['font']> & { fontBuffers?: Buffer[] } = {
    fontBuffers,
    loadSystemFonts: fontBuffers.length === 0,
    defaultFontFamily: isRtl ? typography.rtlFamily : typography.latinFamily,
    sansSerifFamily: isRtl ? typography.rtlFamily : typography.latinFamily,
  };

  const resvg = new Resvg(svg, { font: fontOptions });

  const buffer = Buffer.from(resvg.render().asPng());
  if (cacheFile) {
    try {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(cacheFile, buffer);
    } catch {
      // Ignore read-only filesystems or cache write failures cleanly.
    }
  }
  return buffer;
}

