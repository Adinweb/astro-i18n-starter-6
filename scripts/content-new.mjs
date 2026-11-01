#!/usr/bin/env node
/**
 * Scaffolds one entry group in any content type declared in
 * `app.config.json` → `content.types`.
 *
 * `pages` and `blog` keep their dedicated commands (`new:page`, `new:post`)
 * because they carry page-specific frontmatter and taxonomy; every other type
 * is created from the shared entry contract.
 *
 * Usage:
 *   pnpm run content:new <type> <slug> [--title="<Title>"] [--desc="<Desc>"]
 *     [--from=<locale>] [--slug:<locale>="<slug>"] [--image=cover.png|none]
 *     [--publish]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { contentStub } from './lib/content-stub.mjs';
import { stringifyFrontmatter } from './lib/frontmatter.mjs';
import { readLocaleConfig } from './lib/locales.mjs';
import { entryKeyError } from './lib/validate.mjs';
import { resolveImageOption } from './lib/image-reference.mjs';
import {
  KNOWN_TYPES,
  contentDirFor,
  contentTypeKeyError,
  readContentTypes,
  rootDir,
} from './lib/content-types.mjs';

const rawArgs = process.argv.slice(2);
const positional = rawArgs.filter((arg) => !arg.startsWith('--'));
const type = positional[0];
const group = positional[1];

const options = {
  title: '',
  description: '',
  from: '',
  publish: false,
  image: '',
  noImage: false,
};
const slugsByLocale = {};

for (const arg of rawArgs) {
  if (arg.startsWith('--title=')) options.title = arg.slice(8);
  else if (arg.startsWith('--desc=') || arg.startsWith('--description=')) {
    options.description = arg.startsWith('--desc=') ? arg.slice(7) : arg.slice(14);
  } else if (arg.startsWith('--from=')) options.from = arg.slice(7);
  else if (arg === '--publish' || arg === '--draft=false') options.publish = true;
  else if (arg.startsWith('--image=')) {
    const resolved = resolveImageOption(arg.slice(8), '');
    if (resolved === null) {
      console.error(`❌ Invalid --image value: "${arg.slice(8)}".`);
      process.exit(1);
    }
    options.image = resolved;
    options.noImage = resolved === '';
  } else if (arg.startsWith('--slug:')) {
    const eq = arg.indexOf('=');
    if (eq !== -1) slugsByLocale[arg.slice(7, eq)] = arg.slice(eq + 1);
  }
}

if (!type || !group) {
  console.error(`Usage: pnpm run content:new <type> <slug> [options]`);
  console.error(`Types: ${KNOWN_TYPES.join(', ')}`);
  console.error('Run `pnpm run content:list` to see the declared types and their state.');
  process.exit(1);
}

const typeError = contentTypeKeyError(type);
if (typeError) {
  console.error(typeError);
  process.exit(1);
}

const keyError = entryKeyError(group, 'entry group slug');
if (keyError) {
  console.error(keyError);
  process.exit(1);
}

// Types with a dedicated command keep their richer frontmatter and taxonomy.
if (type === 'pages' || type === 'blog') {
  const script = path.join(rootDir, 'scripts', type === 'pages' ? 'new-page.mjs' : 'new-post.mjs');
  const forwarded = rawArgs.filter((arg) => arg !== type && arg !== group);
  execFileSync(process.execPath, [script, group, ...forwarded], { stdio: 'inherit' });
  process.exit(0);
}

const declared = readContentTypes().find((candidate) => candidate.key === type);
if (!declared.enabled) {
  console.warn(
    `⚠️  "${type}" is disabled in app.config.json — the entry will be created but not routed. ` +
      `Enable it with: pnpm run content:enable ${type}`
  );
}

const { locales, defaultLocale } = readLocaleConfig();
if (locales.length === 0) {
  console.error('❌ Could not read LOCALES from src/i18n/locales.ts');
  process.exit(1);
}

const sourceLocale = options.from || defaultLocale;
if (!locales.includes(sourceLocale)) {
  console.error(`❌ Unknown source locale "${sourceLocale}". Known: ${locales.join(', ')}.`);
  process.exit(1);
}

// `page` is reserved for pagination by every non-page collection schema, so a
// scaffold that used it would produce content the build refuses.
if ([group, ...Object.values(slugsByLocale)].includes('page')) {
  console.error('❌ "page" is reserved for pagination. Choose a different group slug or --slug:<locale>. ');
  process.exit(1);
}

const groupDir = path.join(contentDirFor(type), group);
if (fs.existsSync(groupDir)) {
  console.error(`❌ ${type} entry "${group}" already exists: src/content/${type}/${group}/`);
  console.error('   Use the update options of its command, or remove it first.');
  process.exit(1);
}

const baseTitle = options.title || group.replace(/[-_]+/g, ' ');
fs.mkdirSync(groupDir, { recursive: true });

for (const locale of locales) {
  const isSource = locale === sourceLocale;
  const slug = slugsByLocale[locale] || group;
  const title = isSource
    ? baseTitle
    : `[TODO: ${locale}] ${baseTitle}`;
  const description = isSource ? options.description : '';

  const frontmatter = {
    title,
    slug,
    ...(description ? { description } : {}),
    ...(options.noImage ? {} : { image: options.image || `./${group}.png` }),
    // Only the source locale of a `--publish` run goes live; a placeholder
    // title must never be published as if it were translated copy.
    draft: !(isSource && options.publish),
  };

  fs.writeFileSync(
    path.join(groupDir, `${locale}.mdx`),
    stringifyFrontmatter(frontmatter, contentStub(locale) + '\n'),
    'utf-8'
  );
  console.log(`✅ src/content/${type}/${group}/${locale}.mdx`);
}

if (!options.noImage) {
  // The generated cover is a placeholder; `assets:generate` keeps an existing
  // photograph in place, so a second run never replaces real artwork.
  execFileSync(process.execPath, [path.join(rootDir, 'scripts', 'generate-assets.mjs')], {
    stdio: 'inherit',
    cwd: rootDir,
  });
}

const base = declared.base ? `/${declared.base}/` : '/';
console.log(`
Next steps:
  1. Write the copy in src/content/${type}/${group}/${sourceLocale}.mdx
  2. Translate the other locales and clear their [TODO: …] titles
  3. pnpm run content:status   — see what is still missing
  4. pnpm run build && pnpm run smoke

The entry will be listed at ${base} and, once published, at ${base}<slug>/.
`);
