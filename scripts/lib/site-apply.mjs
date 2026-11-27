/**
 * One-shot declarative site provisioner (`npm run site:apply`).
 *
 * Accepts a structured JSON spec and applies:
 *   1. Blueprint & three-tier config (`client/config.json`: site, brand, business,
 *      social, analytics, cookies, api, redirects, ui, content.types, ui.navigation,
 *      ui.homeSections)
 *   2. Collection schema & directory sync (`content:sync`)
 *   3. Client message dictionary overrides (`client/messages/<locale>.json`)
 *   4. Pages (`src/content/pages/<group>/<locale>.mdx`) & `ui.navigation.pages`
 *   5. Collection entries (`src/content/<collection>/<group>/<locale>.mdx`)
 *   6. Locale mode / default-locale switches (`client/locales.json`)
 *   7. Automatic missing-key sync (`i18n:sync-keys`) + Paraglide compile
 *   8. Brand asset refresh (`generate-assets.mjs --brand-only --force`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { applyBlueprintToConfig, VALID_BLUEPRINTS } from './blueprints.mjs';
import { compileMessages } from './compile-messages.mjs';
import { deepMergeConfig, readCoreAndClientConfig, writeClientConfig } from './config.mjs';
import { contentStub, postStub } from './content-stub.mjs';
import { getKnownTypes } from './content-types.mjs';
import { parseFrontmatter, stringifyFrontmatter } from './frontmatter.mjs';
import { syncDictionaryKeys } from './i18n-sync.mjs';
import { placeArtworkFor } from './image-reference.mjs';
import { readLocaleConfig } from './locales.mjs';
import { switchDefaultLocale, switchToSingleLocale } from './locale-mutations.mjs';
import {
  readClientMessages,
  readCoreMessages,
  stripSchema,
  writeClientMessages,
} from './merge-messages.mjs';
import { syncCollections } from '../content-sync.mjs';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_KEY_RE = /^[a-z0-9-]+$/;
const VALID_OG_MODES = new Set(['branded', 'artwork', 'default']);
const VALID_THEMES = new Set(['system', 'light', 'dark']);
const VALID_HERO_VALUES = new Set(['none', 'minimal', 'default', true, false]);
const VALID_CONTAINER_VALUES = new Set(['canvas', 'contained', 'prose']);
const VALID_LOGO_EXTS = new Set(['.svg', '.png', '.webp', '.jpg', '.jpeg']);

const VALID_SECTION_BLOCKS = new Set([
  'LandingHeroSplit',
  'HeroCenteredEditorial',
  'HeroDashboardShowcase',
  'HeroCommandCli',
  'HeroInteractivePrompt',
  'HeroProofMarquee',
  'HeroFloatingOrbSplit',
  'BentoCapabilities',
  'ProofStatsRow',
  'FaqAccordion',
  'CtaBanner',
  'PricingSection',
  'TestimonialGrid',
  'TeamSection',
  'PartnerLogos',
  'NewsletterBanner',
  'PromoBanner',
  'AboutSplitSection',
  'ProcessSteps',
  'FeatureTabsSection',
  'ComparisonTable',
  'FeatureCardGrid',
  'ImageGallerySection',
  'LatestPostsSection',
  'ContactSplitSection',
  'CarouselSection',
  'ProductShowcaseGrid',
  'AuthFormCard',
  'ParallaxSection',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function loadThemePresets(rootDir) {
  const presetsPath = path.join(rootDir, 'src', 'libs', 'config', 'theme-presets.json');
  const fallbackPath = path.join(defaultRootDir, 'src', 'libs', 'config', 'theme-presets.json');
  const target = fs.existsSync(presetsPath) ? presetsPath : fallbackPath;
  return JSON.parse(fs.readFileSync(target, 'utf-8'));
}

function validateSectionArray(sections, location, errors) {
  if (!Array.isArray(sections)) {
    errors.push(`${location} must be an array of { block, props }.`);
    return;
  }
  sections.forEach((item, idx) => {
    if (!isPlainObject(item) || typeof item.block !== 'string') {
      errors.push(`${location}[${idx}] must be an object with a string "block".`);
      return;
    }
    if (!VALID_SECTION_BLOCKS.has(item.block)) {
      errors.push(
        `${location}[${idx}].block "${item.block}" is not a valid section block.`
      );
    }
    if (item.props !== undefined && !isPlainObject(item.props)) {
      errors.push(`${location}[${idx}].props must be a plain object when provided.`);
    }
  });
}

function resolveLocalLogoSource(rawPath, rootDir) {
  if (typeof rawPath !== 'string') return null;
  const trimmed = rawPath.trim();
  if (!trimmed || trimmed.startsWith('/')) return null;
  const resolved = path.resolve(rootDir, trimmed);
  return { trimmed, resolved, ext: path.extname(resolved).toLowerCase() };
}

export function validateSiteSpec(spec, { rootDir = defaultRootDir } = {}) {
  const errors = [];
  if (!isPlainObject(spec)) {
    return ['Site spec root must be a JSON object.'];
  }

  const themePresets = loadThemePresets(rootDir);
  const validPresets = new Set(Object.keys(themePresets.palettes ?? {}));
  const validFonts = new Set(Object.keys(themePresets.latinFonts ?? {}));
  const validRtlFonts = new Set(Object.keys(themePresets.rtlFonts ?? {}));

  if (spec.blueprint !== undefined && !VALID_BLUEPRINTS.includes(spec.blueprint)) {
    errors.push(
      `Invalid blueprint "${spec.blueprint}". Valid: ${VALID_BLUEPRINTS.join(', ')}.`
    );
  }

  if (spec.site !== undefined) {
    if (!isPlainObject(spec.site)) {
      errors.push('spec.site must be an object.');
    } else {
      for (const field of ['name', 'shortName', 'description']) {
        if (spec.site[field] !== undefined && !String(spec.site[field]).trim()) {
          errors.push(`spec.site.${field} cannot be empty.`);
        }
      }
      if (
        spec.site.contactEmail !== undefined &&
        String(spec.site.contactEmail).trim() !== '' &&
        !EMAIL_RE.test(String(spec.site.contactEmail).trim())
      ) {
        errors.push(`Invalid spec.site.contactEmail "${spec.site.contactEmail}".`);
      }
      if (spec.site.url !== undefined && String(spec.site.url).trim() !== '') {
        try {
          const parsedUrl = new URL(String(spec.site.url).trim());
          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            errors.push(`Invalid spec.site.url "${spec.site.url}". Expected http:// or https:// URL.`);
          }
        } catch {
          errors.push(`Invalid spec.site.url "${spec.site.url}". Expected valid URL.`);
        }
      }
    }
  }

  if (spec.brand !== undefined) {
    if (!isPlainObject(spec.brand)) {
      errors.push('spec.brand must be an object.');
    } else {
      const b = spec.brand;
      if (b.preset !== undefined && !validPresets.has(b.preset)) {
        errors.push(`Invalid spec.brand.preset "${b.preset}". Valid: ${[...validPresets].join(', ')}.`);
      }
      for (const hexKey of ['primaryColor', 'accentColor', 'themeColor', 'backgroundColor']) {
        if (b[hexKey] !== undefined && String(b[hexKey]).trim() !== '' && !HEX_COLOR_RE.test(String(b[hexKey]).trim())) {
          errors.push(`Invalid spec.brand.${hexKey} "${b[hexKey]}". Expected 6-digit hex like #1e40af.`);
        }
      }
      if (b.fontPreset !== undefined && !validFonts.has(b.fontPreset)) {
        errors.push(`Invalid spec.brand.fontPreset "${b.fontPreset}". Valid: ${[...validFonts].join(', ')}.`);
      }
      if (b.rtlFontPreset !== undefined && !validRtlFonts.has(b.rtlFontPreset)) {
        errors.push(`Invalid spec.brand.rtlFontPreset "${b.rtlFontPreset}". Valid: ${[...validRtlFonts].join(', ')}.`);
      }
      if (b.socialCardMode !== undefined && !VALID_OG_MODES.has(b.socialCardMode)) {
        errors.push(`Invalid spec.brand.socialCardMode "${b.socialCardMode}". Valid: branded, artwork, default.`);
      }
      if (b.defaultTheme !== undefined && !VALID_THEMES.has(b.defaultTheme)) {
        errors.push(`Invalid spec.brand.defaultTheme "${b.defaultTheme}". Valid: system, light, dark.`);
      }
      if (b.logo !== undefined) {
        if (!isPlainObject(b.logo)) {
          errors.push('spec.brand.logo must be an object.');
        } else {
          for (const variant of ['light', 'dark']) {
            const val = b.logo[variant];
            if (val === undefined || val === '') continue;
            const local = resolveLocalLogoSource(val, rootDir);
            if (local) {
              if (!fs.existsSync(local.resolved) || !fs.statSync(local.resolved).isFile()) {
                errors.push(`Logo file not found for spec.brand.logo.${variant}: "${local.trimmed}".`);
              } else if (!VALID_LOGO_EXTS.has(local.ext)) {
                errors.push(
                  `Unsupported logo format for spec.brand.logo.${variant}: "${local.ext || 'none'}".`
                );
              }
            }
          }
        }
      }
    }
  }

  if (spec.redirects !== undefined) {
    if (!Array.isArray(spec.redirects)) {
      errors.push('spec.redirects must be an array.');
    } else {
      spec.redirects.forEach((rule, idx) => {
        if (!isPlainObject(rule) || !String(rule.from ?? '').trim() || !String(rule.to ?? '').trim()) {
          errors.push(`spec.redirects[${idx}] must define non-empty "from" and "to".`);
        }
      });
    }
  }

  if (spec.ui !== undefined) {
    if (!isPlainObject(spec.ui)) {
      errors.push('spec.ui must be an object.');
    } else {
      if (spec.ui.ctaPage !== undefined && spec.ui.ctaPage !== '' && !SAFE_KEY_RE.test(String(spec.ui.ctaPage))) {
        errors.push(`Invalid spec.ui.ctaPage "${spec.ui.ctaPage}". Expected lowercase key.`);
      }
      if (spec.ui.homeSections !== undefined) {
        validateSectionArray(spec.ui.homeSections, 'spec.ui.homeSections', errors);
      }
      if (spec.ui.navigation !== undefined) {
        if (!isPlainObject(spec.ui.navigation)) {
          errors.push('spec.ui.navigation must be an object.');
        } else {
          const nav = spec.ui.navigation;
          if (nav.pages !== undefined) {
            if (!Array.isArray(nav.pages)) {
              errors.push('spec.ui.navigation.pages must be an array.');
            } else {
              nav.pages.forEach((p, idx) => {
                if (!isPlainObject(p) || !String(p.group ?? '').trim()) {
                  errors.push(`spec.ui.navigation.pages[${idx}] must define a non-empty "group".`);
                }
              });
            }
          }
          if (nav.footerColumns !== undefined) {
            if (!Array.isArray(nav.footerColumns)) {
              errors.push('spec.ui.navigation.footerColumns must be an array.');
            } else {
              nav.footerColumns.forEach((col, idx) => {
                if (!isPlainObject(col) || !String(col.key ?? '').trim()) {
                  errors.push(`spec.ui.navigation.footerColumns[${idx}] must define a non-empty "key".`);
                  return;
                }
                if (col.items !== undefined) {
                  if (!Array.isArray(col.items)) {
                    errors.push(`spec.ui.navigation.footerColumns[${idx}].items must be an array.`);
                  } else {
                    col.items.forEach((item, itemIdx) => {
                      if (!isPlainObject(item) || (!String(item.group ?? '').trim() && !String(item.href ?? '').trim())) {
                        errors.push(
                          `spec.ui.navigation.footerColumns[${idx}].items[${itemIdx}] must define "group" or "href".`
                        );
                      }
                    });
                  }
                }
              });
            }
          }
          if (nav.menus !== undefined) {
            if (!Array.isArray(nav.menus)) {
              errors.push('spec.ui.navigation.menus must be an array.');
            } else {
              const seenIds = new Set();
              const validateTree = (items, prefix) => {
                if (!Array.isArray(items)) {
                  errors.push(`${prefix} must be an array.`);
                  return;
                }
                items.forEach((it, ii) => {
                  const p = `${prefix}[${ii}]`;
                  if (!isPlainObject(it)) {
                    errors.push(`${p} must be an object.`);
                    return;
                  }
                  const hasTarget = Boolean(
                    String(it.group ?? '').trim() ||
                      String(it.contentType ?? '').trim() ||
                      String(it.href ?? '').trim()
                  );
                  const hasChildren = Array.isArray(it.children) && it.children.length > 0;
                  if (!hasTarget && !hasChildren) {
                    errors.push(`${p} must define "group", "contentType", "href", or "children".`);
                  }
                  if (it.children !== undefined) {
                    validateTree(it.children, `${p}.children`);
                  }
                });
              };
              nav.menus.forEach((menu, mi) => {
                if (!isPlainObject(menu) || !String(menu.id ?? '').trim()) {
                  errors.push(`spec.ui.navigation.menus[${mi}] must define a non-empty "id".`);
                  return;
                }
                const id = String(menu.id).trim();
                if (seenIds.has(id)) {
                  errors.push(`Duplicate spec.ui.navigation.menus id "${id}".`);
                }
                seenIds.add(id);
                if (
                  menu.displayMode !== undefined &&
                  !['dropdown', 'list'].includes(menu.displayMode)
                ) {
                  errors.push(`spec.ui.navigation.menus[${mi}].displayMode must be "dropdown" or "list".`);
                }
                if (menu.items !== undefined) {
                  validateTree(menu.items, `spec.ui.navigation.menus[${mi}].items`);
                }
              });
            }
          }
          if (nav.slots !== undefined) {
            if (!isPlainObject(nav.slots)) {
              errors.push('spec.ui.navigation.slots must be an object.');
            } else {
              for (const dmKey of ['headerDisplayMode', 'drawerDisplayMode', 'footerDisplayMode']) {
                if (
                  nav.slots[dmKey] !== undefined &&
                  !['inherit', 'dropdown', 'list'].includes(nav.slots[dmKey])
                ) {
                  errors.push(
                    `spec.ui.navigation.slots.${dmKey} must be "inherit", "dropdown", or "list".`
                  );
                }
              }
              if (nav.slots.footer !== undefined) {
                if (!Array.isArray(nav.slots.footer)) {
                  errors.push('spec.ui.navigation.slots.footer must be an array.');
                } else {
                  nav.slots.footer.forEach((entry, fi) => {
                    if (typeof entry === 'string') return;
                    if (!isPlainObject(entry) || !String(entry.id ?? '').trim()) {
                      errors.push(`spec.ui.navigation.slots.footer[${fi}] must be a string ID or { id, displayMode } object.`);
                      return;
                    }
                    if (
                      entry.displayMode !== undefined &&
                      !['inherit', 'dropdown', 'list'].includes(entry.displayMode)
                    ) {
                      errors.push(
                        `spec.ui.navigation.slots.footer[${fi}].displayMode must be "inherit", "dropdown", or "list".`
                      );
                    }
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  const localeConfig = readLocaleConfig(rootDir);
  if (spec.locale !== undefined) {
    if (!isPlainObject(spec.locale)) {
      errors.push('spec.locale must be an object.');
    } else if (
      spec.locale.defaultLocale !== undefined &&
      !localeConfig.locales.includes(spec.locale.defaultLocale)
    ) {
      errors.push(
        `spec.locale.defaultLocale "${spec.locale.defaultLocale}" is not registered (${localeConfig.locales.join(', ')}).`
      );
    }
  }

  if (spec.messages !== undefined) {
    if (!isPlainObject(spec.messages)) {
      errors.push('spec.messages must be an object keyed by locale.');
    } else {
      for (const [loc, entries] of Object.entries(spec.messages)) {
        if (!localeConfig.locales.includes(loc)) {
          errors.push(`spec.messages.${loc} refers to an unregistered locale.`);
        } else if (!isPlainObject(entries)) {
          errors.push(`spec.messages.${loc} must be a key-value dictionary object.`);
        }
      }
    }
  }

  if (spec.pages !== undefined) {
    if (!isPlainObject(spec.pages)) {
      errors.push('spec.pages must be an object keyed by page group.');
    } else {
      for (const [group, pageSpec] of Object.entries(spec.pages)) {
        if (!SAFE_KEY_RE.test(group)) {
          errors.push(`Invalid page group key "${group}" in spec.pages.`);
          continue;
        }
        if (!isPlainObject(pageSpec)) {
          errors.push(`spec.pages.${group} must be an object.`);
          continue;
        }
        if (pageSpec.hero !== undefined && !VALID_HERO_VALUES.has(pageSpec.hero)) {
          errors.push(`Invalid spec.pages.${group}.hero "${pageSpec.hero}".`);
        }
        if (pageSpec.container !== undefined && !VALID_CONTAINER_VALUES.has(pageSpec.container)) {
          errors.push(`Invalid spec.pages.${group}.container "${pageSpec.container}".`);
        }
        if (pageSpec.sections !== undefined) {
          validateSectionArray(pageSpec.sections, `spec.pages.${group}.sections`, errors);
        }
        if (typeof pageSpec.slug === 'string' && pageSpec.slug !== '' && (/^\/|\/$/.test(pageSpec.slug) || pageSpec.slug.includes('//'))) {
          errors.push(`Invalid spec.pages.${group}.slug "${pageSpec.slug}". Omit leading/trailing "/" (use "" for home).`);
        }
        if (isPlainObject(pageSpec.locales)) {
          for (const [loc, locData] of Object.entries(pageSpec.locales)) {
            if (!localeConfig.locales.includes(loc)) {
              errors.push(`spec.pages.${group}.locales.${loc} refers to an unregistered locale.`);
            } else if (!isPlainObject(locData)) {
              errors.push(`spec.pages.${group}.locales.${loc} must be an object.`);
            } else {
              if (locData.hero !== undefined && !VALID_HERO_VALUES.has(locData.hero)) {
                errors.push(`Invalid spec.pages.${group}.locales.${loc}.hero "${locData.hero}".`);
              }
              if (locData.container !== undefined && !VALID_CONTAINER_VALUES.has(locData.container)) {
                errors.push(`Invalid spec.pages.${group}.locales.${loc}.container "${locData.container}".`);
              }
              if (typeof locData.slug === 'string' && locData.slug !== '' && (/^\/|\/$/.test(locData.slug) || locData.slug.includes('//'))) {
                errors.push(`Invalid spec.pages.${group}.locales.${loc}.slug "${locData.slug}". Omit leading/trailing "/".`);
              }
              if (locData.sections !== undefined) {
                validateSectionArray(
                  locData.sections,
                  `spec.pages.${group}.locales.${loc}.sections`,
                  errors
                );
              }
            }
          }
        }
      }
    }
  }

  // Project config to know which collections will exist after blueprint + spec.content.types
  const projectedConfig = readCoreAndClientConfig(rootDir);
  if (spec.blueprint && VALID_BLUEPRINTS.includes(spec.blueprint)) {
    applyBlueprintToConfig(projectedConfig, spec.blueprint, { rootPresets: themePresets });
  }
  if (isPlainObject(spec.content?.types)) {
    projectedConfig.content = projectedConfig.content ?? {};
    projectedConfig.content.types = deepMergeConfig(
      projectedConfig.content.types ?? {},
      spec.content.types
    );
  }
  const projectedKnownTypes = new Set(getKnownTypes(rootDir, projectedConfig));

  if (spec.entries !== undefined) {
    if (!isPlainObject(spec.entries)) {
      errors.push('spec.entries must be an object keyed by collection name.');
    } else {
      for (const [collection, groups] of Object.entries(spec.entries)) {
        if (collection === 'pages') {
          errors.push('spec.entries cannot target "pages"; use spec.pages instead.');
          continue;
        }
        if (!projectedKnownTypes.has(collection)) {
          errors.push(
            `Unknown collection "${collection}" in spec.entries (not declared in blueprint, content.types, or client/content.ts).`
          );
          continue;
        }
        if (!isPlainObject(groups)) {
          errors.push(`spec.entries.${collection} must be an object keyed by entry group.`);
          continue;
        }
        for (const [group, entrySpec] of Object.entries(groups)) {
          if (!SAFE_KEY_RE.test(group)) {
            errors.push(`Invalid entry group key "${group}" in spec.entries.${collection}.`);
          } else if (!isPlainObject(entrySpec)) {
            errors.push(`spec.entries.${collection}.${group} must be an object.`);
          } else if (isPlainObject(entrySpec.locales)) {
            for (const [loc, locData] of Object.entries(entrySpec.locales)) {
              if (!localeConfig.locales.includes(loc)) {
                errors.push(
                  `spec.entries.${collection}.${group}.locales.${loc} refers to an unregistered locale.`
                );
              } else if (!isPlainObject(locData)) {
                errors.push(
                  `spec.entries.${collection}.${group}.locales.${loc} must be an object.`
                );
              }
            }
          }
        }
      }
    }
  }

  return errors;
}

function mergeNavPageEntry(existingPages, nextEntry) {
  const list = Array.isArray(existingPages) ? existingPages.map((item) => ({ ...item })) : [];
  const idx = list.findIndex((item) => item.group === nextEntry.group);
  if (idx >= 0) {
    list[idx] = deepMergeConfig(list[idx], nextEntry);
  } else {
    list.push(nextEntry);
  }
  return list;
}

function removeBrandPrefix(brandDir, prefix) {
  if (!fs.existsSync(brandDir)) return;
  for (const file of fs.readdirSync(brandDir)) {
    if (file.startsWith(`${prefix}.`)) {
      fs.rmSync(path.join(brandDir, file), { force: true });
    }
  }
}

function findExistingEntryFile(groupDir, locale) {
  for (const ext of ['mdx', 'md']) {
    const candidate = path.join(groupDir, `${locale}.${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function buildConfigFromSpec(spec, rootDir, { dryRun = false } = {}) {
  const config = readCoreAndClientConfig(rootDir);
  const themePresets = loadThemePresets(rootDir);
  const copiedBrandFiles = [];

  const initialPreset = config.brand?.preset;
  if (spec.blueprint) {
    applyBlueprintToConfig(config, spec.blueprint, { rootPresets: themePresets });
    if (config.brand?.preset !== initialPreset) {
      delete config.brand.primaryColor;
      delete config.brand.accentColor;
    }
  }

  if (spec.site) {
    config.site = deepMergeConfig(config.site ?? {}, spec.site);
  }

  if (spec.brand) {
    const { logo, ...brandRest } = spec.brand;
    const presetChanged = brandRest.preset !== undefined && brandRest.preset !== config.brand?.preset;
    config.brand = deepMergeConfig(config.brand ?? {}, brandRest);

    if (presetChanged) {
      if (brandRest.primaryColor === undefined) delete config.brand.primaryColor;
      if (brandRest.accentColor === undefined) delete config.brand.accentColor;
    }
    const effectivePreset = config.brand.preset;
    const presetPalette = effectivePreset ? themePresets.palettes?.[effectivePreset] : null;
    if (brandRest.themeColor === undefined) {
      const nextTheme = config.brand.primaryColor || presetPalette?.primary || config.brand.themeColor;
      if (nextTheme) config.brand.themeColor = String(nextTheme).toLowerCase();
    }

    if (logo) {
      const brandDir = path.join(rootDir, 'public', 'brand');
      const nextLogo = {
        ...(config.brand.logo ?? {}),
        ...logo,
        alt: logo.alt || config.site?.name || config.brand.logo?.alt || 'Logo',
        showText: logo.showText ?? config.brand.logo?.showText ?? true,
      };
      for (const variant of ['light', 'dark']) {
        if (logo[variant] === '') {
          delete nextLogo[variant];
          if (!dryRun) removeBrandPrefix(brandDir, variant === 'light' ? 'logo' : 'logo-dark');
          continue;
        }
        const local = resolveLocalLogoSource(logo[variant], rootDir);
        if (local) {
          const prefix = variant === 'light' ? 'logo' : 'logo-dark';
          const destName = `${prefix}${local.ext}`;
          const destPath = path.join(brandDir, destName);
          if (!dryRun) {
            fs.mkdirSync(brandDir, { recursive: true });
            removeBrandPrefix(brandDir, prefix);
            fs.copyFileSync(local.resolved, destPath);
          }
          copiedBrandFiles.push(path.relative(rootDir, destPath));
          nextLogo[variant] = `/brand/${destName}`;
        }
      }
      config.brand.logo = nextLogo;
    }
  }

  for (const key of ['business', 'social', 'analytics', 'cookies', 'api']) {
    if (spec[key] !== undefined) {
      config[key] = deepMergeConfig(config[key] ?? {}, spec[key]);
    }
  }

  if (spec.redirects !== undefined) {
    config.redirects = spec.redirects;
  }

  if (spec.ui !== undefined) {
    config.ui = deepMergeConfig(config.ui ?? {}, spec.ui);
  }

  if (spec.content?.types !== undefined) {
    config.content = config.content ?? {};
    config.content.types = deepMergeConfig(config.content.types ?? {}, spec.content.types);
  }

  // Merge pages[*].nav into config.ui.navigation.pages
  if (isPlainObject(spec.pages)) {
    let navPages = config.ui?.navigation?.pages ? [...config.ui.navigation.pages] : [];
    let touchedNav = false;

    for (const [group, pageSpec] of Object.entries(spec.pages)) {
      if (!pageSpec.nav) continue;
      touchedNav = true;
      const navObj = isPlainObject(pageSpec.nav) ? pageSpec.nav : {};
      const inferredLabels = {};
      if (isPlainObject(pageSpec.locales)) {
        for (const [loc, locData] of Object.entries(pageSpec.locales)) {
          if (typeof locData?.title === 'string' && locData.title.trim()) {
            inferredLabels[loc] = locData.title.trim();
          }
        }
      }
      if (isPlainObject(pageSpec.titles)) {
        for (const [loc, t] of Object.entries(pageSpec.titles)) {
          if (typeof t === 'string' && t.trim()) inferredLabels[loc] = t.trim();
        }
      }
      const nextNavEntry = {
        group,
        ...navObj,
        ...(navObj.labels || Object.keys(inferredLabels).length > 0
          ? { labels: { ...inferredLabels, ...(navObj.labels ?? {}) } }
          : {}),
      };
      navPages = mergeNavPageEntry(navPages, nextNavEntry);
    }

    if (touchedNav) {
      config.ui = config.ui ?? {};
      config.ui.navigation = {
        ...(config.ui.navigation ?? {}),
        pages: navPages,
      };
    }
  }

  return { config, copiedBrandFiles };
}

function resolvePageLocalePayload(pageSpec, locale, defaultLocale) {
  const locOverride = isPlainObject(pageSpec.locales?.[locale]) ? pageSpec.locales[locale] : {};
  const hasExplicitLocale = isPlainObject(pageSpec.locales?.[locale]) || Boolean(pageSpec.titles?.[locale]);

  const title =
    locOverride.title ??
    pageSpec.titles?.[locale] ??
    (locale === defaultLocale ? pageSpec.title : undefined);

  const slug =
    locOverride.slug ??
    pageSpec.slugs?.[locale] ??
    (locale === defaultLocale ? pageSpec.slug : undefined);

  const description =
    locOverride.description ??
    pageSpec.descriptions?.[locale] ??
    (locale === defaultLocale ? pageSpec.description : undefined);

  const body =
    locOverride.body ??
    pageSpec.bodies?.[locale] ??
    (locale === defaultLocale ? pageSpec.body : undefined);

  const draft =
    locOverride.draft ??
    (pageSpec.publish === true ? false : pageSpec.publish === false ? true : pageSpec.draft);

  return {
    hasExplicitLocale,
    title,
    slug,
    description,
    body,
    draft,
    hero: locOverride.hero ?? pageSpec.hero,
    container: locOverride.container ?? pageSpec.container,
    flushTop: locOverride.flushTop ?? pageSpec.flushTop,
    template: locOverride.template ?? pageSpec.template,
    image: locOverride.image ?? pageSpec.image,
    sections: locOverride.sections ?? pageSpec.sections,
  };
}

function resolveImageForGroup(rawImage, rootDir, groupDir, group, dryRun) {
  if (rawImage === undefined || rawImage === '') return undefined;
  const trimmed = String(rawImage).trim();
  if (trimmed === 'none') return null;
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return trimmed;
  }
  if (!dryRun) {
    const placed = placeArtworkFor({ value: trimmed, rootDir, groupDir, group });
    if (placed) return placed;
  }
  const baseName = path.basename(trimmed);
  return baseName ? `./${baseName}` : `./${group}.png`;
}

export function applySiteSpec(
  spec,
  { rootDir = defaultRootDir, dryRun = false, skipAssets = false } = {}
) {
  const validationErrors = validateSiteSpec(spec, { rootDir });
  if (validationErrors.length > 0) {
    throw new Error(`Invalid site spec:\n- ${validationErrors.join('\n- ')}`);
  }

  const localeConfig = readLocaleConfig(rootDir);
  const currentDefaultLocale = localeConfig.defaultLocale || localeConfig.locales[0] || 'en';
  const targetDefaultLocale = spec.locale?.defaultLocale || currentDefaultLocale;
  const targetSolo = spec.locale?.solo === true;
  const activeLocalesAfterSwitch = targetSolo ? [targetDefaultLocale] : localeConfig.locales;

  const { config, copiedBrandFiles } = buildConfigFromSpec(spec, rootDir, { dryRun });

  const plannedPages = [];
  const plannedEntries = [];
  const plannedMessages = [];
  const generatedArtTargets = [];

  // Plan / write config
  let configChanges = {};
  if (!dryRun) {
    configChanges = writeClientConfig(config, { rootDir, sparse: true });
  } else {
    configChanges = config;
  }

  // Sync collection directories and .pages.yml when blueprint or content types were provided
  let collectionSync = { ymlChanged: false, missingDirs: [] };
  if (!dryRun && (spec.blueprint !== undefined || spec.content?.types !== undefined)) {
    collectionSync = syncCollections(rootDir, { check: false });
  }

  // Write spec.messages overrides
  if (isPlainObject(spec.messages)) {
    for (const [locale, overrides] of Object.entries(spec.messages)) {
      const keys = Object.keys(overrides);
      plannedMessages.push({ locale, keys });
      if (!dryRun && keys.length > 0) {
        const currentClient = stripSchema(readClientMessages(locale, rootDir));
        const nextClient = { ...currentClient, ...overrides };
        writeClientMessages(locale, nextClient, rootDir);
      }
    }
  }

  // Sync site_description in target default locale dictionary when spec.site.description changed
  if (spec.site?.description && !(spec.messages?.[targetDefaultLocale]?.site_description)) {
    const coreDict = stripSchema(readCoreMessages(targetDefaultLocale, rootDir));
    const clientDict = stripSchema(readClientMessages(targetDefaultLocale, rootDir));
    const currentDesc = clientDict.site_description ?? coreDict.site_description;
    if (currentDesc !== spec.site.description) {
      plannedMessages.push({ locale: targetDefaultLocale, keys: ['site_description'] });
      if (!dryRun) {
        writeClientMessages(
          targetDefaultLocale,
          { ...clientDict, site_description: spec.site.description },
          rootDir
        );
      }
    }
  }

  // Pages
  if (isPlainObject(spec.pages)) {
    for (const [group, pageSpec] of Object.entries(spec.pages)) {
      const groupDir = path.join(rootDir, 'src', 'content', 'pages', group);
      const imageRef = resolveImageForGroup(pageSpec.image, rootDir, groupDir, group, dryRun);

      for (const locale of activeLocalesAfterSwitch) {
        const existingFile = findExistingEntryFile(groupDir, locale);
        const payload = resolvePageLocalePayload(pageSpec, locale, targetDefaultLocale);

        // Skip touching locales that were not mentioned when the file already exists and no shared structural keys exist
        const hasSharedUpdate =
          payload.hero !== undefined ||
          payload.container !== undefined ||
          payload.flushTop !== undefined ||
          payload.template !== undefined ||
          imageRef !== undefined ||
          payload.sections !== undefined ||
          payload.draft !== undefined;

        if (!payload.hasExplicitLocale && existingFile && !hasSharedUpdate) {
          continue;
        }
        if (!payload.hasExplicitLocale && !existingFile && locale !== targetDefaultLocale && targetSolo) {
          continue;
        }

        const parsedExisting = existingFile
          ? parseFrontmatter(fs.readFileSync(existingFile, 'utf-8'))
          : { data: {}, body: '' };

        const data = { ...parsedExisting.data };
        const fallbackTitle =
          locale === targetDefaultLocale
            ? group.charAt(0).toUpperCase() + group.slice(1)
            : `[TODO: ${locale}] ${pageSpec.locales?.[targetDefaultLocale]?.title || pageSpec.title || group}`;

        if (payload.title !== undefined) data.title = payload.title;
        else if (!data.title) data.title = fallbackTitle;

        if (payload.slug !== undefined) {
          data.slug = payload.slug;
        } else if (data.slug === undefined) {
          data.slug = group === 'home' ? '' : group;
        }

        if (payload.description !== undefined) data.description = payload.description;
        if (payload.template !== undefined) data.template = payload.template;
        if (payload.hero !== undefined) data.hero = payload.hero;
        else if (data.hero === undefined) data.hero = payload.sections ? 'none' : 'default';

        if (payload.container !== undefined) data.container = payload.container;
        else if (data.container === undefined) data.container = payload.sections ? 'canvas' : 'contained';

        if (payload.flushTop !== undefined) data.flushTop = payload.flushTop;

        const locImageRef =
          payload.image !== pageSpec.image
            ? resolveImageForGroup(payload.image, rootDir, groupDir, group, dryRun)
            : imageRef;
        if (locImageRef === null) delete data.image;
        else if (locImageRef !== undefined) data.image = locImageRef;

        if (payload.sections !== undefined) data.sections = payload.sections;

        if (payload.draft !== undefined) {
          data.draft = payload.draft;
        } else if (data.draft === undefined) {
          data.draft = typeof data.title === 'string' && data.title.includes('[TODO');
        }

        let body = parsedExisting.body;
        if (payload.body !== undefined) {
          body = payload.body.startsWith('\n') ? payload.body : `\n${payload.body}`;
        } else if (!existingFile) {
          if (Array.isArray(data.sections) && data.sections.length > 0) {
            body = '\n';
          } else if (data.draft === false) {
            body = `\n## ${data.title}\n\n${data.description || ''}\n`;
          } else {
            body = `\n${contentStub(locale)}\n`;
          }
        }

        const outPath = existingFile || path.join(groupDir, `${locale}.mdx`);
        plannedPages.push({
          group,
          locale,
          file: path.relative(rootDir, outPath),
          action: existingFile ? 'update' : 'create',
        });

        if (!dryRun) {
          fs.mkdirSync(groupDir, { recursive: true });
          fs.writeFileSync(outPath, stringifyFrontmatter(data, body), 'utf-8');
          if (typeof data.image === 'string' && data.image.startsWith('./')) {
            const targetAsset = path.resolve(groupDir, data.image);
            if (!fs.existsSync(targetAsset)) generatedArtTargets.push(targetAsset);
          }
        }
      }
    }
  }

  // Collection entries (blog, projects, services, products, etc.)
  if (isPlainObject(spec.entries)) {
    const today = new Date().toISOString().split('T')[0];

    for (const [collection, groups] of Object.entries(spec.entries)) {
      for (const [group, entrySpec] of Object.entries(groups)) {
        const groupDir = path.join(rootDir, 'src', 'content', collection, group);
        const imageRef = resolveImageForGroup(entrySpec.image, rootDir, groupDir, group, dryRun);

        const sharedExtra = {};
        for (const [k, v] of Object.entries(entrySpec)) {
          if (
            [
              'locales',
              'titles',
              'slugs',
              'descriptions',
              'bodies',
              'title',
              'slug',
              'description',
              'body',
              'image',
              'draft',
              'publish',
            ].includes(k)
          ) {
            continue;
          }
          sharedExtra[k] = v;
        }

        for (const locale of activeLocalesAfterSwitch) {
          const existingFile = findExistingEntryFile(groupDir, locale);
          const locOverride = isPlainObject(entrySpec.locales?.[locale])
            ? entrySpec.locales[locale]
            : {};
          const hasExplicitLocale =
            isPlainObject(entrySpec.locales?.[locale]) || Boolean(entrySpec.titles?.[locale]);

          if (!hasExplicitLocale && existingFile && Object.keys(sharedExtra).length === 0 && imageRef === undefined) {
            continue;
          }
          if (!hasExplicitLocale && !existingFile && locale !== targetDefaultLocale && targetSolo) {
            continue;
          }

          const parsedExisting = existingFile
            ? parseFrontmatter(fs.readFileSync(existingFile, 'utf-8'))
            : { data: {}, body: '' };

          const data = { ...parsedExisting.data, ...sharedExtra };
          const locExtra = {};
          for (const [k, v] of Object.entries(locOverride)) {
            if (!['title', 'slug', 'description', 'body', 'draft', 'image'].includes(k)) {
              locExtra[k] = v;
            }
          }
          Object.assign(data, locExtra);

          const title =
            locOverride.title ??
            entrySpec.titles?.[locale] ??
            (locale === targetDefaultLocale ? entrySpec.title : undefined);
          const slug =
            locOverride.slug ??
            entrySpec.slugs?.[locale] ??
            (locale === targetDefaultLocale ? entrySpec.slug : undefined);
          const description =
            locOverride.description ??
            entrySpec.descriptions?.[locale] ??
            (locale === targetDefaultLocale ? entrySpec.description : undefined);

          if (title !== undefined) data.title = title;
          else if (!data.title) {
            data.title =
              locale === targetDefaultLocale
                ? group
                : `[TODO: ${locale}] ${entrySpec.locales?.[targetDefaultLocale]?.title || entrySpec.title || group}`;
          }

          if (slug !== undefined) data.slug = slug;
          else if (!data.slug) data.slug = group;

          if (description !== undefined) data.description = description;
          else if (!data.description) {
            data.description = `${data.title} overview.`;
          }

          if (collection === 'blog' && !data.publishedAt) {
            data.publishedAt = entrySpec.publishedAt ?? today;
          }

          const locImageRef =
            locOverride.image !== undefined
              ? resolveImageForGroup(locOverride.image, rootDir, groupDir, group, dryRun)
              : imageRef;
          if (locImageRef === null) delete data.image;
          else if (locImageRef !== undefined) data.image = locImageRef;
          else if (!data.image) data.image = `./${group}.png`;

          const draft =
            locOverride.draft ??
            (entrySpec.publish === true ? false : entrySpec.publish === false ? true : entrySpec.draft);
          if (draft !== undefined) data.draft = draft;
          else if (data.draft === undefined) {
            data.draft = typeof data.title === 'string' && data.title.includes('[TODO');
          }

          const explicitBody =
            locOverride.body ??
            entrySpec.bodies?.[locale] ??
            (locale === targetDefaultLocale ? entrySpec.body : undefined);
          let body = parsedExisting.body;
          if (explicitBody !== undefined) {
            body = explicitBody.startsWith('\n') ? explicitBody : `\n${explicitBody}`;
          } else if (!existingFile) {
            if (data.draft === false) {
              body = `\n## ${data.title}\n\n${data.description || ''}\n`;
            } else {
              body = `\n${collection === 'blog' ? postStub(locale) : contentStub(locale)}\n`;
            }
          }

          const outPath = existingFile || path.join(groupDir, `${locale}.mdx`);
          plannedEntries.push({
            collection,
            group,
            locale,
            file: path.relative(rootDir, outPath),
            action: existingFile ? 'update' : 'create',
          });

          if (!dryRun) {
            fs.mkdirSync(groupDir, { recursive: true });
            fs.writeFileSync(outPath, stringifyFrontmatter(data, body), 'utf-8');
            if (typeof data.image === 'string' && data.image.startsWith('./')) {
              const targetAsset = path.resolve(groupDir, data.image);
              if (!fs.existsSync(targetAsset)) generatedArtTargets.push(targetAsset);
            }
          }
        }
      }
    }
  }

  // Apply locale mode switches (after pages are written so home/<locale>.mdx is ready)
  let localeResult = {
    changed: false,
    defaultLocale: currentDefaultLocale,
    locales: localeConfig.locales,
  };
  if (!dryRun && spec.locale) {
    if (targetSolo) {
      const soloRes = switchToSingleLocale(targetDefaultLocale, {
        rootDir,
        keepContent: !spec.locale.deleteContent,
        allowDraftHome: Boolean(spec.locale.allowDraft),
        compile: false,
      });
      localeResult = {
        changed: soloRes.changed,
        defaultLocale: targetDefaultLocale,
        locales: [targetDefaultLocale],
        removedLocales: soloRes.removedLocales,
      };
    } else if (spec.locale.defaultLocale && spec.locale.defaultLocale !== currentDefaultLocale) {
      const defRes = switchDefaultLocale(targetDefaultLocale, {
        rootDir,
        allowDraftHome: Boolean(spec.locale.allowDraft),
        compile: false,
      });
      localeResult = {
        changed: defRes.changed,
        defaultLocale: targetDefaultLocale,
        locales: readLocaleConfig(rootDir).locales,
      };
    }
  } else if (dryRun && spec.locale) {
    localeResult = {
      changed:
        targetSolo ||
        (Boolean(spec.locale.defaultLocale) && spec.locale.defaultLocale !== currentDefaultLocale),
      defaultLocale: targetDefaultLocale,
      locales: activeLocalesAfterSwitch,
    };
  }

  // Sync missing dictionary keys and compile Paraglide messages
  const i18nSync = syncDictionaryKeys(rootDir, { dryRun, compile: true });
  if (!dryRun && !i18nSync.compiled) {
    compileMessages(rootDir);
    i18nSync.compiled = true;
  }

  // Refresh brand icons & missing content artwork inside the main workspace
  let assetsGenerated = false;
  if (!dryRun && !skipAssets && path.resolve(rootDir) === defaultRootDir) {
    const genScript = path.join(defaultRootDir, 'scripts', 'generate-assets.mjs');
    execFileSync(process.execPath, [genScript, '--brand-only', '--force'], {
      cwd: rootDir,
      stdio: 'pipe',
    });
    if (generatedArtTargets.length > 0) {
      execFileSync(process.execPath, [genScript], {
        cwd: rootDir,
        stdio: 'pipe',
      });
    }
    assetsGenerated = true;
  }

  return {
    ok: true,
    dryRun,
    blueprint: spec.blueprint ?? null,
    configKeysUpdated: Object.keys(configChanges),
    copiedBrandFiles,
    collectionSync,
    locale: localeResult,
    messagesUpdated: plannedMessages,
    pages: plannedPages,
    entries: plannedEntries,
    i18nSync: {
      totalAdded: i18nSync.totalAdded,
      addedByLocale: i18nSync.addedByLocale,
      compiled: i18nSync.compiled,
    },
    assetsGenerated,
  };
}
