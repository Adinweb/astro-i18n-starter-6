#!/usr/bin/env node
/**
 * Populates missing i18n keys in `client/messages/<locale>.json` from static `m.*()`
 * calls, enabled `content.types`, `ui.navigation.pages`, and content taxonomy.
 *
 * Usage:
 *   npm run i18n:sync-keys [-- --dry-run] [-- --fix] [-- --json] [-- --quiet]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncDictionaryKeys } from './lib/i18n-sync.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  console.log(`Usage: npm run i18n:sync-keys [-- --dry-run] [-- --fix] [-- --json] [-- --quiet]

Options:
  --dry-run   Report missing keys without editing client/messages/*.json
  --fix       Write missing keys and recompile Paraglide (default when --dry-run is omitted)
  --json      Print structured JSON output
  --quiet     Suppress informational output
`);
  process.exit(0);
}

const dryRun = args.has('--dry-run');
const json = args.has('--json');
const quiet = args.has('--quiet');

const result = syncDictionaryKeys(rootDir, { dryRun, compile: !dryRun });

if (json) {
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  process.exit(0);
}

if (quiet) {
  process.exit(0);
}

if (result.totalAdded === 0) {
  console.log('✅ All dictionary keys are already in sync across active locales.');
  process.exit(0);
}

const modeLabel = dryRun ? 'Would add' : 'Added';
console.log(`${dryRun ? 'ℹ️ ' : '✅ '}${modeLabel} ${result.totalAdded} missing dictionary key(s):`);
for (const locale of result.locales) {
  const keys = result.addedByLocale[locale] ?? [];
  if (keys.length === 0) continue;
  console.log(`   - ${locale}: ${keys.join(', ')}`);
}
if (result.compiled) {
  console.log('✅ Recompiled Paraglide messages.');
}
