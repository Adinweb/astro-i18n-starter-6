#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

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
  const pageKey = args.find((a) => !a.startsWith('--'));

  let title = pageKey || 'New Page';
  let hasCustomTitle = false;
  let customDesc = '';
  let hasCustomDesc = false;
  let fromLocale = '';
  let isDraft = false;
  let hasDraftArg = false;
  let isUpdate = false;
  let isSyncFrontmatter = false;
  let syncAll = false;
  let updateHeading = true;
  let skipNav = false;
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
    } else if (arg.startsWith('--title=')) {
      title = arg.slice(8);
      hasCustomTitle = true;
    } else if (arg.startsWith('--desc=') || arg.startsWith('--description=')) {
      customDesc = arg.startsWith('--desc=') ? arg.slice(7) : arg.slice(14);
      hasCustomDesc = true;
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
    } else if (arg.startsWith('--from=') || arg.startsWith('--source=')) {
      fromLocale = arg.slice(arg.indexOf('=') + 1);
    } else if (arg === '--draft=true' || arg === '--draft') {
      isDraft = true;
      hasDraftArg = true;
    } else if (arg === '--draft=false' || arg === '--no-draft' || arg === '--publish') {
      isDraft = false;
      hasDraftArg = true;
    } else if (arg === '--no-update-heading') {
      updateHeading = false;
    } else if (arg === '--no-nav' || arg === '--skip-nav') {
      skipNav = true;
    }
  }

  if (!pageKey) {
    console.log(`
Usage:
  npm run new:page <page-key> [options]

Creation Options:
  --title="<title>"            Title for the page (source locale)
  --desc="<desc>"              Description for the page
  --from=<locale>              Source locale to branch from (default: baseLocale / en)
  --publish / --draft=false    Publish immediately across all locales

Update / Sync Options:
  --update                     Update an existing page group without rewriting markdown body
  --sync-frontmatter           Synchronize frontmatter fields across all 5 language files
  --title:<locale>="<title>"   Specify per-locale title (e.g. --title:fa="درباره ما")
  --desc:<locale>="<desc>"     Specify per-locale description
  --data='{...}'               JSON string mapping locales to { title, description }
  --sync-all                   Force propagate source title/description placeholders to all locales
  --no-update-heading          Do not auto-update markdown # Title heading in body
  --skip-nav                   Do not update or register navigation translation key
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
  const targetDir = path.join(rootDir, 'src', 'content', 'pages', pageKey);

  const inlangSettings = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'project.inlang', 'settings.json'), 'utf-8')
  );
  const LOCALES = inlangSettings.locales;
  const defaultLocale = inlangSettings.baseLocale || 'en';
  const sourceLocale = fromLocale || defaultLocale;

  // -------------------------------------------------------------
  // UPDATE / SYNC-FRONTMATTER MODE
  // -------------------------------------------------------------
  if (fs.existsSync(targetDir) && (isUpdate || isSyncFrontmatter)) {
    console.log(`🔄 Updating existing page group: src/content/pages/${pageKey}/`);
    const updatedLocales = [];

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
        // Missing locale file - create symmetrical fallback
        const slug = isDefault ? pageKey : `${pageKey}-${loc}`;
        fmData = {
          title: `[TODO: ${loc}] ${title}`,
          slug,
          description: `[TODO: ${loc}] Description for ${title}`,
          draft: isDraft,
        };
        const stubBody = loc === 'fa' || loc === 'ar'
          ? 'محتوا به زودی افزوده خواهد شد...'
          : loc === 'de'
          ? 'Inhalt folgt in Kürze...'
          : loc === 'fr'
          ? 'Contenu à venir...'
          : 'Content coming soon...';
        body = `\n# ${fmData.title}\n\n${stubBody}\n`;
      }

      const oldTitle = fmData.title || '';

      // Title resolution
      if (titlesByLocale[loc]) {
        fmData.title = titlesByLocale[loc];
      } else if (isSource && hasCustomTitle) {
        fmData.title = title;
      } else if (hasCustomTitle && (isSyncFrontmatter || syncAll)) {
        if (syncAll || !fmData.title || fmData.title.startsWith('[TODO:')) {
          fmData.title = `[TODO: ${loc}] ${title}`;
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

      // Draft resolution
      if (hasDraftArg) {
        fmData.draft = isDraft;
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

    console.log(`✅ Frontmatter successfully updated for [${pageKey}] across locales: ${updatedLocales.join(', ')}`);

    // Optional nav key update
    if (!skipNav && hasCustomTitle) {
      try {
        const navText = titlesByLocale[sourceLocale] || title;
        console.log(`🔄 Updating nav_${pageKey} translation key...`);
        execSync(
          `node scripts/i18n-add.mjs --category=nav --key=${pageKey} --${sourceLocale}="${navText}"`,
          { stdio: 'inherit' }
        );
      } catch (e) {
        console.warn('⚠️ Warning: Failed to update nav key:', e.message);
      }
    }

    process.exit(0);
  }

  // -------------------------------------------------------------
  // GUARD: Directory already exists without --update flag
  // -------------------------------------------------------------
  if (fs.existsSync(targetDir)) {
    console.error(`❌ Page group already exists: ${targetDir}`);
    console.error(`💡 Use --update or --sync-frontmatter to update existing page titles and descriptions.`);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // NEW PAGE CREATION MODE
  // -------------------------------------------------------------
  fs.mkdirSync(targetDir, { recursive: true });

  for (const loc of LOCALES) {
    const isSource = loc === sourceLocale;
    const isDefault = loc === defaultLocale;
    const slug = isDefault ? pageKey : `${pageKey}-${loc}`;

    let pageTitle;
    if (titlesByLocale[loc]) {
      pageTitle = titlesByLocale[loc];
    } else {
      pageTitle = isSource ? title : `[TODO: ${loc}] ${title}`;
    }

    let pageDesc;
    if (descriptionsByLocale[loc]) {
      pageDesc = descriptionsByLocale[loc];
    } else if (hasCustomDesc) {
      pageDesc = isSource ? customDesc : `[TODO: ${loc}] ${customDesc}`;
    } else {
      pageDesc = isSource ? `Description for ${title}` : `[TODO: ${loc}] Description for ${title}`;
    }

    const stubBody = loc === 'fa' || loc === 'ar'
      ? 'محتوا به زودی افزوده خواهد شد...'
      : loc === 'de'
      ? 'Inhalt folgt in Kürze...'
      : loc === 'fr'
      ? 'Contenu à venir...'
      : 'Content coming soon...';

    const content = `---
title: "${pageTitle}"
slug: "${slug}"
description: "${pageDesc}"
draft: ${isDraft}
---

# ${pageTitle}

${stubBody}
`;
    fs.writeFileSync(path.join(targetDir, `${loc}.mdx`), content, 'utf-8');
  }

  console.log(`✅ Scaffolding complete in src/content/pages/${pageKey}/ across locales: ${LOCALES.join(', ')}`);
  console.log(`ℹ️ Source locale: "${sourceLocale}" (title: "${title}")`);

  // Register nav translation key
  if (!skipNav) {
    try {
      const navText = titlesByLocale[sourceLocale] || title;
      console.log(`🔄 Registering nav_${pageKey} translation key...`);
      execSync(
        `node scripts/i18n-add.mjs --category=nav --key=${pageKey} --${sourceLocale}="${navText}"`,
        { stdio: 'inherit' }
      );
    } catch (e) {
      console.warn('⚠️ Warning: Failed to auto-register nav key:', e.message);
    }
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  runCli();
}
