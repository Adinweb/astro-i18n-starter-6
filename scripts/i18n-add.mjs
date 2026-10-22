#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

/**
 * Merges a single key into one locale dictionary.
 *
 * An explicit translation always wins. A locale without an explicit
 * translation keeps an existing value and only receives a `[TODO: …]`
 * placeholder when the key does not exist yet — registering a key for one
 * locale must never wipe the translations already in the other locales.
 *
 * @param {Record<string, string>} dict Existing dictionary for the locale.
 * @param {string} fullKey Fully qualified key, e.g. `nav_features`.
 * @param {string} locale Locale code, e.g. `de`.
 * @param {string} key Bare key, used to build the placeholder text.
 * @param {Record<string, string>} textByLocale Explicit translations.
 * @returns {Record<string, string>} The merged dictionary.
 */
export function mergeTranslation(dict, fullKey, locale, key, textByLocale) {
  if (textByLocale[locale]) {
    return { ...dict, [fullKey]: textByLocale[locale] };
  }
  if (fullKey in dict) {
    return dict;
  }
  return { ...dict, [fullKey]: `[TODO: ${locale}] ${key}` };
}

export function runCli() {
  const args = process.argv.slice(2);

  // Check if user passed batch options (--json, --file, or --batch)
  if (args.some((a) => a.startsWith('--json=') || a.startsWith('--file=') || a === '--batch')) {
    const batchArgs = args.filter((a) => a !== '--batch').map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');
    try {
      execSync(`node scripts/i18n-add-batch.mjs ${batchArgs}`, { stdio: 'inherit' });
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
    console.error('Usage: pnpm run i18n:add -- --category=<category> --key=<key> [--en="..."] [--fa="..."] [--de="..."]');
    console.error('For multiple keys, use: pnpm run i18n:add-batch -- --file=<path> or --json=\'{"key": {"en": "..."}}\'');
    process.exit(1);
  }

  const fullKey = `${category}_${key}`;
  const rootDir = process.cwd();

  const inlangPath = path.join(rootDir, 'project.inlang', 'settings.json');
  const inlangSettings = JSON.parse(fs.readFileSync(inlangPath, 'utf-8'));
  const LOCALES = inlangSettings.locales;

  const sortKeys = (obj) => {
    const sorted = {};
    Object.keys(obj).sort().forEach((k) => (sorted[k] = obj[k]));
    return sorted;
  };

  for (const loc of LOCALES) {
    const filePath = path.join(rootDir, 'messages', `${loc}.json`);
    if (!fs.existsSync(filePath)) continue;
    const dict = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const merged = mergeTranslation(dict, fullKey, loc, key, textByLocale);

    fs.writeFileSync(filePath, JSON.stringify(sortKeys(merged), null, 2) + '\n', 'utf-8');
  }

  console.log(`✅ Registered key "${fullKey}" across all active locales (${LOCALES.join(', ')}).`);
  console.log('🔄 Recompiling Paraglide messages...');

  try {
    execSync('pnpm run messages:compile', { stdio: 'inherit' });
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
