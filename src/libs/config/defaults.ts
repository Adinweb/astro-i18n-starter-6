/**
 * Plain default values for `app.config.json`.
 *
 * They live here rather than in `app.ts` because two consumers must never
 * disagree about them: the Zod schema (which fills a missing key during the
 * build) and `client.ts` (which fills the same key in the browser without
 * importing Zod). One object, two readers — a default cannot drift.
 *
 * This module has no imports on purpose: it is safe to pull into a browser
 * bundle, a Node script or a unit test.
 */

/** TDDDG § 25 / GDPR consent defaults, applied when `cookies` is absent. */
export const COOKIE_CONFIG_DEFAULTS = {
  enabled: true,
  consentVersion: 1,
  storageKey: 'cookie_consent',
  expirationDays: 180,
};
