/**
 * Client-owned icon extensions.
 * Register custom icon names here and map them to components in `client/ClientIcons.astro`.
 */
export const CLIENT_ICONS = [] as const;

export type ClientIconName = (typeof CLIENT_ICONS)[number];

/** Custom client icons that should mirror (`rtl:rotate-180`) in RTL layouts. */
export const CLIENT_DIRECTIONAL_ICONS = [] as const;
