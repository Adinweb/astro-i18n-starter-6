/**
 * Industry blueprints (`corporate`, `agency`, `portfolio`, `medical`) shared by
 * `site-init.mjs` and `seed-starter.mjs` to bootstrap client projects rapidly.
 */

export const BLUEPRINTS = {
  corporate: {
    label: 'Corporate / B2B Enterprise',
    preset: 'cobalt',
    fontPreset: 'jakarta',
    rtlFontPreset: 'vazirmatn',
    socialCardMode: 'branded',
    businessType: 'Organization',
    ctaPage: 'contact',
    blog: true,
    projects: true,
  },
  agency: {
    label: 'Creative & Digital Agency',
    preset: 'indigo',
    fontPreset: 'outfit',
    rtlFontPreset: 'vazirmatn',
    socialCardMode: 'branded',
    businessType: 'ProfessionalService',
    ctaPage: 'pricing',
    blog: true,
    projects: true,
  },
  portfolio: {
    label: 'Studio / Portfolio Showcase',
    preset: 'slate',
    fontPreset: 'manrope',
    rtlFontPreset: 'vazirmatn',
    socialCardMode: 'artwork',
    businessType: 'ProfessionalService',
    ctaPage: 'contact',
    blog: false,
    projects: true,
  },
  medical: {
    label: 'Medical Clinic & Healthcare',
    preset: 'emerald',
    fontPreset: 'jakarta',
    rtlFontPreset: 'vazirmatn',
    socialCardMode: 'branded',
    businessType: 'MedicalBusiness',
    ctaPage: 'contact',
    blog: true,
    projects: false,
  },
};

export const VALID_BLUEPRINTS = Object.keys(BLUEPRINTS);

export function applyBlueprintToConfig(config, blueprintKey, { rootPresets } = {}) {
  const spec = BLUEPRINTS[blueprintKey];
  if (!spec) {
    throw new Error(
      `Unknown blueprint "${blueprintKey}". Valid options: ${VALID_BLUEPRINTS.join(', ')}.`
    );
  }

  config.brand = {
    ...(config.brand ?? {}),
    preset: spec.preset,
    fontPreset: spec.fontPreset,
    rtlFontPreset: spec.rtlFontPreset,
    socialCardMode: spec.socialCardMode,
  };
  if (rootPresets?.palettes?.[spec.preset]?.primary) {
    config.brand.themeColor = rootPresets.palettes[spec.preset].primary.toLowerCase();
  }
  config.ui = {
    ...(config.ui ?? {}),
    ctaPage: spec.ctaPage,
  };
  config.business = {
    ...(config.business ?? {}),
    type: spec.businessType,
  };
  if (config.content?.types?.blog) {
    config.content.types.blog.enabled = spec.blog;
  }
  if (config.content?.types?.projects) {
    config.content.types.projects.enabled = spec.projects;
  }

  return spec;
}
