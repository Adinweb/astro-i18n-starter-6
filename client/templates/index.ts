import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

/**
 * Client-owned Astro page templates (`template: "<name>"` in page frontmatter).
 * Register entries here and `src/views/PageView.astro` resolves them automatically.
 */
export const CLIENT_PAGE_TEMPLATES: Record<string, AstroComponentFactory> = {};

/**
 * Client-owned Astro templates for content collections (`blog`, `projects`, or
 * any custom collection in `content.types`).
 *
 * Resolution order:
 * - Entry views: `entry.data.template` -> `"<collection>:entry"` -> `"<collection>"`
 * - Index views: `"<collection>:index"`
 */
export const CLIENT_COLLECTION_TEMPLATES: Record<string, AstroComponentFactory> = {};
