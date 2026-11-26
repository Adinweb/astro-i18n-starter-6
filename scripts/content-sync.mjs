#!/usr/bin/env node
/**
 * Synchronizes `.pages.yml` CMS collection definitions and `src/content/<type>/`
 * directories from `app.config.json` + `client/config.json` -> `content.types`.
 *
 * Usage:
 *   npm run content:sync
 *   npm run content:sync -- --check
 *   npm run content:sync -- --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readMergedConfig } from './lib/config.mjs';
import { contentDirFor, readContentTypes, rootDir } from './lib/content-types.mjs';

function humanize(key) {
  return String(key)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function yamlScalar(value) {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const str = String(value);
  if (/^[A-Za-z0-9_./-]+$/.test(str) && !['true', 'false', 'null'].includes(str)) {
    return `"${str}"`;
  }
  return JSON.stringify(str);
}

function mapFieldToPagesCms(field) {
  const label =
    field.label?.trim() ||
    field.labels?.en?.trim() ||
    humanize(field.name);

  const lines = [
    `      - name: ${field.name}`,
    `        label: ${label}`,
  ];

  switch (field.type) {
    case 'text':
      lines.push('        type: text');
      break;
    case 'number':
      lines.push('        type: number');
      break;
    case 'boolean':
      lines.push('        type: boolean');
      break;
    case 'date':
      lines.push('        type: date');
      break;
    case 'image':
      lines.push('        type: image');
      break;
    case 'enum':
      lines.push('        type: select');
      lines.push('        options:');
      lines.push(
        `          values: [${(field.options ?? []).map((opt) => yamlScalar(opt)).join(', ')}]`
      );
      break;
    case 'string[]':
    case 'taxonomy[]':
      lines.push('        type: string');
      lines.push('        list: true');
      break;
    default:
      lines.push('        type: string');
      break;
  }

  if (field.required) {
    lines.push('        required: true');
  }
  if (field.default !== undefined && !Array.isArray(field.default)) {
    lines.push(`        default: ${yamlScalar(field.default)}`);
  }

  return lines.join('\n');
}

const CORE_COLLECTION_BLOCKS = {
  pages: {
    baseFields: new Set([
      'title',
      'slug',
      'description',
      'draft',
      'hero',
      'container',
      'flushTop',
      'template',
      'image',
    ]),
    yaml: `  - name: pages
    label: Static Pages
    type: collection
    path: src/content/pages
    filename: "{primary}/{locale}.mdx"
    subfolders: true
    format: yaml-frontmatter
    fields:
      - name: title
        label: Title
        type: string
        required: true
      - name: slug
        label: URL Slug (leave empty only for home)
        type: string
      - name: description
        label: Meta Description
        type: string
      - name: draft
        label: Draft
        type: boolean
        default: false
      - name: hero
        label: Hero Variant
        type: select
        options:
          values: ["none", "minimal", "default"]
        default: "none"
      - name: container
        label: Page Container
        type: select
        options:
          values: ["canvas", "contained", "prose"]
        default: "canvas"
      - name: flushTop
        label: Flush Top (under sticky header)
        type: boolean
        default: false
      - name: template
        label: Bespoke Template Key
        type: string
      - name: image
        label: Hero Image
        type: image
      - name: body
        label: Body (MDX)
        type: rich-text`,
  },
  blog: {
    baseFields: new Set([
      'title',
      'slug',
      'description',
      'author',
      'publishedAt',
      'updatedAt',
      'categories',
      'tags',
      'draft',
      'image',
    ]),
    yaml: `  - name: blog
    label: Blog Posts
    type: collection
    path: src/content/blog
    filename: "{primary}/{locale}.mdx"
    subfolders: true
    format: yaml-frontmatter
    fields:
      - name: title
        label: Title
        type: string
        required: true
      - name: slug
        label: Localized Slug
        type: string
        required: true
      - name: description
        label: Summary
        type: string
      - name: author
        label: Author
        type: string
      - name: publishedAt
        label: Publish Date
        type: date
        required: true
      - name: updatedAt
        label: Updated Date
        type: date
      - name: categories
        label: Categories
        type: string
        list: true
      - name: tags
        label: Tags
        type: string
        list: true
      - name: draft
        label: Draft
        type: boolean
        default: false
      - name: image
        label: Cover Image
        type: image
      - name: body
        label: Content (MDX)
        type: rich-text`,
  },
  projects: {
    baseFields: new Set([
      'title',
      'slug',
      'description',
      'client',
      'year',
      'link',
      'stack',
      'categories',
      'draft',
      'image',
    ]),
    yaml: `  - name: projects
    label: Projects & Case Studies
    type: collection
    path: src/content/projects
    filename: "{primary}/{locale}.mdx"
    subfolders: true
    format: yaml-frontmatter
    fields:
      - name: title
        label: Project Title
        type: string
        required: true
      - name: slug
        label: Localized Slug
        type: string
        required: true
      - name: description
        label: Summary
        type: string
      - name: client
        label: Client Name
        type: string
      - name: year
        label: Year
        type: number
      - name: link
        label: Live Project URL
        type: string
      - name: stack
        label: Technologies / Services
        type: string
        list: true
      - name: categories
        label: Categories
        type: string
        list: true
      - name: draft
        label: Draft
        type: boolean
        default: false
      - name: image
        label: Cover Image
        type: image
      - name: body
        label: Case Study (MDX)
        type: rich-text`,
  },
};

export function renderCollectionCmsBlock(type) {
  const core = CORE_COLLECTION_BLOCKS[type.key];
  const configuredFields = Array.isArray(type.fields) ? type.fields : [];

  if (core) {
    const extraFields = configuredFields.filter(
      (f) => f?.name && f.cms !== false && !core.baseFields.has(f.name)
    );
    if (extraFields.length === 0) return core.yaml;

    const extraYaml = extraFields.map(mapFieldToPagesCms).join('\n');
    const bodyNeedle = '      - name: body\n';
    const idx = core.yaml.indexOf(bodyNeedle);
    if (idx === -1) return `${core.yaml}\n${extraYaml}`;
    return `${core.yaml.slice(0, idx)}${extraYaml}\n${core.yaml.slice(idx)}`;
  }

  const label = type.labels?.en?.trim() || humanize(type.key);
  const reserved = new Set(['title', 'slug', 'description', 'draft', 'image', 'body']);
  const customFields = configuredFields.filter(
    (f) => f?.name && f.cms !== false && !reserved.has(f.name)
  );

  const lines = [
    `  - name: ${type.key}`,
    `    label: ${label}`,
    `    type: collection`,
    `    path: src/content/${type.key}`,
    `    filename: "{primary}/{locale}.mdx"`,
    `    subfolders: true`,
    `    format: yaml-frontmatter`,
    `    fields:`,
    `      - name: title`,
    `        label: Title`,
    `        type: string`,
    `        required: true`,
    `      - name: slug`,
    `        label: Localized Slug`,
    `        type: string`,
    `        required: true`,
    `      - name: description`,
    `        label: Summary`,
    `        type: string`,
  ];

  for (const field of customFields) {
    lines.push(mapFieldToPagesCms(field));
  }

  lines.push(
    `      - name: draft`,
    `        label: Draft`,
    `        type: boolean`,
    `        default: false`,
    `      - name: image`,
    `        label: Cover Image`,
    `        type: image`,
    `      - name: body`,
    `        label: Content (MDX)`,
    `        type: rich-text`
  );

  return lines.join('\n');
}

/**
 * Rewrites the collection blocks inside `.pages.yml` before `- name: settings`
 * while preserving the leading `media:` section and the trailing `settings` block.
 */
