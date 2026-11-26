import fs from 'node:fs';
import path from 'node:path';

/**
 * Resolves the `@fontsource-variable/*` npm packages required by the active
 * `brand.fontPreset` and `brand.rtlFontPreset` from `theme-presets.json`.
 *
 * In development (`includeAll: true`), returns all preset packages so the live
 * DevThemePreview studio can switch any Latin/RTL font immediately. In
 * production builds (`includeAll: false`), returns only the active presets so
 * unused font CSS and `.woff2` subsets are excluded from `dist/`.
 */

/**
 * @param {{
 *   latinFonts?: Record<string, { packages?: string[] }>;
 *   rtlFonts?: Record<string, { packages?: string[] }>;
 * }} presets
 * @param {{ fontPreset?: string; rtlFontPreset?: string } | undefined} brand
 * @param {boolean} [includeAll=false]
 * @returns {string[]}
 */
export function resolveBrandFontPackages(presets, brand, includeAll = false) {
  const packages = new Set();

  if (includeAll) {
    for (const spec of Object.values(presets?.latinFonts ?? {})) {
      for (const pkg of spec?.packages ?? []) packages.add(pkg);
    }
    for (const spec of Object.values(presets?.rtlFonts ?? {})) {
      for (const pkg of spec?.packages ?? []) packages.add(pkg);
    }
    return [...packages];
  }

  const latinKey = brand?.fontPreset || 'system';
  const rtlKey = brand?.rtlFontPreset || 'vazirmatn';
  const latinSpec = presets?.latinFonts?.[latinKey] ?? presets?.latinFonts?.system;
  const rtlSpec = presets?.rtlFonts?.[rtlKey] ?? presets?.rtlFonts?.vazirmatn;

  for (const pkg of latinSpec?.packages ?? []) packages.add(pkg);
  for (const pkg of rtlSpec?.packages ?? []) packages.add(pkg);

  return [...packages];
}

/**
 * Selects primary built `.woff2` asset filenames from `dist/_astro` to preload
 * per writing direction so webfont swaps do not cause layout shifts (CLS).
 *
 * @param {string[]} assetFiles
 * @param {{
 *   latinFonts?: Record<string, { packages?: string[] }>;
 *   rtlFonts?: Record<string, { packages?: string[] }>;
 * }} presets
 * @param {{ fontPreset?: string; rtlFontPreset?: string } | undefined} brand
 * @returns {{ rtl: string[]; ltr: string[] }}
 */
export function resolveBrandFontPreloadFiles(assetFiles, presets, brand) {
  const woff2 = assetFiles.filter((f) => f.endsWith('.woff2')).sort();
  const latinKey = brand?.fontPreset || 'system';
  const rtlKey = brand?.rtlFontPreset || 'vazirmatn';
  const latinSpec = presets?.latinFonts?.[latinKey] ?? presets?.latinFonts?.system;
  const rtlSpec = presets?.rtlFonts?.[rtlKey] ?? presets?.rtlFonts?.vazirmatn;

  const ltr = [];
  for (const pkg of latinSpec?.packages ?? []) {
    const slug = pkg.replace(/^@fontsource-variable\//, '');
    const match = woff2.find((f) => f.startsWith(`${slug}-latin-wght-normal.`));
    if (match) ltr.push(match);
  }

  const rtl = [];
  for (const pkg of rtlSpec?.packages ?? []) {
    const slug = pkg.replace(/^@fontsource-variable\//, '');
    const match = woff2.find((f) => f.startsWith(`${slug}-arabic-wght-normal.`));
    if (match) rtl.push(match);
  }

  return { rtl, ltr };
}

/**
 * Injects `<link rel="preload" as="font" ...>` tags into built HTML files inside
 * `outDir` according to each page's `<html dir="...">` direction.
 *
 * @param {string} outDir
 * @param {{
 *   latinFonts?: Record<string, { packages?: string[] }>;
 *   rtlFonts?: Record<string, { packages?: string[] }>;
 * }} presets
 * @param {{ fontPreset?: string; rtlFontPreset?: string } | undefined} brand
 * @returns {number} Number of HTML files updated.
 */
export function injectFontPreloadsIntoDist(outDir, presets, brand) {
  const astroDir = path.join(outDir, '_astro');
  if (!fs.existsSync(astroDir)) return 0;

  const assetFiles = fs.readdirSync(astroDir);
  const { rtl, ltr } = resolveBrandFontPreloadFiles(assetFiles, presets, brand);
  if (rtl.length === 0 && ltr.length === 0) return 0;

  let updatedCount = 0;

  /** @param {string} dir */
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

      const html = fs.readFileSync(fullPath, 'utf-8');
      const isRtl = /<html\b[^>]*\bdir=(?:"rtl"|'rtl'|rtl\b)/i.test(html);
      const targets = isRtl ? [...rtl, ...ltr] : ltr;
      if (targets.length === 0) continue;

      const tags = targets
        .map((file) => `<link rel="preload" as="font" type="font/woff2" href="/_astro/${file}" crossorigin>`)
        .filter((tag) => !html.includes(`href="/_astro/${tag.match(/href="\/_astro\/([^"]+)"/)?.[1]}"`))
        .join('');
      if (!tags) continue;

      const nextHtml = html.includes('<link rel="stylesheet"')
        ? html.replace('<link rel="stylesheet"', `${tags}<link rel="stylesheet"`)
        : html.replace('</head>', `${tags}</head>`);
      if (nextHtml !== html) {
        fs.writeFileSync(fullPath, nextHtml, 'utf-8');
        updatedCount += 1;
      }
    }
  };

  walk(outDir);
  return updatedCount;
}

