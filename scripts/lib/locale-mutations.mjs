/**
 * Shared mutation helpers for registered locales (`client/locales.json`,
 * `client/messages/<locale>.json`, and content files).
 *
 * Never modifies upstream core files (`src/i18n/locales.ts`, `messages/core/`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { compileMessages } from './compile-messages.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { readLocaleConfig, writeLocaleConfig, localeConfigPathFor } from './locales.mjs';
import {
  readClientMessages,
  readCoreMessages,
  readMergedMessages,
  stripSchema,
} from './merge-messages.mjs';

export function resolveHomeFile(rootDir, locale) {
  const homeDir = path.join(rootDir, 'src', 'content', 'pages', 'home');
  return (
    ['mdx', 'md']
      .map((ext) => path.join(homeDir, `${locale}.${ext}`))
      .find((candidate) => fs.existsSync(candidate)) ?? null
  );
}

/**
 * Validates and switches the project's default (`defaultLocale`) language in `client/locales.json`.
 */
export function switchDefaultLocale(
  targetLocale,
  { rootDir = process.cwd(), allowDraftHome = false, compile = true } = {}
) {
  const localesFile = localeConfigPathFor(rootDir);
  if (!fs.existsSync(localesFile)) {
    throw new Error('Missing client/locales.json.');
  }

  const localeConfig = readLocaleConfig(rootDir);

  if (!localeConfig.locales.includes(targetLocale)) {
    throw new Error(
      `Locale "${targetLocale}" is not registered. Registered locales: ${localeConfig.locales.join(', ')}`
    );
  }

  if (!localeConfig.metadata[targetLocale]) {
    throw new Error(`client/locales.json metadata is missing "${targetLocale}".`);
  }

  const hasCore = Object.keys(stripSchema(readCoreMessages(targetLocale, rootDir))).length > 0;
  const clientDictPath = path.join(rootDir, 'client', 'messages', `${targetLocale}.json`);
  if (!hasCore && !fs.existsSync(clientDictPath)) {
    throw new Error(
      `Missing dictionary file: client/messages/${targetLocale}.json (and no messages/core/${targetLocale}.json exists).`
    );
  }

  const mergedDict = readMergedMessages(targetLocale, rootDir);
  const warnings = [];
  if (
    typeof mergedDict.site_description !== 'string' ||
    !mergedDict.site_description.trim() ||
    /^\[TODO:/i.test(mergedDict.site_description)
  ) {
    warnings.push(
      `Dictionary for "${targetLocale}" has an empty or untranslated ([TODO]) "site_description".`
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

  const alreadyDefault = localeConfig.defaultLocale === targetLocale;

  if (!alreadyDefault) {
    localeConfig.defaultLocale = targetLocale;
    localeConfig.locales = [
      targetLocale,
      ...localeConfig.locales.filter((loc) => loc !== targetLocale),
    ];
    writeLocaleConfig(localeConfig, rootDir);
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
 * Unregisters a non-default locale from `client/locales.json` and
 * `client/messages/<locale>.json`, optionally deleting or archiving its content files.
 * Upstream `messages/core/<locale>.json` is never modified.
 */
export function unregisterLocale(
  langCode,
  { rootDir = process.cwd(), deleteContent = false, archiveContent = false, compile = true } = {}
) {
  const localesFile = localeConfigPathFor(rootDir);
  if (!fs.existsSync(localesFile)) {
    throw new Error('Missing client/locales.json.');
  }

  const localeConfig = readLocaleConfig(rootDir);
  const baseLocale = localeConfig.defaultLocale || 'en';

  if (!localeConfig.locales.includes(langCode)) {
    throw new Error(`Locale "${langCode}" is not registered in client/locales.json.`);
  }
  if (langCode === baseLocale) {
    throw new Error(`Cannot remove base/default locale "${langCode}".`);
  }
  if (localeConfig.locales.length <= 1) {
    throw new Error('Cannot remove the only remaining locale.');
  }

  const nextLocales = localeConfig.locales.filter((l) => l !== langCode);
  const nextMetadata = { ...localeConfig.metadata };
  delete nextMetadata[langCode];

  writeLocaleConfig(
    {
      defaultLocale: localeConfig.defaultLocale,
      locales: nextLocales,
      metadata: nextMetadata,
    },
    rootDir
  );

  const archiveBaseDir = path.join(rootDir, '.locale-archive', langCode);
  const clientDictPath = path.join(rootDir, 'client', 'messages', `${langCode}.json`);
  let deletedDictionary = false;
  let archivedDictionary = false;
  if (fs.existsSync(clientDictPath)) {
    if (!deleteContent && archiveContent) {
      fs.mkdirSync(archiveBaseDir, { recursive: true });
      fs.copyFileSync(clientDictPath, path.join(archiveBaseDir, 'messages.json'));
      archivedDictionary = true;
    }
    fs.unlinkSync(clientDictPath);
    deletedDictionary = true;
  } else if (!deleteContent && archiveContent) {
    // Archive sparse client state so restoration can cleanly recreate client/messages/<locale>.json
    const currentClient = readClientMessages(langCode, rootDir);
    fs.mkdirSync(archiveBaseDir, { recursive: true });
    fs.writeFileSync(
      path.join(archiveBaseDir, 'messages.json'),
      `${JSON.stringify({ $schema: 'https://inlang.com/schema/inlang-message-format', ...stripSchema(currentClient) }, null, 2)}\n`,
      'utf-8'
    );
    archivedDictionary = true;
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

  const localeConfig = readLocaleConfig(rootDir);
  const otherLocales = localeConfig.locales.filter((loc) => loc !== targetLocale);

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
