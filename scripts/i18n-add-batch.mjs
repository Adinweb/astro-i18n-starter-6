#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileMessages } from './lib/compile-messages.mjs';
import { readLocaleConfig } from './lib/locales.mjs';
import {
  readClientMessages,
  readCoreMessages,
  stripSchema,
  writeClientMessages,
} from './lib/merge-messages.mjs';

const rootDir = process.cwd();

function printHelp() {
  console.log(`
Batch Translation Script (i18n:add-batch)
========================================
Writes client translation keys/overrides to client/messages/<locale>.json.

Usage:
  npm run i18n:add-batch -- --file=<path-to-json> [--category=<cat>]
  npm run i18n:add-batch -- --json='{...}' [--category=<cat>]
  cat translations.json | npm run i18n:add-batch

Flags:
  --file=<path>          Read translations from a JSON file.
  --json='<json>'        Pass JSON string directly on CLI.
  --category=<category>  Auto-prefix keys without a prefix (e.g. "submit" -> "checkout_submit").
  --locale=<locale>      When passing flat key-value pairs, associate values with this locale.
  --no-overwrite         Do not overwrite keys if they already exist in client/core dictionaries.
  --skip-compile         Skip running paraglide messages:compile at the end.
`);
}

export function normalizeBatchData(
  data,
  defaultCat = '',
  activeLocales = [],
  fallbackLoc = 'en',
  targetLocale = ''
) {
  /** @type {Record<string, Record<string, string>>} */
  const result = {};

  const prefixKey = (k, cat) => {
    const activeCat = cat || defaultCat;
    if (activeCat && !k.startsWith(`${activeCat}_`)) {
      return `${activeCat}_${k}`;
    }
    return k;
  };

  if (Array.isArray(data)) {
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const keyName = item.key || item.id || item.name;
      if (!keyName) continue;
      const fullKey = prefixKey(keyName, item.category);
      result[fullKey] = result[fullKey] || {};

      const translations =
        item.translations && typeof item.translations === 'object' ? item.translations : item;
      for (const [k, v] of Object.entries(translations)) {
        if (activeLocales.includes(k) && typeof v === 'string') {
          result[fullKey][k] = v;
        }
      }
    }
    return result;
  }

  if (typeof data !== 'object' || data === null) {
    return result;
  }

  const topKeys = Object.keys(data);
  const isLocaleMap =
    topKeys.length > 0 &&
    topKeys.some((k) => activeLocales.includes(k)) &&
    topKeys.every((k) => !activeLocales.includes(k) || typeof data[k] === 'object');

  if (isLocaleMap) {
    for (const [loc, dict] of Object.entries(data)) {
      if (!activeLocales.includes(loc) || typeof dict !== 'object' || dict === null) continue;
      for (const [rawKey, val] of Object.entries(dict)) {
        if (typeof val !== 'string') continue;
        const fullKey = prefixKey(rawKey, '');
        result[fullKey] = result[fullKey] || {};
        result[fullKey][loc] = val;
      }
    }
    return result;
  }

  for (const [topKey, val] of Object.entries(data)) {
    if (typeof val === 'string') {
      const loc = targetLocale || fallbackLoc;
      const fullKey = prefixKey(topKey, '');
      result[fullKey] = result[fullKey] || {};
      result[fullKey][loc] = val;
      continue;
    }

    if (typeof val === 'object' && val !== null) {
      const subKeys = Object.keys(val);
      const hasLocaleSubkeys = subKeys.some((sk) => activeLocales.includes(sk));

      if (hasLocaleSubkeys) {
        const fullKey = prefixKey(topKey, '');
        result[fullKey] = result[fullKey] || {};
        for (const [sk, text] of Object.entries(val)) {
          if (activeLocales.includes(sk) && typeof text === 'string') {
            result[fullKey][sk] = text;
          }
        }
      } else {
        const cat = topKey;
        for (const [nestedKey, nestedVal] of Object.entries(val)) {
          const fullKey = `${cat}_${nestedKey}`;
          result[fullKey] = result[fullKey] || {};
          if (typeof nestedVal === 'string') {
            const loc = targetLocale || fallbackLoc;
            result[fullKey][loc] = nestedVal;
          } else if (typeof nestedVal === 'object' && nestedVal !== null) {
            for (const [sk, text] of Object.entries(nestedVal)) {
              if (activeLocales.includes(sk) && typeof text === 'string') {
                result[fullKey][sk] = text;
              }
            }
          }
        }
      }
    }
  }

  return result;
}

