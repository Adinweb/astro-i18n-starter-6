#!/usr/bin/env node
/**
 * Ensures compiled Paraglide messages in `src/paraglide/` exist and are at
 * least as recent as `client/locales.json`, `messages/core/*.json`, and
 * `client/messages/*.json`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileMessages } from './lib/compile-messages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function dirHasNewerJson(dirPath, compiledAt) {
  if (!fs.existsSync(dirPath)) return false;
  for (const entry of fs.readdirSync(dirPath)) {
    if (!entry.endsWith('.json')) continue;
    const file = path.join(dirPath, entry);
    if (fs.statSync(file).mtimeMs > compiledAt) {
      return true;
    }
  }
  return false;
}

function isCompiledOutputFresh(dir) {
  const barrel = path.join(dir, 'src', 'paraglide', 'messages', '_index.js');
  const legacyEntry = path.join(dir, 'src', 'paraglide', 'messages.js');
  const target = fs.existsSync(barrel) ? barrel : legacyEntry;

  if (!fs.existsSync(target)) return false;

  const compiledAt = fs.statSync(target).mtimeMs;
  const localesFile = path.join(dir, 'client', 'locales.json');
  if (fs.existsSync(localesFile) && fs.statSync(localesFile).mtimeMs > compiledAt) {
    return false;
  }

  if (dirHasNewerJson(path.join(dir, 'messages', 'core'), compiledAt)) return false;
  if (dirHasNewerJson(path.join(dir, 'client', 'messages'), compiledAt)) return false;

  return true;
}

if (!isCompiledOutputFresh(rootDir)) {
  compileMessages(rootDir);
}
