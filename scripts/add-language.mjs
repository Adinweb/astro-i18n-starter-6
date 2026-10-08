#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const langCode = args.find((a) => !a.startsWith('--'));
let langName = '';
let dir = 'ltr';
let contentOption = null; // null: prompt user, true: create content, false: skip content

for (const arg of args) {
  if (arg.startsWith('--name=')) langName = arg.slice(7);
  else if (arg.startsWith('--dir=')) dir = arg.slice(6);
  else if (arg === '--with-content' || arg === '--create-content' || arg === '--content=yes' || arg === '--content=true') {
    contentOption = true;
  } else if (arg === '--no-content' || arg === '--without-content' || arg === '--content=no' || arg === '--content=false') {
    contentOption = false;
  }
}

if (!langCode) {
  console.error('Usage: npm run i18n:add-lang <locale-code> [--name="<Display Name>"] [--dir="ltr|rtl"] [--with-content|--no-content]');
  process.exit(1);
}

const defaultNames = {
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  ar: 'العربية',
  ru: 'Русский',
  ja: '日本語',
  zh: '中文',
};

langName = langName || defaultNames[langCode] || langCode.toUpperCase();
if (['ar', 'fa', 'he', 'ur'].includes(langCode)) {
  dir = 'rtl';
}

const rootDir = process.cwd();
console.log(`🌍 Adding new language: "${langCode}" (${langName}, dir=${dir})...\n`);

// Helper to ask confirmation if not specified by flag
async function confirmExistingContent() {
  if (contentOption !== null) {
    return contentOption;
  }

  // Non-interactive fallback
  if (!process.stdin.isTTY) {
    console.log('ℹ️ Non-interactive mode: defaulting to creating content files for existing content.');
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `❓ Do you want to create content files for already existing content (pages and blog posts) in "${langCode}"? (y/n) [default: y]: `,
      (answer) => {
        rl.close();
        const trimmed = answer.trim().toLowerCase();
        if (trimmed === 'n' || trimmed === 'no') {
          resolve(false);
        } else {
          resolve(true);
        }
      }
    );
  });
}

// 1. Update project.inlang/settings.json
const inlangPath = path.join(rootDir, 'project.inlang', 'settings.json');
const inlangSettings = JSON.parse(fs.readFileSync(inlangPath, 'utf-8'));
if (!inlangSettings.locales.includes(langCode)) {
  inlangSettings.locales.push(langCode);
  fs.writeFileSync(inlangPath, JSON.stringify(inlangSettings, null, 2) + '\n', 'utf-8');
  console.log(`✅ Added "${langCode}" to project.inlang/settings.json`);
}

// 2. Create messages/<locale>.json
const enDictPath = path.join(rootDir, 'messages', 'en.json');
const targetDictPath = path.join(rootDir, 'messages', `${langCode}.json`);
const enDict = JSON.parse(fs.readFileSync(enDictPath, 'utf-8'));

const frTranslations = {
  common_back_home: 'Retour à l’accueil',
  common_back_to_blog: 'Retour au blog',
  common_change_language: 'Changer de langue',
  common_close: 'Fermer',
  common_english_version_hint: 'Ou consulter cette page en anglais :',
  common_go_english_version: 'Aller à la version anglaise',
  common_no_results: 'Aucun résultat trouvé.',
  common_not_found_desc: 'La page que vous recherchez n’existe pas ou a été déplacée.',
  common_not_found_title: 'Page non trouvée',
  common_press_esc: 'pour fermer',
  common_published_on: 'Publié le',
  common_read_more: 'En savoir plus',
  common_search_placeholder: 'Rechercher des articles et des pages...',
  common_site_title: 'Astro i18n',
  common_type_to_search: 'Tapez pour rechercher...',
  nav_about: 'À propos',
  nav_blog: 'Blog',
  nav_home: 'Accueil',
};

const newDict = {
  $schema: 'https://inlang.com/schema/inlang-message-format',
};

for (const [key, val] of Object.entries(enDict)) {
  if (key.startsWith('$')) continue;
  if (key === 'items_count') {
    newDict[key] = [
      {
        declarations: ['input count', 'local countPlural = count: plural'],
        selectors: ['countPlural'],
        match: {
          'countPlural=one': '{count} élément',
          'countPlural=*': '{count} éléments',
        },
      },
    ];
  } else if (key === 'position_ordinal') {
    newDict[key] = [
      {
        declarations: ['input pos', 'local posOrdinal = pos: plural type=ordinal'],
        selectors: ['posOrdinal'],
        match: {
          'posOrdinal=one': '{pos}er',
          'posOrdinal=*': '{pos}e',
        },
      },
    ];
  } else if (langCode === 'fr' && frTranslations[key]) {
    newDict[key] = frTranslations[key];
  } else if (typeof val === 'string') {
    newDict[key] = `[TODO: ${langCode}] ${val}`;
  } else {
    newDict[key] = val;
  }
}

