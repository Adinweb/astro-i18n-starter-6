import { describe, it, expect } from 'vitest';
import { normalizeBatchData } from '../../../scripts/i18n-add-batch.mjs';
import { parseFrontmatter as parsePageFm, stringifyFrontmatter as stringifyPageFm } from '../../../scripts/new-page.mjs';
import { parseFrontmatter as parsePostFm, stringifyFrontmatter as stringifyPostFm } from '../../../scripts/new-post.mjs';

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
});
