/**
 * Merges upstream core dictionaries (`messages/core/<locale>.json`) with client
 * overrides/extensions (`client/messages/<locale>.json`) and materializes the
 * temporary Inlang workspace under `.paraglide-work/`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_URL = 'https://inlang.com/schema/inlang-message-format';
const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function resolveNodeModuleFile(relativeModulePath, rootDir) {
  const workDir = path.join(path.resolve(rootDir), '.paraglide-work');
  const searchStarts = [
    path.resolve(rootDir),
    SCRIPT_ROOT,
    ...(process.env.PARAGLIDE_BIN ? [path.dirname(path.resolve(process.env.PARAGLIDE_BIN))] : []),
  ];
  for (const start of searchStarts) {
    let dir = start;
    while (true) {
      const candidate = path.join(dir, 'node_modules', relativeModulePath);
      if (fs.existsSync(candidate)) {
        return path.relative(workDir, candidate).split(path.sep).join('/');
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  throw new Error(
    `Could not resolve Inlang plugin "${relativeModulePath}" from "${rootDir}" or "${SCRIPT_ROOT}".`
  );
}

export function readClientLocales(rootDir = SCRIPT_ROOT) {
  const localesPath = path.join(rootDir, 'client', 'locales.json');
  if (!fs.existsSync(localesPath)) {
    throw new Error(`Missing client/locales.json at ${localesPath}`);
  }
  return JSON.parse(fs.readFileSync(localesPath, 'utf-8'));
}

export function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function stripSchema(dict) {
  const copy = { ...dict };
  delete copy.$schema;
  return copy;
}

export function sortDictionary(dict) {
  const sorted = { $schema: dict.$schema || SCHEMA_URL };
  const keys = Object.keys(dict)
    .filter((k) => k !== '$schema')
    .sort();
  for (const key of keys) {
    sorted[key] = dict[key];
  }
  return sorted;
}

export function readCoreMessages(locale, rootDir = SCRIPT_ROOT) {
  return readJsonIfExists(path.join(rootDir, 'messages', 'core', `${locale}.json`));
}

export function readClientMessages(locale, rootDir = SCRIPT_ROOT) {
  return readJsonIfExists(path.join(rootDir, 'client', 'messages', `${locale}.json`));
}

export function writeClientMessages(locale, dict, rootDir = SCRIPT_ROOT) {
  const filePath = path.join(rootDir, 'client', 'messages', `${locale}.json`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const eol = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf-8').includes('\r\n')
      ? '\r\n'
      : '\n'
    : '\n';
  const sorted = sortDictionary({ $schema: SCHEMA_URL, ...dict });
  const json = JSON.stringify(sorted, null, 2).split('\n').join(eol);
  fs.writeFileSync(filePath, `${json}${eol}`, 'utf-8');
}

function todoFallbackForValue(value, locale) {
  if (typeof value === 'string') return `[TODO: ${locale}] ${value}`;
  return value;
}

/**
 * Merges `messages/core/<locale>.json` + `client/messages/<locale>.json`.
 * For client-added locales that do not have an upstream `messages/core/<locale>.json`,
 * missing upstream keys fall back to `messages/core/<fallbackLocale>.json` marked with
 * `[TODO: <locale>]` unless overridden in `client/messages/<locale>.json`.
 */
export function readMergedMessages(locale, rootDir = SCRIPT_ROOT) {
  const coreDict = readCoreMessages(locale, rootDir);
  const clientDict = readClientMessages(locale, rootDir);

  const hasCoreLocale = Object.keys(stripSchema(coreDict)).length > 0;
  let baseCore = coreDict;
  if (!hasCoreLocale) {
    const coreEn = readCoreMessages('en', rootDir);
    const fallbackEntries = {};
    for (const [k, v] of Object.entries(stripSchema(coreEn))) {
      fallbackEntries[k] = todoFallbackForValue(v, locale);
    }
    baseCore = fallbackEntries;
  }

  return sortDictionary({
    $schema: SCHEMA_URL,
    ...stripSchema(baseCore),
    ...stripSchema(clientDict),
  });
}

/**
 * Prepares `.paraglide-work/project.inlang/settings.json` and
 * `.paraglide-work/messages/<locale>.json` from two-tier sources.
 */
export function prepareParaglideWorkspace(rootDir = SCRIPT_ROOT) {
  const localeConfig = readClientLocales(rootDir);
  const locales = Array.isArray(localeConfig.locales) ? localeConfig.locales : [];
  const defaultLocale = localeConfig.defaultLocale || locales[0] || 'en';

  const workDir = path.join(rootDir, '.paraglide-work');
  const inlangDir = path.join(workDir, 'project.inlang');
  const messagesOutDir = path.join(workDir, 'messages');

  fs.mkdirSync(inlangDir, { recursive: true });
  fs.mkdirSync(messagesOutDir, { recursive: true });

  // Prune stale message files in `.paraglide-work/messages/` from removed locales.
  for (const existing of fs.readdirSync(messagesOutDir)) {
    if (!existing.endsWith('.json')) continue;
    const loc = existing.slice(0, -'.json'.length);
    if (!locales.includes(loc)) {
      fs.unlinkSync(path.join(messagesOutDir, existing));
    }
  }

  const settings = {
    $schema: 'https://inlang.com/schema/project-settings',
    baseLocale: defaultLocale,
    locales,
    modules: [
      resolveNodeModuleFile('@inlang/plugin-message-format/dist/index.js', rootDir),
      resolveNodeModuleFile('@inlang/plugin-m-function-matcher/dist/index.js', rootDir),
    ],
    'plugin.inlang.messageFormat': {
      pathPattern: './messages/{locale}.json',
    },
  };

  fs.writeFileSync(
    path.join(inlangDir, 'settings.json'),
    `${JSON.stringify(settings, null, 2)}\n`,
    'utf-8'
  );

  for (const locale of locales) {
    const merged = readMergedMessages(locale, rootDir);
    fs.writeFileSync(
      path.join(messagesOutDir, `${locale}.json`),
      `${JSON.stringify(merged, null, 2)}\n`,
      'utf-8'
    );
  }

  return { workDir, inlangDir, messagesOutDir, locales, defaultLocale };
}
