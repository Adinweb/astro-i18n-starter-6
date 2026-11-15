/**
 * The icon vocabulary of the site, and nothing else.
 *
 * `Icon.astro` maps each name below to one Tabler icon component (`@tabler/
 * icons-astro`). The list is deliberately a closed union instead of `string`:
 * a typo in a component, or a navigation entry that names an icon nobody
 * registered, fails the type check rather than rendering an empty square.
 *
 * The mapping is static, so the bundler only pulls in the icons that appear
 * here — importing the package barrel and indexing it at runtime would drag the
 * whole set into the build, and inline SVG would then be duplicated per render.
 *
 * This module has no Astro imports on purpose: navigation data and the unit
 * tests can use the names without touching the component layer.
 */

export const SITE_ICONS = [
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
] as const;

export type IconName = (typeof SITE_ICONS)[number];

/** Rendered when a name is unknown at runtime (data-driven menus, user content). */
export const FALLBACK_ICON: IconName = 'file';

const SITE_ICON_SET: ReadonlySet<string> = new Set(SITE_ICONS);

export function isIconName(name: string | undefined): name is IconName {
  return typeof name === 'string' && SITE_ICON_SET.has(name);
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
 * `Button.astro` uses this list to rotate the icon and to decide whether the
 * hover nudge travels forward, so the two never disagree.
 */
const DIRECTIONAL_ICONS: ReadonlySet<IconName> = new Set<IconName>([
  'arrow-right',
  'chevron-left',
  'chevron-right',
]);

export function isDirectionalIcon(name: string | undefined): boolean {
  return isIconName(name) && DIRECTIONAL_ICONS.has(name);
}
