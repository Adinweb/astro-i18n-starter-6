#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { contentStub, stripLeadingHeading } from './lib/content-stub.mjs';
import { compileMessages } from './lib/compile-messages.mjs';
import {
  escapeRegex,
  parseFrontmatter,
  stringifyFrontmatter,
} from './lib/frontmatter.mjs';

const args = process.argv.slice(2);
const langCode = args.find((a) => !a.startsWith('--'));
let langName = '';
let dir = 'ltr';
let contentOption = null; // null: prompt user, true: create content, false: skip content
let fromLocale = '';
let isDraft = true;

for (const arg of args) {
  if (arg.startsWith('--name=')) langName = arg.slice(7);
  else if (arg.startsWith('--dir=')) dir = arg.slice(6);
  else if (arg.startsWith('--from=')) fromLocale = arg.slice(7);
  else if (arg.startsWith('--source=')) fromLocale = arg.slice(9);
  else if (arg.startsWith('--source-lang=')) fromLocale = arg.slice(14);
  else if (arg === '--draft=true' || arg === '--draft') isDraft = true;
  else if (arg === '--draft=false' || arg === '--publish' || arg === '--no-draft') isDraft = false;
  else if (arg === '--with-content' || arg === '--create-content' || arg === '--content=yes' || arg === '--content=true') {
    contentOption = true;
  } else if (arg === '--no-content' || arg === '--without-content' || arg === '--content=no' || arg === '--content=false') {
    contentOption = false;
  }
}

if (!langCode) {
  console.error('Usage: pnpm run i18n:add-lang <locale-code> [--name="<Display Name>"] [--dir="ltr|rtl"] [--from=<source-locale>] [--with-content|--no-content] [--draft=true|false]');
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

const inlangPath = path.join(rootDir, 'project.inlang', 'settings.json');
const inlangSettings = JSON.parse(fs.readFileSync(inlangPath, 'utf-8'));
const existingLocales = [...inlangSettings.locales];
const defaultBaseLocale = inlangSettings.baseLocale || 'en';

// Helper to prompt user or resolve options
async function resolveContentOptions() {
  let shouldCreate = contentOption;
  let source = fromLocale;

  if (source && !existingLocales.includes(source)) {
    console.warn(`⚠️ Warning: Specified source locale "${source}" not found in [${existingLocales.join(', ')}]. Falling back to "${defaultBaseLocale}".`);
    source = defaultBaseLocale;
  }

  if (!process.stdin.isTTY) {
    if (shouldCreate === null) {
      console.log('ℹ️ Non-interactive mode: defaulting to creating content files for existing content.');
      shouldCreate = true;
    }
    return { shouldCreate, source: source || defaultBaseLocale };
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q) => new Promise((resolve) => rl.question(q, resolve));

  try {
    if (shouldCreate === null) {
      const answer = await question(
        `❓ Do you want to create content files for already existing content (pages and blog posts) in "${langCode}"? (y/n) [default: y]: `
      );
      const trimmed = answer.trim().toLowerCase();
      shouldCreate = !(trimmed === 'n' || trimmed === 'no');
    }

    if (shouldCreate && !source) {
      const answer = await question(
        `❓ Which existing language should be used as template source to auto-generate content? (available: ${existingLocales.join(', ')}) [default: ${defaultBaseLocale}]: `
      );
      const chosen = answer.trim();
      if (chosen && existingLocales.includes(chosen)) {
        source = chosen;
      } else {
        source = defaultBaseLocale;
      }
    }
  } finally {
    rl.close();
  }

  return { shouldCreate, source: source || defaultBaseLocale };
}

const { shouldCreate: shouldPopulateContent, source: sourceLocale } = await resolveContentOptions();

// 1. Update project.inlang/settings.json
if (!inlangSettings.locales.includes(langCode)) {
  inlangSettings.locales.push(langCode);
  fs.writeFileSync(inlangPath, JSON.stringify(inlangSettings, null, 2) + '\n', 'utf-8');
  console.log(`✅ Added "${langCode}" to project.inlang/settings.json`);
}

// 2. Create messages/<locale>.json from sourceLocale dictionary
const sourceDictPath = fs.existsSync(path.join(rootDir, 'messages', `${sourceLocale}.json`))
  ? path.join(rootDir, 'messages', `${sourceLocale}.json`)
  : path.join(rootDir, 'messages', 'en.json');
const targetDictPath = path.join(rootDir, 'messages', `${langCode}.json`);
const sourceDict = JSON.parse(fs.readFileSync(sourceDictPath, 'utf-8'));

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
  common_search_placeholder: 'Rechercher des articles et des pages...',
  common_type_to_search: 'Tapez pour rechercher...',
  nav_about: 'À propos',
  nav_blog: 'Blog',
  nav_home: 'Accueil',
};

