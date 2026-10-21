/**
 * Shared hero configuration.
 *
 * The hero shell (`src/components/PageHero.astro`) and the components that
 * render its inner content share these values so the accessible name of the
 * region always points at the hero heading.
 */

/** Id of the hero's `<h1>`, used by `aria-labelledby` on the hero region. */
export const HERO_TITLE_ID = 'page-hero-title';

/**
 * Background artwork used by the hero when a page has no featured image of its
 * own. Served from `public/`, so it is referenced as an absolute path.
 *
 * Regenerate it with `pnpm run assets:generate`; it is drawn from code, so
 * the file stays reproducible.
 */
export const DEFAULT_HERO_IMAGE = '/images/hero/default.png';
