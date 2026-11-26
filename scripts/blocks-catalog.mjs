#!/usr/bin/env node
/**
 * Generates or validates `docs/BLOCKS-API.md` from component `interface Props`.
 *
 * Usage:
 *   npm run blocks:catalog [-- --check] [-- --json] [-- --quiet]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateBlocksApi, MAX_BLOCKS_API_BYTES } from './lib/blocks-catalog.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const json = args.has('--json');
const quiet = args.has('--quiet');

const result = generateBlocksApi({ rootDir, check });

if (result.overBudget) {
  if (json) {
    console.log(
      JSON.stringify({
        ok: false,
        error: `docs/BLOCKS-API.md (${result.bytes} bytes) exceeds ${MAX_BLOCKS_API_BYTES} bytes.`,
        bytes: result.bytes,
        counts: result.counts,
      })
    );
  } else {
    console.error(
      `❌ docs/BLOCKS-API.md is ${result.bytes} bytes (limit: < ${MAX_BLOCKS_API_BYTES} bytes).`
    );
  }
  process.exit(1);
}

if (check && result.changed) {
  if (json) {
    console.log(
      JSON.stringify({
        ok: false,
        error: 'docs/BLOCKS-API.md is out of date. Run `npm run blocks:catalog`.',
        bytes: result.bytes,
        counts: result.counts,
      })
    );
  } else {
    console.error('❌ docs/BLOCKS-API.md is out of date. Run `npm run blocks:catalog` to update.');
  }
  process.exit(1);
}

if (json) {
  console.log(
    JSON.stringify({
      ok: true,
      bytes: result.bytes,
      changed: result.changed,
      counts: result.counts,
      file: path.relative(rootDir, result.outPath),
    })
  );
  process.exit(0);
}

if (!quiet) {
  const total =
    result.counts.heroes +
    result.counts.sections +
    result.counts.showcases +
    result.counts.core +
    result.counts.ui;
  const verb = check ? 'verified' : result.changed ? 'updated' : 'up to date';
  console.log(`✅ docs/BLOCKS-API.md ${verb} (${total} components, ${result.bytes} bytes).`);
}
