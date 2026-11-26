/**
 * Industry blueprints (`corporate`, `agency`, `portfolio`, `medical`, `catalog`, `legal`)
 * shared by `site-init.mjs`, `seed-starter.mjs`, and `site-apply.mjs` to bootstrap
 * client projects rapidly.
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
    contentTypes: {
      solutions: {
        enabled: true,
        base: 'solutions',
        index: true,
        paginated: false,
        feed: false,
        nav: true,
        icon: 'building',
        labels: { en: 'Solutions', fa: 'راهکارها' },
        descriptions: {
          en: 'Enterprise solutions tailored to your operations.',
          fa: 'راهکارهای سازمانی متناسب با نیاز کسب‌وکار شما.',
        },
        fields: [
          {
            name: 'industry',
            type: 'enum',
            options: ['finance', 'manufacturing', 'logistics', 'saas'],
            showOnCard: 'badge',
            filter: { enabled: true, mode: 'select', sort: 'config' },
          },
          {
            name: 'deployment',
            type: 'enum',
            options: ['cloud', 'on-premise', 'hybrid'],
            showOnCard: 'meta',
            filter: { enabled: true, mode: 'single', sort: 'config' },
          },
          {
            name: 'sla',
            type: 'string',
            showOnCard: 'meta',
          },
        ],
      },
    },
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
    contentTypes: {
      gallery: {
        enabled: true,
        base: 'gallery',
        index: true,
        paginated: false,
        feed: false,
        nav: true,
        icon: 'photo',
        labels: { en: 'Gallery', fa: 'گالری آثار' },
        descriptions: {
          en: 'Selected brand, product, and visual showcase work.',
          fa: 'گزیده‌ای از پروژه‌ها و آثار بصری.',
        },
        card: { layout: 'gallery', aspectRatio: 'square', badgeField: 'discipline', badgeLimit: 2 },
        fields: [
          {
            name: 'discipline',
            type: 'enum',
            options: ['branding', 'web', 'motion', 'print'],
            showOnCard: 'badge',
            filter: { enabled: true, mode: 'single', sort: 'config' },
          },
          {
            name: 'year',
            type: 'number',
            min: 2000,
            max: 2100,
            showOnCard: 'meta',
            filter: { enabled: true, mode: 'range' },
          },
        ],
      },
    },
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
    contentTypes: {
      gallery: {
        enabled: true,
        base: 'gallery',
        index: true,
        paginated: false,
        feed: false,
        nav: true,
        icon: 'photo',
        labels: { en: 'Gallery', fa: 'گالری' },
        descriptions: {
          en: 'Visual archive and creative showcase.',
          fa: 'آرشیو بصری و نمایشگاه آثار.',
        },
        card: { layout: 'gallery', aspectRatio: 'square', badgeField: 'discipline', badgeLimit: 2 },
        fields: [
          {
            name: 'discipline',
            type: 'enum',
            options: ['branding', 'photography', 'editorial', 'digital'],
            showOnCard: 'badge',
            filter: { enabled: true, mode: 'single', sort: 'config' },
          },
          {
            name: 'year',
            type: 'number',
            min: 2000,
            max: 2100,
            showOnCard: 'meta',
            filter: { enabled: true, mode: 'range' },
          },
        ],
      },
    },
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
    contentTypes: {
      services: {
        enabled: true,
        base: 'services',
        index: true,
        paginated: false,
        feed: false,
        nav: true,
        icon: 'heart',
        labels: { en: 'Medical Services', fa: 'خدمات درمانی' },
        descriptions: {
          en: 'Specialized clinical care and outpatient treatments.',
          fa: 'خدمات تخصصی پزشکی و مراقبت‌های سرپایی.',
        },
        fields: [
          {
            name: 'department',
            type: 'enum',
            options: ['cardiology', 'dermatology', 'pediatrics', 'diagnostics'],
            showOnCard: 'badge',
            filter: { enabled: true, mode: 'select', sort: 'config' },
          },
          {
            name: 'accepting_patients',
            type: 'boolean',
            default: true,
            showOnCard: 'meta',
            filter: { enabled: true, mode: 'toggle' },
          },
        ],
      },
    },
  },
  catalog: {
    label: 'Product Catalog & Showcase',
    preset: 'amber',
    fontPreset: 'jakarta',
    rtlFontPreset: 'vazirmatn',
    socialCardMode: 'artwork',
    businessType: 'Store',
    ctaPage: 'contact',
    blog: true,
    projects: true,
    contentTypes: {
      products: {
        enabled: true,
        base: 'products',
        index: true,
        paginated: true,
        perPage: 12,
        feed: false,
        nav: true,
        icon: 'shopping-bag',
        labels: { en: 'Products', fa: 'محصولات' },
        descriptions: {
          en: 'Explore our curated product catalog.',
          fa: 'مشاهده کاتالوگ محصولات و مشخصات فنی.',
        },
        card: {
          layout: 'grid',
          aspectRatio: 'video',
          badgeField: 'category',
          badgeLimit: 2,
          metaFields: ['price', 'sku'],
        },
        fields: [
          {
            name: 'category',
            type: 'enum',
            options: ['hardware', 'accessories', 'bundles', 'software'],
            showOnCard: 'badge',
            filter: { enabled: true, mode: 'single', sort: 'config' },
          },
          {
            name: 'price',
            type: 'number',
            min: 0,
            showOnCard: 'meta',
            filter: { enabled: true, mode: 'range' },
          },
          {
            name: 'in_stock',
            type: 'boolean',
            default: true,
            filter: { enabled: true, mode: 'toggle' },
          },
          {
            name: 'sku',
            type: 'string',
            showOnCard: 'meta',
          },
        ],
      },
    },
  },
  legal: {
    label: 'Legal, Consulting & Advisory',
    preset: 'slate',
    fontPreset: 'editorial',
    rtlFontPreset: 'vazirmatn',
    socialCardMode: 'branded',
    businessType: 'ProfessionalService',
    ctaPage: 'contact',
    blog: true,
    projects: false,
    contentTypes: {
      practices: {
        enabled: true,
        base: 'practices',
        index: true,
        paginated: false,
        feed: false,
        nav: true,
        icon: 'shield',
        labels: { en: 'Practice Areas', fa: 'حوزه‌های حقوقی' },
        descriptions: {
          en: 'Dedicated legal advisory across core practice areas.',
          fa: 'مشاوره و وکالت تخصصی در حوزه‌های کلیدی حقوقی.',
        },
        fields: [
          {
            name: 'practice_area',
            type: 'enum',
            options: ['corporate', 'litigation', 'ip', 'employment'],
            showOnCard: 'badge',
            filter: { enabled: true, mode: 'select', sort: 'config' },
          },
          {
            name: 'jurisdiction',
            type: 'string',
            showOnCard: 'meta',
          },
        ],
      },
    },
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

  config.content = {
    ...(config.content ?? {}),
    types: {
      ...(config.content?.types ?? {}),
    },
  };
  if (config.content.types.blog) {
    config.content.types.blog.enabled = spec.blog;
  }
  if (config.content.types.projects) {
    config.content.types.projects.enabled = spec.projects;
  }

  if (spec.contentTypes) {
    for (const [typeKey, typeDef] of Object.entries(spec.contentTypes)) {
      if (!config.content.types[typeKey]) {
        config.content.types[typeKey] = structuredClone(typeDef);
      } else {
        config.content.types[typeKey] = {
          ...structuredClone(typeDef),
          ...config.content.types[typeKey],
        };
      }
    }
  }

  return spec;
}
