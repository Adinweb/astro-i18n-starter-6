/**
 * Synchronizes missing Paraglide dictionary keys into `client/messages/<locale>.json`
 * from static `m.*()` usages, enabled `content.types`, `ui.navigation.pages`, and
 * content frontmatter taxonomy (`categories`, `tags`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileMessages } from './compile-messages.mjs';
import { readMergedConfig } from './config.mjs';
import { readContentTypes } from './content-types.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { readLocaleConfig } from './locales.mjs';
import {
  readClientMessages,
  readCoreMessages,
  readMergedMessages,
  stripSchema,
  writeClientMessages,
} from './merge-messages.mjs';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function humanizeSegment(raw) {
  return String(raw)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function deriveEnglishDefault(key, hints = new Map()) {
  if (hints.has(key)) return hints.get(key);

  if (key.startsWith('nav_')) {
    return humanizeSegment(key.slice(4));
  }
  if (key.endsWith('_index_description')) {
    const base = humanizeSegment(key.slice(0, -'_index_description'.length));
    return `Explore our ${base.toLowerCase()} collection.`;
  }
  if (key.startsWith('blog_category_')) {
    return humanizeSegment(key.slice('blog_category_'.length));
  }
  if (key.startsWith('blog_tag_')) {
    return humanizeSegment(key.slice('blog_tag_'.length));
  }

  const fieldIdx = key.indexOf('_field_');
  if (fieldIdx !== -1) {
    return humanizeSegment(key.slice(fieldIdx + '_field_'.length));
  }

  return humanizeSegment(key);
}

function collectStaticMessageKeys(rootDir) {
  const keys = new Set();
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'paraglide' || entry.name === 'node_modules') continue;
        walk(fullPath);
      } else if (/\.(astro|ts|tsx|js)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const match of content.matchAll(/\bm\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
          keys.add(match[1]);
        }
      }
    }
  };
  walk(path.join(rootDir, 'src'));
  walk(path.join(rootDir, 'client'));
  return keys;
}

function collectFrontmatterTaxonomyKeys(rootDir, keys, hints) {
  const contentDir = path.join(rootDir, 'src', 'content');
  if (!fs.existsSync(contentDir)) return;

  for (const colEntry of fs.readdirSync(contentDir, { withFileTypes: true })) {
    if (!colEntry.isDirectory()) continue;
    const colDir = path.join(contentDir, colEntry.name);
    for (const groupEntry of fs.readdirSync(colDir, { withFileTypes: true })) {
      if (!groupEntry.isDirectory()) continue;
      const groupDir = path.join(colDir, groupEntry.name);
      for (const fileEntry of fs.readdirSync(groupDir, { withFileTypes: true })) {
        if (!fileEntry.isFile() || !/\.(mdx|md)$/.test(fileEntry.name)) continue;
        const raw = fs.readFileSync(path.join(groupDir, fileEntry.name), 'utf-8');
        if (!/^---\r?\n[\s\S]*?\r?\n---/.test(raw)) continue;
        const { data } = parseFrontmatter(raw);
        if (Array.isArray(data.categories)) {
          for (const cat of data.categories) {
            const safe = String(cat).trim();
            if (!safe) continue;
            const k = `blog_category_${safe}`;
            keys.add(k);
            hints.set(k, humanizeSegment(safe));
          }
        }
        if (Array.isArray(data.tags)) {
          for (const tag of data.tags) {
            const safe = String(tag).trim();
            if (!safe) continue;
            const k = `blog_tag_${safe}`;
            keys.add(k);
            hints.set(k, humanizeSegment(safe));
          }
        }
      }
    }
  }
}

export function syncDictionaryKeys(
  rootDir = defaultRootDir,
  { dryRun = false, compile = true } = {}
) {
  const { locales, defaultLocale } = readLocaleConfig(rootDir);
  const baseLocale = defaultLocale || locales[0] || 'en';
  const mergedConfig = readMergedConfig(rootDir);
  const contentTypes = readContentTypes(mergedConfig, rootDir);

  const requiredKeys = collectStaticMessageKeys(rootDir);
  const hints = new Map();

  // 1. Collect taxonomy keys from existing MDX content
  collectFrontmatterTaxonomyKeys(rootDir, requiredKeys, hints);

  // 2. Collect keys from ui.navigation.pages without full inline label coverage
  const navPages = mergedConfig.ui?.navigation?.pages;
  if (Array.isArray(navPages)) {
    for (const navPage of navPages) {
      if (!navPage?.group) continue;
      const hasAllLocales =
        Boolean(navPage.label?.trim()) ||
        (navPage.labels && locales.every((loc) => Boolean(navPage.labels[loc]?.trim())));
      if (!hasAllLocales) {
        const key = `nav_${navPage.group.replace(/[^a-zA-Z0-9_]+/g, '_')}`;
        requiredKeys.add(key);
        const hint = navPage.labels?.[baseLocale] || navPage.labels?.en || humanizeSegment(navPage.group);
        hints.set(key, hint);
      }
    }
  }

  // 3. Collect keys for enabled custom content types
  for (const type of contentTypes) {
    if (!type.enabled || type.key === 'pages') continue;
    const isBuiltIn = type.key === 'blog' || type.key === 'projects';

    if (!isBuiltIn) {
      const hasAllLabels =
        type.labels && locales.every((loc) => Boolean(type.labels[loc]?.trim()));
      if (!hasAllLabels) {
        const navKey = `nav_${type.key}`;
        requiredKeys.add(navKey);
        hints.set(navKey, type.labels?.en || type.labels?.[baseLocale] || humanizeSegment(type.key));
      }

      const hasAllDescs =
        type.descriptions && locales.every((loc) => Boolean(type.descriptions[loc]?.trim()));
      if (!hasAllDescs) {
        const descKey = `${type.key}_index_description`;
        requiredKeys.add(descKey);
        hints.set(
          descKey,
          type.descriptions?.en ||
            type.descriptions?.[baseLocale] ||
            `Explore our ${humanizeSegment(type.key).toLowerCase()} collection.`
        );
      }

      for (const field of type.fields ?? []) {
        if (!field?.name) continue;
        const hasAllFieldLabels =
          Boolean(field.label?.trim()) ||
          Boolean(field.filter?.label?.trim()) ||
          (field.labels && locales.every((loc) => Boolean(field.labels[loc]?.trim()))) ||
          (field.filter?.labels && locales.every((loc) => Boolean(field.filter.labels[loc]?.trim())));

        if (!hasAllFieldLabels) {
          const fKey = `${type.key}_field_${field.name}`;
          requiredKeys.add(fKey);
          hints.set(
            fKey,
            field.label || field.labels?.en || field.labels?.[baseLocale] || humanizeSegment(field.name)
          );
        }

        if (field.type === 'enum' && Array.isArray(field.options)) {
          for (const opt of field.options) {
            const hasAllOptLabels =
              field.optionLabels?.[opt] &&
              locales.every((loc) => Boolean(field.optionLabels[opt][loc]?.trim()));
            if (!hasAllOptLabels) {
              const safeOpt = String(opt).replace(/[^a-zA-Z0-9_-]+/g, '_');
              const optKey = `${type.key}_${field.name}_${safeOpt}`;
              requiredKeys.add(optKey);
              hints.set(
                optKey,
                field.optionLabels?.[opt]?.en ||
                  field.optionLabels?.[opt]?.[baseLocale] ||
                  humanizeSegment(opt)
              );
            }
          }
        }
      }
    }
  }

  // 4. Load core/client/merged dictionaries and include parity keys across locales
  const mergedByLocale = {};
  const clientByLocale = {};
  for (const locale of locales) {
    mergedByLocale[locale] = stripSchema(readMergedMessages(locale, rootDir));
    clientByLocale[locale] = stripSchema(readClientMessages(locale, rootDir));
  }

  // Any key present in baseLocale merged dictionary must also exist in other locales
  for (const k of Object.keys(mergedByLocale[baseLocale] ?? {})) {
    requiredKeys.add(k);
  }

  const addedByLocale = {};
  let totalAdded = 0;

  // Resolve baseLocale first so non-default locales inherit accurate base English values
  const sortedKeys = [...requiredKeys].sort();
  const baseClient = { ...clientByLocale[baseLocale] };
  const baseMerged = { ...mergedByLocale[baseLocale] };
  const baseAdded = [];

  for (const key of sortedKeys) {
    if (key in baseMerged) continue;
    const val = deriveEnglishDefault(key, hints);
    baseClient[key] = val;
    baseMerged[key] = val;
    baseAdded.push(key);
  }

  clientByLocale[baseLocale] = baseClient;
  mergedByLocale[baseLocale] = baseMerged;
  addedByLocale[baseLocale] = baseAdded;
  totalAdded += baseAdded.length;

  const coreEn = stripSchema(readCoreMessages('en', rootDir));
  const coreBase = baseLocale === 'en' ? coreEn : stripSchema(readCoreMessages(baseLocale, rootDir));

  for (const locale of locales) {
    if (locale === baseLocale) continue;
    const locClient = { ...clientByLocale[locale] };
    const locMerged = mergedByLocale[locale];
    const locAdded = [];

    for (const key of sortedKeys) {
      if (key in locMerged) continue;
      const sourceVal =
        mergedByLocale.en?.[key] ??
        coreEn[key] ??
        baseMerged[key] ??
        coreBase[key] ??
        deriveEnglishDefault(key, hints);
      locClient[key] =
        typeof sourceVal === 'string'
          ? `[TODO: ${locale}] ${sourceVal}`
          : structuredClone(sourceVal);
      locAdded.push(key);
    }

    clientByLocale[locale] = locClient;
    addedByLocale[locale] = locAdded;
    totalAdded += locAdded.length;
  }

  let compiled = false;
  if (!dryRun && totalAdded > 0) {
    for (const locale of locales) {
      if ((addedByLocale[locale]?.length ?? 0) > 0) {
        writeClientMessages(locale, clientByLocale[locale], rootDir);
      }
    }
    if (compile) {
      compileMessages(rootDir);
      compiled = true;
    }
  }

  return {
    baseLocale,
    locales,
    totalAdded,
    addedByLocale,
    compiled,
    dryRun,
  };
}
