/**
 * Browser-safe access to merged `app.config.json` + `client/config.json`.
 *
 * `app.ts` validates with Zod at build time; client scripts read through this
 * zero-Zod module so the ~106 kB Zod runtime never enters browser bundles.
 */

import rawConfig from '../../../app.config.json';
import clientConfig from '../../../client/config.json';
import { COOKIE_CONFIG_DEFAULTS, deepMergeConfig } from './defaults';
import type { CookieConfig } from './app';

const mergedConfig = deepMergeConfig(
  rawConfig as Record<string, unknown>,
  clientConfig as Record<string, unknown>
);

const cookieOverrides = (mergedConfig as { cookies?: Partial<CookieConfig> }).cookies;

/** Consent configuration for the runtime gatekeeper (`src/libs/cookies/`). */
export const CLIENT_COOKIE_CONFIG: CookieConfig = {
  ...COOKIE_CONFIG_DEFAULTS,
  ...cookieOverrides,
};
