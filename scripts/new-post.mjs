#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { resolveImageOption, placeArtworkFor } from './lib/image-reference.mjs';
import { postStub } from './lib/content-stub.mjs';
import { resolveSlug } from './lib/slug.mjs';
import {
  escapeRegex,
  parseFrontmatter,
  stringifyFrontmatter,
} from './lib/frontmatter.mjs';

export { parseFrontmatter, stringifyFrontmatter };

/**
 * Replaces the first markdown heading of a body with a new title.
 *
 * The heading of a scaffolded entry always mirrors its frontmatter title, so
 * the `--update` flow and the clone flow can keep the two in sync.
 */
export function replaceLeadingHeading(body, title) {
  return body.replace(/^\s*#\s+.*$/m, `# ${title}`);
}

/**
 * The post's cover is referenced relative to the entry file, so Astro resolves
 * and optimizes it (see `scripts/lib/image-reference.mjs`).
 */
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
  let customImage = '';
  let noImage = false;
  let customCategories = null;
  let customTags = null;
  let cloneFrom = '';
  const titlesByLocale = {};
  const descriptionsByLocale = {};
  const slugsByLocale = {};
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
    } else if (arg.startsWith('--clone-from=')) {
      cloneFrom = arg.slice(13);
    } else if (arg.startsWith('--slug:')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const loc = arg.slice(7, eqIdx);
        slugsByLocale[loc] = arg.slice(eqIdx + 1);
      }
    } else if (arg.startsWith('--title=')) {
      customTitle = arg.slice(8);
    } else if (arg.startsWith('--desc=') || arg.startsWith('--description=')) {
      customDesc = arg.startsWith('--desc=') ? arg.slice(7) : arg.slice(14);
      hasCustomDesc = true;
    } else if (arg.startsWith('--date=') || arg.startsWith('--publishedAt=')) {
      customDate = arg.startsWith('--date=') ? arg.slice(7) : arg.slice(14);
    } else if (arg.startsWith('--image=')) {
      const raw = arg.slice(8).trim();
      // The path is relative to the content file, the way Astro's `image()`
      // helper resolves it. `none` opts out of a group-specific cover, and
      // the post then uses the shared artwork.
      const resolved = resolveImageOption(raw, '');
      if (resolved === null) {
        console.error(
          `❌ Invalid --image value: "${raw}". Use a path relative to the content file such as "cover.png", or "none" to opt out.`
        );
        process.exit(1);
      }
      noImage = resolved === '';
      customImage = resolved;
    } else if (arg.startsWith('--categories=') || arg.startsWith('--category=')) {
      const rawValue = arg.slice(arg.startsWith('--categories=') ? 13 : 11);
      const values = rawValue
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      customCategories = [...(customCategories ?? []), ...values];
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
    } else if (arg.startsWith('--tags=') || arg.startsWith('--tag=')) {
      const rawValue = arg.slice(arg.startsWith('--tags=') ? 7 : 6);
      const values = rawValue
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      customTags = [...(customTags ?? []), ...values];
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
  pnpm run new:post <group-slug> [options]

Creation Options:
  --collection=<name>          Content collection name (default: "blog")
  --title="<title>"            Title for the post (source locale)
  --desc="<description>"       Description for the post
  --from=<locale>              Source locale of the article (default: the base locale)
  --clone-from=<group>         Reuse the body of an existing article group
  --publish / --draft=false    Publish immediately across all locales (default marks non-source as draft)
  --category="a,b"             Blog category keys (repeatable, comma-separated)
  --tags="x,y"                 Blog tag keys (repeatable, comma-separated)
  --image=cover.png            Featured image, referenced relative to the content file
  --image=none                 Use the shared hero artwork instead of a group-specific cover
  --slug:<locale>="<slug>"     Native slug of one language (default: <group> for the source locale)

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

    // A custom cover has to sit next to the content, so it is copied into the
    // group folder before the frontmatter is rewritten.
    if (customImage) {
      const placed = placeArtworkFor({
        value: customImage,
        rootDir,
        groupDir: targetDir,
        group: groupSlug,
      });
      if (!placed) {
        console.warn(
          `⚠️ Artwork "${customImage}" was not found next to the content (${path.relative(rootDir, targetDir)}) or in the project root.`
        );
        console.warn(`   The group artwork "./${groupSlug}.png" is used instead.`);
        customImage = '';
      } else {
        customImage = placed;
      }
    }
    const sourceTitle = customTitle || groupSlug.replace(/-/g, ' ');

    for (const loc of LOCALES) {
      const filePath = path.join(targetDir, `${loc}.mdx`);
      const isSource = loc === sourceLocale;

      let fmData = {};
      let body = '';

      if (fs.existsSync(filePath)) {
        const parsed = parseFrontmatter(fs.readFileSync(filePath, 'utf-8'));
        fmData = parsed.data;
        body = parsed.body;
      } else {
        const slug = resolveSlug(loc, groupSlug, sourceLocale, defaultLocale, slugsByLocale);
        fmData = {
          title: `[TODO: ${loc}] ${sourceTitle}`,
          slug,
          description: `[TODO: ${loc}] Description for ${groupSlug}`,
          publishedAt: customDate || today,
          draft: !isSource,
        };
        body = `\n# ${fmData.title}\n\n${postStub(loc)}`;
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

      // Taxonomy and featured image resolution
      if (noImage) {
        delete fmData.image;
      } else if (customImage) {
        fmData.image = customImage;
      }
      if (customCategories && customCategories.length > 0) {
        fmData.categories = customCategories;
      }
      if (customTags && customTags.length > 0) {
        fmData.tags = customTags;
      }

      // Draft resolution
      if (hasDraftArg) {
        fmData.draft = !publishAll;
      }

      // Slug resolution
      if (slugsByLocale[loc]) {
        fmData.slug = slugsByLocale[loc];
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
  // A custom cover is copied into the group folder, because the frontmatter
  // reference is relative to the entry file. This runs before the group
  // folder is created, so a missing artwork leaves nothing behind.
  if (customImage) {
    const placed = placeArtworkFor({
      value: customImage,
      rootDir,
      groupDir: targetDir,
      group: groupSlug,
    });
    if (!placed) {
      console.warn(
        `⚠️ Artwork "${customImage}" was not found next to the content (${path.relative(rootDir, targetDir)}) or in the project root.`
      );
      console.warn(`   The group artwork "./${groupSlug}.png" is used instead.`);
      customImage = '';
    } else {
      customImage = placed;
    }
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const sourceTitle = customTitle || groupSlug.replace(/-/g, ' ');

  // `--clone-from` reuses the body of an existing article. Only the source
  // locale gets that copy; every other language starts from its own stub.
  let clonedBody = '';
  if (cloneFrom) {
    const cloneDir = path.join(colDir, cloneFrom);
    const cloneFile = ['.mdx', '.md']
      .map((extension) => path.join(cloneDir, `${sourceLocale}${extension}`))
      .find((candidate) => fs.existsSync(candidate));

    if (!cloneFile) {
      console.error(
        `❌ No article group "${cloneFrom}" with a "${sourceLocale}" entry in ${path.relative(rootDir, colDir)}.`
      );
      process.exit(1);
    }

    clonedBody = fs
      .readFileSync(cloneFile, 'utf-8')
      .replace(/^---[\s\S]*?---/, '')
      .trim();
  }

  // Every group owns its cover. The artwork is drawn from code by
  // `assets:generate`, so the referenced file always exists once it is run.
  // `--image=none` opts out, and the post falls back to the shared artwork.
  const defaultGroupImage = ['blog', 'pages'].includes(collection)
    ? `./${groupSlug}.png`
    : '';
  const groupImage = noImage ? '' : customImage || defaultGroupImage;

  for (const loc of LOCALES) {
    const isSource = loc === sourceLocale;
    const isDraft = hasDraftArg ? !publishAll : !isSource;
    const slug = resolveSlug(loc, groupSlug, sourceLocale, defaultLocale, slugsByLocale);

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

    // Every entry starts with a body in its own language, and the heading of
    // the body always mirrors the frontmatter title.
    const body = isSource && clonedBody
      ? replaceLeadingHeading(clonedBody, title)
      : `\n# ${title}\n\n${postStub(loc)}`;

    const taxonomyLines = [
      groupImage ? `image: "${groupImage}"` : '',
      customCategories?.length
        ? `categories: [${customCategories.map((item) => `"${item}"`).join(', ')}]`
        : '',
      customTags?.length ? `tags: [${customTags.map((item) => `"${item}"`).join(', ')}]` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const content = `---
title: "${title}"
slug: "${slug}"
description: "${description}"
${taxonomyLines ? `${taxonomyLines}\n` : ''}publishedAt: ${dateValue}
draft: ${isDraft}
---
${body}
`;

    fs.writeFileSync(path.join(targetDir, `${loc}.mdx`), content, 'utf-8');
  }

  console.log(`✅ Created synchronized article group in src/content/${collection}/${groupSlug}/ across locales: ${LOCALES.join(', ')}`);
  console.log(`ℹ️ Source locale: "${sourceLocale}" (title: "${sourceTitle}")`);
  console.log(
    groupImage
      ? `ℹ️ Hero background: "${groupImage}"`
      : 'ℹ️ Hero background: shared artwork (--image=none)'
  );

  // Draw the artwork for the new group, so its cover is never broken.
  try {
    execSync('node scripts/generate-assets.mjs', { stdio: 'inherit' });
  } catch (e) {
    console.warn('⚠️ Warning: Failed to generate the cover artwork:', e.message);
    if (groupImage) {
      console.warn(`   Run "pnpm run assets:generate" to create "${groupImage}".`);
    }
  }

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
