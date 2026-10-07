#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
let category = '';
let key = '';
let faText = '';
let enText = '';
let deText = '';

for (const arg of args) {
  if (arg.startsWith('--category=')) category = arg.slice(11);
  else if (arg.startsWith('--key=')) key = arg.slice(6);
  else if (arg.startsWith('--fa=')) faText = arg.slice(5);
  else if (arg.startsWith('--en=')) enText = arg.slice(5);
  else if (arg.startsWith('--de=')) deText = arg.slice(5);
}

if (!category || !key || !faText) {
  console.error('Usage: npm run i18n:add -- --category=<category> --key=<key> --fa="متن فارسی" [--en="..."] [--de="..."]');
  process.exit(1);
}

const fullKey = `${category}_${key}`;
const rootDir = process.cwd();

const paths = {
  en: path.join(rootDir, 'messages', 'en.json'),
  de: path.join(rootDir, 'messages', 'de.json'),
  fa: path.join(rootDir, 'messages', 'fa.json'),
};

const enDict = JSON.parse(fs.readFileSync(paths.en, 'utf-8'));
const deDict = JSON.parse(fs.readFileSync(paths.de, 'utf-8'));
const faDict = JSON.parse(fs.readFileSync(paths.fa, 'utf-8'));

faDict[fullKey] = faText;
enDict[fullKey] = enText || `[TODO: en] ${key}`;
deDict[fullKey] = deText || `[TODO: de] ${key}`;

const sortKeys = (obj) => {
  const sorted = {};
  Object.keys(obj).sort().forEach((k) => (sorted[k] = obj[k]));
  return sorted;
};

fs.writeFileSync(paths.en, JSON.stringify(sortKeys(enDict), null, 2) + '\n', 'utf-8');
fs.writeFileSync(paths.de, JSON.stringify(sortKeys(deDict), null, 2) + '\n', 'utf-8');
fs.writeFileSync(paths.fa, JSON.stringify(sortKeys(faDict), null, 2) + '\n', 'utf-8');

console.log(`✅ Registered key "${fullKey}" across en, de, fa dictionaries.`);
console.log('🔄 Recompiling Paraglide messages...');

try {
  execSync('npm run messages:compile', { stdio: 'inherit' });
  console.log('🎉 Paraglide recompiled successfully.');
} catch (e) {
  console.error('❌ Failed to recompile messages:', e.message);
  process.exit(1);
}
