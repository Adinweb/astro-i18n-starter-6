import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

/**
 * Client-owned Astro page templates (`template: "<name>"` in page frontmatter).
 * Register entries here and `src/views/PageView.astro` resolves them automatically.
 */
export const CLIENT_PAGE_TEMPLATES: Record<string, AstroComponentFactory> = {};