const newDict = {
  $schema: 'https://inlang.com/schema/inlang-message-format',
};

for (const [key, val] of Object.entries(sourceDict)) {
  if (key.startsWith('$')) continue;
  if (key === 'items_count') {
    newDict[key] = [
      {
        declarations: ['input count', 'local countPlural = count: plural'],
        selectors: ['countPlural'],
        match:
          langCode === 'fr'
            ? {
                'countPlural=one': '{count} élément',
                'countPlural=*': '{count} éléments',
              }
            : {
                'countPlural=one': `[TODO: ${langCode}] {count} item`,
                'countPlural=*': `[TODO: ${langCode}] {count} items`,
              },
      },
    ];
  } else if (key === 'position_ordinal') {
    newDict[key] = [
      {
        declarations: ['input pos', 'local posOrdinal = pos: plural type=ordinal'],
        selectors: ['posOrdinal'],
        match:
          langCode === 'fr'
            ? {
                'posOrdinal=one': '{pos}er',
                'posOrdinal=*': '{pos}e',
              }
            : {
                'posOrdinal=*': `[TODO: ${langCode}] #{pos}`,
              },
      },
    ];
  } else if (langCode === 'fr' && frTranslations[key]) {
    newDict[key] = frTranslations[key];
  } else if (typeof val === 'string') {
    newDict[key] = `[TODO: ${langCode}] ${val}`;
  } else if (Array.isArray(val)) {
    newDict[key] = val.map((variant) => ({
      ...variant,
      match: Object.fromEntries(
        Object.entries(variant?.match ?? {}).map(([k, text]) => [
          k,
          typeof text === 'string' && !text.startsWith('[TODO:')
            ? `[TODO: ${langCode}] ${text}`
            : text,
        ])
      ),
    }));
  } else {
    newDict[key] = val;
  }
}

fs.writeFileSync(targetDictPath, JSON.stringify(newDict, null, 2) + '\n', 'utf-8');
console.log(`✅ Created messages/${langCode}.json (derived from "${sourceLocale}")`);

// 3. Update src/i18n/locales.ts (SSOT for LOCALES and metadata)
const localesPath = path.join(rootDir, 'src', 'i18n', 'locales.ts');
let localesCode = fs.readFileSync(localesPath, 'utf-8');

