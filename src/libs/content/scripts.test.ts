import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeBatchData } from '../../../scripts/i18n-add-batch.mjs';
import { mergeTranslation } from '../../../scripts/i18n-add.mjs';
import {
  normalizeImageReference,
  resolveImageOption,
  findArtworkFile,
  placeArtwork,
  placeArtworkFor,
} from '../../../scripts/lib/image-reference.mjs';
import {
  parseFrontmatter as parsePageFm,
  stringifyFrontmatter as stringifyPageFm,
} from '../../../scripts/new-page.mjs';
import {
  parseFrontmatter as parsePostFm,
  stringifyFrontmatter as stringifyPostFm,
} from '../../../scripts/new-post.mjs';
import {
  escapeYamlString,
  unescapeYamlDoubleQuoted,
} from '../../../scripts/lib/frontmatter.mjs';
import { parseLocaleConfig, readLocaleConfig } from '../../../scripts/lib/locales.mjs';
import {
  compileMessages,
  findParaglideBin,
} from '../../../scripts/lib/compile-messages.mjs';

describe('scripts/i18n-add-batch.mjs normalizeBatchData', () => {
  const activeLocales = ['en', 'de', 'fr', 'fa', 'ar'];

  it('normalizes key-to-locale dictionary mapping', () => {
    const input = {
      checkout_title: {
        en: 'Checkout',
        fa: 'تسویه حساب',
        de: 'Kasse',
      },
      checkout_submit: {
        en: 'Place Order',
        fa: 'ثبت سفارش',
      },
    };

    const normalized = normalizeBatchData(input, '', activeLocales, 'en');
    expect(normalized).toBeDefined();
    expect(normalized.checkout_title).toEqual({
      en: 'Checkout',
      fa: 'تسویه حساب',
      de: 'Kasse',
    });
    expect(normalized.checkout_submit).toEqual({
      en: 'Place Order',
      fa: 'ثبت سفارش',
    });
  });

  it('normalizes locale-to-keys dictionary mapping', () => {
    const input = {
      en: {
        checkout_title: 'Checkout',
        checkout_submit: 'Place Order',
      },
      fa: {
        checkout_title: 'تسویه حساب',
        checkout_submit: 'ثبت سفارش',
      },
    };

    const normalized = normalizeBatchData(input, '', activeLocales, 'en');
    expect(normalized.checkout_title).toEqual({
      en: 'Checkout',
      fa: 'تسویه حساب',
    });
    expect(normalized.checkout_submit).toEqual({
      en: 'Place Order',
      fa: 'ثبت سفارش',
    });
  });

  it('normalizes nested category mapping and applies category prefix', () => {
    const input = {
      auth: {
        login: { en: 'Sign In', fa: 'ورود' },
        register: { en: 'Sign Up', fa: 'ثبت نام' },
      },
    };

    const normalized = normalizeBatchData(input, '', activeLocales, 'en');
    expect(normalized.auth_login).toEqual({ en: 'Sign In', fa: 'ورود' });
    expect(normalized.auth_register).toEqual({ en: 'Sign Up', fa: 'ثبت نام' });
  });

  it('applies default category prefix when key does not have it', () => {
    const input = {
      save: { en: 'Save', fa: 'ذخیره' },
      button_cancel: { en: 'Cancel', fa: 'انصراف' },
    };

    const normalized = normalizeBatchData(input, 'button', activeLocales, 'en');
    expect(normalized.button_save).toEqual({ en: 'Save', fa: 'ذخیره' });
    expect(normalized.button_cancel).toEqual({ en: 'Cancel', fa: 'انصراف' });
  });

  it('normalizes array format with keys and translations', () => {
    const input = [
      { key: 'cta_buy', en: 'Buy Now', fa: 'خرید' },
      { key: 'cta_learn', en: 'Learn More', fa: 'بیشتر بدانید' },
    ];

    const normalized = normalizeBatchData(input, '', activeLocales, 'en');
    expect(normalized.cta_buy).toEqual({ en: 'Buy Now', fa: 'خرید' });
    expect(normalized.cta_learn).toEqual({ en: 'Learn More', fa: 'بیشتر بدانید' });
  });
});

