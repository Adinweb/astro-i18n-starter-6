#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

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
  console.error('Usage: npm run i18n:add -- --category=<category> --key=<key> [--en="..."] [--fa="..."] [--de="..."]');
  console.error('For multiple keys, use: npm run i18n:add-batch -- --file=<path> or --json=\'<json>\'');
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

  if (textByLocale[loc]) {
    dict[fullKey] = textByLocale[loc];
  } else {
    dict[fullKey] = `[TODO: ${loc}] ${key}`;
  }

  fs.writeFileSync(filePath, JSON.stringify(sortKeys(dict), null, 2) + '\n', 'utf-8');
}

console.log(`✅ Registered key "${fullKey}" across all active locales (${LOCALES.join(', ')}).`);
console.log('🔄 Recompiling Paraglide messages...');

try {
  execSync('npm run messages:compile', { stdio: 'inherit' });
  console.log('🎉 Paraglide recompiled successfully.');
} catch (e) {
  console.error('❌ Failed to recompile messages:', e.message);
  process.exit(1);
}
