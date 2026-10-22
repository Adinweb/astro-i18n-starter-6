import heroPhoto from '@/assets/hero/hero-0.jpg';

/**
 * Shared hero configuration.
 *
 * The hero shell (`src/components/PageHero.astro`) and the components that
 * render its inner content share these values so the accessible name of the
 * region always points at the hero heading, and so every hero background is
 * sized in exactly one place.
 */

/** Id of the hero's `<h1>`, used by `aria-labelledby` on the hero region. */
export const HERO_TITLE_ID = 'page-hero-title';

/**
 * Background used by the hero when a page has no featured image of its own.
 *
 * The photograph is imported straight from `src/assets/`, so Astro hands it
 * over as image metadata: its real dimensions, a hashed URL and the renditions
 * it can optimize. Nothing has to be looked up by path, and no size table has
 * to be kept in sync with the file on disk.
 *
 * The source photograph is shipped at a web-friendly resolution; the original
 * is far too heavy to serve.
 */
export const DEFAULT_HERO_IMAGE = heroPhoto;