describe('Frontmatter Parsing and Updating (new-page.mjs & new-post.mjs)', () => {
  it('parses page frontmatter and preserves markdown body exactly', () => {
    const raw = `---
title: "Original Page"
slug: "original-page"
description: "Original description"
draft: false
---

# Original Page

This is the body text that should never be deleted.
`;

    const { data, body } = parsePageFm(raw) as { data: Record<string, any>; body: string };
    expect(data.title).toBe('Original Page');
    expect(data.slug).toBe('original-page');
    expect(data.description).toBe('Original description');
    expect(data.draft).toBe(false);
    expect(body).toContain('This is the body text that should never be deleted.');

    // Update title and description while keeping slug and body
    data.title = 'Updated Page Title';
    data.description = 'Updated page description';

    const serialized = stringifyPageFm(data, body);
    expect(serialized).toContain('title: "Updated Page Title"');
    expect(serialized).toContain('slug: "original-page"');
    expect(serialized).toContain('description: "Updated page description"');
    expect(serialized).toContain('draft: false');
    expect(serialized).toContain('This is the body text that should never be deleted.');
  });

  it('round-trips blog taxonomy arrays through post frontmatter', () => {
    const raw = `---
title: "Taxonomy Post"
slug: "taxonomy-post"
description: "With categories"
image: "./taxonomy-post.png"
categories: ["engineering", "guides"]
tags: ["astro", "i18n"]
publishedAt: 2026-06-01
draft: false
---

Body copy.
`;

    const { data, body } = parsePostFm(raw) as { data: Record<string, any>; body: string };
    expect(data.categories).toEqual(['engineering', 'guides']);
    expect(data.tags).toEqual(['astro', 'i18n']);
    expect(data.image).toBe('./taxonomy-post.png');

    data.tags = ['astro', 'rtl', 'performance'];
    const serialized = stringifyPostFm(data, body);
    expect(serialized).toContain('categories: ["engineering", "guides"]');
    expect(serialized).toContain('tags: ["astro", "rtl", "performance"]');
    expect(serialized).toContain('image: "./taxonomy-post.png"');
    expect(serialized).toContain('Body copy.');
  });

  it('parses post frontmatter and preserves publishedAt and markdown body', () => {
    const raw = `---
title: "Tech Trends 2026"
slug: "tech-trends"
description: "Predictions for 2026"
publishedAt: 2026-05-15
draft: false
---

# Tech Trends 2026

Content exploring future AI workflows...
`;

    const { data, body } = parsePostFm(raw) as { data: Record<string, any>; body: string };
    expect(data.title).toBe('Tech Trends 2026');
    expect(data.slug).toBe('tech-trends');
    expect(data.publishedAt).toBe('2026-05-15');
    expect(data.draft).toBe(false);

    // Update description and sync
    data.description = 'Synchronized new description';
    const serialized = stringifyPostFm(data, body);

    expect(serialized).toContain('description: "Synchronized new description"');
    expect(serialized).toContain('publishedAt: 2026-05-15');
    expect(serialized).toContain('Content exploring future AI workflows...');
  });

  it('escapes and unescapes quotes, backslashes, and unquoted updatedAt symmetrically', () => {
    const tricky = 'Guide to "Astro v7" & C:\\content\\blog';
    const escaped = escapeYamlString(tricky);
    expect(unescapeYamlDoubleQuoted(escaped)).toBe(tricky);

    const serialized = stringifyPostFm(
      {
        title: tricky,
        slug: 'astro-guide',
        description: 'Line with "quoted" segment',
        publishedAt: '2026-05-15',
        updatedAt: '2026-06-20',
        tags: ['tag"one', 'C:\\tag'],
        draft: false,
      },
      '\nBody text.\n'
    );

    expect(serialized).toContain('updatedAt: 2026-06-20');
    expect(serialized).not.toContain('updatedAt: "2026-06-20"');

    const reparsed = parsePostFm(serialized) as { data: Record<string, any>; body: string };
    expect(reparsed.data.title).toBe(tricky);
    expect(reparsed.data.description).toBe('Line with "quoted" segment');
    expect(reparsed.data.updatedAt).toBe('2026-06-20');
    expect(reparsed.data.tags).toEqual(['tag"one', 'C:\\tag']);
  });
});

