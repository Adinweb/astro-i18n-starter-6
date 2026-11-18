#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { resolveImageOption, placeArtworkFor } from './lib/image-reference.mjs';
import { contentStub } from './lib/content-stub.mjs';
import { findPlaceholderSlugs, placeholderSlugNotice, resolveSlug } from './lib/slug.mjs';
import { entryKeyError } from './lib/validate.mjs';
import { readLocaleConfig } from './lib/locales.mjs';
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
  let presetOption = 'standard';
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
    } else if (arg.startsWith('--preset=')) {
      const raw = arg.slice(9).trim();
      if (!['standard', 'landing'].includes(raw)) {
        console.error(
          `❌ Invalid --preset value: "${raw}". Expected "standard" or "landing".`
        );
        process.exit(1);
      }
      presetOption = raw;
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
  --preset=standard|landing    Page template preset (default: standard; "landing" scaffolds composable canvas blocks)
  --hero=none|minimal|default  Page hero presentation mode (default: default, or none for --preset=landing)
  --container=canvas|contained|prose  Page body container mode (default: contained, or canvas when --hero=none / --preset=landing)
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

  const keyError = entryKeyError(pageKey, 'page key');
  if (keyError) {
    console.error(keyError);
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

  const { locales: LOCALES, defaultLocale: cfgDefaultLocale } = readLocaleConfig(rootDir);
  const defaultLocale = cfgDefaultLocale || 'en';
  if (fromLocale && !LOCALES.includes(fromLocale)) {
    console.error(
      `❌ Unknown source locale "${fromLocale}". Registered locales: ${LOCALES.join(', ')}.`
    );
    process.exit(1);
  }
  const sourceLocale = fromLocale || defaultLocale;

  /**
   * Builds `--<locale>=<label>` arguments for the navigation key from every
   * real (non-placeholder) title passed on the command line. A page that is
   * published in a locale must not show a `[TODO: …]` label in that locale's
   * navigation.
   */
  const navTranslationArgs = () => {
    const navArgs = [];
    for (const loc of LOCALES) {
      const label = titlesByLocale[loc] || (loc === sourceLocale ? title : '');
      if (!label || label.includes('[TODO')) continue;
      navArgs.push(`--${loc}=${label}`);
    }
    return navArgs;
  };

  const publishedLocales = [];
  const draftLocales = [];

  // -------------------------------------------------------------
  // UPDATE / SYNC-FRONTMATTER MODE
  // -------------------------------------------------------------
  if (fs.existsSync(targetDir) && (isUpdate || isSyncFrontmatter)) {
    console.log(`🔄 Updating existing page group: src/content/pages/${pageKey}/`);
    const updatedLocales = [];
    const bodyHeadingLocales = [];

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
        const sourceDescription =
          typeof sourceFmData?.description === 'string' ? sourceFmData.description : '';
        fmData = {
          title: `[TODO: ${loc}] ${sourceFmData?.title || title}`,
          slug,
          ...(sourceDescription ? { description: `[TODO: ${loc}] ${sourceDescription}` } : {}),
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

      // `hero: "minimal"` renders the frontmatter title as the page's only
      // `<h1>`; a body that still carries its own heading would duplicate it.
      if (heroOption === 'minimal' && /<h1[\s>]/i.test(body)) bodyHeadingLocales.push(loc);

      const newContent = stringifyFrontmatter(fmData, body);
      fs.writeFileSync(filePath, newContent, 'utf-8');
      updatedLocales.push(loc);
    }

    console.log(`✅ Frontmatter successfully updated for [${pageKey}] across locales: ${updatedLocales.join(', ')}`);
    for (const line of placeholderSlugNotice(
      'new:page',
      pageKey,
      findPlaceholderSlugs(targetDir, pageKey, LOCALES)
    )) {
      console.warn(line);
    }
    if (bodyHeadingLocales.length > 0) {
      console.warn(
        `⚠️ hero "minimal" renders the title as the page's <h1>, but the body of ` +
          `[${bodyHeadingLocales.join(', ')}] also contains an <h1>. Remove the body heading so the page has exactly one.`
      );
    }

    // Optional nav key update (any per-locale `--title:<locale>` counts too)
    const hasAnyTitle = hasCustomTitle || Object.keys(titlesByLocale).length > 0;
    if (!skipNav && hasAnyTitle) {
      try {
        console.log(`🔄 Updating nav_${pageKey} translation key...`);
        execFileSync(process.execPath, [
          path.join(rootDir, 'scripts', 'i18n-add.mjs'),
          '--category=nav',
          `--key=${pageKey}`,
          ...navTranslationArgs(),
        ], { cwd: rootDir, stdio: 'inherit' });
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

    // Without `--desc` the entry simply has no description: the SEO component
    // then falls back to the site description, instead of publishing an
    // invented "Description for …" string in the meta tags of a live site.
    let pageDesc;
    if (descriptionsByLocale[loc]) {
      pageDesc = descriptionsByLocale[loc];
    } else if (hasCustomDesc) {
      pageDesc = isSource ? customDesc : `[TODO: ${loc}] ${customDesc}`;
    } else {
      pageDesc = '';
    }

    // A locale with placeholder copy stays a draft even under `--publish`, so
    // untranslated text never reaches the public site.
    const hasPlaceholder = [pageTitle, pageDesc].some((value) => value.includes('[TODO'));
    const isDraft = hasDraftArg ? !publishAll || hasPlaceholder : !isSource;
    (isDraft ? draftLocales : publishedLocales).push(loc);

    const isLandingPreset = presetOption === 'landing';
    const resolvedHero = heroOption || (isLandingPreset ? 'none' : 'default');
    const resolvedLayout =
      layoutOption || (isLandingPreset || resolvedHero === 'none' ? 'canvas' : 'contained');
    const stubBody = contentStub(loc);

    const buildLandingBody = () => {
      const isFa = loc === 'fa';
      const isAr = loc === 'ar';
      const heroImport = pageImage ? `import heroVisual from '${pageImage}';\n` : '';
      const heroImageProp = pageImage ? `\n  image={heroVisual}\n  imageAlt=${JSON.stringify(pageTitle)}` : '';
      const heroDesc =
        pageDesc ||
        (isFa
          ? 'توضیح کوتاه معرفی ارزش پیشنهادی و مزیت رقابتی این بخش.'
          : isAr
            ? 'وصف موجز يبرز القيمة المقدمة والمزايا الرئيسية.'
            : 'Concise value proposition explaining who this solution serves and the measurable outcome it delivers.');
      const ctaHref = loc === defaultLocale ? '/' : `/${loc}/`;

      return [
        `import LandingHeroSplit from '@/components/LandingHeroSplit.astro';`,
        `import ProofStatsRow from '@/components/ProofStatsRow.astro';`,
        `import BentoCapabilities from '@/components/BentoCapabilities.astro';`,
        `import FaqAccordion from '@/components/FaqAccordion.astro';`,
        `import CtaBanner from '@/components/CtaBanner.astro';`,
        heroImport,
        `<LandingHeroSplit`,
        `  surface="hero"`,
        `  eyebrow=${JSON.stringify(isFa ? 'معرفی محصول و خدمات' : isAr ? 'نظرة عامة' : 'Overview')}`,
        `  title=${JSON.stringify(pageTitle)}`,
        `  description=${JSON.stringify(heroDesc)}`,
        `  primaryCta={{ label: ${JSON.stringify(isFa ? 'شروع همکاری' : isAr ? 'ابدأ الآن' : 'Get started')}, href: "#next-step" }}`,
        `  secondaryCta={{ label: ${JSON.stringify(isFa ? 'امکانات کلیدی' : isAr ? 'المميزات' : 'Explore capabilities')}, href: "#capabilities" }}${heroImageProp}`,
        `/>`,
        ``,
        `<ProofStatsRow`,
        `  locale=${JSON.stringify(loc)}`,
        `  items={[`,
        `    { count: 99, suffix: "%", label: ${JSON.stringify(isFa ? 'پایداری سرویس' : isAr ? 'استقرار الخدمة' : 'Uptime SLA')}, context: ${JSON.stringify(isFa ? 'پایش پیوسته در شبکه توزیع‌شده' : isAr ? 'مراقبة مستمرة' : 'Monitored edge delivery')} },`,
        `    { count: 14, suffix: "ms", label: ${JSON.stringify(isFa ? 'میانگین پاسخ‌گویی' : isAr ? 'متوسط الاستجابة' : 'Median TTFB')}, context: ${JSON.stringify(isFa ? 'خروجی کاملاً استاتیک' : isAr ? 'بناء ثابت بالكامل' : 'Pre-rendered static HTML')} },`,
        `    { count: 100, suffix: "", label: ${JSON.stringify(isFa ? 'امتیاز دسترسی‌پذیری' : isAr ? 'سهولة الوصول' : 'WCAG AA Ready')}, context: ${JSON.stringify(isFa ? 'طراحی استاندارد برای صفحه‌کلید و RTL' : isAr ? 'دعم كامل للوحة المفاتيح' : 'Full keyboard & RTL parity')} }`,
        `  ]}`,
        `/>`,
        ``,
        `<BentoCapabilities`,
        `  id="capabilities"`,
        `  locale=${JSON.stringify(loc)}`,
        `  eyebrow=${JSON.stringify(isFa ? 'قابلیت‌های اصلی' : isAr ? 'القدرات الأساسية' : 'Capabilities')}`,
        `  heading=${JSON.stringify(isFa ? 'طراحی‌شده برای تحویل سریع پروژه‌ها' : isAr ? 'مصمم لتسليم المشاريع بسرعة' : 'Engineered for fast client delivery')}`,
        `  items={[`,
        `    { wide: true, icon: "sparkles", title: ${JSON.stringify(isFa ? 'معماری ماژولار و مقیاس‌پذیر' : isAr ? 'بنية معمارية مرنة' : 'Modular Section Architecture')}, description: ${JSON.stringify(isFa ? 'هر بخش به صورت مستقل با رنگ‌ها و تایپوگرافی برند هماهنگ می‌شود و در حالت‌های روشن، تاریک و چاپ کیفیت خود را حفظ می‌کند.' : isAr ? 'يتكيف كل قسم تلقائياً مع ألوان وخطوط العلامة التجارية.' : 'Every block adapts automatically to your brand tokens and stays crisp across light, dark, and print themes.')} },`,
        `    { icon: "globe", title: ${JSON.stringify(isFa ? 'دوجهته بومی' : isAr ? 'دعم ثنائي الاتجاه' : 'Native RTL & LTR')}, description: ${JSON.stringify(isFa ? 'چیدمان و جهت‌گیری آیکون‌ها در زبان‌های فارسی، عربی و لاتین به صورت خودکار قرینه می‌شود.' : isAr ? 'محاذاة منطقية تلقائية للعربية والفارسية.' : 'Logical CSS geometry mirrors layouts, borders, and reading icons seamlessly.')} },`,
        `    { icon: "shield", title: ${JSON.stringify(isFa ? 'سئو و دسترس‌پذیری استاندارد' : isAr ? 'تحسين محركات البحث' : 'Verified SEO & Schema')}, description: ${JSON.stringify(isFa ? 'دارای متادیتای ساختاریافته، نقشه سایت و کارت‌های اختصاصی اشتراک‌گذاری.' : isAr ? 'بيانات منظمة وبطاقات مشاركة مخصصة.' : 'Ships structured metadata, canonical alternates, and per-route social cards.')} }`,
        `  ]}`,
        `/>`,
        ``,
        `<FaqAccordion`,
        `  id="faq"`,
        `  surface="subtle"`,
        `  eyebrow=${JSON.stringify(isFa ? 'پرسش‌های متداول' : isAr ? 'الأسئلة الشائعة' : 'FAQ')}`,
        `  heading=${JSON.stringify(isFa ? 'پاسخ به پرسش‌های رایج' : isAr ? 'إجابات على الأسئلة المتكررة' : 'Frequently asked questions')}`,
        `  items={[`,
        `    { question: ${JSON.stringify(isFa ? 'چگونه رنگ‌ها و فونت برند را تغییر دهم؟' : isAr ? 'كيف أخصص ألوان العلامة التجارية؟' : 'How do we customize brand colors and fonts?')}, answer: ${JSON.stringify(isFa ? 'تنظیمات برند در client/config.json نگهداری می‌شود و با دستور site:init قابل تغییر است.' : isAr ? 'تُحفظ إعدادات العلامة التجارية في client/config.json.' : 'Brand tokens, palettes, and font pairings are managed in client/config.json or via npm run site:init.')} },`,
        `    { question: ${JSON.stringify(isFa ? 'آیا این صفحه با زبان‌های راست‌به‌چپ سازگار است؟' : isAr ? 'هل تدعم الصفحة اللغات من اليمين لليسار؟' : 'Does this layout mirror for RTL languages?')}, answer: ${JSON.stringify(isFa ? 'بله، تمامی بخش‌ها صرفاً با ویژگی‌های منطقی CSS پیاده‌سازی شده‌اند.' : isAr ? 'نعم، جميع المكونات مبنية بخصائص CSS المنطقية.' : 'Yes. All layout spacing, borders, and directional chevrons mirror automatically using CSS logical properties.')} }`,
        `  ]}`,
        `/>`,
        ``,
        `<CtaBanner`,
        `  id="next-step"`,
        `  title=${JSON.stringify(isFa ? 'آماده راه‌اندازی پروژه بعدی خود هستید؟' : isAr ? 'هل أنت مستعد لإطلاق مشروعك القادم؟' : 'Ready to launch your next site?')}`,
        `  description=${JSON.stringify(isFa ? 'محتوای این بخش‌ها را مطابق نیاز مشتری ویرایش کرده و خروجی نهایی استاتیک را منتشر کنید.' : isAr ? 'خصص هذه الأقسام لتناسب متطلبات مشروعك وانشر الموقع الثابت.' : 'Tailor these composable sections to your client brief and ship static HTML with zero runtime bloat.')}`,
        `  primaryCta={{ label: ${JSON.stringify(isFa ? 'بازگشت به خانه' : isAr ? 'العودة للرئيسية' : 'Back to home')}, href: ${JSON.stringify(ctaHref)} }}`,
        `/>`,
      ].join('\n');
    };

    const bodyMarkup = isLandingPreset
      ? buildLandingBody()
      : resolvedHero === 'none'
        ? `<section class="layout-container py-12">\n  <h1 class="text-4xl font-extrabold tracking-tight text-fg">${pageTitle}</h1>\n\n  ${stubBody}\n</section>`
        : stubBody;
    const fmRecord = {
      title: pageTitle,
      slug,
      ...(pageDesc ? { description: pageDesc } : {}),
      ...(pageImage ? { image: pageImage } : {}),
      hero: resolvedHero,
      container: resolvedLayout,
      ...(isLandingPreset ? { flushTop: true } : {}),
      draft: isDraft,
    };

    const content = stringifyFrontmatter(fmRecord, `\n${bodyMarkup}\n`);
    fs.writeFileSync(path.join(targetDir, `${loc}.mdx`), content, 'utf-8');
  }

  for (const line of placeholderSlugNotice(
    'new:page',
    pageKey,
    findPlaceholderSlugs(targetDir, pageKey, LOCALES)
  )) {
    console.warn(line);
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
    if (publishedLocales.length > 0) {
      // The scaffold body is the localized "content coming soon" sentence, and
      // `smoke` refuses a built page that still contains it. Say so now, while
      // the author is still in the terminal, instead of at the next build.
      console.warn(
        '⚠️ The published body is still the scaffold sentence ("content coming soon").' +
          ' Write the real copy before the next production build; `pnpm run smoke` fails while it is in dist/.'
      );
    }
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
      console.log(`🔄 Registering nav_${pageKey} translation key...`);
      execFileSync(process.execPath, [
        path.join(rootDir, 'scripts', 'i18n-add.mjs'),
        '--category=nav',
        `--key=${pageKey}`,
        ...navTranslationArgs(),
      ], { cwd: rootDir, stdio: 'inherit' });
    } catch (e) {
      console.warn('⚠️ Warning: Failed to auto-register nav key:', e.message);
    }

    // The client dictionary now has the label; the menu order is still the
    // project's decision, so point at the one place that decides it.
    console.log(
      `   ↳ Add "${pageKey}" (label: nav_${pageKey}) to CLIENT_PAGE_ITEMS in client/navigation.ts to show it in the menus.`
    );
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  runCli();
}
