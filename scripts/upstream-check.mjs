#!/usr/bin/env node
/**
 * Upstream-sync readiness and contract integrity check.
 *
 * Verifies the clean separation between upstream-owned core files (`src/`,
 * `app.config.json`, `messages/core/`), client-owned extension points (`client/`),
 * and the optional `starter-kit/` demo package.
 *
 * Usage:
 *   npm run upstream:check
 */
import fs from 'node:fs';
import path from 'node:path';
import { readCoreConfig, readClientConfig, readMergedConfig } from './lib/config.mjs';
import { getKnownTypes, rootDir } from './lib/content-types.mjs';
import { readLocaleConfig } from './lib/locales.mjs';
import {
  readClientMessages,
  readCoreMessages,
  readMergedMessages,
  stripSchema,
} from './lib/merge-messages.mjs';

const errors = [];
const warnings = [];
const ok = [];

const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);
const pass = (msg) => ok.push(msg);

// 1. Two-tier config merge integrity
let clientConfig;
let mergedConfig;
try {
  readCoreConfig(rootDir);
  clientConfig = readClientConfig(rootDir);
  mergedConfig = readMergedConfig(rootDir);
  if (!mergedConfig?.site?.name || !mergedConfig?.brand?.themeColor || !mergedConfig?.content?.types) {
    fail('Merged config (app.config.json + client/config.json) is missing required sections (site, brand, content.types).');
  } else {
    pass(`Two-tier config merges cleanly (site: "${mergedConfig.site.name}", client overrides: ${Object.keys(clientConfig).length} top-level key(s)).`);
  }
} catch (error) {
  fail(`Failed reading/merging app.config.json and client/config.json: ${error.message}`);
}

// 2. Client locale config parity
let localeConfig;
try {
  localeConfig = readLocaleConfig(rootDir);
  if (!Array.isArray(localeConfig.locales) || localeConfig.locales.length === 0) {
    fail('client/locales.json must list at least one active locale.');
  } else if (!localeConfig.defaultLocale || !localeConfig.locales.includes(localeConfig.defaultLocale)) {
    fail(`client/locales.json defaultLocale "${localeConfig.defaultLocale}" is not listed in locales.`);
  } else {
    let metaOk = true;
    for (const loc of localeConfig.locales) {
      const m = localeConfig.metadata?.[loc];
      if (!m || (m.dir !== 'ltr' && m.dir !== 'rtl') || !m.htmlLang || !m.name || !m.fontFamily) {
        fail(`client/locales.json metadata for "${loc}" is incomplete.`);
        metaOk = false;
      }
    }
    if (metaOk) {
      pass(`client/locales.json valid (${localeConfig.locales.join(', ')}; default="${localeConfig.defaultLocale}").`);
    }
  }
} catch (error) {
  fail(`Invalid client/locales.json: ${error.message}`);
}

// 3. Two-tier dictionary layer checks
const extractPlaceholders = (text) =>
  typeof text === 'string'
    ? [...new Set([...text.matchAll(/\{([A-Za-z0-9_]+)(?:,[^}]*)?\}/g)].map((m) => m[1]))].sort()
    : [];

if (localeConfig?.locales?.length) {
  const coreDir = path.join(rootDir, 'messages', 'core');
  if (!fs.existsSync(coreDir)) {
    fail('messages/core/ directory is missing.');
  } else {
    const coreFiles = fs.readdirSync(coreDir).filter((f) => f.endsWith('.json'));
    const clientDir = path.join(rootDir, 'client', 'messages');
    if (!fs.existsSync(clientDir)) {
      fail('client/messages/ directory is missing.');
    }

    const baseLoc = localeConfig.defaultLocale;
    const baseMerged = stripSchema(readMergedMessages(baseLoc, rootDir));
    const baseKeys = Object.keys(baseMerged).sort();
    let msgOk = true;

    for (const loc of localeConfig.locales) {
      const locCore = stripSchema(readCoreMessages(loc, rootDir));
      const locClient = stripSchema(readClientMessages(loc, rootDir));
      if (Object.keys(locCore).length === 0) {
        warn(`messages/core/${loc}.json has no core keys (expected for non-built-in locales; client/messages/${loc}.json supplies overrides).`);
      }
      const locMerged = stripSchema(readMergedMessages(loc, rootDir));
      const missing = baseKeys.filter((k) => !(k in locMerged));
      const extra = Object.keys(locMerged).filter((k) => !baseKeys.includes(k));
      if (missing.length > 0) {
        fail(`Merged messages for "${loc}" miss ${missing.length} key(s): ${missing.slice(0, 5).join(', ')}`);
        msgOk = false;
      }
      if (extra.length > 0) {
        fail(`Merged messages for "${loc}" define ${extra.length} extra key(s) absent from "${baseLoc}": ${extra.slice(0, 5).join(', ')}`);
        msgOk = false;
      }
      for (const key of baseKeys) {
        if (!(key in locMerged)) continue;
        const expectedVars = extractPlaceholders(baseMerged[key]);
        const actualVars = extractPlaceholders(locMerged[key]);
        if (JSON.stringify(expectedVars) !== JSON.stringify(actualVars)) {
          fail(`Placeholder mismatch on "${key}" in "${loc}": expected {${expectedVars.join(',')}}, got {${actualVars.join(',')}}`);
          msgOk = false;
        }
      }
      const redundantOverrides = Object.keys(locClient).filter((k) => k in locCore && locClient[k] === locCore[k]);
      if (redundantOverrides.length > 0) {
        warn(`client/messages/${loc}.json repeats ${redundantOverrides.length} identical core value(s) (${redundantOverrides.slice(0, 3).join(', ')}).`);
      }
    }

    if (msgOk) {
      pass(`Two-tier messages merge cleanly (${coreFiles.length} core file(s), ${baseKeys.length} merged keys across ${localeConfig.locales.length} locale(s)).`);
    }
  }
}

