#!/usr/bin/env node
/**
 * Switches the starter's default (`DEFAULT_LOCALE` / `baseLocale`) language to
 * any registered locale, keeping `project.inlang/settings.json`,
 * `src/i18n/locales.ts`, and compiled Paraglide messages in sync.
 *
 * Usage:
 *   pnpm run i18n:set-default <locale-code>
 */
import fs from 'node:fs';
import path from 'node:path';
import { compileMessages } from './lib/compile-messages.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { readLocaleConfig } from './lib/locales.mjs';

const args = process.argv.slice(2);
const wantsHelp = args.includes('--help') || args.includes('-h');
const targetLocale = args.find((a) => !a.startsWith('-'));
const allowDraftHome = args.includes('--allow-draft');

if (wantsHelp || !targetLocale) {
  console.error('Usage: pnpm run i18n:set-default <locale-code> [--allow-draft]');
  process.exit(wantsHelp ? 0 : 1);
}

const rootDir = process.cwd();
const inlangPath = path.join(rootDir, 'project.inlang', 'settings.json');
const localesPath = path.join(rootDir, 'src', 'i18n', 'locales.ts');

if (!fs.existsSync(inlangPath)) {
  console.error('❌ Missing project.inlang/settings.json.');
  process.exit(1);
}
if (!fs.existsSync(localesPath)) {
  console.error('❌ Missing src/i18n/locales.ts.');
  process.exit(1);
}

const inlangSettings = JSON.parse(fs.readFileSync(inlangPath, 'utf-8'));
let localesSource = fs.readFileSync(localesPath, 'utf-8');
const localeConfig = readLocaleConfig();

if (!inlangSettings.locales.includes(targetLocale) || !localeConfig.locales.includes(targetLocale)) {
  console.error(
    `❌ Locale "${targetLocale}" is not registered. Registered locales: ${inlangSettings.locales.join(', ')}`
  );
  console.error(`   Register it first with: pnpm run i18n:add-lang ${targetLocale}`);
  process.exit(1);
}

if (!localeConfig.metadata[targetLocale]) {
  console.error(`❌ LOCALE_METADATA in src/i18n/locales.ts is missing "${targetLocale}".`);
  process.exit(1);
}

const dictPath = path.join(rootDir, 'messages', `${targetLocale}.json`);
if (!fs.existsSync(dictPath)) {
  console.error(`❌ Missing dictionary file: messages/${targetLocale}.json.`);
  process.exit(1);
}
const dict = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
if (typeof dict.site_description !== 'string' || !dict.site_description.trim() || /^\[TODO:/i.test(dict.site_description)) {
  console.warn(
    `⚠️  Warning: messages/${targetLocale}.json "site_description" is empty or untranslated ([TODO]).`
  );
  console.warn('   Default OG metadata and site.webmanifest read site_description from the default locale.');
}

// `buildSiteRoutes()` requires a published home page for DEFAULT_LOCALE.
const homeDir = path.join(rootDir, 'src', 'content', 'pages', 'home');
const homeFile = ['mdx', 'md']
  .map((ext) => path.join(homeDir, `${targetLocale}.${ext}`))
  .find((candidate) => fs.existsSync(candidate));

if (!homeFile) {
  console.error(
    `❌ Missing home page for "${targetLocale}": expected src/content/pages/home/${targetLocale}.mdx.`
  );
  console.error('   Every default locale needs a published home page at "/".');
  process.exit(1);
}

if (!allowDraftHome) {
  const { data } = parseFrontmatter(fs.readFileSync(homeFile, 'utf-8'));
  if (data.draft === true || data.draft === 'true') {
    console.error(
      `❌ Home page for "${targetLocale}" (${path.relative(rootDir, homeFile)}) is currently a draft (draft: true).`
    );
    console.error('   Set `draft: false` before switching the default locale (or pass --allow-draft).');
    process.exit(1);
  }
}

const currentInlangDefault = inlangSettings.baseLocale;
const currentTsDefault = localeConfig.defaultLocale;

if (currentInlangDefault === targetLocale && currentTsDefault === targetLocale) {
  console.log(`ℹ️  "${targetLocale}" is already the default locale.`);
  process.exit(0);
}

// 1. Update project.inlang/settings.json
if (inlangSettings.baseLocale !== targetLocale) {
  inlangSettings.baseLocale = targetLocale;
  const eol = fs.readFileSync(inlangPath, 'utf-8').includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(
    inlangPath,
    JSON.stringify(inlangSettings, null, 2).split('\n').join(eol) + eol,
    'utf-8'
  );
  console.log(`✅ Updated baseLocale to "${targetLocale}" in project.inlang/settings.json`);
}

// 2. Update DEFAULT_LOCALE in src/i18n/locales.ts
const defaultPattern = /(export const DEFAULT_LOCALE\s*:\s*Locale\s*=\s*)['"][^'"]+['"]/;
if (!defaultPattern.test(localesSource)) {
  console.error('❌ Could not locate DEFAULT_LOCALE declaration in src/i18n/locales.ts.');
  process.exit(1);
}
localesSource = localesSource.replace(defaultPattern, `$1'${targetLocale}'`);
fs.writeFileSync(localesPath, localesSource, 'utf-8');
console.log(`✅ Updated DEFAULT_LOCALE to "${targetLocale}" in src/i18n/locales.ts`);

// 3. Recompile Paraglide messages
console.log('\n🔄 Recompiling Paraglide messages...');
try {
  compileMessages(rootDir);
  const meta = localeConfig.metadata[targetLocale];
  console.log(
    `🎉 Default locale switched to "${targetLocale}" (${meta.name ?? targetLocale}, dir=${meta.dir ?? 'ltr'})!`
  );
  console.log('   Next: run `pnpm run audit:i18n && pnpm run build && pnpm run smoke` to verify.');
} catch (error) {
  console.error('❌ Failed to compile messages:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
