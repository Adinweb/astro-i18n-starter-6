#!/usr/bin/env node
/**
 * Pre-flight health check for a project built from this starter.
 *
 * Runs no build and writes no file: it inspects the configuration, the
 * dictionaries and the content, then prints one line per finding with the
 * command that fixes it. `lint`/`build`/`smoke` answer "does it compile and
 * render"; `doctor` answers "is this project set up for the site it describes".
 *
 * Usage:
 *   pnpm run doctor [--json]
 *
 * Exit code is 1 when at least one error was found, so CI can gate on it.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  KNOWN_TYPES,
  contentDirFor,
  groupDirs,
  readAppConfig,
  readContentTypes,
  rootDir,
} from './lib/content-types.mjs';
import { readLocaleConfig } from './lib/locales.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const wantsJson = process.argv.includes('--json');
const findings = [];
const add = (level, title, fix) => findings.push({ level, title, fix });

const RESERVED_BASES = new Set([
  'page',
  'pagefind',
  '_astro',
  'api',
  'rss',
  'sitemap',
  'robots',
  'icons',
  'site.webmanifest',
]);

// ---------------------------------------------------------------- runtime ---
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const requiredNode = /(\d+)\.(\d+)\.(\d+)/.exec(packageJson.engines?.node ?? '');
const [major, minor] = process.versions.node.split('.').map(Number);
if (requiredNode) {
  const needed = requiredNode.slice(1, 3).map(Number);
  const tooOld =
    major < needed[0] || (major === needed[0] && minor < needed[1]);
  if (tooOld) {
    add(
      'error',
      `Node ${process.versions.node} is older than the required ${packageJson.engines.node}.`,
      'Install the version pinned in package.json "engines".'
    );
  } else {
    add('ok', `Node ${process.versions.node} satisfies ${packageJson.engines.node}.`);
  }
}

if (!fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) {
  // A fresh clone before `pnpm install` is a normal state, so this is a
  // warning: it cannot break the build, it only makes installs unreproducible.
  add('warn', 'pnpm-lock.yaml is missing.', 'Run `pnpm install` and commit the lockfile.');
} else if (!packageJson.packageManager) {
  add(
    'warn',
    'package.json has no "packageManager" field.',
    'Add e.g. "packageManager": "pnpm@<version>" so CI and contributors agree on the tool.'
  );
} else {
  add('ok', `Package manager pinned as ${packageJson.packageManager}.`);
}

// ----------------------------------------------------------------- config ---
let appConfig = null;
try {
  appConfig = readAppConfig();
  add('ok', 'app.config.json parses.');
} catch (error) {
  add('error', `app.config.json is not valid JSON: ${error.message}`, 'Fix the JSON syntax.');
}

// Read the locales before validating content-type bases: a base that matches a
// locale prefix is reserved by the router, exactly as it is in types.ts.
const { locales, defaultLocale } = readLocaleConfig();
const types = appConfig ? readContentTypes(appConfig) : [];

const unknown = types.filter((type) => !KNOWN_TYPES.includes(type.key));
for (const type of unknown) {
  add(
    'error',
    `Unknown content type "${type.key}" in content.types.`,
    `Add its collection to src/content.config.ts and the key to CONTENT_TYPE_KEYS, or remove it from app.config.json (known: ${KNOWN_TYPES.join(', ')}).`
  );
}

const seenBases = new Map();
for (const type of types) {
  if (type.key === 'pages') continue;
  if (!type.base) {
    add('error', `Content type "${type.key}" has an empty base.`, 'Give it a route segment.');
    continue;
  }
  if (RESERVED_BASES.has(type.base) || locales.includes(type.base)) {
    add(
      'error',
      `Content type "${type.key}" uses the reserved base "${type.base}".`,
      'Pick another segment; the router, the build output and locale prefixes own those paths.'
    );
  }
  if (seenBases.has(type.base)) {
    add(
      'error',
      `Content types "${seenBases.get(type.base)}" and "${type.key}" share the base "${type.base}".`,
      'Give each type its own route segment.'
    );
  }
  seenBases.set(type.base, type.key);
}

const disabled = types.filter((type) => !type.enabled);
if (disabled.length > 0) {
  add(
    'warn',
    `Disabled content type(s): ${disabled.map((type) => type.key).join(', ')}.`,
    'Their routes, sitemap entries and navigation links are not built. Re-enable with `pnpm run content:enable <type>`.'
  );
}

if (appConfig) {
  const templateBrand =
    /starter|template/i.test(appConfig.site?.name ?? '') ||
    appConfig.site?.name === 'Astro i18n Starter';
  if (templateBrand) {
    add(
      'warn',
      `Site name is still the template default ("${appConfig.site?.name}").`,
      'Set site.name/shortName/description, brand colors and social links in app.config.json.'
    );
  } else {
    add('ok', `Site identity is customised (${appConfig.site.name}).`);
  }

  if (/example\.com|github\.com\/?$/.test(appConfig.social?.github ?? '')) {
    add('warn', 'Social links still point at placeholders.', 'Set social.github/twitter in app.config.json.');
  }
}

if (!process.env.SITE_URL) {
  add(
    'warn',
    'SITE_URL is not set in this shell.',
    'Set it before a production build so canonical URLs, hreflang, the feed and the sitemap use the real origin.'
  );
} else {
  add('ok', `SITE_URL is set (${process.env.SITE_URL}).`);
}

// ------------------------------------------------------------- dictionaries ---
if (locales.length === 0) {
  add('error', 'Could not read LOCALES from src/i18n/locales.ts.', 'Check that file.');
}

const dictionaries = {};
for (const locale of locales) {
  const file = path.join(rootDir, 'messages', `${locale}.json`);
  if (!fs.existsSync(file)) {
    add('error', `messages/${locale}.json is missing.`, 'Run `pnpm run messages:compile` or create it.');
    continue;
  }
  try {
    dictionaries[locale] = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (error) {
    add('error', `messages/${locale}.json is not valid JSON: ${error.message}`, 'Fix the syntax.');
  }
}

const baseDictionary = dictionaries[defaultLocale];
if (baseDictionary) {
  const baseKeys = Object.keys(baseDictionary).filter((key) => !key.startsWith('$'));

  for (const locale of locales) {
    const dictionary = dictionaries[locale];
    if (!dictionary || locale === defaultLocale) continue;
    const missing = baseKeys.filter((key) => !(key in dictionary));
    if (missing.length > 0) {
      add(
        'error',
        `${locale}.json is missing ${missing.length} key(s), e.g. ${missing.slice(0, 3).join(', ')}.`,
        'Run `pnpm run audit:i18n` for the full list.'
      );
    }
  }

  const todos = locales
    .filter((locale) => locale !== defaultLocale)
    .map((locale) => {
      const dictionary = dictionaries[locale] ?? {};
      return {
        locale,
        count: Object.values(dictionary).filter(
          (value) => typeof value === 'string' && value.includes('[TODO:')
        ).length,
      };
    })
    .filter((entry) => entry.count > 0);

  if (todos.length > 0) {
    add(
      'warn',
      `Untranslated message keys: ${todos.map((entry) => `${entry.locale} ${entry.count}`).join(', ')}.`,
      'Translate them in messages/<locale>.json. A [TODO: …] value ships as visible copy.'
    );
  } else {
    add('ok', `No [TODO: …] values in the ${locales.length} dictionaries.`);
  }
}

// Compiled messages must not be older than the dictionaries they come from.
// The compiler only rewrites the files whose content changed, so the barrel it
// always regenerates is the reliable timestamp of the last successful compile.
const compiledBarrel = path.join(rootDir, 'src', 'paraglide', 'messages', '_index.js');
const compiledMessages = fs.existsSync(compiledBarrel)
  ? compiledBarrel
  : path.join(rootDir, 'src', 'paraglide', 'messages.js');

if (!fs.existsSync(compiledMessages)) {
  add('warn', 'src/paraglide/ is not compiled.', 'Run `pnpm run messages:compile`.');
} else {
  const compiledAt = fs.statSync(compiledMessages).mtimeMs;
  const newestDictionary = Math.max(
    ...locales.map((locale) => {
      const file = path.join(rootDir, 'messages', `${locale}.json`);
      return fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0;
    })
  );
  if (newestDictionary > compiledAt + 1000) {
    add(
      'warn',
      'messages/*.json changed after src/paraglide/ was compiled.',
      'Run `pnpm run messages:compile` (or `pnpm run dev`, which compiles first).'
    );
  } else {
    add('ok', 'Compiled messages are up to date.');
  }
}

// ------------------------------------------------------------------ content ---
for (const type of types.filter((candidate) => KNOWN_TYPES.includes(candidate.key))) {
  const groups = groupDirs(type.key);
  if (groups.length === 0) {
    if (type.enabled && type.key !== 'pages') {
      add(
        'warn',
        `Content type "${type.key}" is enabled but has no entries.`,
        `Create one with \`pnpm run content:new ${type.key} <slug>\` or disable it.`
      );
    }
    continue;
  }

  let missingFiles = 0;
  let brokenImages = 0;
  let todoEntries = 0;

  for (const group of groups) {
    const groupDir = path.join(contentDirFor(type.key), group);
    for (const locale of locales) {
      const file = ['mdx', 'md'].map((ext) => path.join(groupDir, `${locale}.${ext}`)).find((candidate) => fs.existsSync(candidate));
      if (!file) {
        missingFiles += 1;
        continue;
      }
      const source = fs.readFileSync(file, 'utf-8');
      const { data } = parseFrontmatter(source);
      if (typeof data.title === 'string' && data.title.includes('[TODO:')) todoEntries += 1;
      if (typeof data.image === 'string' && data.image.startsWith('./')) {
        const imagePath = path.resolve(groupDir, data.image);
        if (!fs.existsSync(imagePath)) brokenImages += 1;
      }
    }
  }

  if (missingFiles > 0) {
    add(
      'warn',
      `${type.key}: ${missingFiles} group/locale file(s) missing.`,
      `Run \`pnpm run content:status\` for the matrix, then \`pnpm run i18n:add-lang\`-style scaffolding or add the files.`
    );
  }
  if (brokenImages > 0) {
    add(
      'error',
      `${type.key}: ${brokenImages} frontmatter image reference(s) point at files that do not exist.`,
      'Fix the `image: "./<file>"` value or run `pnpm run assets:generate`.'
    );
  }
  if (todoEntries > 0) {
    add(
      'warn',
      `${type.key}: ${todoEntries} entr(ies) still carry a [TODO: …] title.`,
      'Translate the title before publishing that locale.'
    );
  }
  if (missingFiles === 0 && brokenImages === 0 && todoEntries === 0) {
    add('ok', `${type.key}: ${groups.length} group(s) complete across ${locales.length} locale(s).`);
  }
}

if (!fs.existsSync(path.join(rootDir, 'dist'))) {
  add('warn', 'No dist/ build yet.', 'Run `pnpm run build` before `pnpm run smoke`.');
}

// ------------------------------------------------------------------- output ---
const errors = findings.filter((finding) => finding.level === 'error');
const warnings = findings.filter((finding) => finding.level === 'warn');

if (wantsJson) {
  console.log(
    JSON.stringify({ ok: errors.length === 0, errors: errors.length, warnings: warnings.length, findings }, null, 2)
  );
  process.exit(errors.length === 0 ? 0 : 1);
}

const icon = { ok: '✅', warn: '⚠️ ', error: '❌' };
console.log('🩺 Project doctor\n');
for (const finding of findings) {
  console.log(`${icon[finding.level]} ${finding.title}`);
  if (finding.fix && finding.level !== 'ok') console.log(`   → ${finding.fix}`);
}

console.log(
  `\n${errors.length} error(s), ${warnings.length} warning(s).` +
    (errors.length === 0 ? ' No blocking problems found.' : ' Fix the errors above, then re-run.')
);
process.exit(errors.length === 0 ? 0 : 1);
