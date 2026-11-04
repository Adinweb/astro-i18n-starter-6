/**
 * Browser-safe access to `app.config.json`.
 *
 * `app.ts` is the build-time reader: it validates the file with Zod and derives
 * `siteConfig`, `API_CONFIG`, `POSTS_PER_PAGE` and friends. That validation runs
 * at import time, so any module that imports it drags the whole Zod runtime into
 * the browser bundle (measured: ~106 kB raw / ~30 kB gzip on every page).
 *
 * Client scripts therefore read the same file through this module instead: the
 * values still come from `app.config.json` (the single source of truth, already
 * validated by `app.ts` during the build) and the fallbacks come from
 * `defaults.ts`, so nothing is duplicated. Only add a field here when a module
 * that ships to the browser genuinely needs it.
 *
 * Rule of thumb: a module with a `<script>` or imported by one uses `client.ts`;
 * components, views, pages and Node scripts use `app.ts`.
 */

import rawConfig from '../../../app.config.json';
import { COOKIE_CONFIG_DEFAULTS } from './defaults';
import type { CookieConfig } from './app';

/**
 * `cookies` is optional in `app.config.json`: the schema and this module both
 * fall back to `COOKIE_CONFIG_DEFAULTS`. It is therefore read defensively — a
 * named import would stop compiling the moment a project trims the block and
 * relies on the defaults.
 */
const cookieOverrides = (rawConfig as { cookies?: Partial<CookieConfig> }).cookies;

/** Consent configuration for the runtime gatekeeper (`src/libs/cookies/`). */
export const CLIENT_COOKIE_CONFIG: CookieConfig = {
  ...COOKIE_CONFIG_DEFAULTS,
  ...cookieOverrides,
};