fs.writeFileSync(targetDictPath, JSON.stringify(newDict, null, 2) + '\n', 'utf-8');
console.log(`✅ Created messages/${langCode}.json`);

// 3. Update src/i18n/locales.ts (SSOT for LOCALES and metadata)
const localesPath = path.join(rootDir, 'src', 'i18n', 'locales.ts');
let localesCode = fs.readFileSync(localesPath, 'utf-8');

if (!localesCode.includes(`'${langCode}'`)) {
  localesCode = localesCode.replace(
    /export const LOCALES = \[(.*?)\] as const;/s,
    (m, p1) => {
      const existing = p1
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      existing.push(`'${langCode}'`);
      return `export const LOCALES = [${existing.join(', ')}] as const;`;
    }
  );
  console.log(`✅ Updated LOCALES in src/i18n/locales.ts with "${langCode}"`);
}

if (!localesCode.includes(`${langCode}:`)) {
  const fontVar = dir === 'rtl' ? 'var(--font-fa)' : 'var(--font-sans)';
  const newMetaBlock = `  ${langCode}: {
    dir: '${dir}',
    htmlLang: '${langCode}',
    name: '${langName}',
    fontFamily: '${fontVar}',
  },\n} satisfies Record<Locale, LocaleMeta>;`;

  localesCode = localesCode.replace(/}\s*satisfies Record<Locale, LocaleMeta>;/, newMetaBlock);
  console.log(`✅ Updated LOCALE_METADATA in src/i18n/locales.ts with metadata for "${langCode}"`);
}

fs.writeFileSync(localesPath, localesCode, 'utf-8');

// Also update src/i18n/config.ts if it defines LOCALES directly
const configPath = path.join(rootDir, 'src', 'i18n', 'config.ts');
if (fs.existsSync(configPath)) {
  let configCode = fs.readFileSync(configPath, 'utf-8');
  if (configCode.includes('export const LOCALES = [') && !configCode.includes(`'${langCode}'`)) {
    configCode = configCode.replace(
      /export const LOCALES = \[(.*?)\] as const;/s,
      (m, p1) => {
        const existing = p1.split(',').map((s) => s.trim()).filter(Boolean);
        existing.push(`'${langCode}'`);
        return `export const LOCALES = [${existing.join(', ')}] as const;`;
      }
    );
    fs.writeFileSync(configPath, configCode, 'utf-8');
    console.log(`✅ Updated src/i18n/config.ts with "${langCode}"`);
  }
}

// 4. Confirmation and population of missing content collection files
const shouldPopulateContent = await confirmExistingContent();

if (shouldPopulateContent) {
  console.log(`\n📄 Creating content files for existing pages and posts...`);
  const contentDir = path.join(rootDir, 'src', 'content');
  if (fs.existsSync(contentDir)) {
    const collections = fs.readdirSync(contentDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const collection of collections) {
      const colDir = path.join(contentDir, collection);
      const groups = fs.readdirSync(colDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const group of groups) {
        const groupDir = path.join(colDir, group);
        const targetFile = path.join(groupDir, `${langCode}.mdx`);
        if (!fs.existsSync(targetFile)) {
          const enFile = path.join(groupDir, 'en.mdx');
          let title = group;
          let slug = group === 'home' ? '' : `${group}-${langCode}`;
          let description = `Description for ${group}`;

          if (fs.existsSync(enFile)) {
            const enContent = fs.readFileSync(enFile, 'utf-8');
            const tMatch = enContent.match(/title:\s*"([^"]+)"/);
            if (tMatch) title = tMatch[1];
          }

          const mdxContent = `---
title: "${langCode === 'fr' ? (group === 'home' ? 'Bienvenue sur Astro i18n' : group === 'about' ? 'À propos de nous' : title) : `[TODO: ${langCode}] ${title}`}"
slug: "${slug}"
description: "${description}"
${collection === 'blog' ? 'publishedAt: ' + new Date().toISOString().split('T')[0] : ''}
draft: false
---

# ${langCode === 'fr' ? (group === 'home' ? 'Bienvenue sur Astro i18n' : group === 'about' ? 'À propos de nous' : title) : title}

Contenu à venir...
`;
          fs.writeFileSync(targetFile, mdxContent, 'utf-8');
          console.log(`  + Created content: src/content/${collection}/${group}/${langCode}.mdx`);
        }
      }
    }
  }
} else {
  console.log(`\n⏭️ Skipped creating content files for existing content as requested.`);
  console.log(`💡 You can create "${langCode}.mdx" files under src/content/ whenever you are ready.`);
}

// 5. Compile Paraglide
console.log('\n🔄 Compiling Paraglide messages...');
try {
  execSync('npm run messages:compile', { stdio: 'inherit' });
  console.log(`🎉 Language "${langCode}" added successfully!`);
} catch (e) {
  console.error('❌ Failed to compile messages:', e.message);
  process.exit(1);
}