export function runCli() {
  const args = process.argv.slice(2);
  let jsonRaw = '';
  let filePath = '';
  let category = '';
  let targetLocale = '';
  let skipCompile = false;
  let overwrite = true;

  for (const arg of args) {
    if (arg.startsWith('--json=')) {
      jsonRaw = arg.slice(7);
    } else if (arg.startsWith('--data=')) {
      jsonRaw = arg.slice(7);
    } else if (arg.startsWith('--file=')) {
      filePath = arg.slice(7);
    } else if (arg.startsWith('--category=')) {
      category = arg.slice(11);
    } else if (arg.startsWith('--locale=')) {
      targetLocale = arg.slice(9);
    } else if (arg === '--skip-compile' || arg === '--no-compile') {
      skipCompile = true;
    } else if (arg === '--no-overwrite' || arg === '--overwrite=false') {
      overwrite = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!jsonRaw && !filePath) {
    try {
      if (!process.stdin.isTTY) {
        jsonRaw = fs.readFileSync(0, 'utf-8').trim();
      }
    } catch {
      // Ignore stdin read failure
    }
  }

  if (!jsonRaw && !filePath) {
    printHelp();
    console.error('❌ Error: Please provide translation data via --file=<path>, --json=\'<json>\', or stdin.');
    process.exit(1);
  }

  if (filePath) {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`❌ Error: File not found: ${resolvedPath}`);
      process.exit(1);
    }
    jsonRaw = fs.readFileSync(resolvedPath, 'utf-8');
  }

  let parsedData;
  try {
    parsedData = JSON.parse(jsonRaw);
  } catch (err) {
    console.error('❌ Error parsing JSON input:', err.message);
    process.exit(1);
  }

  const localeConfig = readLocaleConfig(rootDir);
  const LOCALES = localeConfig.locales;
  const defaultLocale = localeConfig.defaultLocale || 'en';

  const normalized = normalizeBatchData(parsedData, category, LOCALES, defaultLocale, targetLocale);
  const keysToProcess = Object.keys(normalized);

  if (keysToProcess.length === 0) {
    console.warn('⚠️ No translation keys found in the provided input.');
    process.exit(0);
  }

  console.log(`📦 Found ${keysToProcess.length} key(s) to process in batch...`);

  for (const loc of LOCALES) {
    const clientDict = stripSchema(readClientMessages(loc, rootDir));
    const coreDict = stripSchema(readCoreMessages(loc, rootDir));

    for (const fullKey of keysToProcess) {
      const translations = normalized[fullKey];
      const existsInClient = fullKey in clientDict;
      const existsInCore = fullKey in coreDict;

      if (translations[loc] !== undefined) {
        if (!existsInClient && !existsInCore) {
          clientDict[fullKey] = translations[loc];
        } else if (overwrite) {
          clientDict[fullKey] = translations[loc];
        }
      } else if (!existsInClient && !existsInCore) {
        const sourceText =
          translations[defaultLocale] || translations[Object.keys(translations)[0]] || fullKey;
        clientDict[fullKey] = `[TODO: ${loc}] ${sourceText}`;
      }
    }

    writeClientMessages(loc, clientDict, rootDir);
  }

  console.log(
    `✅ Successfully synced ${keysToProcess.length} key(s) to client/messages/*.json (${LOCALES.join(', ')}).`
  );
  console.log(`   Keys: ${keysToProcess.join(', ')}`);

  if (!skipCompile) {
    console.log('🔄 Recompiling Paraglide messages...');
    try {
      compileMessages(rootDir);
      console.log('🎉 Paraglide recompiled successfully.');
    } catch (e) {
      console.error('❌ Failed to recompile messages:', e.message);
      process.exit(1);
    }
  } else {
    console.log('ℹ️ Skipped Paraglide recompilation (--skip-compile specified).');
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  runCli();
}
