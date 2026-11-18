import type { Locale } from '@/i18n/locales';
import type { FooterColumn, NavItem, NavContext } from '@/libs/config/navigation';
import * as m from '@/paraglide/messages';

export interface ClientPageNavItem {
  readonly group: string;
  readonly icon: string;
  readonly label: (locale: Locale) => string;
}

/**
 * Pages listed in the primary header, mobile drawer, and footer pages column.
 * A page only renders once at least one published translation exists for the active locale.
 */
export const CLIENT_PAGE_ITEMS: readonly ClientPageNavItem[] = [
  { group: 'home', icon: 'home', label: (locale: Locale) => m.nav_home({}, { locale }) },
];

/**
 * Optional client-owned primary navigation items appended after content types
 * (for example custom dropdowns or anchor links).
 */
export async function getClientPrimaryExtras(_ctx: NavContext): Promise<NavItem[]> {
  return [];
}

/**
 * Optional extra footer columns appended alongside generated footer columns.
 */
export async function getClientFooterColumns(_ctx: NavContext): Promise<FooterColumn[]> {
  return [];
}

/**
 * Optional legal links rendered in the bottom footer bar.
 */
export async function getClientLegalNavigation(_ctx: NavContext): Promise<NavItem[]> {
  return [];
}
