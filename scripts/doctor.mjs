#!/usr/bin/env node
/**
 * Pre-flight health check for a project built from this starter.
 *
 * Inspects three-tier configuration (`app.config.json` + `client/config.json` + `client/cms.json`),
 * `client/locales.json`, merged dictionaries, and content health.
 *
 * Usage:
 *   npm run doctor -- [--json] [--handoff]
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
  cmsConfigPathFor,
  coreConfigPathFor,
  mergeLayeredConfig,
} from './lib/config.mjs';
import { validateRedirects } from './lib/redirects.mjs';
import { localeConfigPathFor, readLocaleConfig } from './lib/locales.mjs';
import {
  readCoreMessages,
  readMergedMessages,
  stripSchema,
} from './lib/merge-messages.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import {
  collectSectionAssetRefs,
  findUnoptimizedPublicUploads,
  isExistingAssetRef,
} from './lib/image-reference.mjs';
import { findPlaceholderSlugs } from './lib/slug.mjs';
import { isPlaceholderSiteUrl, isPlaceholderSocialUrl } from './lib/validate.mjs';

const wantsJson = process.argv.includes('--json');
const isHandoff = process.argv.includes('--handoff') || process.argv.includes('--strict');
const strictLevel = isHandoff ? 'error' : 'warn';
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
  'llms.txt',
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
  fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml')) ||
  fs.existsSync(path.join(rootDir, 'bun.lock')) ||
  fs.existsSync(path.join(rootDir, 'bun.lockb'));
if (!hasLockfile) {
  add(
    strictLevel,
    'No lockfile (pnpm-lock.yaml, package-lock.json, or bun.lock) found.',
    'Run `pnpm install` (or `npm install`) and commit the lockfile.'
  );
} else {
  add('ok', 'Dependency lockfile is present.');
}

// ----------------------------------------------------------------- config ---
let coreConfig = null;
let clientConfig = {};
let cmsConfig = {};
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

const cmsCfgPath = cmsConfigPathFor(rootDir);
if (fs.existsSync(cmsCfgPath)) {
  try {
    const raw = fs.readFileSync(cmsCfgPath, 'utf-8').trim();
    cmsConfig = raw ? JSON.parse(raw) : {};
    add('ok', 'client/cms.json parses.');
  } catch (error) {
    add('error', `client/cms.json is not valid JSON: ${error.message}`, 'Fix the JSON syntax.');
  }
}

if (coreConfig) {
  appConfig = mergeLayeredConfig(coreConfig, clientConfig, cmsConfig);
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
      strictLevel,
      `Site name is still the template default ("${appConfig.site?.name}").`,
      'Run `npm run site:init` or set site overrides in client/config.json.'
    );
  } else {
    add('ok', `Site identity is customised (${appConfig.site.name}).`);
  }

  if (
    isHandoff &&
    (!appConfig.site?.author?.trim() || appConfig.site.author.trim() === 'Astro Starter Team')
  ) {
    add(
      'error',
      `Default site author is still "${appConfig.site?.author || '(empty)'}" in handoff mode.`,
      'Set site.author in client/config.json or pass `--author` to `site:init` / `client:bootstrap`.'
    );
  }

  const logoObj = appConfig.brand?.logo;
  const publicRoot = path.resolve(rootDir, 'public');
  for (const variant of ['light', 'dark']) {
    const rawLogo = typeof logoObj?.[variant] === 'string' ? logoObj[variant].trim() : '';
    if (!rawLogo || /^https?:\/\//i.test(rawLogo)) continue;
    const logoFile = path.resolve(publicRoot, rawLogo.replace(/^\/+/, ''));
    if (!logoFile.startsWith(publicRoot + path.sep) || !fs.existsSync(logoFile)) {
      add(
        strictLevel,
        `brand.logo.${variant} ("${rawLogo}") does not exist in public/.`,
        'Pass a valid asset path via `npm run site:init -- --logo=<path>` or remove the broken path.'
      );
    }
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

  const hasPlaceholderSocial = Object.values(appConfig.social ?? {}).some((url) =>
    isPlaceholderSocialUrl(url)
  );
  if (hasPlaceholderSocial) {
    add(
      strictLevel,
      'Social links still point at placeholders.',
      'Set your client links (or clear unused keys) under `social` in client/config.json.'
    );
  }

  const hasEndpoint = Boolean(
    appConfig.api?.baseUrl ||
      /^https?:\/\//i.test(appConfig.api?.endpoints?.contact ?? '') ||
      (appConfig.api?.provider === 'web3forms' && (appConfig.api?.accessKey || process.env.PUBLIC_WEB3FORMS_KEY)) ||
      process.env.PUBLIC_API_BASE_URL ||
      process.env.PUBLIC_CONTACT_API_URL
  );
  const contactEmail = appConfig.site?.contactEmail ?? '';

  if (!hasEndpoint && !contactEmail) {
    add(
      strictLevel,
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

  const analytics = appConfig.analytics ?? {};
  const cookiesEnabled = appConfig.cookies?.enabled !== false;
  if (analytics.ga4Id && !/^G-[A-Z0-9]{4,20}$/i.test(String(analytics.ga4Id).trim())) {
    add('error', `Invalid analytics.ga4Id "${analytics.ga4Id}".`, 'Use a valid GA4 Measurement ID like "G-XXXXXXXXXX".');
  }
  if (analytics.gtmId && !/^GTM-[A-Z0-9]{4,16}$/i.test(String(analytics.gtmId).trim())) {
    add('error', `Invalid analytics.gtmId "${analytics.gtmId}".`, 'Use a valid Google Tag Manager ID like "GTM-XXXXXXX".');
  }
  if (analytics.clarityId && !/^[a-z0-9]{6,20}$/i.test(String(analytics.clarityId).trim())) {
    add('error', `Invalid analytics.clarityId "${analytics.clarityId}".`, 'Use a valid Microsoft Clarity project ID.');
  }
  if (analytics.umamiWebsiteId && !analytics.umamiSrc) {
    add('error', 'analytics.umamiWebsiteId is set without analytics.umamiSrc.', 'Provide the full Umami script URL in analytics.umamiSrc.');
  }
  if (!cookiesEnabled) {
    const requireConsent = analytics.requireConsent !== false;
    const hasCookieDependent = Boolean(analytics.ga4Id || analytics.gtmId || analytics.clarityId);
    const hasCookieless = Boolean(analytics.plausibleDomain || (analytics.umamiWebsiteId && analytics.umamiSrc));
    if (hasCookieDependent && requireConsent) {
      add(
        strictLevel,
        'Cookie-dependent analytics (GA4 / GTM / Clarity) are configured while cookies.enabled is false — consent-gated tags stay inactive.',
        'Set cookies.enabled: true in client/config.json (for GDPR compliance) or set analytics.requireConsent: false if the consent banner is intentionally disabled.'
      );
    } else if (hasCookieDependent && !requireConsent) {
      add('ok', 'Cookie-dependent analytics are configured with analytics.requireConsent: false (direct mode).');
    }
    if (hasCookieless && requireConsent && analytics.allowCookielessWithoutBanner !== true) {
      add(
        strictLevel,
        'Plausible/Umami analytics are configured while cookies.enabled is false and analytics.allowCookielessWithoutBanner is false — tags will stay blocked.',
        'Enable cookies.enabled or set analytics.allowCookielessWithoutBanner: true in client/config.json.'
      );
    }
  }

  const redirects = appConfig.redirects ?? [];
  const redirectErrors = validateRedirects(redirects);
  for (const errMsg of redirectErrors) {
    add('error', errMsg, 'Fix the redirect rule in client/config.json or client/cms.json.');
  }
  if (redirects.length > 0 && redirectErrors.length === 0) {
    add('ok', `${redirects.length} redirect rule(s) validated.`);
  }

  const brokenHomeSectionRefs = Array.isArray(appConfig.ui?.homeSections)
    ? collectSectionAssetRefs(appConfig.ui.homeSections).filter(
        (ref) => !isExistingAssetRef(ref, rootDir, rootDir)
      )
    : [];
  if (brokenHomeSectionRefs.length > 0) {
    add(
      'error',
      `ui.homeSections: ${brokenHomeSectionRefs.length} image reference(s) point at files that do not exist (${brokenHomeSectionRefs.slice(0, 3).join(', ')}${brokenHomeSectionRefs.length > 3 ? ', …' : ''}).`,
      'Fix or re-select broken image paths in `ui.homeSections` (`client/config.json`).'
    );
  }
}

function readEnvFileValue(filePath, key) {
  if (!fs.existsSync(filePath)) return undefined;
  let result;
  for (const rawLine of fs.readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || match[1] !== key) continue;
    const value = match[2].trim();
    const quote = value[0];
    if (value.length > 1 && (quote === '"' || quote === "'") && value.endsWith(quote)) {
      result = value.slice(1, -1);
      continue;
    }
    const comment = value.indexOf(' #');
    result = comment === -1 ? value : value.slice(0, comment).trim();
  }
  return result;
}

function readDotEnvValue(key) {
  let value;
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    const found = readEnvFileValue(path.join(rootDir, file), key);
    if (found !== undefined) value = found;
  }
  return value;
}

const rawSiteUrl = (process.env.SITE_URL ?? readDotEnvValue('SITE_URL') ?? process.env.APP_URL ?? '').trim();
if (!rawSiteUrl) {
  add(
    strictLevel,
    'SITE_URL is not set in the shell or .env.',
    'Set it in .env or CI before a production build so canonical URLs, hreflang, the feed and the sitemap use the real origin.'
  );
} else if (isHandoff && isPlaceholderSiteUrl(rawSiteUrl)) {
  add(
    'error',
    `SITE_URL ("${rawSiteUrl}") points to localhost or a placeholder domain in handoff mode.`,
    'Set SITE_URL to the client production domain (e.g. "https://client-domain.com").'
  );
} else {
  add('ok', `SITE_URL is set (${rawSiteUrl}).`);
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
      strictLevel,
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
  add(strictLevel, 'src/paraglide/ is not compiled.', 'Run `npm run messages:compile`.');
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
      strictLevel,
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
  const brokenImageRefs = [];
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
      if (source.includes('[TODO:')) todoEntries += 1;
      if (typeof data.image === 'string' && !isExistingAssetRef(data.image, rootDir, groupDir)) {
        brokenImageRefs.push(data.image);
      }
      if (Array.isArray(data.sections)) {
        for (const ref of collectSectionAssetRefs(data.sections)) {
          if (!isExistingAssetRef(ref, rootDir, groupDir)) brokenImageRefs.push(ref);
        }
      }
    }
  }

  const brokenImages = brokenImageRefs.length;
  if (missingFiles > 0) {
    add(
      strictLevel,
      `${type.key}: ${missingFiles} group/locale file(s) missing.`,
      'Run `npm run content:status` for the matrix.'
    );
  }
  if (brokenImages > 0) {
    add(
      'error',
      `${type.key}: ${brokenImages} frontmatter/section image reference(s) point at files that do not exist (${brokenImageRefs.slice(0, 3).join(', ')}${brokenImageRefs.length > 3 ? ', …' : ''}).`,
      'Fix the `image` path (`src/assets/...` or `./<file>`) or run `npm run assets:generate`.'
    );
  }
  if (todoEntries > 0) {
    add(
      strictLevel,
      `${type.key}: ${todoEntries} entr(ies) still contain [TODO: …] placeholders.`,
      'Translate all remaining [TODO: …] placeholders before publishing that locale.'
    );
  }

  const placeholderSlugs = groups.flatMap((group) =>
    findPlaceholderSlugs(path.join(contentDirFor(type.key), group), group, locales).map(
      (entry) => `${group}/${entry.locale} → "${entry.slug}"`
    )
  );
  if (placeholderSlugs.length > 0) {
    add(
      strictLevel,
      `${type.key}: ${placeholderSlugs.length} placeholder slug(s): ${placeholderSlugs.slice(0, 3).join(', ')}${placeholderSlugs.length > 3 ? ', …' : ''}.`,
      'Set a native slug per language before publishing.'
    );
  }
  if (missingFiles === 0 && brokenImages === 0 && todoEntries === 0) {
    add('ok', `${type.key}: ${groups.length} group(s) complete across ${locales.length} locale(s).`);
  }
}

const unoptimizedRasters = findUnoptimizedPublicUploads(rootDir);
if (unoptimizedRasters.length > 0) {
  add(
    'warn',
    `${unoptimizedRasters.length} raster image(s) in public/uploads/ bypass build-time WebP optimization (${unoptimizedRasters.slice(0, 3).join(', ')}${unoptimizedRasters.length > 3 ? ', …' : ''}).`,
    'Move them to src/assets/uploads/ (automatic WebP optimization on build) or pre-compress to .webp.'
  );
}

if (fs.existsSync(path.join(rootDir, 'starter-kit'))) {
  add('ok', 'starter-kit/ demo bundle is available (`npm run starter:seed`).');
}

if (!fs.existsSync(path.join(rootDir, 'dist'))) {
  add(strictLevel, 'No dist/ build yet.', 'Run `npm run build` before `npm run smoke`.');
}

// ------------------------------------------------------------------- output ---
const errors = findings.filter((finding) => finding.level === 'error');
const warnings = findings.filter((finding) => finding.level === 'warn');

if (wantsJson) {
  console.log(
    JSON.stringify(
      { ok: errors.length === 0, handoff: isHandoff, errors: errors.length, warnings: warnings.length, findings },
      null,
      2
    )
  );
  process.exit(errors.length === 0 ? 0 : 1);
}

const icon = { ok: '✅', warn: '⚠️ ', error: '❌' };
console.log(isHandoff ? '🩺 Project doctor (strict --handoff gate)\n' : '🩺 Project doctor\n');
for (const finding of findings) {
  console.log(`${icon[finding.level]} ${finding.title}`);
  if (finding.fix && finding.level !== 'ok') console.log(`   → ${finding.fix}`);
}

console.log(
  `\n${errors.length} error(s), ${warnings.length} warning(s).` +
    (errors.length === 0
      ? isHandoff
        ? ' All handoff readiness checks passed.'
        : ' No blocking problems found.'
      : ' Fix the errors above, then re-run.')
);
process.exit(errors.length === 0 ? 0 : 1);
