/**
 * Browser-safe access to merged `app.config.json` + `client/config.json` + `client/cms.json`.
 *
 * `app.ts` validates with Zod at build time; client scripts read through this
 * zero-Zod module so the ~106 kB Zod runtime never enters browser bundles.
 */

import rawConfig from '../../../app.config.json';
import clientConfig from '../../../client/config.json';
import cmsConfig from '../../../client/cms.json';
import {
  COOKIE_CONFIG_DEFAULTS,
  MOTION_CONFIG_DEFAULTS,
  NAVBAR_CONFIG_DEFAULTS,
  QUICK_CONTACT_CONFIG_DEFAULTS,
  mergeLayeredConfig,
} from './defaults';
import type { CookieConfig, MotionConfig, NavbarConfig, QuickContactConfig } from './app';

const mergedConfig = mergeLayeredConfig(
  rawConfig as Record<string, unknown>,
  clientConfig as Record<string, unknown>,
  cmsConfig as Record<string, unknown>
);

const cookieOverrides = (mergedConfig as { cookies?: Partial<CookieConfig> }).cookies;
const navbarOverrides = (mergedConfig as { ui?: { navbar?: Partial<NavbarConfig> } }).ui?.navbar;
const motionOverrides = (mergedConfig as { ui?: { motion?: Partial<MotionConfig> } }).ui?.motion;
const quickContactOverrides = (
  mergedConfig as { ui?: { quickContact?: Partial<QuickContactConfig> } }
).ui?.quickContact;

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

/** Quick-contact FAB settings for browser scripts. */
export const CLIENT_QUICK_CONTACT_CONFIG: QuickContactConfig = {
  ...QUICK_CONTACT_CONFIG_DEFAULTS,
  ...quickContactOverrides,
};
