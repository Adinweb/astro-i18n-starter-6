import { getCollection } from 'astro:content';
import { getLocaleMeta, type Locale } from '@/i18n/locales';
import { localizeHref } from '@/i18n/paths';
import { absoluteUrl, siteConfig } from '@/libs/config/app';
import { getSortedLocaleEntries } from '@/libs/content/entries';
import { getBlogPostHref, getRssFeedHref } from '@/libs/content/service';
import { getCategoryLabel, getTagLabel } from '@/libs/content/taxonomy';
import * as m from '@/paraglide/messages';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds a single-language Atom 1.0 feed containing only the published blog
 * articles of `locale`, with localized metadata and `xml:lang`.
 */
export async function buildLocaleAtomFeed(locale: Locale): Promise<Response> {
  const meta = getLocaleMeta(locale);
  const posts = getSortedLocaleEntries(await getCollection('blog'), locale);

  const entries = posts
    .map((post) => {
      const url = absoluteUrl(getBlogPostHref(post.data.slug, locale));
      const published = post.data.publishedAt.toISOString();
      const updated = (post.data.updatedAt ?? post.data.publishedAt).toISOString();
      const authorName = post.data.author ?? siteConfig.name;
      const categories = [
        ...post.data.categories.map((key) => getCategoryLabel(key, locale)),
        ...post.data.tags.map((key) => getTagLabel(key, locale)),
      ]
        .map((term) => `    <category term="${escapeXml(term)}" />`)
        .join('\n');

      return `  <entry xml:lang="${escapeXml(meta.htmlLang)}">
    <title>${escapeXml(post.data.title)}</title>
    <link rel="alternate" type="text/html" hreflang="${escapeXml(locale)}" href="${escapeXml(url)}" />
    <id>${escapeXml(url)}</id>
    <published>${published}</published>
    <updated>${updated}</updated>
    <author>
      <name>${escapeXml(authorName)}</name>
    </author>
    <summary>${escapeXml(post.data.description ?? '')}</summary>${categories ? `\n${categories}` : ''}
  </entry>`;
    })
    .join('\n');

  const latestTimestamp = posts.reduce((latest, post) => {
    const updated = (post.data.updatedAt ?? post.data.publishedAt).getTime();
    return Math.max(latest, updated);
  }, 0);
  const latest =
    posts.length > 0 ? new Date(latestTimestamp).toISOString() : new Date().toISOString();
  const localeHomeUrl = absoluteUrl(localizeHref('/', locale));
  const selfFeedUrl = absoluteUrl(getRssFeedHref(locale));
  const subtitle = m.site_description({}, { locale });

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(meta.htmlLang)}">
  <title>${escapeXml(`${siteConfig.name} — ${meta.name}`)}</title>
  <subtitle>${escapeXml(subtitle)}</subtitle>
  <link rel="alternate" type="text/html" hreflang="${escapeXml(locale)}" href="${escapeXml(localeHomeUrl)}" />
  <link rel="self" type="application/atom+xml" href="${escapeXml(selfFeedUrl)}" />
  <id>${escapeXml(selfFeedUrl)}</id>
  <updated>${latest}</updated>
  <author>
    <name>${escapeXml(siteConfig.name)}</name>
  </author>
${entries}
</feed>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
