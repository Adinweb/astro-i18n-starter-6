/**
 * Blog index configuration.
 *
 * The index is a three-column grid, so nine posts fill exactly three rows: a
 * full screen of cards on a wide viewport, and still a small enough HTML
 * payload for a static site.
 *
 * The value is the single source of truth for how many posts a page holds.
 * The route builder (`src/libs/content/service.ts`) and the blog index view
 * both read it, so the number of generated pages and the number of rendered
 * cards can never drift apart.
 */
export const POSTS_PER_PAGE = 9;