describe('Hero artwork references (scripts/lib/image-reference.mjs)', () => {
  it('turns a file name into a reference relative to the content file', () => {
    expect(normalizeImageReference('cover.png')).toBe('./cover.png');
    expect(normalizeImageReference('./cover.png')).toBe('./cover.png');
  });

  it('keeps a sub-directory relative to the content file', () => {
    expect(normalizeImageReference('art/cover.png')).toBe('./art/cover.png');
  });

  it('recovers the intended path from a Git Bash mangled argument', () => {
    // Git Bash rewrites `/images/x.png` into `<git-root>/images/x.png`.
    expect(normalizeImageReference('C:/Program Files/Git/images/pages/contact.png')).toBe(
      './images/pages/contact.png'
    );
    expect(normalizeImageReference('/usr/bin/Git/images/blog/post.png')).toBe(
      './images/blog/post.png'
    );
  });

  it('rejects an absolute Windows path that is not under a Git root', () => {
    expect(normalizeImageReference('C:/Windows/System32/evil.png')).toBe('');
  });

  it('returns an empty string for a missing value', () => {
    expect(normalizeImageReference('')).toBe('');
    expect(normalizeImageReference(undefined)).toBe('');
  });
});

describe('Hero image option (resolveImageOption)', () => {
  it('normalizes a reference', () => {
    expect(resolveImageOption('cover.png', '')).toBe('./cover.png');
    expect(resolveImageOption('./blog/post.png', '')).toBe('./blog/post.png');
  });

  it('opts out of a page-specific artwork with "none"', () => {
    expect(resolveImageOption('none', '')).toBe('');
    expect(resolveImageOption('NONE', '')).toBe('');
  });

  it('rejects a value that cannot be mapped to a reference', () => {
    expect(resolveImageOption('C:/Windows/System32/evil.png', '')).toBeNull();
  });

  it('omits the image from the frontmatter when it is empty', () => {
    const serialized = stringifyPageFm(
      { title: 'Page', slug: 'page', description: 'Desc', image: undefined },
      '\n# Page\n'
    );
    expect(serialized).not.toContain('image:');
    expect(serialized).toContain('title: "Page"');
  });
});

