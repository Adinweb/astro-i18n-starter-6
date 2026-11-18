#!/usr/bin/env node
/**
 * Pre-flight health check for a project built from this starter.
 *
 * Inspects two-tier configuration (`app.config.json` + `client/config.json`),
 * `client/locales.json`, merged dictionaries, and content health.
 *
 * Usage:
 *   npm run doctor -- [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  contentDirFor,
  getKnownTypes,
  groupDirs,
  readContentTypes,
  rootDir,
} from './lib/content-types.mjs';
import {
  clientConfigPathFor,
  coreConfigPathFor,
  deepMergeConfig,
} from './lib/config.mjs';
import { localeConfigPathFor, readLocaleConfig } from './lib/locales.mjs';
import {
  readCoreMessages,
  readMergedMessages,
  stripSchema,
} from './lib/merge-messages.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { findPlaceholderSlugs } from './lib/slug.mjs';

const wantsJson = process.argv.includes('--json');
const findings = [];
const add = (level, title, fix) => findings.push({ level, title, fix });

const RESERVED_BASES = new Set([
  'page',
  'pagefind',
  '_astro',
  'api',
  'rss',
  'og',
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
  const tooOld = major < needed[0] || (major === needed[0] && minor < needed[1]);
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

const hasLockfile =
  fs.existsSync(path.join(rootDir, 'package-lock.json')) ||
  fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'));
if (!hasLockfile) {
  add('warn', 'No lockfile (package-lock.json or pnpm-lock.yaml) found.', 'Run `npm install` and commit the lockfile.');
} else {
  add('ok', 'Dependency lockfile is present.');
}

// ----------------------------------------------------------------- config ---
let coreConfig = null;
let clientConfig = {};
let appConfig = null;

try {
  coreConfig = JSON.parse(fs.readFileSync(coreConfigPathFor(rootDir), 'utf-8'));
  add('ok', 'app.config.json parses.');
} catch (error) {
  add('error', `app.config.json is not valid JSON: ${error.message}`, 'Fix the JSON syntax.');
}

const clientCfgPath = clientConfigPathFor(rootDir);
if (fs.existsSync(clientCfgPath)) {
  try {
    const raw = fs.readFileSync(clientCfgPath, 'utf-8').trim();
    clientConfig = raw ? JSON.parse(raw) : {};
    add('ok', 'client/config.json parses.');
  } catch (error) {
    add('error', `client/config.json is not valid JSON: ${error.message}`, 'Fix the JSON syntax.');
  }
} else {
  add('warn', 'client/config.json is missing.', 'Create `{}` in client/config.json or run `npm run site:init`.');
}

if (coreConfig) {
  appConfig = deepMergeConfig(coreConfig, clientConfig);
}

let locales = [];
let defaultLocale = 'en';
try {
  const localeCfg = readLocaleConfig(rootDir);
  locales = localeCfg.locales;
  defaultLocale = localeCfg.defaultLocale || locales[0] || 'en';
  add('ok', `client/locales.json defines ${locales.length} locale(s) (default: ${defaultLocale}).`);
} catch (error) {
  add('error', error instanceof Error ? error.message : String(error), 'Create valid client/locales.json.');
}

const knownTypes = getKnownTypes(rootDir);
const types = appConfig ? readContentTypes(appConfig, rootDir) : [];

const unknown = types.filter((type) => !knownTypes.includes(type.key));
for (const type of unknown) {
  add(
    'error',
    `Unknown content type "${type.key}" in content.types.`,
    `Register its collection in client/content.ts or remove it from client/config.json (known: ${knownTypes.join(', ')}).`
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
    'Their routes, sitemap entries and navigation links are not built. Re-enable with `npm run content:enable -- <type>`.'
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
      'Run `npm run site:init` or set site overrides in client/config.json.'
    );
  } else {
    add('ok', `Site identity is customised (${appConfig.site.name}).`);
  }

  const presetsFile = path.join(rootDir, 'src', 'libs', 'config', 'theme-presets.json');
  if (fs.existsSync(presetsFile)) {
    const themePresets = JSON.parse(fs.readFileSync(presetsFile, 'utf-8'));
    const brand = appConfig.brand ?? {};
    if (brand.preset && !(brand.preset in themePresets.palettes)) {
      add(
        'error',
        `Unknown brand.preset "${brand.preset}" in merged config.`,
        `Use one of: ${Object.keys(themePresets.palettes).join(', ')}.`
      );
    }
    if (brand.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(brand.primaryColor)) {
      add(
        'error',
        `Invalid brand.primaryColor "${brand.primaryColor}".`,
        'Use a 6-digit hex color like "#1e40af".'
      );
    }
    if (brand.accentColor && !/^#[0-9a-fA-F]{6}$/.test(brand.accentColor)) {
      add(
        'error',
        `Invalid brand.accentColor "${brand.accentColor}".`,
        'Use a 6-digit hex color like "#f59e0b".'
      );
    }
    if (brand.fontPreset && !(brand.fontPreset in themePresets.latinFonts)) {
      add(
        'error',
        `Unknown brand.fontPreset "${brand.fontPreset}".`,
        `Use one of: ${Object.keys(themePresets.latinFonts).join(', ')}.`
      );
    }
    if (brand.rtlFontPreset && !(brand.rtlFontPreset in themePresets.rtlFonts)) {
      add(
        'error',
        `Unknown brand.rtlFontPreset "${brand.rtlFontPreset}".`,
        `Use one of: ${Object.keys(themePresets.rtlFonts).join(', ')}.`
      );
    }
    if (brand.socialCardMode && !['branded', 'artwork', 'default'].includes(brand.socialCardMode)) {
      add(
        'error',
        `Unknown brand.socialCardMode "${brand.socialCardMode}".`,
        'Use "branded", "artwork", or "default".'
      );
    }
  }

  const hasPlaceholderSocial = Object.values(appConfig.social ?? {}).some(
    (url) => typeof url === 'string' && /example\.com|github\.com\/?$/.test(url.trim())
  );
  if (hasPlaceholderSocial) {
    add(
      'warn',
      'Social links still point at placeholders.',
      'Set your links under social in client/config.json.'
    );
  }

  const hasEndpoint = Boolean(
    appConfig.api?.baseUrl ||
      process.env.PUBLIC_API_BASE_URL ||
      process.env.PUBLIC_CONTACT_API_URL
  );
  const contactEmail = appConfig.site?.contactEmail ?? '';

  if (!hasEndpoint && !contactEmail) {
    add(
      'warn',
      'The contact form has no destination (api.baseUrl and site.contactEmail are both empty).',
      'Set site.contactEmail in client/config.json for mailto fallback and/or api.baseUrl for an external endpoint.'
    );
  } else {
    add(
      'ok',
      contactEmail
        ? `Contact fallback address: ${contactEmail}.`
        : 'Contact form posts to the configured external endpoint.'
    );
  }

  const baseDictionary = locales.length ? readMergedMessages(defaultLocale, rootDir) : null;
  if (baseDictionary) {
    const messageDescription = baseDictionary.site_description;
    const appDescription = appConfig.site?.description;

    if (typeof messageDescription !== 'string' || !messageDescription.trim()) {
      add(
        'error',
        `Merged dictionary for "${defaultLocale}" is missing a non-empty "site_description".`,
        `Add "site_description" in client/messages/${defaultLocale}.json.`
      );
    } else if (
      defaultLocale === 'en' &&
      typeof appDescription === 'string' &&
      messageDescription.trim() !== appDescription.trim()
    ) {
      add(
        'warn',
        `Site description differs between merged config and "${defaultLocale}" dictionary.`,
        `Keep site.description in client/config.json aligned with site_description in client/messages/${defaultLocale}.json.`
      );
    }
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
const dictionaries = {};
for (const locale of locales) {
  const hasCore = Object.keys(stripSchema(readCoreMessages(locale, rootDir))).length > 0;
  const clientFile = path.join(rootDir, 'client', 'messages', `${locale}.json`);
  if (!hasCore && !fs.existsSync(clientFile)) {
    add('error', `client/messages/${locale}.json is missing.`, 'Run `npm run messages:compile` or create it.');
    continue;
  }
  try {
    dictionaries[locale] = readMergedMessages(locale, rootDir);
  } catch (error) {
    add('error', `Dictionary for "${locale}" could not be loaded: ${error.message}`, 'Fix the JSON syntax.');
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
        `Merged "${locale}" dictionary is missing ${missing.length} key(s), e.g. ${missing.slice(0, 3).join(', ')}.`,
        'Run `npm run audit:i18n` for the full list.'
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
      'Translate them in client/messages/<locale>.json. A [TODO: …] value ships as visible copy.'
    );
  } else {
    add('ok', `No [TODO: …] values in the ${locales.length} active dictionaries.`);
  }
}

// Check compiled Paraglide output freshness against core + client messages + client/locales.json
const compiledBarrel = path.join(rootDir, 'src', 'paraglide', 'messages', '_index.js');
const compiledMessages = fs.existsSync(compiledBarrel)
  ? compiledBarrel
  : path.join(rootDir, 'src', 'paraglide', 'messages.js');

if (!fs.existsSync(compiledMessages)) {
  add('warn', 'src/paraglide/ is not compiled.', 'Run `npm run messages:compile`.');
} else {
  const compiledAt = fs.statSync(compiledMessages).mtimeMs;
  const watchFiles = [
    localeConfigPathFor(rootDir),
    ...locales.flatMap((locale) => [
      path.join(rootDir, 'messages', 'core', `${locale}.json`),
      path.join(rootDir, 'client', 'messages', `${locale}.json`),
    ]),
  ];
  const newestSource = Math.max(
    0,
    ...watchFiles.map((file) => (fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0))
  );
  if (newestSource > compiledAt + 1000) {
    add(
      'warn',
      'Message dictionaries or client/locales.json changed after src/paraglide/ was compiled.',
      'Run `npm run messages:compile`.'
    );
  } else {
    add('ok', 'Compiled messages are up to date.');
  }
}

// ------------------------------------------------------------------ content ---
for (const type of types.filter((candidate) => knownTypes.includes(candidate.key))) {
  const groups = groupDirs(type.key);
  if (groups.length === 0) {
    if (type.enabled && type.key !== 'pages') {
      add(
        'ok',
        `Content type "${type.key}" is enabled with 0 entries (clean base).`,
        `Seed starter demo entries with \`npm run starter:seed\` or create an entry with \`npm run content:new -- ${type.key} <slug>\`.`
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
      const file = ['mdx', 'md']
        .map((ext) => path.join(groupDir, `${locale}.${ext}`))
        .find((candidate) => fs.existsSync(candidate));
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
      'Run `npm run content:status` for the matrix.'
    );
  }
  if (brokenImages > 0) {
    add(
      'error',
      `${type.key}: ${brokenImages} frontmatter image reference(s) point at files that do not exist.`,
      'Fix the `image: "./<file>"` value or run `npm run assets:generate`.'
    );
  }
  if (todoEntries > 0) {
    add(
      'warn',
      `${type.key}: ${todoEntries} entr(ies) still carry a [TODO: …] title.`,
      'Translate the title before publishing that locale.'
    );
  }

  const placeholderSlugs = groups.flatMap((group) =>
    findPlaceholderSlugs(path.join(contentDirFor(type.key), group), group, locales).map(
      (entry) => `${group}/${entry.locale} → "${entry.slug}"`
    )
  );
  if (placeholderSlugs.length > 0) {
    add(
      'warn',
      `${type.key}: ${placeholderSlugs.length} placeholder slug(s): ${placeholderSlugs.slice(0, 3).join(', ')}${placeholderSlugs.length > 3 ? ', …' : ''}.`,
      'Set a native slug per language before publishing.'
    );
  }
  if (missingFiles === 0 && brokenImages === 0 && todoEntries === 0) {
    add('ok', `${type.key}: ${groups.length} group(s) complete across ${locales.length} locale(s).`);
  }
}

if (fs.existsSync(path.join(rootDir, 'starter-kit'))) {
  add('ok', 'starter-kit/ demo bundle is available (`npm run starter:seed`).');
}

if (!fs.existsSync(path.join(rootDir, 'dist'))) {
  add('warn', 'No dist/ build yet.', 'Run `npm run build` before `npm run smoke`.');
}

// ------------------------------------------------------------------- output ---
const errors = findings.filter((finding) => finding.level === 'error');
const warnings = findings.filter((finding) => finding.level === 'warn');

if (wantsJson) {
  console.log(
    JSON.stringify(
      { ok: errors.length === 0, errors: errors.length, warnings: warnings.length, findings },
      null,
      2
    )
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
