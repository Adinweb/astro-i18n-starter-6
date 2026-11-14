import type { APIRoute } from 'astro';
import { siteConfig } from '@/libs/config/app';
import { parseContentEntryId } from '@/libs/content/entries';
import { buildOgRouteKey, renderBrandedOgPng, type SocialCardContext } from '@/libs/content/og-card';
import { getSiteRoutes } from '@/libs/content/service';
import { getCategoryLabel } from '@/libs/content/taxonomy';
import { getContentTypeDescription, getContentTypeLabel } from '@/libs/content/types';
import { formatNumber } from '@/i18n/format';
import * as m from '@/paraglide/messages';

export async function getStaticPaths() {
  if (siteConfig.socialCardMode !== 'branded') {
    return [];
  }

  const routes = await getSiteRoutes();
  const seen = new Set<string>();
  const paths: Array<{ params: { slug: string }; props: SocialCardContext }> = [];

  const register = (context: SocialCardContext) => {
    if (seen.has(context.routeKey)) return;
    seen.add(context.routeKey);
    paths.push({
      params: { slug: context.routeKey },
      props: context,
    });
  };

  for (const route of routes) {
    const { props } = route;
    const { locale } = props;

    if (props.routeType === 'page') {
      const { group } = parseContentEntryId(props.entry.id);
      register({
        routeKey: buildOgRouteKey('page', { group, locale }),
        title: props.entry.data.title,
        subtitle: props.entry.data.description,
        kicker: siteConfig.name,
        locale,
      });
    } else if (props.routeType === 'blog-entry') {
      const { group } = parseContentEntryId(props.entry.id);
      const primaryCategory = props.entry.data.categories[0];
      register({
        routeKey: buildOgRouteKey('blog-entry', { group, locale }),
        title: props.entry.data.title,
        subtitle: props.entry.data.description,
        kicker: primaryCategory
          ? getCategoryLabel(primaryCategory, locale)
          : m.nav_blog({}, { locale }),
        locale,
      });
    } else if (props.routeType === 'blog-index') {
      const baseTitle = m.nav_blog({}, { locale });
      const pageStatus = m.blog_pagination_status(
        { page: formatNumber(props.page, locale), totalPages: formatNumber(props.totalPages, locale) },
        { locale }
      );
      const title = props.page > 1 ? `${baseTitle} — ${pageStatus}` : baseTitle;
      register({
        routeKey: buildOgRouteKey('blog-index', { page: props.page, locale }),
        title,
        subtitle: m.blog_index_description({}, { locale }),
        kicker: siteConfig.name,
        locale,
      });
    } else if (props.routeType === 'collection-entry') {
      const { group } = parseContentEntryId(props.entry.id);
      register({
        routeKey: buildOgRouteKey('collection-entry', {
          contentType: props.contentType,
          group,
          locale,
        }),
        title: props.entry.data.title,
        subtitle: props.entry.data.description,
        kicker: getContentTypeLabel(props.contentType, locale),
        locale,
      });
    } else if (props.routeType === 'collection-index') {
      const baseTitle = getContentTypeLabel(props.contentType, locale);
      const pageStatus = m.blog_pagination_status(
        { page: formatNumber(props.page, locale), totalPages: formatNumber(props.totalPages, locale) },
        { locale }
      );
      const title = props.page > 1 ? `${baseTitle} — ${pageStatus}` : baseTitle;
      register({
        routeKey: buildOgRouteKey('collection-index', {
          contentType: props.contentType,
          page: props.page,
          locale,
        }),
        title,
        subtitle: getContentTypeDescription(props.contentType, locale),
        kicker: siteConfig.name,
        locale,
      });
    }
  }

  return paths;
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderBrandedOgPng(props as SocialCardContext);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
