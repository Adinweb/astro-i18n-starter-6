#!/usr/bin/env node
/**
 * Ensures compiled Paraglide messages in `src/paraglide/` exist and are at
 * least as recent as `messages/*.json` and `project.inlang/settings.json`.
 *
 * Used by `npm run dev` so warm restarts skip the ~3s Paraglide CLI compilation
 * when dictionaries have not changed, keeping dev server startup fast.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileMessages } from './lib/compile-messages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function isCompiledOutputFresh(dir) {
  const barrel = path.join(dir, 'src', 'paraglide', 'messages', '_index.js');
  const legacyEntry = path.join(dir, 'src', 'paraglide', 'messages.js');
  const target = fs.existsSync(barrel) ? barrel : legacyEntry;

  if (!fs.existsSync(target)) return false;

  const compiledAt = fs.statSync(target).mtimeMs;
  const settingsFile = path.join(dir, 'project.inlang', 'settings.json');
  if (fs.existsSync(settingsFile) && fs.statSync(settingsFile).mtimeMs > compiledAt) {
    return false;
  }

  const messagesDir = path.join(dir, 'messages');
  if (!fs.existsSync(messagesDir)) return false;

  for (const entry of fs.readdirSync(messagesDir)) {
    if (!entry.endsWith('.json')) continue;
    const file = path.join(messagesDir, entry);
    if (fs.statSync(file).mtimeMs > compiledAt) {
      return false;
    }
  }

  return true;
}

if (!isCompiledOutputFresh(rootDir)) {
  compileMessages(rootDir);
}
