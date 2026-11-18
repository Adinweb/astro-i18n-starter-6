import type { Locale } from '@/i18n/locales';
import { getBlogIndexHref, getPageUrl } from '@/libs/content/service';
import { getContentType } from '@/libs/content/types';
import type { FooterColumn, NavContext, NavItem } from '@/libs/config/navigation';
import * as m from '@/paraglide/messages';

export interface ClientPageNavItem {
  readonly group: string;
  readonly icon: string;
  readonly label: (locale: Locale) => string;
}

/**
 * Full starter-kit navigation pages. Copy to `client/navigation.ts` or run `npm run starter:seed`.
 */
export const CLIENT_PAGE_ITEMS: readonly ClientPageNavItem[] = [
  { group: 'home', icon: 'home', label: (locale: Locale) => m.nav_home({}, { locale }) },
  { group: 'features', icon: 'sparkles', label: (locale: Locale) => m.nav_features({}, { locale }) },
  { group: 'pricing', icon: 'tag', label: (locale: Locale) => m.nav_pricing({}, { locale }) },
  { group: 'components', icon: 'layout-grid', label: (locale: Locale) => m.nav_components({}, { locale }) },
  { group: 'about', icon: 'info', label: (locale: Locale) => m.nav_about({}, { locale }) },
];

/**
 * Resources dropdown linking to Overview and deep anchors inside `features` (`#rtl`, `#design`).
 */
export async function getClientPrimaryExtras(ctx: NavContext): Promise<NavItem[]> {
  const { locale, currentUrl, isActive } = ctx;
  const featuresHref = await getPageUrl('features', locale);
  const blogHref = getContentType('blog').enabled ? getBlogIndexHref(locale) : null;
  const overviewHref = featuresHref ?? blogHref;
  if (!overviewHref) return [];

  const exploreChildren: NavItem[] = featuresHref
    ? [
        {
          key: 'rtl_support',
          label: m.nav_rtl_support({}, { locale }),
          href: `${featuresHref}#rtl`,
          icon: 'globe',
          active: false,
        },
        {
          key: 'design_system',
          label: m.nav_design_system({}, { locale }),
          href: `${featuresHref}#design`,
          icon: 'palette',
          active: false,
        },
      ]
    : [];

  const resourcesChildren: NavItem[] = [
    {
      key: 'overview',
      label: m.nav_overview({}, { locale }),
      href: overviewHref,
      icon: 'book-open',
      active: featuresHref ? false : isActive(overviewHref, currentUrl),
    },
    ...(exploreChildren.length > 0
      ? [
          {
            key: 'explore',
            label: m.nav_explore({}, { locale }),
            icon: 'compass',
            active: exploreChildren.some((child) => child.active),
            children: exploreChildren,
          },
        ]
      : []),
  ];

  return [
    {
      key: 'resources',
      label: m.nav_resources({}, { locale }),
      icon: 'layers',
      active: resourcesChildren.some((child) => child.active),
      children: resourcesChildren,
    },
  ];
}

export async function getClientFooterColumns(_ctx: NavContext): Promise<FooterColumn[]> {
  return [];
}

/**
 * Legal anchors pointing into the `about` page (`#privacy`, `#terms`).
 */
export async function getClientLegalNavigation(ctx: NavContext): Promise<NavItem[]> {
  const aboutHref = await getPageUrl('about', ctx.locale);
  if (!aboutHref) return [];
  return [
    {
      key: 'privacy',
      label: m.footer_legal_privacy({}, { locale: ctx.locale }),
      href: `${aboutHref}#privacy`,
      active: false,
    },
    {
      key: 'terms',
      label: m.footer_legal_terms({}, { locale: ctx.locale }),
      href: `${aboutHref}#terms`,
      active: false,
    },
  ];
}
