import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { absoluteUrl, siteConfig } from '@/libs/config/app';
import { getBlogPostHref } from '@/libs/content/service';
import {
  isPublished,
  parseContentEntryId,
  sortByPublishedAtDesc,
} from '@/libs/content/entries';
import { getCategoryLabel, getTagLabel } from '@/libs/content/taxonomy';
import { DEFAULT_LOCALE } from '@/i18n/locales';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const posts = sortByPublishedAtDesc(
    (await getCollection('blog')).filter(isPublished)
  );

  const entries = posts
    .map((post) => {
      const { locale } = parseContentEntryId(post.id);
      const url = absoluteUrl(getBlogPostHref(post.data.slug, locale));
      const published = post.data.publishedAt.toISOString();
      const updated = (post.data.updatedAt ?? post.data.publishedAt).toISOString();
      const categories = [
        ...post.data.categories.map((key) => getCategoryLabel(key, locale)),
        ...post.data.tags.map((key) => getTagLabel(key, locale)),
      ]
        .map((term) => `    <category term="${escapeXml(term)}" />`)
        .join('\n');

      return `  <entry xml:lang="${locale}">
    <title>${escapeXml(post.data.title)}</title>
    <link rel="alternate" type="text/html" hreflang="${locale}" href="${escapeXml(url)}" />
    <id>${escapeXml(url)}</id>
    <published>${published}</published>
    <updated>${updated}</updated>
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
  const siteUrl = absoluteUrl('/');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${DEFAULT_LOCALE}">
  <title>${escapeXml(siteConfig.name)}</title>
  <subtitle>${escapeXml(siteConfig.description)}</subtitle>
  <link rel="alternate" type="text/html" href="${escapeXml(siteUrl)}" />
  <link rel="self" type="application/atom+xml" href="${escapeXml(absoluteUrl('/rss.xml'))}" />
  <id>${escapeXml(siteUrl)}</id>
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
};
