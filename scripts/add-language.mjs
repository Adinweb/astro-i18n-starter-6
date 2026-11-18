#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { contentStub, stripLeadingHeading } from './lib/content-stub.mjs';
import { compileMessages } from './lib/compile-messages.mjs';
import { localeCodeError } from './lib/validate.mjs';
import { parseFrontmatter, stringifyFrontmatter } from './lib/frontmatter.mjs';
import { readLocaleConfig, writeLocaleConfig } from './lib/locales.mjs';
import {
  readClientMessages,
  readCoreMessages,
  readMergedMessages,
  stripSchema,
  writeClientMessages,
} from './lib/merge-messages.mjs';

const args = process.argv.slice(2);
const langCode = args.find((a) => !a.startsWith('--'));
let langName = '';
let dir = 'ltr';
let contentOption = null;
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
  else if (
    arg === '--with-content' ||
    arg === '--create-content' ||
    arg === '--content=yes' ||
    arg === '--content=true'
  ) {
    contentOption = true;
  } else if (
    arg === '--no-content' ||
    arg === '--without-content' ||
    arg === '--content=no' ||
    arg === '--content=false'
  ) {
    contentOption = false;
  }
}

if (!langCode) {
  console.error(
    'Usage: npm run i18n:add-lang -- <locale-code> [--name="<Display Name>"] [--dir="ltr|rtl"] [--from=<source-locale>] [--with-content|--no-content] [--draft=true|false]'
  );
  process.exit(1);
}

const localeError = localeCodeError(langCode);
if (localeError) {
  console.error(localeError);
  process.exit(1);
}

const defaultNames = {
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands',
  pt: 'Português',
  tr: 'Türkçe',
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

const localeConfig = readLocaleConfig(rootDir);
const existingLocales = [...localeConfig.locales];
const defaultBaseLocale = localeConfig.defaultLocale || 'en';

async function resolveContentOptions() {
  let shouldCreate = contentOption;
  let source = fromLocale;

  if (source && !existingLocales.includes(source)) {
    console.warn(
      `⚠️ Warning: Specified source locale "${source}" not found in [${existingLocales.join(', ')}]. Falling back to "${defaultBaseLocale}".`
    );
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
      source = chosen && existingLocales.includes(chosen) ? chosen : defaultBaseLocale;
    }
  } finally {
    rl.close();
  }

  return { shouldCreate, source: source || defaultBaseLocale };
}

const { shouldCreate: shouldPopulateContent, source: sourceLocale } = await resolveContentOptions();

// 1. Update client/locales.json
const fontVar =
  langCode === 'ar'
    ? 'var(--font-ar)'
    : dir === 'rtl'
      ? 'var(--font-fa)'
      : 'var(--font-sans)';

let localesChanged = false;
if (!localeConfig.locales.includes(langCode)) {
  localeConfig.locales.push(langCode);
  localesChanged = true;
}
if (!localeConfig.metadata[langCode]) {
  localeConfig.metadata[langCode] = {
    dir,
    htmlLang: langCode,
    name: langName,
    fontFamily: fontVar,
  };
  localesChanged = true;
}
if (localesChanged) {
  writeLocaleConfig(localeConfig, rootDir);
  console.log(`✅ Updated client/locales.json with "${langCode}" (${langName}, dir=${dir})`);
}

// 2. Create or restore client/messages/<locale>.json
const coreDictForTarget = stripSchema(readCoreMessages(langCode, rootDir));
const hasCoreLocale = Object.keys(coreDictForTarget).length > 0;
const sourceMergedDict = hasCoreLocale
  ? stripSchema(readClientMessages(sourceLocale, rootDir))
  : stripSchema(readMergedMessages(sourceLocale, rootDir));

const targetDictPath = path.join(rootDir, 'client', 'messages', `${langCode}.json`);
const frTranslations = {
  common_back_home: 'Retour à l’accueil',
  common_back_to_blog: 'Retour au blog',
  common_change_language: 'Changer de langue',
  common_close: 'Fermer',
  common_default_version_hint: 'Ou consulter cette page en {language} :',
  common_go_default_version: 'Aller à la version {language}',
  common_no_results: 'Aucun résultat trouvé.',
  common_not_found_desc: 'La page que vous recherchez n’existe pas ou a été déplacée.',
  common_not_found_title: 'Page non trouvée',
  common_press_esc: 'pour fermer',
  common_published_on: 'Publié le',
  common_search_placeholder: 'Rechercher des articles et des pages...',
  common_search_results_count: '{count} résultat(s) trouvé(s).',
  common_type_to_search: 'Tapez pour rechercher...',
  nav_about: 'À propos',
  nav_blog: 'Blog',
  nav_home: 'Accueil',
};

