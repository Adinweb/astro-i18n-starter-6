#!/usr/bin/env node
/**
 * Switches a content type on or off in `app.config.json`.
 *
 * Disabling a type removes its routes, its sitemap entries, its navigation
 * links and its feed — but never touches the content itself, so re-enabling it
 * brings the pages straight back.
 *
 * Usage:
 *   pnpm run content:enable <type>
 *   pnpm run content:disable <type>
 */
import {
  FIXED_TYPES,
  contentTypeKeyError,
  readAppConfig,
  readContentTypes,
  writeAppConfig,
} from './lib/content-types.mjs';

const [mode, key] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

if (mode !== 'enable' && mode !== 'disable') {
  console.error('Usage: node scripts/content-toggle.mjs <enable|disable> <type>');
  process.exit(1);
}

const keyError = contentTypeKeyError(key);
if (keyError) {
  console.error(keyError);
  process.exit(1);
}

if (mode === 'disable' && FIXED_TYPES.has(key)) {
  console.error(`❌ The "${key}" type cannot be disabled: it owns the home page.`);
  process.exit(1);
}

const config = readAppConfig();
config.content = config.content ?? {};
config.content.types = config.content.types ?? {};
config.content.types[key] = config.content.types[key] ?? {};

const before = readContentTypes(config).find((type) => type.key === key);
config.content.types[key].enabled = mode === 'enable';
writeAppConfig(config);

const type = readContentTypes(config).find((candidate) => candidate.key === key);
const baseLabel = type.base ? `/${type.base}/` : '/';

if (before.enabled === type.enabled) {
  console.log(`ℹ️  "${key}" is already ${mode}d — nothing changed.`);
  process.exit(0);
}

console.log(
  `${mode === 'enable' ? '✅ Enabled' : '⏸️  Disabled'} content type "${key}" (${baseLabel}).`
);
console.log(
  mode === 'enable'
    ? '   Rewrites its index/entry routes, sitemap entries and navigation links on the next build.'
    : '   Its routes, sitemap entries and navigation links are gone from the next build; the content files stay on disk.'
);
console.log('   Next: pnpm run build && pnpm run smoke');
