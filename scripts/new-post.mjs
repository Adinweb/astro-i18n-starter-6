#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseFrontmatter(rawContent) {
  const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: rawContent };
  }
  const fmText = match[1];
  const body = match[2];
  const data = {};
  const lines = fmText.split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else if (val === 'true') {
      val = true;
    } else if (val === 'false') {
      val = false;
    }
    data[key] = val;
  }
  return { data, body };
}

export function stringifyFrontmatter(data, body) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (typeof v === 'boolean') {
      lines.push(`${k}: ${v}`);
    } else if (typeof v === 'number') {
      lines.push(`${k}: ${v}`);
    } else if (k === 'publishedAt') {
      lines.push(`${k}: ${v}`);
    } else {
      const strVal = String(v).replace(/"/g, '\\"');
      lines.push(`${k}: "${strVal}"`);
    }
  }
  lines.push('---');
  const cleanBody = body.startsWith('\n') ? body : '\n' + body;
  return lines.join('\n') + cleanBody;
}

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function runCli() {
  const args = process.argv.slice(2);
  const groupSlug = args.find((a) => !a.startsWith('--'));

  let collection = 'blog';
  let fromLocale = '';
  let customTitle = '';
  let customDesc = '';
  let hasCustomDesc = false;
  let customDate = '';
  let publishAll = false;
  let hasDraftArg = false;
  let isUpdate = false;
  let isSyncFrontmatter = false;
  let syncAll = false;
  let updateHeading = true;
  const titlesByLocale = {};
  const descriptionsByLocale = {};
  let jsonData = null;

  for (const arg of args) {
    if (arg === '--update') {
      isUpdate = true;
    } else if (arg === '--sync-frontmatter') {
      isSyncFrontmatter = true;
    } else if (arg === '--sync-all') {
      syncAll = true;
    } else if (arg.startsWith('--collection=')) {
      collection = arg.slice(13);
    } else if (arg.startsWith('--from=')) {
      fromLocale = arg.slice(7);
    } else if (arg.startsWith('--source=')) {
      fromLocale = arg.slice(9);
    } else if (arg.startsWith('--title=')) {
      customTitle = arg.slice(8);
    } else if (arg.startsWith('--desc=') || arg.startsWith('--description=')) {
      customDesc = arg.startsWith('--desc=') ? arg.slice(7) : arg.slice(14);
      hasCustomDesc = true;
    } else if (arg.startsWith('--date=') || arg.startsWith('--publishedAt=')) {
      customDate = arg.startsWith('--date=') ? arg.slice(7) : arg.slice(14);
    } else if (arg.startsWith('--title:')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const loc = arg.slice(8, eqIdx);
        titlesByLocale[loc] = arg.slice(eqIdx + 1);
      }
    } else if (arg.startsWith('--desc:') || arg.startsWith('--description:')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const prefixLen = arg.startsWith('--desc:') ? 7 : 14;
        const loc = arg.slice(prefixLen, eqIdx);
        descriptionsByLocale[loc] = arg.slice(eqIdx + 1);
      }
    } else if (arg.startsWith('--data=')) {
      try {
        jsonData = JSON.parse(arg.slice(7));
      } catch (e) {
        console.error('❌ Failed to parse --data JSON:', e.message);
        process.exit(1);
      }
    } else if (arg.startsWith('--file=')) {
      try {
        jsonData = JSON.parse(fs.readFileSync(arg.slice(7), 'utf-8'));
      } catch (e) {
        console.error('❌ Failed to parse --file JSON:', e.message);
        process.exit(1);
      }
    } else if (arg === '--publish' || arg === '--no-draft' || arg === '--draft=false') {
      publishAll = true;
      hasDraftArg = true;
    } else if (arg === '--draft=true' || arg === '--draft') {
      publishAll = false;
      hasDraftArg = true;
    } else if (arg === '--no-update-heading') {
      updateHeading = false;
    }
  }

  if (!groupSlug) {
    console.log(`
Usage:
  npm run new:post <group-slug> [options]

Creation Options:
  --collection=<name>          Content collection name (default: "blog")
  --title="<title>"            Title for the post (source locale)
  --desc="<description>"       Description for the post
  --from=<locale>              Source locale to branch or clone body from
  --publish / --draft=false    Publish immediately across all locales (default marks non-source as draft)

Update / Sync Options:
  --update                     Update an existing article group without rewriting markdown body
  --sync-frontmatter           Synchronize frontmatter fields across all 5 language files
  --title:<locale>="<title>"   Specify per-locale title (e.g. --title:fa="عنوان مقاله")
  --desc:<locale>="<desc>"     Specify per-locale description
  --date="YYYY-MM-DD"          Update publication date
  --data='{...}'               JSON string mapping locales to { title, description }
  --sync-all                   Force propagate source title/description placeholders to all locales
  --no-update-heading          Do not auto-update markdown # Title heading in body
`);
    process.exit(1);
  }

  // Ingest JSON data if supplied
  if (jsonData && typeof jsonData === 'object') {
    for (const [loc, fields] of Object.entries(jsonData)) {
      if (typeof fields === 'object' && fields !== null) {
        if (fields.title) titlesByLocale[loc] = fields.title;
        if (fields.description || fields.desc) descriptionsByLocale[loc] = fields.description || fields.desc;
      }
    }
  }

  const rootDir = process.cwd();
  const colDir = path.join(rootDir, 'src', 'content', collection);
  if (!fs.existsSync(colDir)) {
    console.error(`❌ Collection directory not found: ${colDir}`);
    process.exit(1);
  }

  const targetDir = path.join(colDir, groupSlug);

  const inlangSettings = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'project.inlang', 'settings.json'), 'utf-8')
  );
  const LOCALES = inlangSettings.locales;
  const defaultLocale = inlangSettings.baseLocale || 'en';
  const sourceLocale = fromLocale || defaultLocale;
  const today = new Date().toISOString().split('T')[0];

  // -------------------------------------------------------------
  // UPDATE / SYNC-FRONTMATTER MODE
  // -------------------------------------------------------------
  if (fs.existsSync(targetDir) && (isUpdate || isSyncFrontmatter)) {
    console.log(`🔄 Updating existing article group: src/content/${collection}/${groupSlug}/`);
    const updatedLocales = [];
    const sourceTitle = customTitle || groupSlug.replace(/-/g, ' ');

    for (const loc of LOCALES) {
      const filePath = path.join(targetDir, `${loc}.mdx`);
      const isSource = loc === sourceLocale;
      const isDefault = loc === defaultLocale;

      let fmData = {};
      let body = '';

      if (fs.existsSync(filePath)) {
        const parsed = parseFrontmatter(fs.readFileSync(filePath, 'utf-8'));
        fmData = parsed.data;
        body = parsed.body;
      } else {
        const slug = isDefault ? groupSlug : `${groupSlug}-${loc}`;
        fmData = {
          title: `[TODO: ${loc}] ${sourceTitle}`,
          slug,
          description: `[TODO: ${loc}] Description for ${groupSlug}`,
          publishedAt: customDate || today,
          draft: !isSource,
        };
        body = `\n# ${fmData.title}\n\nArticle content goes here...\n`;
      }

      const oldTitle = fmData.title || '';

      // Title resolution
      if (titlesByLocale[loc]) {
        fmData.title = titlesByLocale[loc];
      } else if (isSource && customTitle) {
        fmData.title = customTitle;
      } else if (customTitle && (isSyncFrontmatter || syncAll)) {
        if (syncAll || !fmData.title || fmData.title.startsWith('[TODO:')) {
          fmData.title = `[TODO: ${loc}] ${customTitle}`;
        }
      }

      // Description resolution
      if (descriptionsByLocale[loc]) {
        fmData.description = descriptionsByLocale[loc];
      } else if (isSource && hasCustomDesc) {
        fmData.description = customDesc;
      } else if (hasCustomDesc && (isSyncFrontmatter || syncAll)) {
        if (syncAll || !fmData.description || fmData.description.startsWith('[TODO:')) {
          fmData.description = `[TODO: ${loc}] ${customDesc}`;
        }
      }

      // Date resolution
      if (customDate) {
        fmData.publishedAt = customDate;
      }

      // Draft resolution
      if (hasDraftArg) {
        fmData.draft = !publishAll;
      }

      // Heading update in markdown body if requested
      if (updateHeading && fmData.title && oldTitle && oldTitle !== fmData.title) {
        const headingRegex = new RegExp(`^(\\s*#\\s*)${escapeRegex(oldTitle)}(\\s*)$`, 'm');
        if (headingRegex.test(body)) {
          body = body.replace(headingRegex, `$1${fmData.title}$2`);
        }
      }

      const newContent = stringifyFrontmatter(fmData, body);
      fs.writeFileSync(filePath, newContent, 'utf-8');
      updatedLocales.push(loc);
    }

    console.log(`✅ Frontmatter successfully updated for [${groupSlug}] across locales: ${updatedLocales.join(', ')}`);
    process.exit(0);
  }

  // -------------------------------------------------------------
  // GUARD: Directory already exists without --update flag
  // -------------------------------------------------------------
  if (fs.existsSync(targetDir)) {
    console.error(`❌ Article group already exists: ${targetDir}`);
    console.error(`💡 Use --update or --sync-frontmatter to update existing post titles and descriptions.`);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // NEW ARTICLE CREATION MODE
  // -------------------------------------------------------------
  fs.mkdirSync(targetDir, { recursive: true });

  let baseBody = `\n# Article Header\n\nArticle content goes here...\n`;

  if (fromLocale) {
    let sourceFile = null;
    if (fromLocale.includes('/')) {
      const candidate = path.join(colDir, fromLocale.endsWith('.mdx') ? fromLocale : `${fromLocale}.mdx`);
      if (fs.existsSync(candidate)) sourceFile = candidate;
    } else if (fs.existsSync(path.join(colDir, fromLocale, `${fromLocale}.mdx`))) {
      sourceFile = path.join(colDir, fromLocale, `${fromLocale}.mdx`);
    } else if (fs.existsSync(path.join(colDir, fromLocale, 'en.mdx'))) {
      sourceFile = path.join(colDir, fromLocale, 'en.mdx');
    } else {
      const existingGroups = fs.readdirSync(colDir, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== groupSlug);
      for (const eg of existingGroups) {
        const candidate = path.join(colDir, eg.name, `${fromLocale}.mdx`);
        if (fs.existsSync(candidate)) {
          sourceFile = candidate;
          break;
        }
      }
    }

    if (sourceFile && fs.existsSync(sourceFile)) {
      const fromContent = fs.readFileSync(sourceFile, 'utf-8');
      baseBody = fromContent.replace(/^---[\s\S]*?---/, '');
    }
  }

  const sourceTitle = customTitle || groupSlug.replace(/-/g, ' ');

  for (const loc of LOCALES) {
    const isSource = loc === sourceLocale;
    const isDraft = publishAll ? false : !isSource;
    const isDefault = loc === defaultLocale;
    const slug = isDefault ? groupSlug : `${groupSlug}-${loc}`;

    let title;
    if (titlesByLocale[loc]) {
      title = titlesByLocale[loc];
    } else {
      title = isSource ? sourceTitle : `[TODO: ${loc}] ${sourceTitle}`;
    }

    let description;
    if (descriptionsByLocale[loc]) {
      description = descriptionsByLocale[loc];
    } else if (hasCustomDesc) {
      description = isSource ? customDesc : `[TODO: ${loc}] ${customDesc}`;
    } else {
      description = `[TODO: ${loc}] Description for ${groupSlug}`;
    }

    const dateValue = customDate || today;

    const content = `---
title: "${title}"
slug: "${slug}"
description: "${description}"
publishedAt: ${dateValue}
draft: ${isDraft}
---
${baseBody}
`;

    fs.writeFileSync(path.join(targetDir, `${loc}.mdx`), content, 'utf-8');
  }

  console.log(`✅ Created synchronized article group in src/content/${collection}/${groupSlug}/ across locales: ${LOCALES.join(', ')}`);
  console.log(`ℹ️ Source locale: "${sourceLocale}" (title: "${sourceTitle}")`);

  if (!publishAll) {
    const draftedLocales = LOCALES.filter((l) => l !== sourceLocale);
    console.log(`📝 Note: Non-source locales (${draftedLocales.join(', ')}) are marked as "draft: true" so they won't appear on blog index until translated.`);
    console.log(`   (To publish all locales immediately next time, pass --publish or --draft=false).`);
  } else {
    console.log(`🚀 All locales published immediately with "draft: false".`);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  runCli();
}