export function buildSyncedPagesYml(existingYml, types) {
  const normalized = existingYml.replace(/\r\n/g, '\n');
  const contentMarker = '\ncontent:\n';
  const settingsMarker = '\n  - name: settings\n';

  const contentIdx = normalized.indexOf(contentMarker);
  const settingsIdx = normalized.indexOf(settingsMarker);
  if (contentIdx === -1 || settingsIdx === -1 || settingsIdx <= contentIdx) {
    throw new Error('Could not locate "content:" and "- name: settings" anchors in .pages.yml');
  }

  const prefix = normalized.slice(0, contentIdx + contentMarker.length);
  const settingsAndTail = normalized.slice(settingsIdx + 1); // starts with "  - name: settings"

  const blocks = types
    .filter((type) => type.enabled || type.key in CORE_COLLECTION_BLOCKS)
    .map((type) => renderCollectionCmsBlock(type));

  const nextYml = `${prefix}${blocks.join('\n\n')}\n\n${settingsAndTail}`;
  return existingYml.includes('\r\n') ? nextYml.replace(/\n/g, '\r\n') : nextYml;
}

export function syncCollections(targetRootDir = rootDir, { check = false, dryRun = false } = {}) {
  const config = readMergedConfig(targetRootDir);
  const types = readContentTypes(config, targetRootDir);
  const pagesYmlPath = path.join(targetRootDir, '.pages.yml');
  const existingYml = fs.readFileSync(pagesYmlPath, 'utf-8');
  const nextYml = buildSyncedPagesYml(existingYml, types);

  const missingDirs = [];
  for (const type of types) {
    if (!type.enabled) continue;
    const dir = contentDirFor(type.key, targetRootDir);
    if (!fs.existsSync(dir)) {
      missingDirs.push(dir);
    }
  }

  const ymlChanged = existingYml !== nextYml;

  if (!check && !dryRun) {
    for (const dir of missingDirs) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, '.gitkeep'), '', 'utf-8');
    }
    if (ymlChanged) {
      fs.writeFileSync(pagesYmlPath, nextYml, 'utf-8');
    }
  }

  return {
    types,
    ymlChanged,
    missingDirs: missingDirs.map((dir) => path.relative(targetRootDir, dir)),
  };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const args = new Set(process.argv.slice(2));
  const check = args.has('--check');
  const dryRun = args.has('--dry-run');

  const result = syncCollections(rootDir, { check, dryRun });

  if (check) {
    if (result.ymlChanged || result.missingDirs.length > 0) {
      if (result.ymlChanged) {
        console.error('❌ .pages.yml is out of sync with content.types.');
      }
      if (result.missingDirs.length > 0) {
        console.error(`❌ Missing content directories: ${result.missingDirs.join(', ')}`);
      }
      console.error('   Run `npm run content:sync` to update.');
      process.exit(1);
    }
    console.log('✅ .pages.yml and content directories are in sync with content.types.');
    process.exit(0);
  }

  if (dryRun) {
    console.log(
      `Dry run: .pages.yml ${result.ymlChanged ? 'would be updated' : 'is up to date'}; ` +
        `${result.missingDirs.length} director(y/ies) would be created.`
    );
    process.exit(0);
  }

  console.log(
    `✅ Content sync complete (.pages.yml: ${result.ymlChanged ? 'updated' : 'unchanged'}, ` +
      `created dirs: ${result.missingDirs.length}).`
  );
}
