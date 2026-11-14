/**
 * Shared mutation helpers for registered locales (`project.inlang/settings.json`,
 * `src/i18n/locales.ts`, `messages/<locale>.json`, and content files).
 *
 * Used by `set-default-language.mjs`, `remove-language.mjs`,
 * `set-language-mode.mjs`, and `site-init.mjs` so locale switching and pruning
 * share one validated code path.
 */
import fs from 'node:fs';
import path from 'node:path';
import { compileMessages } from './compile-messages.mjs';
import { escapeRegex, parseFrontmatter } from './frontmatter.mjs';
import { LOCALES_SOURCE_PATH, parseLocaleConfig } from './locales.mjs';

export function resolveHomeFile(rootDir, locale) {
  const homeDir = path.join(rootDir, 'src', 'content', 'pages', 'home');
  return (
    ['mdx', 'md']
      .map((ext) => path.join(homeDir, `${locale}.${ext}`))
      .find((candidate) => fs.existsSync(candidate)) ?? null
  );
}

/**
 * Validates and switches the project's default (`DEFAULT_LOCALE` / `baseLocale`) language.
 */
export function switchDefaultLocale(
  targetLocale,
  { rootDir = process.cwd(), allowDraftHome = false, compile = true } = {}
) {
  const inlangPath = path.join(rootDir, 'project.inlang', 'settings.json');
  const localesPath =
    rootDir === path.resolve(path.dirname(LOCALES_SOURCE_PATH), '..', '..')
      ? LOCALES_SOURCE_PATH
      : path.join(rootDir, 'src', 'i18n', 'locales.ts');

  if (!fs.existsSync(inlangPath)) {
    throw new Error('Missing project.inlang/settings.json.');
  }
  if (!fs.existsSync(localesPath)) {
    throw new Error('Missing src/i18n/locales.ts.');
  }

  const inlangRaw = fs.readFileSync(inlangPath, 'utf-8');
  const inlangSettings = JSON.parse(inlangRaw);
  let localesSource = fs.readFileSync(localesPath, 'utf-8');
  const localeConfig = parseLocaleConfig(localesSource);

  if (!inlangSettings.locales.includes(targetLocale) || !localeConfig.locales.includes(targetLocale)) {
    throw new Error(
      `Locale "${targetLocale}" is not registered. Registered locales: ${inlangSettings.locales.join(', ')}`
    );
  }

  if (!localeConfig.metadata[targetLocale]) {
    throw new Error(`LOCALE_METADATA in src/i18n/locales.ts is missing "${targetLocale}".`);
  }

  const dictPath = path.join(rootDir, 'messages', `${targetLocale}.json`);
  if (!fs.existsSync(dictPath)) {
    throw new Error(`Missing dictionary file: messages/${targetLocale}.json.`);
  }
  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
  const warnings = [];
  if (
    typeof dict.site_description !== 'string' ||
    !dict.site_description.trim() ||
    /^\[TODO:/i.test(dict.site_description)
  ) {
    warnings.push(
      `messages/${targetLocale}.json "site_description" is empty or untranslated ([TODO]).`
    );
  }

  const homeFile = resolveHomeFile(rootDir, targetLocale);
  if (!homeFile) {
    throw new Error(
      `Missing home page for "${targetLocale}": expected src/content/pages/home/${targetLocale}.mdx.`
    );
  }

  if (!allowDraftHome) {
    const { data } = parseFrontmatter(fs.readFileSync(homeFile, 'utf-8'));
    if (data.draft === true || data.draft === 'true') {
      throw new Error(
        `Home page for "${targetLocale}" (${path.relative(rootDir, homeFile)}) is currently a draft (draft: true). Pass --allow-draft to override.`
      );
    }
  }

  const alreadyDefault =
    inlangSettings.baseLocale === targetLocale && localeConfig.defaultLocale === targetLocale;

  if (!alreadyDefault) {
    if (inlangSettings.baseLocale !== targetLocale) {
      inlangSettings.baseLocale = targetLocale;
      const eol = inlangRaw.includes('\r\n') ? '\r\n' : '\n';
      fs.writeFileSync(
        inlangPath,
        JSON.stringify(inlangSettings, null, 2).split('\n').join(eol) + eol,
        'utf-8'
      );
    }

    const defaultPattern = /(export const DEFAULT_LOCALE\s*:\s*Locale\s*=\s*)['"][^'"]+['"]/;
    if (!defaultPattern.test(localesSource)) {
      throw new Error('Could not locate DEFAULT_LOCALE declaration in src/i18n/locales.ts.');
    }
    localesSource = localesSource.replace(defaultPattern, `$1'${targetLocale}'`);
    fs.writeFileSync(localesPath, localesSource, 'utf-8');
  }

  if (compile && !alreadyDefault) {
    compileMessages(rootDir);
  }

  return {
    changed: !alreadyDefault,
    warnings,
    meta: localeConfig.metadata[targetLocale],
  };
}

/**
 * Unregisters a non-default locale from `settings.json`, `src/i18n/locales.ts`,
 * and `messages/<locale>.json`, optionally deleting or archiving its content files.
 */
export function unregisterLocale(
  langCode,
  { rootDir = process.cwd(), deleteContent = false, archiveContent = false, compile = true } = {}
) {
  const inlangPath = path.join(rootDir, 'project.inlang', 'settings.json');
  const localesPath = path.join(rootDir, 'src', 'i18n', 'locales.ts');
  const inlangRaw = fs.readFileSync(inlangPath, 'utf-8');
  const inlangSettings = JSON.parse(inlangRaw);
  const baseLocale = inlangSettings.baseLocale || 'en';

  if (!inlangSettings.locales.includes(langCode)) {
    throw new Error(
      `Locale "${langCode}" is not registered in project.inlang/settings.json.`
    );
  }
  if (langCode === baseLocale) {
    throw new Error(`Cannot remove base/default locale "${langCode}".`);
  }
  if (inlangSettings.locales.length <= 1) {
    throw new Error('Cannot remove the only remaining locale.');
  }

  inlangSettings.locales = inlangSettings.locales.filter((l) => l !== langCode);
  const eol = inlangRaw.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(
    inlangPath,
    JSON.stringify(inlangSettings, null, 2).split('\n').join(eol) + eol,
    'utf-8'
  );

  const archiveBaseDir = path.join(rootDir, '.locale-archive', langCode);
  const dictPath = path.join(rootDir, 'messages', `${langCode}.json`);
  let deletedDictionary = false;
  let archivedDictionary = false;
  if (fs.existsSync(dictPath)) {
    if (!deleteContent && archiveContent) {
      fs.mkdirSync(archiveBaseDir, { recursive: true });
      fs.copyFileSync(dictPath, path.join(archiveBaseDir, 'messages.json'));
      archivedDictionary = true;
    }
    fs.unlinkSync(dictPath);
    deletedDictionary = true;
  }

  if (fs.existsSync(localesPath)) {
    let localesCode = fs.readFileSync(localesPath, 'utf-8');
    localesCode = localesCode.replace(
      /export const LOCALES = \[(.*?)\] as const;/s,
      (_match, p1) => {
        const remaining = p1
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s && s !== `'${langCode}'` && s !== `"${langCode}"`);
        return `export const LOCALES = [${remaining.join(', ')}] as const;`;
      }
    );
    const metaRegex = new RegExp(
      `\\r?\\n  ['"]?${escapeRegex(langCode)}['"]?:\\s*\\{[\\s\\S]*?^  \\},?`,
      'm'
    );
    localesCode = localesCode.replace(metaRegex, '');
    fs.writeFileSync(localesPath, localesCode, 'utf-8');
  }

  const deletedContentFiles = [];
  const archivedContentFiles = [];
  const contentDir = path.join(rootDir, 'src', 'content');
  if ((deleteContent || archiveContent) && fs.existsSync(contentDir)) {
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
        for (const ext of ['mdx', 'md']) {
          const file = path.join(groupDir, `${langCode}.${ext}`);
          if (!fs.existsSync(file)) continue;
          if (deleteContent) {
            fs.unlinkSync(file);
            deletedContentFiles.push(path.relative(rootDir, file));
          } else if (archiveContent) {
            const archiveFile = path.join(
              archiveBaseDir,
              'content',
              collection,
              group,
              `${langCode}.${ext}`
            );
            fs.mkdirSync(path.dirname(archiveFile), { recursive: true });
            fs.renameSync(file, archiveFile);
            archivedContentFiles.push(path.relative(rootDir, archiveFile));
          }
        }
      }
    }
  }

  if (compile) {
    compileMessages(rootDir);
  }

  return {
    deletedDictionary,
    archivedDictionary,
    deletedContentFiles,
    archivedContentFiles,
  };
}

