#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { compileMessages } from './lib/compile-messages.mjs';
import { readLocaleConfig } from './lib/locales.mjs';
import {
  readClientMessages,
  readCoreMessages,
  stripSchema,
  writeClientMessages,
} from './lib/merge-messages.mjs';

/**
 * Merges a single key into a client dictionary.
 *
 * Explicit translations always win. Existing keys in `dict` or `coreDict` keep
 * their value; missing keys only receive `[TODO: …]` when absent from both layers.
 *
 * @param {Record<string, unknown>} dict Existing client dictionary for the locale.
 * @param {string} fullKey Fully qualified key, e.g. `nav_features`.
 * @param {string} locale Locale code, e.g. `de`.
 * @param {string} key Bare key, used to build the placeholder text.
 * @param {Record<string, string>} textByLocale Explicit translations.
 * @param {Record<string, unknown>} [coreDict={}] Upstream core dictionary for the locale.
 * @returns {Record<string, unknown>} The merged client dictionary.
 */
export function mergeTranslation(dict, fullKey, locale, key, textByLocale, coreDict = {}) {
  if (textByLocale[locale] !== undefined) {
    return { ...dict, [fullKey]: textByLocale[locale] };
  }
  if (fullKey in dict || fullKey in coreDict) {
    return dict;
  }
  return { ...dict, [fullKey]: `[TODO: ${locale}] ${key}` };
}

export function runCli() {
  const args = process.argv.slice(2);

  if (args.some((a) => a.startsWith('--json=') || a.startsWith('--file=') || a === '--batch')) {
    const batchArgs = args.filter((a) => a !== '--batch');
    try {
      execFileSync(
        process.execPath,
        [path.join(process.cwd(), 'scripts', 'i18n-add-batch.mjs'), ...batchArgs],
        { stdio: 'inherit' }
      );
      process.exit(0);
    } catch (err) {
      process.exit(err.status || 1);
    }
  }

  let category = '';
  let key = '';
  const textByLocale = {};

  for (const arg of args) {
    if (arg.startsWith('--category=')) {
      category = arg.slice(11);
    } else if (arg.startsWith('--key=')) {
      key = arg.slice(6);
    } else if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const locKey = arg.slice(2, eqIdx);
        textByLocale[locKey] = arg.slice(eqIdx + 1);
      }
    }
  }

  if (!category || !key) {
    console.error(
      'Usage: npm run i18n:add -- --category=<category> --key=<key> [--en="..."] [--fa="..."] [--de="..."]'
    );
    console.error(
      'For multiple keys, use: npm run i18n:add-batch -- --file=<path> or --json=\'{"key": {"en": "..."}}\''
    );
    process.exit(1);
  }

  const fullKey = `${category}_${key}`;
  const rootDir = process.cwd();
  const { locales: LOCALES } = readLocaleConfig(rootDir);

  for (const loc of LOCALES) {
    const clientDict = stripSchema(readClientMessages(loc, rootDir));
    const coreDict = stripSchema(readCoreMessages(loc, rootDir));
    const merged = mergeTranslation(clientDict, fullKey, loc, key, textByLocale, coreDict);
    writeClientMessages(loc, merged, rootDir);
  }

  console.log(
    `✅ Registered key "${fullKey}" in client/messages/*.json across active locales (${LOCALES.join(', ')}).`
  );
  console.log('🔄 Recompiling Paraglide messages...');

  try {
    compileMessages(rootDir);
    console.log('🎉 Paraglide recompiled successfully.');
  } catch (e) {
    console.error('❌ Failed to recompile messages:', e.message);
    process.exit(1);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  runCli();
}
