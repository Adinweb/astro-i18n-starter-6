#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const groupSlug = args.find((a) => !a.startsWith('--'));
let collection = 'blog';
let fromLocale = '';

for (const arg of args) {
  if (arg.startsWith('--collection=')) collection = arg.slice(13);
  else if (arg.startsWith('--from=')) fromLocale = arg.slice(7);
}

if (!groupSlug) {
  console.error('Usage: npm run new:post <group-slug> [--collection=<name>] [--from=<locale>]');
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
const today = new Date().toISOString().split('T')[0];

let baseBody = `\n# Article Header\n\nArticle content goes here...\n`;

if (fromLocale && fs.existsSync(path.join(targetDir, `${fromLocale}.mdx`))) {
  const fromContent = fs.readFileSync(path.join(targetDir, `${fromLocale}.mdx`), 'utf-8');
  baseBody = fromContent.replace(/^---[\s\S]*?---/, '');
}

for (const loc of LOCALES) {
  const isEn = loc === 'en';
  const isFrom = loc === fromLocale;
  const isDraft = !(isEn || isFrom);

  const slug = loc === 'fa' ? `${groupSlug}-fa` : loc === 'de' ? `${groupSlug}-de` : groupSlug;
  const title = isEn ? groupSlug.replace(/-/g, ' ') : `[TODO: ${loc}] ${groupSlug.replace(/-/g, ' ')}`;

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