const newClientEntries = {};
for (const [key, val] of Object.entries(sourceMergedDict)) {
  if (key.startsWith('$')) continue;
  if (hasCoreLocale && key in coreDictForTarget) continue;
  if (key === 'items_count') {
    newClientEntries[key] = [
      {
        declarations: ['input count', 'local countPlural = count: plural'],
        selectors: ['countPlural'],
        match:
          langCode === 'fr'
            ? {
                'countPlural=one': '{count} élément',
                'countPlural=*': '{count} éléments',
              }
            : langCode === 'de'
              ? {
                  'countPlural=one': '{count} Element',
                  'countPlural=*': '{count} Elemente',
                }
              : {
                  'countPlural=one': `[TODO: ${langCode}] {count} item`,
                  'countPlural=*': `[TODO: ${langCode}] {count} items`,
                },
      },
    ];
  } else if (key === 'position_ordinal') {
    newClientEntries[key] = [
      {
        declarations: ['input pos', 'local posOrdinal = pos: plural type=ordinal'],
        selectors: ['posOrdinal'],
        match:
          langCode === 'fr'
            ? {
                'posOrdinal=one': '{pos}er',
                'posOrdinal=*': '{pos}e',
              }
            : langCode === 'de'
              ? {
                  'posOrdinal=*': '{pos}.',
                }
              : {
                  'posOrdinal=*': `[TODO: ${langCode}] #{pos}`,
                },
      },
    ];
  } else if (langCode === 'fr' && frTranslations[key]) {
    newClientEntries[key] = frTranslations[key];
  } else if (typeof val === 'string') {
    newClientEntries[key] = `[TODO: ${langCode}] ${val}`;
  } else if (Array.isArray(val)) {
    newClientEntries[key] = val.map((variant) => ({
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
    newClientEntries[key] = val;
  }
}

const archivedDictPath = path.join(rootDir, '.locale-archive', langCode, 'messages.json');
if (fs.existsSync(targetDictPath)) {
  console.log(
    `⏭️  client/messages/${langCode}.json already exists — keeping its existing translations.`
  );
  console.log('   Delete the file first if you want a freshly derived dictionary.');
} else if (fs.existsSync(archivedDictPath)) {
  fs.mkdirSync(path.dirname(targetDictPath), { recursive: true });
  fs.renameSync(archivedDictPath, targetDictPath);
  console.log(
    `✅ Restored client/messages/${langCode}.json from .locale-archive/${langCode}/messages.json`
  );
} else {
  writeClientMessages(langCode, newClientEntries, rootDir);
  console.log(
    `✅ Created client/messages/${langCode}.json` +
      (hasCoreLocale
        ? ` (core keys served from messages/core/${langCode}.json)`
        : ` (derived from "${sourceLocale}")`)
  );
}

// 3. Populate missing content collection files
if (shouldPopulateContent) {
  console.log(
    `\n📄 Creating content files for existing pages and posts using source language "${sourceLocale}"...`
  );
  const contentDir = path.join(rootDir, 'src', 'content');
  if (fs.existsSync(contentDir)) {
    const collections = fs
      .readdirSync(contentDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const collection of collections) {
      const colDir = path.join(contentDir, collection);
      const groups = fs
        .readdirSync(colDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const group of groups) {
        const groupDir = path.join(colDir, group);
        const targetFile = path.join(groupDir, `${langCode}.mdx`);
        const existingTarget = ['mdx', 'md'].find((ext) =>
          fs.existsSync(path.join(groupDir, `${langCode}.${ext}`))
        );
        if (!existingTarget) {
          const archivedCandidate = ['mdx', 'md']
            .map((ext) => ({
              ext,
              file: path.join(
                rootDir,
                '.locale-archive',
                langCode,
                'content',
                collection,
                group,
                `${langCode}.${ext}`
              ),
            }))
            .find((entry) => fs.existsSync(entry.file));
          if (archivedCandidate) {
            fs.renameSync(
              archivedCandidate.file,
              path.join(groupDir, `${langCode}.${archivedCandidate.ext}`)
            );
            console.log(
              `  ↩ Restored archived content: src/content/${collection}/${group}/${langCode}.${archivedCandidate.ext}`
            );
            continue;
          }

          const preferredSourceFile = path.join(groupDir, `${sourceLocale}.mdx`);
          const fallbackSourceFile = path.join(groupDir, `${defaultBaseLocale}.mdx`);
          const anyMdx = fs.readdirSync(groupDir).find((f) => f.endsWith('.mdx') || f.endsWith('.md'));
          const sourceCandidate = fs.existsSync(preferredSourceFile)
            ? preferredSourceFile
            : fs.existsSync(fallbackSourceFile)
              ? fallbackSourceFile
              : anyMdx
                ? path.join(groupDir, anyMdx)
                : null;

          let title = group;
          const slug = group === 'home' ? '' : `${group}-${langCode}`;
          let description = '';
          let body = contentStub(langCode);
          let bodyCopiedFromSource = false;
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
              const copied = stripLeadingHeading(bodyStripped).trim();
              if (copied) {
                body = copied;
                bodyCopiedFromSource = true;
              }
            }
          }

          const pageTitle =
            langCode === 'fr'
              ? group === 'home'
                ? 'Bienvenue sur Astro i18n'
                : group === 'about'
                  ? 'À propos de nous'
                  : title
              : `[TODO: ${langCode}] ${title}`;
          const pageDescription = !description
            ? ''
            : description.startsWith('[TODO:')
              ? description
              : langCode === 'fr' && (group === 'home' || group === 'about')
                ? description
                : `[TODO: ${langCode}] ${description}`;
          const entryIsDraft =
            isDraft || pageTitle.includes('[TODO') || pageDescription.includes('[TODO');

          const fmRecord = {
            title: pageTitle,
            slug,
            ...(pageDescription ? { description: pageDescription } : {}),
            ...(sourceFm.image ? { image: sourceFm.image } : {}),
            ...(collection === 'pages'
              ? {
                  ...(sourceFm.template !== undefined ? { template: sourceFm.template } : {}),
                  ...(sourceFm.hero !== undefined ? { hero: sourceFm.hero } : {}),
                  ...(sourceFm.container !== undefined ? { container: sourceFm.container } : {}),
                  ...(sourceFm.flushTop !== undefined ? { flushTop: sourceFm.flushTop } : {}),
                }
              : {}),
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
          const untranslatedNote = bodyCopiedFromSource
            ? `{/* TODO(${langCode}): translate this body — it is still ${path.basename(sourceCandidate ?? sourceLocale, '.mdx')} copy. */}\n\n`
            : '';
          const mdxContent = stringifyFrontmatter(fmRecord, `\n${untranslatedNote}${cleanBody}\n`);
          fs.writeFileSync(targetFile, mdxContent, 'utf-8');
          if (!isDraft && entryIsDraft) {
            console.warn(
              `  ⚠️ src/content/${collection}/${group}/${langCode}.mdx stays a draft: its title or description still contains a placeholder.`
            );
          }
          console.log(
            `  + Created content: src/content/${collection}/${group}/${langCode}.mdx (from "${sourceCandidate ? path.basename(sourceCandidate, '.mdx') : 'default'}")`
          );
        }
      }
    }
  }
} else {
  console.log('\n⏭️ Skipped creating content files for existing content as requested.');
  console.log(`💡 You can create "${langCode}.mdx" files under src/content/ whenever you are ready.`);
}

// Clean up processed archive folder if present
const langArchiveDir = path.join(rootDir, '.locale-archive', langCode);
if (fs.existsSync(langArchiveDir)) {
  fs.rmSync(langArchiveDir, { recursive: true, force: true });
}
const archiveRoot = path.join(rootDir, '.locale-archive');
if (fs.existsSync(archiveRoot) && fs.readdirSync(archiveRoot).length === 0) {
  fs.rmSync(archiveRoot, { recursive: true, force: true });
}

// 4. Compile Paraglide
console.log('\n🔄 Compiling Paraglide messages...');
try {
  compileMessages(rootDir);
  console.log(`🎉 Language "${langCode}" added successfully!`);
} catch (e) {
  console.error('❌ Failed to compile messages:', e.message);
  process.exit(1);
}
