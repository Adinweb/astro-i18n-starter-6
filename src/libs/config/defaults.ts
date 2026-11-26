/**
 * Plain default values and pure merge helpers for `app.config.json` +
 * `client/config.json` + `client/cms.json`.
 *
 * This module has no imports on purpose: it is safe to pull into a browser
 * bundle, a Node script or a unit test without dragging Zod into the client bundle.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const CMS_STRIP_EMPTY_STRING_KEYS = new Set([
  'id',
  'variant',
  'icon',
  'startsAt',
  'endsAt',
  'dismissMode',
  'dismissTtlDays',
  'dismissVersion',
  'heightPx',
  'type',
  'status',
  'contactEmail',
]);

const CMS_LOCALE_MAP_KEYS = new Set([
  'badgeByLocale',
  'messageByLocale',
  'ctaLabelByLocale',
  'ctaHrefByLocale',
  'labels',
  'descriptions',
  'placeholder',
  'allLabel',
]);

function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Cleans CMS-authored JSON overrides (e.g. `client/cms.json` written by Pages CMS)
 * so omitted/null optional fields or incomplete coordinate/redirect objects never
 * clobber valid defaults or break strict schema validation.
 */
export function sanitizeCmsConfig(raw: unknown): Record<string, unknown> {
  if (!isPlainObject(raw)) return {};

  const walk = (node: unknown, keyName?: string, parentKeyName?: string): unknown => {
    if (node === null || node === undefined) return undefined;

    if (typeof node === 'string') {
      const trimmed = node.trim();
      if (
        trimmed === '' &&
        ((keyName && CMS_STRIP_EMPTY_STRING_KEYS.has(keyName)) ||
          (parentKeyName && CMS_LOCALE_MAP_KEYS.has(parentKeyName)))
      ) {
        return undefined;
      }
      return node;
    }

    if (Array.isArray(node)) {
      const cleaned = node
        .map((item) => walk(item, undefined, keyName))
        .filter((item) => item !== undefined);

      if (keyName === 'redirects') {
        return cleaned.filter((item) => {
          if (!isPlainObject(item)) return false;
          return (
            typeof item.from === 'string' &&
            item.from.trim() !== '' &&
            typeof item.to === 'string' &&
            item.to.trim() !== ''
          );
        });
      }

      if (keyName === 'items') {
        return cleaned.filter((item) => isPlainObject(item));
      }

      return cleaned;
    }

    if (isPlainObject(node)) {
      if (keyName === 'geo') {
        const lat = coerceFiniteNumber(node.lat);
        const lng = coerceFiniteNumber(node.lng);
        if (lat === undefined || lng === undefined) return undefined;
        return { lat, lng };
      }

      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) {
        const cleaned = walk(v, k, keyName);
        if (cleaned !== undefined) {
          out[k] = cleaned;
        }
      }
      if (keyName && CMS_LOCALE_MAP_KEYS.has(keyName) && Object.keys(out).length === 0) {
        return undefined;
      }
      return out;
    }

    return node;
  };

  const sanitized = walk(raw);
  return isPlainObject(sanitized) ? sanitized : {};
}

/**
 * Recursively merges `override` (`client/config.json`) onto `base` (`app.config.json`).
 * Arrays and primitives replace wholesale; `undefined` fields are ignored.
 */
function deepMergeConfig<T extends Record<string, unknown>>(
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

/**
 * Merges the three configuration layers in strict precedence order:
 * `app.config.json` (core) -> `client/config.json` (developer) -> sanitized `client/cms.json` (client CMS).
 */
export function mergeLayeredConfig<T extends Record<string, unknown>>(
  core: T,
  client: Record<string, unknown> = {},
  cms: Record<string, unknown> = {}
): T {
  const withClient = deepMergeConfig(core, client);
  const cleanCms = sanitizeCmsConfig(cms);
  return deepMergeConfig(withClient, cleanCms);
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
  dismissMode: 'session' as 'session' | 'persistent',
  dismissVersion: 1,
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
    dismissMode: 'session' | 'persistent';
    dismissTtlDays?: number;
    dismissVersion: number;
    startsAt?: string;
    endsAt?: string;
    heightPx?: number;
    excludePaths: string[];
  }>,
};

/** Default collapsible floating quick-contact widget settings. */
export const QUICK_CONTACT_CONFIG_DEFAULTS = {
  enabled: true,
  mobileOnly: true,
  channels: ['phone', 'whatsapp', 'telegram'] as Array<'phone' | 'whatsapp' | 'telegram'>,
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
  quickContact: QUICK_CONTACT_CONFIG_DEFAULTS,
  motion: MOTION_CONFIG_DEFAULTS,
};

/** Default analytics integrations (strictly consent-gated unless cookieless opt-out is explicit). */
export const ANALYTICS_CONFIG_DEFAULTS = {
  ga4Id: '',
  gtmId: '',
  plausibleDomain: '',
  plausibleSrc: 'https://plausible.io/js/script.js',
  umamiWebsiteId: '',
  umamiSrc: '',
  clarityId: '',
  consentMode: false,
  allowCookielessWithoutBanner: false,
};

/** Default URL redirects emitted to `dist/_redirects` and `deploy/nginx-redirects.conf`. */
export const REDIRECTS_CONFIG_DEFAULTS: Array<{
  from: string;
  to: string;
  status: 301 | 302;
}> = [];
