import sharp from 'sharp';
import { getLocaleMeta, type Locale } from '@/i18n/locales';
import { siteConfig } from '@/libs/config/app';
import {
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

/**
 * Renders a deterministic 1200x630 SVG card matching the brand theme, palette,
 * and writing direction of the target route.
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
  const textAnchor = 'start';
  const accentX = isRtl ? width - marginX - 6 : marginX;
  const kickerTextX = isRtl ? textX - 20 : textX + 20;
  const glowPrimaryCx = isRtl ? Math.round(width * 0.18) : Math.round(width * 0.82);
  const glowAccentCx = isRtl ? Math.round(width * 0.76) : Math.round(width * 0.24);

  const fontFamily = isRtl
    ? "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Vazirmatn', 'Noto Kufi Arabic', 'Tahoma', sans-serif"
    : "'Noto Sans', 'Liberation Sans', 'DejaVu Sans', sans-serif";

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

  const siteFooterX = isRtl ? width - marginX : marginX;
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

  <rect x="${accentX}" y="96" width="6" height="40" rx="3" fill="${resolvedTheme.accentHex}" />
  ${kickerTspan}

  <text x="${textX}" y="${titleStartY}" text-anchor="${textAnchor}"${rtlTextAttrs} font-family="${fontFamily}" font-size="54" font-weight="700" fill="#f8fafc">${titleMarkup}</text>
  ${subtitleMarkup}

  <line x1="${marginX}" y1="528" x2="${width - marginX}" y2="528" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1" />
  <text x="${siteFooterX}" y="572" text-anchor="${textAnchor}"${rtlTextAttrs} font-family="${fontFamily}" font-size="24" font-weight="600" fill="#e2e8f0">${escapeXml(siteName)}</text>
  <text x="${localeX}" y="572" text-anchor="${localeAnchor}" font-family="'Noto Sans', 'Liberation Sans', sans-serif" font-size="18" font-weight="500" fill="#94a3b8">${escapeXml(localeBadgeText)}</text>
</svg>`;
}

export async function renderBrandedOgPng(
  context: SocialCardContext,
  options: OgCardRenderOptions = {}
): Promise<Buffer> {
  const svg = renderBrandedOgSvg(context, options);
  return await sharp(Buffer.from(svg, 'utf-8'))
    .png({ compressionLevel: 9 })
    .toBuffer();
}
