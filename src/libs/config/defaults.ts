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
