import { describe, expect, it } from 'vitest';
import { formatDocumentTitle, resolveLocalizedSiteName } from './seo';

describe('seo helpers', () => {
  it('deduplicates identical or already-suffixed document titles', () => {
    expect(formatDocumentTitle('Astro i18n Starter', 'Astro i18n Starter')).toBe(
      'Astro i18n Starter'
    );
    expect(formatDocumentTitle('استارتر چندزبانه Astro', 'استارتر چندزبانه Astro')).toBe(
      'استارتر چندزبانه Astro'
    );
    expect(formatDocumentTitle('About', 'Astro i18n Starter')).toBe('About | Astro i18n Starter');
    expect(formatDocumentTitle('About | Astro i18n Starter', 'Astro i18n Starter')).toBe(
      'About | Astro i18n Starter'
    );
  });

  it('resolves localized site names with agency customization priority', () => {
    expect(
      resolveLocalizedSiteName(
        { name: 'Astro i18n Starter' },
        'fa',
        'استارتر چندزبانه Astro'
      )
    ).toBe('استارتر چندزبانه Astro');

    expect(
      resolveLocalizedSiteName(
        { name: 'Acme Corp', localizedNames: { fa: 'شرکت اَکمی' } },
        'fa',
        'استارتر چندزبانه Astro'
      )
    ).toBe('شرکت اَکمی');

    expect(
      resolveLocalizedSiteName({ name: 'Acme Corp' }, 'fa', 'استارتر چندزبانه Astro')
    ).toBe('Acme Corp');
  });
});