describe('Artwork placement (scripts/lib/image-reference.mjs)', () => {
  let rootDir = '';
  let groupDir = '';

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-artwork-'));
    groupDir = path.join(rootDir, 'src', 'content', 'pages', 'contact');
    fs.mkdirSync(groupDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it('finds the artwork next to the content and in the project root', () => {
    const inGroup = path.join(groupDir, 'cover.png');
    fs.writeFileSync(inGroup, 'x');
    expect(findArtworkFile('./cover.png', rootDir, groupDir)).toBe(inGroup);

    const inRoot = path.join(rootDir, 'brand.png');
    fs.writeFileSync(inRoot, 'x');
    expect(findArtworkFile('./brand.png', rootDir, groupDir)).toBe(inRoot);
  });

  it('returns null when no artwork exists', () => {
    expect(findArtworkFile('./missing.png', rootDir, groupDir)).toBeNull();
  });

  it('copies an artwork into the group folder and references the copy', () => {
    const source = path.join(rootDir, 'brand.png');
    fs.writeFileSync(source, 'x');

    const reference = placeArtwork({ sourceFile: source, groupDir, group: 'contact' });

    expect(reference).toBe('./brand.png');
    expect(fs.existsSync(path.join(groupDir, 'brand.png'))).toBe(true);
  });

  it('keeps a file that already sits in the group folder', () => {
    const source = path.join(groupDir, 'cover.png');
    fs.writeFileSync(source, 'x');

    const reference = placeArtwork({ sourceFile: source, groupDir, group: 'contact' });

    expect(reference).toBe('./cover.png');
  });

  it('renames an artwork the generator would overwrite', () => {
    const source = path.join(rootDir, 'contact.png');
    fs.writeFileSync(source, 'x');

    const reference = placeArtwork({ sourceFile: source, groupDir, group: 'contact' });

    expect(reference).toBe('./contact-custom.png');
    expect(fs.existsSync(path.join(groupDir, 'contact-custom.png'))).toBe(true);
  });

  it('reports a missing artwork instead of a broken reference', () => {
    expect(
      placeArtworkFor({ value: './missing.png', rootDir, groupDir, group: 'contact' })
    ).toBeNull();
  });
});

describe('Translation preservation (i18n-add.mjs mergeTranslation)', () => {
  it('applies the explicit translation for the given locale', () => {
    const merged = mergeTranslation({}, 'nav_features', 'en', 'features', { en: 'Features' });
    expect(merged.nav_features).toBe('Features');
  });

  it('keeps an existing translation in a locale without an explicit value', () => {
    const dict = { nav_features: 'Funktionen' };
    const merged = mergeTranslation(dict, 'nav_features', 'de', 'features', { en: 'Features' });
    expect(merged.nav_features).toBe('Funktionen');
  });

  it('seeds a placeholder only for a key that does not exist yet', () => {
    const merged = mergeTranslation({}, 'nav_features', 'de', 'features', { en: 'Features' });
    expect(merged.nav_features).toBe('[TODO: de] features');
  });

  it('never mutates the dictionary it was given', () => {
    const dict = { nav_features: 'Funktionen' };
    mergeTranslation(dict, 'nav_features', 'en', 'features', { en: 'Features' });
    expect(dict.nav_features).toBe('Funktionen');
  });
});

describe('Locale configuration (scripts/lib/locales.mjs)', () => {
  const source = `
export const LOCALES = ['en', 'fa'] as const;
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_METADATA = {
  en: {
    dir: 'ltr',
    htmlLang: 'en',
    name: 'English',
    fontFamily: 'var(--font-sans)',
  },
  fa: {
    dir: 'rtl',
    htmlLang: 'fa',
    name: 'فارسی',
    fontFamily: 'var(--font-fa)',
  },
} satisfies Record<Locale, LocaleMeta>;
`;

  it('reads the locale list, the default locale and the metadata', () => {
    const config = parseLocaleConfig(source);
    expect(config.locales).toEqual(['en', 'fa']);
    expect(config.defaultLocale).toBe('en');
    expect(config.metadata.fa.dir).toBe('rtl');
    expect(config.metadata.en.fontFamily).toBe('var(--font-sans)');
  });

  it('does not depend on the order of the keys inside a locale block', () => {
    const reordered = source.replace(
      /(\n  \w+: \{\n)    dir: '(\w+)',\n/g,
      '$1    htmlLang: "x",\n    dir: "$2",\n'
    );
    expect(parseLocaleConfig(reordered).metadata.fa.dir).toBe('rtl');
    expect(parseLocaleConfig(reordered).metadata.en.dir).toBe('ltr');
  });

  it('reports a locale without a direction instead of guessing one', () => {
    const withoutDirection = source.replace("    dir: 'rtl',\n", '');
    expect(parseLocaleConfig(withoutDirection).metadata.fa.dir).toBeUndefined();
  });

  it('parses quoted BCP-47 hyphenated locale keys cleanly', () => {
    const bcpSource = `
export const LOCALES = ['en', 'pt-br'] as const;
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_METADATA = {
  en: { dir: 'ltr', htmlLang: 'en', name: 'English', fontFamily: 'var(--font-sans)' },
  'pt-br': { dir: 'ltr', htmlLang: 'pt-BR', name: 'Português', fontFamily: 'var(--font-sans)' },
} satisfies Record<Locale, LocaleMeta>;
`;
    const parsed = parseLocaleConfig(bcpSource);
    expect(parsed.locales).toEqual(['en', 'pt-br']);
    expect(parsed.metadata['pt-br']?.dir).toBe('ltr');
  });

  it('describes the locales this project actually builds', () => {
    const config = readLocaleConfig();
    const settings = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'project.inlang', 'settings.json'),
        'utf-8'
      )
    );
    expect(config.locales).toEqual(settings.locales);
    expect(config.defaultLocale).toBe(settings.baseLocale);
    for (const locale of config.locales) {
      expect(['ltr', 'rtl']).toContain(config.metadata[locale].dir);
    }
  });
});

describe('Paraglide CLI helper (scripts/lib/compile-messages.mjs)', () => {
  it(
    'compiles messages directly under Node without requiring pnpm on PATH',
    () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-paraglide-compile-'));
      try {
        fs.cpSync(path.join(process.cwd(), 'project.inlang'), path.join(tempDir, 'project.inlang'), {
          recursive: true,
        });
        fs.cpSync(path.join(process.cwd(), 'messages'), path.join(tempDir, 'messages'), {
          recursive: true,
        });
        const bin = findParaglideBin(process.cwd());
        expect(bin).toBeTruthy();
        const prevBin = process.env.PARAGLIDE_BIN;
        process.env.PARAGLIDE_BIN = bin!;
        try {
          compileMessages(tempDir);
        } finally {
          if (prevBin === undefined) delete process.env.PARAGLIDE_BIN;
          else process.env.PARAGLIDE_BIN = prevBin;
        }

        expect(fs.existsSync(path.join(tempDir, 'src', 'paraglide', 'messages.js'))).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    },
    20_000
  );
});
