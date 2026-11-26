/**
 * Pure SEO title formatting and localized brand name resolution helpers.
 */

const STOCK_SITE_NAME = 'Astro i18n Starter';

export function resolveLocalizedSiteName(
  site: { name: string; localizedNames?: Record<string, string> },
  locale: string,
  localizedDefaultName?: string
): string {
  const explicit = site.localizedNames?.[locale]?.trim();
  if (explicit) return explicit;
  if (localizedDefaultName?.trim() && site.name.trim() === STOCK_SITE_NAME) {
    return localizedDefaultName.trim();
  }
  return site.name;
}

export function formatDocumentTitle(title: string, siteName: string): string {
  const cleanTitle = title.trim();
  const cleanSite = siteName.trim();
  if (!cleanTitle) return cleanSite;
  if (!cleanSite) return cleanTitle;

  const lowerTitle = cleanTitle.toLowerCase();
  const lowerSite = cleanSite.toLowerCase();
  if (
    lowerTitle === lowerSite ||
    lowerTitle.endsWith(`| ${lowerSite}`) ||
    lowerTitle.endsWith(`— ${lowerSite}`)
  ) {
    return cleanTitle;
  }

  return `${cleanTitle} | ${cleanSite}`;
}
