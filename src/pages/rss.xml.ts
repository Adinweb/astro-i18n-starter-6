import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { siteConfig } from '@/libs/config/site';
import { getBlogPostHref } from '@/libs/content/service';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absolute(pathname: string): string {
  return new URL(pathname, siteConfig.url).href;
}

export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog'))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  const entries = posts
    .map((post) => {
      const parts = post.id.split('/');
      const localePart = parts[parts.length - 1];
      const locale = isLocale(localePart) ? localePart : DEFAULT_LOCALE;
      const url = absolute(getBlogPostHref(post.data.slug, locale));
      const published = post.data.publishedAt.toISOString();
      const updated = (post.data.updatedAt ?? post.data.publishedAt).toISOString();

      return `  <entry>
    <title>${escapeXml(post.data.title)}</title>
    <link rel="alternate" type="text/html" hreflang="${locale}" href="${escapeXml(url)}" />
    <id>${escapeXml(url)}</id>
    <published>${published}</published>
    <updated>${updated}</updated>
    <summary>${escapeXml(post.data.description ?? '')}</summary>
  </entry>`;
    })
    .join('\n');

  const latest = posts[0]?.data.publishedAt.toISOString() ?? new Date(0).toISOString();
  const siteUrl = absolute('/');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${DEFAULT_LOCALE}">
  <title>${escapeXml(siteConfig.name)}</title>
  <subtitle>${escapeXml(siteConfig.description)}</subtitle>
  <link rel="alternate" type="text/html" href="${escapeXml(siteUrl)}" />
  <link rel="self" type="application/atom+xml" href="${escapeXml(absolute('/rss.xml'))}" />
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
