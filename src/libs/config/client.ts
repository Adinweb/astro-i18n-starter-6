/**
 * Browser-safe access to merged `app.config.json` + `client/config.json`.
 *
 * `app.ts` validates with Zod at build time; client scripts read through this
 * zero-Zod module so the ~106 kB Zod runtime never enters browser bundles.
 */

import rawConfig from '../../../app.config.json';
import clientConfig from '../../../client/config.json';
import {
  COOKIE_CONFIG_DEFAULTS,
  MOTION_CONFIG_DEFAULTS,
  NAVBAR_CONFIG_DEFAULTS,
  deepMergeConfig,
} from './defaults';
import type { CookieConfig, MotionConfig, NavbarConfig } from './app';

const mergedConfig = deepMergeConfig(
  rawConfig as Record<string, unknown>,
  clientConfig as Record<string, unknown>
);

const cookieOverrides = (mergedConfig as { cookies?: Partial<CookieConfig> }).cookies;
const navbarOverrides = (mergedConfig as { ui?: { navbar?: Partial<NavbarConfig> } }).ui?.navbar;
const motionOverrides = (mergedConfig as { ui?: { motion?: Partial<MotionConfig> } }).ui?.motion;

/** Consent configuration for the runtime gatekeeper (`src/libs/cookies/`). */
export const CLIENT_COOKIE_CONFIG: CookieConfig = {
  ...COOKIE_CONFIG_DEFAULTS,
  ...cookieOverrides,
};

/** Navbar offset and scroll-to-sticky thresholds for browser scripts. */
export const CLIENT_NAVBAR_CONFIG: NavbarConfig = {
  ...NAVBAR_CONFIG_DEFAULTS,
  ...navbarOverrides,
};

/** Reveal entrance timing, travel, stagger, and smooth-scroll settings for browser scripts. */
export const CLIENT_MOTION_CONFIG: MotionConfig = {
  ...MOTION_CONFIG_DEFAULTS,
  ...motionOverrides,
};