if (!localesCode.includes(`'${langCode}'`)) {
  localesCode = localesCode.replace(
    /export const LOCALES = \[(.*?)\] as const;/s,
    (_match, p1) => {
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

const metaKeyPattern = new RegExp(`^\\s*['"]?${escapeRegex(langCode)}['"]?:\\s*\\{`, 'm');
if (!metaKeyPattern.test(localesCode)) {
  const fontVar =
    langCode === 'ar'
      ? 'var(--font-ar)'
      : dir === 'rtl'
        ? 'var(--font-fa)'
        : 'var(--font-sans)';
  const formattedKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(langCode)
    ? langCode
    : `'${langCode}'`;
  const escapedName = langName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const newMetaBlock = `  ${formattedKey}: {
    dir: '${dir}',
    htmlLang: '${langCode}',
    name: '${escapedName}',
    fontFamily: '${fontVar}',
  },\n} satisfies Record<Locale, LocaleMeta>;`;

  localesCode = localesCode.replace(/}\s*satisfies Record<Locale, LocaleMeta>;/, newMetaBlock);
  console.log(`✅ Updated LOCALE_METADATA in src/i18n/locales.ts with metadata for "${langCode}"`);
}

fs.writeFileSync(localesPath, localesCode, 'utf-8');

// 4. Confirmation and population of missing content collection files
if (shouldPopulateContent) {
  console.log(`\n📄 Creating content files for existing pages and posts using source language "${sourceLocale}"...`);
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
          // Resolve candidate source file
          const preferredSourceFile = path.join(groupDir, `${sourceLocale}.mdx`);
          const fallbackSourceFile = path.join(groupDir, `${defaultBaseLocale}.mdx`);
          const sourceCandidate = fs.existsSync(preferredSourceFile)
            ? preferredSourceFile
            : fs.existsSync(fallbackSourceFile)
            ? fallbackSourceFile
            : fs.readdirSync(groupDir).find((f) => f.endsWith('.mdx') || f.endsWith('.md'))
            ? path.join(groupDir, fs.readdirSync(groupDir).find((f) => f.endsWith('.mdx') || f.endsWith('.md')))
            : null;

          let title = group;
          const slug = group === 'home' ? '' : `${group}-${langCode}`;
          let description = `Description for ${group}`;
          let body = contentStub(langCode);
          let sourceFm = {};

          if (sourceCandidate && fs.existsSync(sourceCandidate)) {
            const rawContent = fs.readFileSync(sourceCandidate, 'utf-8');
            const parsed = parseFrontmatter(rawContent);
            sourceFm = parsed.data;
            if (typeof sourceFm.title === 'string' && sourceFm.title) title = sourceFm.title;
            if (typeof sourceFm.description === 'string' && sourceFm.description) {
              description = sourceFm.description;
            }

            const bodyStripped = parsed.body.trim();
            if (bodyStripped) {
              body = stripLeadingHeading(bodyStripped).trim() || contentStub(langCode);
            }
          }

          const pageTitle = langCode === 'fr'
            ? (group === 'home' ? 'Bienvenue sur Astro i18n' : group === 'about' ? 'À propos de nous' : title)
            : `[TODO: ${langCode}] ${title}`;
          const pageDescription = description.startsWith('[TODO:')
            ? description
            : langCode === 'fr' && (group === 'home' || group === 'about')
              ? description
              : `[TODO: ${langCode}] ${description}`;
          const entryIsDraft =
            isDraft || pageTitle.includes('[TODO') || pageDescription.includes('[TODO');

          const fmRecord = {
            title: pageTitle,
            slug,
            description: pageDescription,
            ...(sourceFm.image ? { image: sourceFm.image } : {}),
            ...(sourceFm.author ? { author: sourceFm.author } : {}),
            ...(Array.isArray(sourceFm.categories) && sourceFm.categories.length > 0
              ? { categories: sourceFm.categories }
              : {}),
            ...(Array.isArray(sourceFm.tags) && sourceFm.tags.length > 0
              ? { tags: sourceFm.tags }
              : {}),
            ...(collection === 'blog'
              ? {
                  publishedAt:
                    sourceFm.publishedAt || new Date().toISOString().split('T')[0],
                }
              : sourceFm.publishedAt
                ? { publishedAt: sourceFm.publishedAt }
                : {}),
            ...(sourceFm.updatedAt ? { updatedAt: sourceFm.updatedAt } : {}),
            draft: entryIsDraft,
          };

          const cleanBody = (body.startsWith('#') ? stripLeadingHeading(body) : body).trim();
          const mdxContent = stringifyFrontmatter(fmRecord, `\n${cleanBody}\n`);
          fs.writeFileSync(targetFile, mdxContent, 'utf-8');
          if (!isDraft && entryIsDraft) {
            console.warn(`  ⚠️ src/content/${collection}/${group}/${langCode}.mdx stays a draft: its title or description still contains a placeholder.`);
          }
          console.log(`  + Created content: src/content/${collection}/${group}/${langCode}.mdx (from "${sourceCandidate ? path.basename(sourceCandidate, '.mdx') : 'default'}")`);
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
  compileMessages(rootDir);
  console.log(`🎉 Language "${langCode}" added successfully!`);
} catch (e) {
  console.error('❌ Failed to compile messages:', e.message);
  process.exit(1);
}

