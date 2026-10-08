#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const groupSlug = args.find((a) => !a.startsWith('--'));
let collection = 'blog';
let fromLocale = '';
let customTitle = '';
let publishAll = false;

for (const arg of args) {
  if (arg.startsWith('--collection=')) collection = arg.slice(13);
  else if (arg.startsWith('--from=')) fromLocale = arg.slice(7);
  else if (arg.startsWith('--source=')) fromLocale = arg.slice(9);
  else if (arg.startsWith('--title=')) customTitle = arg.slice(8);
  else if (arg === '--publish' || arg === '--no-draft' || arg === '--draft=false') publishAll = true;
  else if (arg === '--draft=true' || arg === '--draft') publishAll = false;
}

if (!groupSlug) {
  console.error('Usage: npm run new:post <group-slug> [--collection=<name>] [--from=<locale>] [--title="<title>"] [--publish|--draft=false]');
  process.exit(1);
}

const rootDir = process.cwd();
const colDir = path.join(rootDir, 'src', 'content', collection);
if (!fs.existsSync(colDir)) {
  console.error(`❌ Collection directory not found: ${colDir}`);
  process.exit(1);
}

const targetDir = path.join(colDir, groupSlug);
if (fs.existsSync(targetDir)) {
  console.error(`❌ Article group already exists: ${targetDir}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

const inlangSettings = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'project.inlang', 'settings.json'), 'utf-8')
);
const LOCALES = inlangSettings.locales;
const defaultLocale = inlangSettings.baseLocale || 'en';
const sourceLocale = fromLocale || defaultLocale;
const today = new Date().toISOString().split('T')[0];

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
    // Check if fromLocale matches a locale in an existing post group
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
  const title = isSource ? sourceTitle : `[TODO: ${loc}] ${sourceTitle}`;

  const content = `---
title: "${title}"
slug: "${slug}"
description: "[TODO: ${loc}] Description for ${groupSlug}"
publishedAt: ${today}
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
