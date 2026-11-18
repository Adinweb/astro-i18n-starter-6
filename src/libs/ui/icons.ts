/**
 * The icon vocabulary of the site, composed from core icons plus client extensions (`client/icons.ts`).
 *
 * `Icon.astro` maps core names statically to per-icon `@tabler/icons-astro` modules and delegates
 * client-added icon names to `client/ClientIcons.astro`.
 */
import { CLIENT_DIRECTIONAL_ICONS, CLIENT_ICONS, type ClientIconName } from '@client/icons';

const CORE_SITE_ICONS = [
  'search',
  'globe',
  'close',
  'check',
  'menu',
  'chevron-left',
  'chevron-right',
  'chevron-down',
  'sun',
  'moon',
  'copy',
  'external-link',
  'arrow-right',
  'shield',
  'mail',
  'layers',
  'home',
  'info',
  'sparkles',
  'tag',
  'newspaper',
  'folder',
  'compass',
  'palette',
  'book-open',
  'star',
  'star-filled',
  'quote',
  'users',
  'building',
  'file',
  'alert-circle',
  'alert-triangle',
  'circle-check',
  'bell',
  'bolt',
  'clock',
  'map-pin',
  'phone',
  'rocket',
  'code',
  'award',
  'layout-grid',
  'calendar',
  'photo',
  'minus',
  'eye',
  'eye-off',
  'shopping-bag',
  'heart',
  'share',
  'chevron-up',
  'dots-vertical',
  'lock',
  'user',
  'adjustments-horizontal',
  'brand-github',
  'brand-x',
  'brand-linkedin',
  'brand-instagram',
  'brand-telegram',
  'brand-whatsapp',
  'filter',
  'map',
  'refresh',
  'wand',
] as const;

export type CoreIconName = (typeof CORE_SITE_ICONS)[number];

export const SITE_ICONS = [...CORE_SITE_ICONS, ...CLIENT_ICONS] as const;

export type IconName = CoreIconName | ClientIconName;

/** Rendered when a name is unknown at runtime (data-driven menus, user content). */
export const FALLBACK_ICON: CoreIconName = 'file';

const CORE_ICON_SET: ReadonlySet<string> = new Set(CORE_SITE_ICONS);
const CLIENT_ICON_SET: ReadonlySet<string> = new Set(CLIENT_ICONS);
const SITE_ICON_SET: ReadonlySet<string> = new Set(SITE_ICONS);

function isCoreIconName(name: string | undefined): name is CoreIconName {
  return typeof name === 'string' && CORE_ICON_SET.has(name);
}

export function isClientIconName(name: string | undefined): name is ClientIconName {
  return typeof name === 'string' && CLIENT_ICON_SET.has(name);
}

export function isIconName(name: string | undefined): name is IconName {
  return typeof name === 'string' && SITE_ICON_SET.has(name);
}

export function resolveCoreIconName(name: string | undefined): CoreIconName {
  return isCoreIconName(name) ? name : FALLBACK_ICON;
}

/**
 * Resolves an arbitrary icon string from content or data to a name this build
 * actually ships. Callers therefore never have to branch on undefined.
 */
export function resolveIconName(name: string | undefined): IconName {
  return isIconName(name) ? name : FALLBACK_ICON;
}

/**
 * Icons that point along the reading direction and therefore mirror in RTL.
 */
const DIRECTIONAL_ICONS: ReadonlySet<string> = new Set<string>([
  'arrow-right',
  'chevron-left',
  'chevron-right',
  ...CLIENT_DIRECTIONAL_ICONS,
]);

export function isDirectionalIcon(name: string | undefined): boolean {
  return isIconName(name) && DIRECTIONAL_ICONS.has(name);
}
