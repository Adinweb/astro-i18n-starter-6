#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const pageKey = args.find((a) => !a.startsWith('--'));
let title = pageKey || 'New Page';
let fromLocale = '';
let isDraft = false;

for (const arg of args) {
  if (arg.startsWith('--title=')) {
    title = arg.slice(8);
  } else if (arg.startsWith('--from=')) {
    fromLocale = arg.slice(7);
  } else if (arg.startsWith('--source=')) {
    fromLocale = arg.slice(9);
  } else if (arg === '--draft=true' || arg === '--draft') {
    isDraft = true;
  } else if (arg === '--draft=false' || arg === '--no-draft' || arg === '--publish') {
    isDraft = false;
  }
}

if (!pageKey) {
  console.error('Usage: npm run new:page <page-key> [--title="<title>"] [--from=<locale>] [--draft=true|false]');
  process.exit(1);
}

const rootDir = process.cwd();
const targetDir = path.join(rootDir, 'src', 'content', 'pages', pageKey);

if (fs.existsSync(targetDir)) {
  console.error(`❌ Page group already exists: ${targetDir}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

const inlangSettings = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'project.inlang', 'settings.json'), 'utf-8')
);
const LOCALES = inlangSettings.locales;
const defaultLocale = inlangSettings.baseLocale || 'en';
const sourceLocale = fromLocale || defaultLocale;

for (const loc of LOCALES) {
  const isSource = loc === sourceLocale;
  const isDefault = loc === defaultLocale;
  const slug = isDefault ? pageKey : `${pageKey}-${loc}`;
  const pageTitle = isSource ? title : `[TODO: ${loc}] ${title}`;
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
description: "${isSource ? `Description for ${title}` : `[TODO: ${loc}] Description for ${title}`}"
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
try {
  console.log(`🔄 Registering nav_${pageKey} translation key...`);
  execSync(
    `node scripts/i18n-add.mjs --category=nav --key=${pageKey} --${sourceLocale}="${title}"`,
    { stdio: 'inherit' }
  );
} catch (e) {
  console.warn('⚠️ Warning: Failed to auto-register nav key:', e.message);
}
