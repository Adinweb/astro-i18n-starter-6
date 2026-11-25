/**
 * Plain default values and pure merge helpers for `app.config.json` + `client/config.json`.
 *
 * This module has no imports on purpose: it is safe to pull into a browser
 * bundle, a Node script or a unit test without dragging Zod into the client bundle.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively merges `override` (`client/config.json`) onto `base` (`app.config.json`).
 * Arrays and primitives replace wholesale; `undefined` fields are ignored.
 */
export function deepMergeConfig<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>
): T {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = result[key];
    if (isPlainObject(value) && isPlainObject(current)) {
      result[key] = deepMergeConfig(current, value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/** TDDDG § 25 / GDPR consent defaults, applied when `cookies` is absent. */
export const COOKIE_CONFIG_DEFAULTS = {
  enabled: true,
  consentVersion: 1,
  storageKey: 'cookie_consent',
  expirationDays: 180,
};

/** Default navbar offset and scroll-to-sticky thresholds (in pixels). */
export const NAVBAR_CONFIG_DEFAULTS = {
  initialTopOffset: 16,
  stickyScrollThreshold: 0,
  stickyTopOffset: 12,
  autoBannerOffset: true,
  manualBannerOffset: 0,
};

/** Default site-wide top announcement banner configuration. */
export const TOP_BANNER_CONFIG_DEFAULTS = {
  enabled: false,
  id: 'site-announcement',
  variant: 'primary' as const,
  icon: 'sparkles',
  badge: '',
  badgeByLocale: {} as Record<string, string>,
  message: '',
  messageByLocale: {} as Record<string, string>,
  ctaLabel: '',
  ctaLabelByLocale: {} as Record<string, string>,
  ctaHref: '',
  ctaHrefByLocale: {} as Record<string, string>,
  external: false,
  dismissible: true,
  excludePaths: [] as string[],
  items: [] as Array<{
    id: string;
    enabled: boolean;
    variant: 'primary' | 'hero' | 'surface' | 'accent' | 'info' | 'warning';
    icon: string;
    badge: string;
    badgeByLocale: Record<string, string>;
    message: string;
    messageByLocale: Record<string, string>;
    ctaLabel: string;
    ctaLabelByLocale: Record<string, string>;
    ctaHref: string;
    ctaHrefByLocale: Record<string, string>;
    external: boolean;
    dismissible: boolean;
    heightPx?: number;
    excludePaths: string[];
  }>,
};

/** Default ChronoTrig reveal timing, travel, stagger, and Lenis smooth-scroll settings. */
export const MOTION_CONFIG_DEFAULTS = {
  revealDelayMs: 0,
  revealDurationMs: 1600,
  revealDistancePx: 56,
  revealSmallDistancePx: 18,
  revealEasing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  staggerStepMs: 80,
  rootMargin: '0px 0px -8% 0px',
  mobileBehavior: 'lightweight' as const,
  smoothScroll: true,
  smoothScrollLerp: 0.125,
};

export const UI_CONFIG_DEFAULTS = {
  ctaPage: 'pricing',
  showSearch: true,
  showThemeToggle: true,
  showLanguageSwitcher: true,
  showTopLoadingBar: true,
  stickyHeader: true,
  navbar: NAVBAR_CONFIG_DEFAULTS,
  topBanner: TOP_BANNER_CONFIG_DEFAULTS,
  motion: MOTION_CONFIG_DEFAULTS,
};
