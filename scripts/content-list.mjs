#!/usr/bin/env node
/**
 * Lists every content type declared in `app.config.json` with its route base,
 * whether it is enabled, and how many entries it holds per locale.
 *
 * Usage:
 *   pnpm run content:list [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  contentDirFor,
  groupDirs,
  readContentTypes,
} from './lib/content-types.mjs';
import { readLocaleConfig } from './lib/locales.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const wantsJson = process.argv.includes('--json');
const { locales, defaultLocale } = readLocaleConfig();

if (locales.length === 0) {
  console.error('❌ Could not read LOCALES from src/i18n/locales.ts');
  process.exit(1);
}

function entryFile(groupDir, locale) {
  for (const extension of ['mdx', 'md']) {
    const candidate = path.join(groupDir, `${locale}.${extension}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function describe(type) {
  const dir = contentDirFor(type.key);
  const groups = groupDirs(type.key);
  const perLocale = Object.fromEntries(locales.map((locale) => [locale, 0]));
  const published = { total: 0, draft: 0, missing: 0 };

  for (const group of groups) {
    const groupDir = path.join(dir, group);
    for (const locale of locales) {
      const file = entryFile(groupDir, locale);
      if (!file) {
        published.missing += 1;
        continue;
      }
      const { data } = parseFrontmatter(fs.readFileSync(file, 'utf-8'));
      perLocale[locale] += 1;
      if (data.draft === true) published.draft += 1;
      else published.total += 1;
    }
  }

  return {
    key: type.key,
    enabled: type.enabled,
    base: type.base === '' ? '/' : `/${type.base}/`,
    index: type.index,
    paginated: type.paginated,
    nav: type.nav,
    groups: groups.length,
    published: published.total,
    drafts: published.draft,
    missing: published.missing,
    perLocale,
  };
}

const report = readContentTypes().map(describe);

if (wantsJson) {
  console.log(JSON.stringify({ defaultLocale, locales, types: report }, null, 2));
  process.exit(0);
}

console.log('📦 Content types (app.config.json → content.types)\n');

const pad = (value, width) => String(value).padEnd(width);
const keyWidth = Math.max(6, ...report.map((type) => type.key.length));

for (const type of report) {
  const state = type.enabled ? '✅ enabled ' : '⏸️  disabled';
  const nav = type.nav ? 'nav' : '—';
  const pagination = type.paginated ? 'paginated' : 'single page';
  console.log(
    `  ${pad(type.key, keyWidth)}  ${state}  ${pad(type.base, 12)}  ` +
      `${type.groups} group(s), ${type.published} published, ${type.drafts} draft, ` +
      `${type.missing} missing  (${pagination}, ${nav})`
  );
}

const disabled = report.filter((type) => !type.enabled).map((type) => type.key);
if (disabled.length > 0) {
  console.log(
    `\nℹ️  Disabled: ${disabled.join(', ')} — no routes, sitemap entries, or navigation links. ` +
      'Re-enable with: pnpm run content:enable <type>'
  );
}

const missingTotal = report.reduce((sum, type) => sum + type.missing, 0);
if (missingTotal > 0) {
  console.log(
    `\n⚠️  ${missingTotal} group/locale combination(s) have no file. ` +
      'Run `pnpm run content:status` for the per-locale matrix.'
  );
}
