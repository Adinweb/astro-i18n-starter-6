import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE, LOCALES, LOCALE_METADATA, type Locale } from '@/i18n/locales';
import { absoluteUrl, siteConfig } from '@/libs/config/app';
import { resolveLocalizedSiteName } from '@/libs/content/seo';
import { getSiteRoutes } from '@/libs/content/service';
import * as m from '@/paraglide/messages';

function buildLocaleSections(
  routes: Awaited<ReturnType<typeof getSiteRoutes>>,
  targetLocale: Locale,
  headingPrefix = ''
): string[] {
  const localeRoutes = routes.filter((route) => route.props.locale === targetLocale);
  const pageLines: string[] = [];
  const blogLines: string[] = [];
  let blogIndexUrl: string | undefined;
  const collectionMap = new Map<string, string[]>();
  const collectionIndexMap = new Map<string, string>();

  for (const route of localeRoutes) {
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

  const out: string[] = [];
  if (pageLines.length > 0) {
    out.push('', `## ${headingPrefix}Pages`, '', ...pageLines);
  }
  if (blogLines.length > 0) {
    out.push(
      '',
      `## ${headingPrefix}Blog`,
      '',
      ...(blogIndexUrl ? [`- Index: ${blogIndexUrl}`] : []),
      ...blogLines
    );
  }
  for (const [collectionKey, entries] of collectionMap.entries()) {
    if (entries.length === 0) continue;
    const heading = collectionKey.charAt(0).toUpperCase() + collectionKey.slice(1);
    const indexHref = collectionIndexMap.get(collectionKey);
    out.push(
      '',
      `## ${headingPrefix}${heading}`,
      '',
      ...(indexHref ? [`- Index: ${indexHref}`] : []),
      ...entries
    );
  }
  return out;
}

/**
 * Generates `/llms.txt` as a clean Markdown index of published pages, articles,
 * and collections across all active locales for AI/LLM crawlers without server overhead.
 */
export const GET: APIRoute = async () => {
  const routes = await getSiteRoutes();
  const siteName = resolveLocalizedSiteName(
    siteConfig,
    DEFAULT_LOCALE,
    m.site_name({}, { locale: DEFAULT_LOCALE })
  );
  const siteDescription =
    m.site_description({}, { locale: DEFAULT_LOCALE }) || siteConfig.description;

  const localeSummary = LOCALES.map(
    (loc) => `${LOCALE_METADATA[loc].name} (${loc}, ${LOCALE_METADATA[loc].dir.toUpperCase()})`
  ).join(', ');

  const sections: string[] = [
    `# ${siteName}`,
    '',
    `> ${siteDescription}`,
    '',
    `- Canonical URL: ${absoluteUrl('/')}`,
    `- Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    `- Active Locales: ${localeSummary}`,
    ...(siteConfig.contactEmail ? [`- Contact: mailto:${siteConfig.contactEmail}`] : []),
    ...buildLocaleSections(routes, DEFAULT_LOCALE),
  ];

  for (const loc of LOCALES) {
    if (loc === DEFAULT_LOCALE) continue;
    const meta = LOCALE_METADATA[loc];
    const localizedSections = buildLocaleSections(routes, loc, `${meta.name} (${loc}) — `);
    if (localizedSections.length > 0) {
      sections.push(...localizedSections);
    }
  }

  const body = `${sections.join('\n')}\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
