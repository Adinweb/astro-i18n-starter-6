#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import MagicString from 'magic-string';

const args = process.argv.slice(2);
let filePath = '';
let dryRun = false;

for (const arg of args) {
  if (arg.startsWith('--file=')) {
    filePath = arg.slice(7);
  } else if (arg === '--dry-run') {
    dryRun = true;
  }
}

if (!filePath) {
  console.error('Usage: npm run block:adapt -- --file=<path-to-file> [--dry-run]');
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), filePath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

const original = fs.readFileSync(resolvedPath, 'utf-8');
const s = new MagicString(original);

const directionReplacements = [
  [/\bml-(\S+)\b/g, 'ms-$1'],
  [/\bmr-(\S+)\b/g, 'me-$1'],
  [/\bpl-(\S+)\b/g, 'ps-$1'],
  [/\bpr-(\S+)\b/g, 'pe-$1'],
  [/\bleft-(\S+)\b/g, 'start-$1'],
  [/\bright-(\S+)\b/g, 'end-$1'],
  [/\btext-left\b/g, 'text-start'],
  [/\btext-right\b/g, 'text-end'],
  [/\bborder-l-(\S+)\b/g, 'border-s-$1'],
  [/\bborder-r-(\S+)\b/g, 'border-e-$1'],
  [/\brounded-l-(\S+)\b/g, 'rounded-s-$1'],
  [/\brounded-r-(\S+)\b/g, 'rounded-e-$1'],
  [/\bborder-l\b/g, 'border-s'],
  [/\bborder-r\b/g, 'border-e'],
  [/\brounded-l\b/g, 'rounded-s'],
  [/\brounded-r\b/g, 'rounded-e'],
];

const colorReplacements = [
  [/\bbg-white\b/g, 'bg-bg'],
  [/\bbg-gray-50\b/g, 'bg-surface'],
  [/\btext-gray-900\b/g, 'text-fg'],
  [/\btext-black\b/g, 'text-fg'],
  [/\btext-gray-500\b/g, 'text-muted'],
  [/\btext-gray-400\b/g, 'text-muted'],
  [/\bborder-gray-200\b/g, 'border-border'],
  [/\bborder-gray-300\b/g, 'border-border'],
  [/\bbg-blue-600\b/g, 'bg-primary'],
  [/\bbg-indigo-600\b/g, 'bg-primary'],
  [/\btext-blue-600\b/g, 'text-primary'],
];

const allReplacements = [...directionReplacements, ...colorReplacements];

// Match class="..." or class='...' or class:list="..."
const classAttrRegex = /class(?:[:\w-]*)?=(["'])(.*?)\1/g;
let match;
let changeCount = 0;

while ((match = classAttrRegex.exec(original)) !== null) {
  const quote = match[1];
  const classValue = match[2];
  const valueStart = match.index + match[0].indexOf(quote) + 1;
  const valueEnd = valueStart + classValue.length;

  let transformed = classValue;
  for (const [regex, replacement] of allReplacements) {
    transformed = transformed.replace(regex, replacement);
  }

  if (transformed !== classValue) {
    s.overwrite(valueStart, valueEnd, transformed);
    changeCount++;
  }
}

if (changeCount > 0) {
  if (dryRun) {
    console.log(`[dry-run] Would make ${changeCount} class attribute updates in ${filePath}`);
  } else {
    fs.writeFileSync(resolvedPath, s.toString(), 'utf-8');
    console.log(`✅ Adapted ${changeCount} class attributes in ${filePath}`);
  }
} else {
  console.log(`ℹ️ No Tailwind blocks needed adapting in ${filePath}`);
}
