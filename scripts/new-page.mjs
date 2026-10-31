#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { resolveImageOption, placeArtworkFor } from './lib/image-reference.mjs';
import { contentStub } from './lib/content-stub.mjs';
import { resolveSlug } from './lib/slug.mjs';
import {
  escapeRegex,
  parseFrontmatter,
  stringifyFrontmatter,
} from './lib/frontmatter.mjs';

export { parseFrontmatter, stringifyFrontmatter };

/**
 * The page's hero artwork is referenced relative to the entry file, so Astro
 * resolves and optimizes it (see `scripts/lib/image-reference.mjs`).
 */
export function runCli() {
  const args = process.argv.slice(2);
  const pageKey = args.find((a) => !a.startsWith('--'));

  let title = pageKey || 'New Page';
  let hasCustomTitle = false;
  let customDesc = '';
  let hasCustomDesc = false;
  let fromLocale = '';
  let publishAll = false;
  let hasDraftArg = false;
  let isUpdate = false;
  let isSyncFrontmatter = false;
  let syncAll = false;
  let updateHeading = true;
  let skipNav = false;
  let customImage = '';
  let noImage = false;
  let heroOption = '';
  let layoutOption = '';
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
    } else if (arg.startsWith('--slug:')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const loc = arg.slice(7, eqIdx);
        slugsByLocale[loc] = arg.slice(eqIdx + 1);
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
      publishAll = false;
      hasDraftArg = true;
    } else if (arg === '--draft=false' || arg === '--no-draft' || arg === '--publish') {
      publishAll = true;
      hasDraftArg = true;
    } else if (arg === '--no-update-heading') {
      updateHeading = false;
    } else if (arg === '--no-nav' || arg === '--skip-nav') {
      skipNav = true;
    } else if (arg.startsWith('--image=')) {
      const raw = arg.slice(8).trim();
      // The path is relative to the content file, the way Astro's `image()`
      // helper resolves it. `none` opts out of a page-specific hero
      // background, and the page then uses the shared artwork.
      const resolved = resolveImageOption(raw, '');
      if (resolved === null) {
        console.error(
          `❌ Invalid --image value: "${raw}". Use a path relative to the content file such as "cover.png", or "none" to opt out.`
        );
        process.exit(1);
      }
      noImage = resolved === '';
      customImage = resolved;
    } else if (arg.startsWith('--hero=')) {
      const raw = arg.slice(7).trim();
      if (!['none', 'minimal', 'default'].includes(raw)) {
        console.error(
          `❌ Invalid --hero value: "${raw}". Expected "none", "minimal", or "default".`
        );
        process.exit(1);
      }
      heroOption = raw;
    } else if (arg.startsWith('--container=') || arg.startsWith('--layout=')) {
      const raw = arg.slice(arg.indexOf('=') + 1).trim();
      if (!['canvas', 'contained', 'prose'].includes(raw)) {
        console.error(
          `❌ Invalid --container value: "${raw}". Expected "canvas", "contained", or "prose".`
        );
        process.exit(1);
      }
      layoutOption = raw;
    }
  }

  if (!pageKey) {
    console.log(`
Usage:
  pnpm run new:page <page-key> [options]

Creation Options:
  --title="<title>"            Title for the page (source locale)
  --desc="<desc>"              Description for the page
  --from=<locale>              Source locale to branch from (default: baseLocale / en)
  --publish / --draft=false    Publish the source and locales with real titles/descriptions
  --draft / --draft=true       Create every locale as a draft
  --hero=none|minimal|default  Page hero presentation mode (default: default)
  --container=canvas|contained|prose  Page body container mode (default: contained, or canvas when --hero=none)
  --image=cover.png            Hero background, referenced relative to the content file
  --image=none                 Use the shared hero artwork instead of a page-specific one
  --slug:<locale>="<slug>"     Native slug of one language (default: <page-key> for the source locale)

Update / Sync Options:
  --update                     Update an existing page group without rewriting markdown body
  --sync-frontmatter           Synchronize frontmatter fields across all configured locale files
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

  const publishedLocales = [];
  const draftLocales = [];

  // -------------------------------------------------------------
  // UPDATE / SYNC-FRONTMATTER MODE
  // -------------------------------------------------------------
  if (fs.existsSync(targetDir) && (isUpdate || isSyncFrontmatter)) {
    console.log(`🔄 Updating existing page group: src/content/pages/${pageKey}/`);
    const updatedLocales = [];

    // A custom artwork has to sit next to the content, so it is copied into
    // the group folder before the frontmatter is rewritten.
    if (customImage) {
      const placed = placeArtworkFor({
        value: customImage,
        rootDir,
        groupDir: targetDir,
        group: pageKey,
      });
      if (!placed) {
        console.warn(
          `⚠️ Artwork "${customImage}" was not found next to the content (${path.relative(rootDir, targetDir)}) or in the project root.`
        );
        console.warn(`   The group artwork "./${pageKey}.png" is used instead.`);
        customImage = '';
      } else {
        customImage = placed;
      }
    }

    const sourceFilePath = path.join(targetDir, `${sourceLocale}.mdx`);
    const sourceFmData = fs.existsSync(sourceFilePath)
      ? parseFrontmatter(fs.readFileSync(sourceFilePath, 'utf-8')).data
      : null;

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
        // Missing locale file - create symmetrical fallback
        const slug = resolveSlug(loc, pageKey, sourceLocale, defaultLocale, slugsByLocale);
        fmData = {
          title: `[TODO: ${loc}] ${sourceFmData?.title || title}`,
          slug,
          description: `[TODO: ${loc}] ${sourceFmData?.description || `Description for ${title}`}`,
          hero: heroOption || sourceFmData?.hero || 'default',
          container: layoutOption || sourceFmData?.container || 'contained',
          draft: hasDraftArg ? !publishAll : !isSource,
        };
        body = `\n${contentStub(loc)}`;
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
        const hasPlaceholder = [fmData.title, fmData.description].some(
          (value) => typeof value === 'string' && value.includes('[TODO')
        );
        fmData.draft = !publishAll || hasPlaceholder;
      }

      // Slug resolution
      if (slugsByLocale[loc]) {
        fmData.slug = slugsByLocale[loc];
      }

      // Hero background & layout resolution (including source-locale sync)
      if (noImage) {
        delete fmData.image;
      } else if (customImage) {
        fmData.image = customImage;
      } else if (isSyncFrontmatter && sourceFmData && !isSource) {
        if (sourceFmData.image !== undefined) fmData.image = sourceFmData.image;
        else delete fmData.image;
      }

      if (heroOption) {
        fmData.hero = heroOption;
      } else if (isSyncFrontmatter && sourceFmData && !isSource) {
        if (sourceFmData.hero !== undefined) fmData.hero = sourceFmData.hero;
        else delete fmData.hero;
      }

      if (layoutOption) {
        fmData.container = layoutOption;
      } else if (isSyncFrontmatter && sourceFmData && !isSource) {
        if (sourceFmData.container !== undefined) fmData.container = sourceFmData.container;
        else delete fmData.container;
      }

      if (isSyncFrontmatter && sourceFmData && !isSource) {
        if (sourceFmData.flushTop !== undefined) fmData.flushTop = sourceFmData.flushTop;
        else delete fmData.flushTop;

        if (sourceFmData.template !== undefined) fmData.template = sourceFmData.template;
        else delete fmData.template;
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
        execFileSync(
          process.execPath,
          [
            path.join(rootDir, 'scripts', 'i18n-add.mjs'),
            '--category=nav',
            `--key=${pageKey}`,
            `--${sourceLocale}=${navText}`,
          ],
          { cwd: rootDir, stdio: 'inherit' }
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
  // A custom artwork is copied into the group folder, because the frontmatter
  // reference is relative to the entry file. This runs before the group
  // folder is created, so a missing artwork leaves nothing behind.
  if (customImage) {
    const placed = placeArtworkFor({
      value: customImage,
      rootDir,
      groupDir: targetDir,
      group: pageKey,
    });
    if (!placed) {
      console.warn(
        `⚠️ Artwork "${customImage}" was not found next to the content (${path.relative(rootDir, targetDir)}) or in the project root.`
      );
      console.warn(`   The group artwork "./${pageKey}.png" is used instead.`);
      customImage = '';
    } else {
      customImage = placed;
    }
  }

  fs.mkdirSync(targetDir, { recursive: true });

  // Every page owns its hero background. The artwork is drawn from code by
  // `assets:generate`, so the referenced file always exists once it is run.
  // `--image=none` opts out, and the page falls back to the shared artwork.
  const pageImage = noImage ? '' : customImage || `./${pageKey}.png`;

  for (const loc of LOCALES) {
    const isSource = loc === sourceLocale;
    const slug = resolveSlug(loc, pageKey, sourceLocale, defaultLocale, slugsByLocale);

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

    // A locale with placeholder copy stays a draft even under `--publish`, so
    // untranslated text never reaches the public site.
    const hasPlaceholder = [pageTitle, pageDesc].some((value) => value.includes('[TODO'));
    const isDraft = hasDraftArg ? !publishAll || hasPlaceholder : !isSource;
    (isDraft ? draftLocales : publishedLocales).push(loc);

    const resolvedHero = heroOption || 'default';
    const resolvedLayout = layoutOption || (resolvedHero === 'none' ? 'canvas' : 'contained');
    const stubBody = contentStub(loc);
    const bodyMarkup =
      resolvedHero === 'none'
        ? `<section class="layout-container py-12">\n  <h1 class="text-4xl font-extrabold tracking-tight text-fg">${pageTitle}</h1>\n\n  ${stubBody}\n</section>`
        : stubBody;
    const fmRecord = {
      title: pageTitle,
      slug,
      description: pageDesc,
      ...(pageImage ? { image: pageImage } : {}),
      hero: resolvedHero,
      container: resolvedLayout,
      draft: isDraft,
    };

    const content = stringifyFrontmatter(fmRecord, `\n${bodyMarkup}\n`);
    fs.writeFileSync(path.join(targetDir, `${loc}.mdx`), content, 'utf-8');
  }

  console.log(`✅ Scaffolding complete in src/content/pages/${pageKey}/ across locales: ${LOCALES.join(', ')}`);
  console.log(`ℹ️ Source locale: "${sourceLocale}" (title: "${title}")`);
  console.log(
    pageImage
      ? `ℹ️ Hero background: "${pageImage}"`
      : 'ℹ️ Hero background: shared artwork (--image=none)'
  );

  if (hasDraftArg && !publishAll) {
    console.log('📝 Note: Every locale is marked as "draft: true" and stays unpublished until you publish it.');
  } else if (!hasDraftArg) {
    const draftedLocales = LOCALES.filter((l) => l !== sourceLocale);
    console.log(
      `📝 Note: Non-source locales (${draftedLocales.join(', ')}) are marked as "draft: true" until they are translated.`
    );
    console.log('   (To publish every locale immediately, pass --publish or --draft=false).');
  } else {
    console.log(`🚀 Published locales: ${publishedLocales.join(', ') || 'none'}.`);
    if (draftLocales.length) {
      console.log(
        `📝 Locales with placeholder copy stay drafts: ${draftLocales.join(', ')}. Provide --title:<locale> and --desc:<locale> to publish them.`
      );
    }
  }

  // Draw the artwork for the new page, so its hero background is never broken.
  try {
    execFileSync(process.execPath, [path.join(rootDir, 'scripts', 'generate-assets.mjs')], {
      cwd: rootDir,
      stdio: 'inherit',
    });
  } catch (e) {
    console.warn('⚠️ Warning: Failed to generate the hero artwork:', e.message);
    console.warn(`   Run "pnpm run assets:generate" to create "${pageImage}".`);
  }

  // Register nav translation key
  if (!skipNav) {
    try {
      const navText = titlesByLocale[sourceLocale] || title;
      console.log(`🔄 Registering nav_${pageKey} translation key...`);
      execFileSync(
        process.execPath,
        [
          path.join(rootDir, 'scripts', 'i18n-add.mjs'),
          '--category=nav',
          `--key=${pageKey}`,
          `--${sourceLocale}=${navText}`,
        ],
        { cwd: rootDir, stdio: 'inherit' }
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
