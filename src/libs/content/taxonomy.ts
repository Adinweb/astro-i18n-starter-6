import * as m from '@/paraglide/messages';
import type { Locale } from '@/i18n/locales';
import { humanizeKey } from './blog';

type MessageFunction = (params: Record<string, never>, options: { locale: Locale }) => string;

const catalog = m as unknown as Record<string, MessageFunction | undefined>;

/**
 * Taxonomy keys are language-neutral; their visible labels come from the
 * compiled message dictionaries (`blog_category_<key>`, `blog_tag_<key>`).
 * Unknown keys fall back to a humanized form so new tags never break a build.
 */
function lookup(prefix: string, key: string, locale: Locale): string {
  const message = catalog[`${prefix}${key}`];
  return typeof message === 'function' ? message({}, { locale }) : humanizeKey(key);
}

export function getCategoryLabel(key: string, locale: Locale): string {
  return lookup('blog_category_', key, locale);
}

export function getTagLabel(key: string, locale: Locale): string {
  return lookup('blog_tag_', key, locale);
}