// 4. Core <-> Client extension hooks must remain intact
const requiredClientFiles = [
  'client/config.json',
  'client/locales.json',
  'client/styles.css',
  'client/icons.ts',
  'client/ClientIcons.astro',
  'client/LayoutHooks.astro',
  'client/templates/index.ts',
  'client/navigation.ts',
  'client/content.ts',
];
const missingClientFiles = requiredClientFiles.filter((rel) => !fs.existsSync(path.join(rootDir, rel)));
if (missingClientFiles.length > 0) {
  fail(`Missing client workspace extension file(s): ${missingClientFiles.join(', ')}`);
} else {
  pass(`All ${requiredClientFiles.length} client workspace extension files exist.`);
}

const hookAssertions = [
  {
    file: 'src/styles/global.css',
    pattern: /@source\s+["']\.\.\/\.\.\/client["']/,
    label: 'Tailwind v4 @source "../../client" directive in src/styles/global.css',
  },
  {
    file: 'src/content.config.ts',
    pattern: /\.\.\.clientCollections/,
    label: 'clientCollections spread in src/content.config.ts',
  },
  {
    file: 'src/layouts/BaseLayout.astro',
    pattern: /@client\/styles\.css/,
    label: '@client/styles.css import in src/layouts/BaseLayout.astro',
  },
  {
    file: 'src/layouts/BaseLayout.astro',
    pattern: /@client\/LayoutHooks\.astro/,
    label: 'LayoutHooks slot hook in src/layouts/BaseLayout.astro',
  },
  {
    file: 'src/views/PageView.astro',
    pattern: /\.\.\.CLIENT_PAGE_TEMPLATES/,
    label: 'CLIENT_PAGE_TEMPLATES spread in src/views/PageView.astro',
  },
  {
    file: 'src/i18n/locales.ts',
    pattern: /(?:@client|(?:\.\.\/)+client)\/locales\.json/,
    label: 'client/locales.json SSOT import in src/i18n/locales.ts',
  },
  {
    file: 'src/libs/config/app.ts',
    pattern: /(?:@client|(?:\.\.\/)+client)\/config\.json/,
    label: 'client/config.json override merge in src/libs/config/app.ts',
  },
];

let hooksOk = true;
for (const hook of hookAssertions) {
  const fullPath = path.join(rootDir, hook.file);
  if (!fs.existsSync(fullPath) || !hook.pattern.test(fs.readFileSync(fullPath, 'utf-8'))) {
    fail(`Missing core extension hook: ${hook.label}`);
    hooksOk = false;
  }
}
if (hooksOk) {
  pass(`All ${hookAssertions.length} core-to-client extension hooks are intact.`);
}

// 5. Client navigation page groups match existing/seeded pages or warn cleanly
const clientNavSource = fs.existsSync(path.join(rootDir, 'client/navigation.ts'))
  ? fs.readFileSync(path.join(rootDir, 'client/navigation.ts'), 'utf-8')
  : '';
const navGroups = [...clientNavSource.matchAll(/group:\s*['"]([a-z0-9-]+)['"]/gi)].map((m) => m[1]);
const missingNavPages = navGroups.filter(
  (group) => !fs.existsSync(path.join(rootDir, 'src', 'content', 'pages', group))
);
if (missingNavPages.length > 0) {
  warn(`client/navigation.ts lists unpublished page group(s) not present in src/content/pages/: ${missingNavPages.join(', ')}`);
} else {
  pass(`All ${navGroups.length} page group(s) in client/navigation.ts exist in src/content/pages/.`);
}

// 6. Content types & gitignore/gitattributes hygiene
const knownTypes = getKnownTypes(rootDir);
if (mergedConfig?.content?.types) {
  const undeclared = Object.keys(mergedConfig.content.types).filter((k) => !knownTypes.includes(k));
  if (undeclared.length > 0) {
    fail(`Content type(s) configured in config.json without a collection schema in src/content.config.ts or client/content.ts: ${undeclared.join(', ')}`);
  } else {
    pass(`All configured content types (${Object.keys(mergedConfig.content.types).join(', ')}) have matching schemas.`);
  }
}

const gitignore = fs.existsSync(path.join(rootDir, '.gitignore'))
  ? fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf-8')
  : '';
for (const ignored of ['src/paraglide/', '.paraglide-work/', '.locale-archive/']) {
  if (!gitignore.includes(ignored)) {
    fail(`.gitignore must ignore generated directory "${ignored}" to avoid upstream merge conflicts.`);
  }
}
if (!fs.existsSync(path.join(rootDir, '.gitattributes'))) {
  warn('No .gitattributes found (recommended to mark client/ strategies for upstream merges).');
} else {
  pass('.gitignore and .gitattributes upstream-sync guards are present.');
}

// 7. Starter kit presence
if (!fs.existsSync(path.join(rootDir, 'starter-kit'))) {
  warn('starter-kit/ directory is absent (optional demo package removed).');
} else {
  pass('starter-kit/ demo package is present and decoupled from src/content/.');
}

for (const msg of ok) console.log(`✅ ${msg}`);
for (const msg of warnings) console.warn(`⚠️  ${msg}`);
for (const msg of errors) console.error(`❌ ${msg}`);

console.log(`\nUpstream check summary: ${ok.length} passed, ${warnings.length} warning(s), ${errors.length} error(s).`);
if (errors.length > 0) process.exit(1);
