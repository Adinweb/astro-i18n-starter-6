#!/usr/bin/env node
/**
 * One-shot declarative site provisioner (`npm run site:apply`).
 *
 * Applies a complete client specification JSON (`--spec=<path>`) across
 * `client/config.json`, `client/locales.json`, `client/messages/*.json`,
 * `src/content/pages/`, `src/content/<collection>/`, brand assets, and
 * Paraglide compilation in one command.
 *
 * Usage:
 *   npm run site:apply -- --spec=client-spec.json [--dry-run] [--skip-assets] [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { applySiteSpec } from './lib/site-apply.mjs';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: npm run site:apply -- --spec=<path.json> [--dry-run] [--skip-assets] [--json]

Options:
  --spec=<path>    Path to declarative client site specification JSON (or "-" for stdin)
  --dry-run        Validate spec and preview all planned changes without writing files
  --skip-assets    Skip regenerating brand icons and content cover placeholders
  --json           Emit machine-readable JSON summary
`);
  process.exit(0);
}

const specArg = args.find((arg) => arg.startsWith('--spec='));
const positionalSpec = args.find((arg) => !arg.startsWith('--'));
const specPath = specArg ? specArg.slice('--spec='.length).trim() : positionalSpec;
const dryRun = args.includes('--dry-run');
const skipAssets = args.includes('--skip-assets');
const wantsJson = args.includes('--json');

if (!specPath) {
  console.error('❌ Missing required `--spec=<path.json>` argument.');
  process.exit(1);
}

const rootDir = process.cwd();
let rawSpec;
try {
  rawSpec =
    specPath === '-'
      ? fs.readFileSync(0, 'utf-8')
      : fs.readFileSync(path.resolve(rootDir, specPath), 'utf-8');
} catch (error) {
  console.error(`❌ Failed to read spec file "${specPath}": ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

let spec;
try {
  spec = JSON.parse(rawSpec);
} catch (error) {
  console.error(`❌ Invalid JSON in "${specPath}": ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

try {
  const result = applySiteSpec(spec, { rootDir, dryRun, skipAssets });
  if (wantsJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const modeLabel = dryRun ? 'Dry-run preview' : 'Applied site spec';
    console.log(`✅ ${modeLabel}:`);
    console.log(`   - Config keys: ${result.configKeysUpdated.join(', ') || 'none'}`);
    console.log(`   - Pages affected: ${result.pages.length}`);
    console.log(`   - Collection entries affected: ${result.entries.length}`);
    console.log(`   - Missing dictionary keys synced: ${result.i18nSync.totalAdded}`);
    if (!dryRun) {
      console.log('   Next: run `npm run check:quick && npm run audit:i18n && npm run build`.');
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (wantsJson) {
    console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  } else {
    console.error(`❌ ${message}`);
  }
  process.exit(1);
}