/**
 * Switches the project to single-language mode on `targetLocale`, making it
 * the default locale and unregistering every other registered locale.
 */
export function switchToSingleLocale(
  targetLocale,
  { rootDir = process.cwd(), keepContent = true, allowDraftHome = false, compile = true } = {}
) {
  const defaultResult = switchDefaultLocale(targetLocale, {
    rootDir,
    allowDraftHome,
    compile: false,
  });

  const inlangPath = path.join(rootDir, 'project.inlang', 'settings.json');
  const inlangSettings = JSON.parse(fs.readFileSync(inlangPath, 'utf-8'));
  const otherLocales = inlangSettings.locales.filter((loc) => loc !== targetLocale);

  const removedLocales = [];
  const deletedContentFiles = [];
  const archivedContentFiles = [];

  for (const loc of otherLocales) {
    const res = unregisterLocale(loc, {
      rootDir,
      deleteContent: !keepContent,
      archiveContent: keepContent,
      compile: false,
    });
    removedLocales.push(loc);
    deletedContentFiles.push(...res.deletedContentFiles);
    archivedContentFiles.push(...res.archivedContentFiles);
  }

  if (compile && (defaultResult.changed || removedLocales.length > 0)) {
    compileMessages(rootDir);
  }

  return {
    changed: defaultResult.changed || removedLocales.length > 0,
    defaultChanged: defaultResult.changed,
    warnings: defaultResult.warnings,
    meta: defaultResult.meta,
    removedLocales,
    deletedContentFiles,
    archivedContentFiles,
  };
}
