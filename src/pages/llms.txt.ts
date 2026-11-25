import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, LOCALES, LOCALE_METADATA } from '@/i18n/locales';
import { absoluteUrl, siteConfig } from '@/libs/config/app';
import { getSiteRoutes } from '@/libs/content/service';

/**
 * Generates `/llms.txt` as a clean Markdown index of published default-locale
 * pages, articles, and collections for AI/LLM crawlers without server overhead.
 */
export const GET: APIRoute = async () => {
  const routes = await getSiteRoutes();
  const defaultRoutes = routes.filter((route) => route.props.locale === DEFAULT_LOCALE);

  const pageLines: string[] = [];
  const blogLines: string[] = [];
  let blogIndexUrl: string | undefined;
  const collectionMap = new Map<string, string[]>();
  const collectionIndexMap = new Map<string, string>();

  for (const route of defaultRoutes) {
    const props = route.props;
    const href = absoluteUrl(props.url);

    if (props.routeType === 'page') {
      const { title, description } = props.entry.data;
      pageLines.push(`- [${title}](${href})${description ? `: ${description}` : ''}`);
    } else if (props.routeType === 'blog-index' && props.page === 1) {
      blogIndexUrl = href;
    } else if (props.routeType === 'blog-entry') {
      const { title, description } = props.entry.data;
      blogLines.push(`- [${title}](${href})${description ? `: ${description}` : ''}`);
    } else if (props.routeType === 'collection-index' && props.page === 1) {
      collectionIndexMap.set(props.contentType, href);
    } else if (props.routeType === 'collection-entry') {
      const key = props.contentType;
      const list = collectionMap.get(key) ?? [];
      const { title, description } = props.entry.data;
      list.push(`- [${title}](${href})${description ? `: ${description}` : ''}`);
      collectionMap.set(key, list);
    }
  }

  const localeSummary = LOCALES.map(
    (loc) => `${LOCALE_METADATA[loc].name} (${loc}, ${LOCALE_METADATA[loc].dir.toUpperCase()})`
  ).join(', ');

  const sections: string[] = [
    `# ${siteConfig.name}`,
    '',
    `> ${siteConfig.description}`,
    '',
    `- Canonical URL: ${absoluteUrl('/')}`,
    `- Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    `- Active Locales: ${localeSummary}`,
    ...(siteConfig.contactEmail ? [`- Contact: mailto:${siteConfig.contactEmail}`] : []),
  ];

  if (pageLines.length > 0) {
    sections.push('', '## Pages', '', ...pageLines);
  }

  if (blogLines.length > 0) {
    sections.push(
      '',
      '## Blog',
      '',
      ...(blogIndexUrl ? [`- Index: ${blogIndexUrl}`] : []),
      ...blogLines
    );
  }

  for (const [collectionKey, entries] of collectionMap.entries()) {
    if (entries.length === 0) continue;
    const heading = collectionKey.charAt(0).toUpperCase() + collectionKey.slice(1);
    const indexHref = collectionIndexMap.get(collectionKey);
    sections.push(
      '',
      `## ${heading}`,
      '',
      ...(indexHref ? [`- Index: ${indexHref}`] : []),
      ...entries
    );
  }

  const body = `${sections.join('\n')}\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
