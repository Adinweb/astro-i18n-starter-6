#!/usr/bin/env node
/**
 * Client onboarding & rapid rebranding wizard (`pnpm run site:init`).
 *
 * Updates `app.config.json` (site metadata, brand color preset/overrides,
 * Latin & RTL font pairings, OpenGraph card mode, content modules, social links),
 * optionally switches default language or solo-language mode, keeps
 * `site_description` in sync for the active default dictionary, and refreshes
 * brand icons / `og-default.png`.
 *
 * Can run interactively in a terminal or completely headlessly via flags + `--yes`.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readCoreAndClientConfig, writeClientConfig } from './lib/config.mjs';
import { applyBlueprintToConfig, VALID_BLUEPRINTS } from './lib/blueprints.mjs';
import { compileMessages } from './lib/compile-messages.mjs';
import { syncCollections } from './content-sync.mjs';
import { readLocaleConfig } from './lib/locales.mjs';
import { switchDefaultLocale, switchToSingleLocale } from './lib/locale-mutations.mjs';
import {
  readClientMessages,
  readCoreMessages,
  stripSchema,
  writeClientMessages,
} from './lib/merge-messages.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const presetsPath = path.join(rootDir, 'src', 'libs', 'config', 'theme-presets.json');
const themePresets = JSON.parse(fs.readFileSync(presetsPath, 'utf-8'));

const VALID_PRESETS = Object.keys(themePresets.palettes);
const VALID_FONTS = Object.keys(themePresets.latinFonts);
const VALID_RTL_FONTS = Object.keys(themePresets.rtlFonts);
const VALID_OG_MODES = ['branded', 'artwork', 'default'];
const VALID_THEMES = ['system', 'light', 'dark'];
const VALID_BUSINESS_TYPES = ['Organization', 'LocalBusiness', 'ProfessionalService', 'MedicalBusiness', 'Store'];
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: npm run site:init [options]

Identity:
  --name="<Site Name>"           Full site / brand title
  --short-name="<Short Name>"    Compact header & manifest name
  --desc="<Description>"         Site meta description
  --author="<Author>"            Default article author name
  --email="<contact@domain>"     Public contact email (empty clears it)

Brand & Typography:
  --blueprint=<${VALID_BLUEPRINTS.join('|')}>
  --preset=<${VALID_PRESETS.join('|')}>
  --primary=<#rrggbb>            Override primary brand hex
  --accent=<#rrggbb>             Override accent hex
  --font=<${VALID_FONTS.join('|')}>
  --rtl-font=<${VALID_RTL_FONTS.join('|')}>
  --og-mode=<${VALID_OG_MODES.join('|')}>
  --default-theme=<${VALID_THEMES.join('|')}>
  --logo=<path>                  Copy local light/primary logo (.svg/.png/.webp/.jpg) to public/brand/
  --logo-dark=<path>             Copy local dark-mode logo variant to public/brand/

Business & Local SEO:
  --business-type=<${VALID_BUSINESS_TYPES.join('|')}>
  --legal-name="<Legal Name>"    Official legal entity name
  --phone="<phone>"              Public business phone
  --whatsapp="<number-or-url>"   WhatsApp contact number or wa.me URL
  --business-telegram="<handle>" Business Telegram handle or URL
  --address="<street>"           Street address
  --city="<city>"                City name
  --country="<country>"          Country name or code
  --working-hours="<hours>"      Opening hours (e.g. "Sat-Wed 09:00-18:00")
  --map-url="<https://...>"      Map embed URL
  --geo=<lat,lng>                Coordinates (e.g. "35.6892,51.3890", empty clears)

Languages & Content Modules:
  --default-locale=<code>        Set default locale (e.g. en, fa)
  --single-lang                  Switch to solo mode on the chosen default locale
  --multi-lang                   Keep all registered languages active
  --delete-content               When --single-lang, delete unused locale files instead of archiving
  --allow-draft                  Allow switching to a locale whose home page is currently draft
  --blog=true|false              Enable or disable the blog collection
  --projects=true|false          Enable or disable the projects collection
  --cta-page=<page-key>          Header/drawer primary CTA target page
  --keep-demo-banner             Keep core demo announcement banners enabled

Social & Execution:
  --github=<url>  --twitter=<url>  --linkedin=<url>  --instagram=<url>  --telegram=<url>
  --skip-assets                  Skip regenerating brand PNG icons & og-default.png
  --yes / -y                     Apply flags/defaults without interactive prompts
`);
  process.exit(0);
}

function parseBool(value, flagName) {
  if (value === 'true' || value === '1' || value === 'yes') return true;
  if (value === 'false' || value === '0' || value === 'no') return false;
  console.error(`❌ Invalid boolean value for ${flagName}: "${value}". Expected true or false.`);
  process.exit(1);
}

const opts = {
  yes: args.includes('--yes') || args.includes('-y') || args.includes('--force'),
  skipAssets: args.includes('--skip-assets'),
  allowDraft: args.includes('--allow-draft'),
  keepContent: !(args.includes('--delete-content') || args.includes('--with-content')),
  keepDemoBanner: args.includes('--keep-demo-banner'),
};

for (const arg of args) {
  if (arg === '--single-lang') opts.singleLang = true;
  else if (arg === '--multi-lang') opts.singleLang = false;
  else if (arg === '--blog') opts.blog = true;
  else if (arg === '--no-blog') opts.blog = false;
  else if (arg === '--projects') opts.projects = true;
  else if (arg === '--no-projects') opts.projects = false;
  else if (!arg.startsWith('--')) continue;
  else {
    const eqIdx = arg.indexOf('=');
    if (eqIdx === -1) continue;
    const key = arg.slice(2, eqIdx);
    const val = arg.slice(eqIdx + 1);
    if (key === 'name') opts.name = val;
    else if (key === 'short-name') opts.shortName = val;
    else if (key === 'desc' || key === 'description') opts.desc = val;
    else if (key === 'author') opts.author = val;
    else if (key === 'email') opts.email = val;
    else if (key === 'blueprint') opts.blueprint = val;
    else if (key === 'preset') opts.preset = val;
    else if (key === 'primary') opts.primary = val;
    else if (key === 'accent') opts.accent = val;
    else if (key === 'font') opts.fontPreset = val;
    else if (key === 'rtl-font') opts.rtlFontPreset = val;
    else if (key === 'og-mode') opts.socialCardMode = val;
    else if (key === 'default-theme') opts.defaultTheme = val;
    else if (key === 'logo') opts.logo = val;
    else if (key === 'logo-dark') opts.logoDark = val;
    else if (key === 'default-locale') opts.defaultLocale = val;
    else if (key === 'blog') opts.blog = parseBool(val, '--blog');
    else if (key === 'projects') opts.projects = parseBool(val, '--projects');
    else if (key === 'cta-page') opts.ctaPage = val;
    else if (key === 'business-type') opts.businessType = val;
    else if (key === 'legal-name') opts.legalName = val;
    else if (key === 'phone') opts.phone = val;
    else if (key === 'whatsapp') opts.whatsapp = val;
    else if (key === 'business-telegram') opts.businessTelegram = val;
    else if (key === 'address') opts.address = val;
    else if (key === 'city') opts.city = val;
    else if (key === 'country') opts.country = val;
    else if (key === 'working-hours') opts.workingHours = val;
    else if (key === 'map-url') opts.mapEmbedUrl = val;
    else if (key === 'geo') opts.geo = val;
    else if (key === 'github') opts.github = val;
    else if (key === 'twitter') opts.twitter = val;
    else if (key === 'linkedin') opts.linkedin = val;
    else if (key === 'instagram') opts.instagram = val;
    else if (key === 'telegram') opts.telegram = val;
  }
}

const config = readCoreAndClientConfig(rootDir);
if (opts.blueprint !== undefined) {
  if (!VALID_BLUEPRINTS.includes(opts.blueprint)) {
    console.error(
      `❌ Invalid --blueprint "${opts.blueprint}". Valid: ${VALID_BLUEPRINTS.join(', ')}.`
    );
    process.exit(1);
  }
  applyBlueprintToConfig(config, opts.blueprint, { rootPresets: themePresets });
}
const localeConfig = readLocaleConfig(rootDir);
const registeredLocales = localeConfig.locales;
const currentDefaultLocale = localeConfig.defaultLocale || registeredLocales[0];

if (!opts.yes && process.stdin.isTTY) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (label, current) =>
    new Promise((resolve) => {
      rl.question(`${label} [${current}]: `, (answer) => {
        const trimmed = answer.trim();
        resolve(trimmed || current);
      });
    });
  const askOptional = (label, current) =>
    new Promise((resolve) => {
      rl.question(`${label} [${current || 'none'}]: `, (answer) => {
        const trimmed = answer.trim();
        if (trimmed === '-') resolve('');
        else resolve(trimmed || current);
      });
    });

  try {
    console.log('\n🚀 Astro Starter Client Onboarding (press Enter to keep current values)\n');
    if (opts.name === undefined) opts.name = await ask('Site name', config.site.name);
    if (opts.shortName === undefined) {
      opts.shortName = await ask('Short name', config.site.shortName);
    }
    if (opts.desc === undefined) {
      opts.desc = await ask('Site description', config.site.description);
    }
    if (opts.email === undefined) {
      opts.email = await askOptional(
        'Public contact email ("-" to clear)',
        config.site.contactEmail ?? ''
      );
    }
    if (opts.defaultLocale === undefined) {
      opts.defaultLocale = await ask(
        `Default locale (${registeredLocales.join(', ')})`,
        currentDefaultLocale
      );
    }
    if (opts.singleLang === undefined && registeredLocales.length > 1) {
      const soloAns = await ask(
        `Single-language mode on "${opts.defaultLocale}"? (y/n)`,
        'n'
      );
      opts.singleLang = /^y(es)?$/i.test(soloAns);
    }
    if (opts.preset === undefined) {
      opts.preset = await ask(
        `Brand palette preset (${VALID_PRESETS.join(', ')})`,
        config.brand.preset ?? 'indigo'
      );
    }
    if (opts.primary === undefined) {
      opts.primary = await askOptional(
        'Custom primary hex (#rrggbb, "-" to use preset)',
        config.brand.primaryColor ?? ''
      );
    }
    if (opts.fontPreset === undefined) {
      opts.fontPreset = await ask(
        `Latin font pairing (${VALID_FONTS.join(', ')})`,
        config.brand.fontPreset ?? 'system'
      );
    }
    if (opts.rtlFontPreset === undefined) {
      opts.rtlFontPreset = await ask(
        `RTL font pairing (${VALID_RTL_FONTS.join(', ')})`,
        config.brand.rtlFontPreset ?? 'vazirmatn'
      );
    }
    if (opts.socialCardMode === undefined) {
      opts.socialCardMode = await ask(
        `OpenGraph social card mode (${VALID_OG_MODES.join(', ')})`,
        config.brand.socialCardMode ?? 'branded'
      );
    }
    if (opts.blog === undefined) {
      const blogCurrent = config.content?.types?.blog?.enabled !== false;
      const ans = await ask('Enable blog section? (y/n)', blogCurrent ? 'y' : 'n');
      opts.blog = /^y(es)?$/i.test(ans);
    }
    if (opts.projects === undefined) {
      const projCurrent = config.content?.types?.projects?.enabled !== false;
      const ans = await ask('Enable projects section? (y/n)', projCurrent ? 'y' : 'n');
      opts.projects = /^y(es)?$/i.test(ans);
    }
  } finally {
    rl.close();
  }
}

const name = (opts.name ?? config.site.name).trim();
const shortName = (opts.shortName ?? (opts.name ? name : config.site.shortName)).trim();
const descExplicit = opts.desc !== undefined && opts.desc !== config.site.description;
const description = (opts.desc ?? config.site.description).trim();
const author = (opts.author ?? config.site.author ?? 'Astro Starter Team').trim();
const email = (opts.email ?? config.site.contactEmail ?? '').trim();

const presetChanged = opts.preset !== undefined && opts.preset !== config.brand.preset;
const preset = opts.preset ?? config.brand.preset ?? 'indigo';
const primary =
  opts.primary !== undefined
    ? opts.primary.trim()
    : presetChanged
      ? ''
      : (config.brand.primaryColor ?? '');
const accent =
  opts.accent !== undefined
    ? opts.accent.trim()
    : presetChanged
      ? ''
      : (config.brand.accentColor ?? '');
const fontPreset = opts.fontPreset ?? config.brand.fontPreset ?? 'system';
const rtlFontPreset = opts.rtlFontPreset ?? config.brand.rtlFontPreset ?? 'vazirmatn';
const socialCardMode = opts.socialCardMode ?? config.brand.socialCardMode ?? 'branded';
const defaultTheme = opts.defaultTheme ?? config.brand.defaultTheme ?? 'system';
const targetLocale = opts.defaultLocale ?? currentDefaultLocale;

const errors = [];
if (!name) errors.push('Site name cannot be empty.');
if (!shortName) errors.push('Short name cannot be empty.');
if (!description) errors.push('Site description cannot be empty.');
if (email && !EMAIL_RE.test(email)) errors.push(`Invalid contact email: "${email}".`);
if (!VALID_PRESETS.includes(preset)) {
  errors.push(`Invalid --preset "${preset}". Valid: ${VALID_PRESETS.join(', ')}.`);
}
if (primary && !HEX_COLOR_RE.test(primary)) {
  errors.push(`Invalid --primary "${primary}". Expected 6-digit hex color like #1e40af.`);
}
if (accent && !HEX_COLOR_RE.test(accent)) {
  errors.push(`Invalid --accent "${accent}". Expected 6-digit hex color like #f59e0b.`);
}
if (!VALID_FONTS.includes(fontPreset)) {
  errors.push(`Invalid --font "${fontPreset}". Valid: ${VALID_FONTS.join(', ')}.`);
}
if (!VALID_RTL_FONTS.includes(rtlFontPreset)) {
  errors.push(`Invalid --rtl-font "${rtlFontPreset}". Valid: ${VALID_RTL_FONTS.join(', ')}.`);
}
if (!VALID_OG_MODES.includes(socialCardMode)) {
  errors.push(`Invalid --og-mode "${socialCardMode}". Valid: ${VALID_OG_MODES.join(', ')}.`);
}
if (!VALID_THEMES.includes(defaultTheme)) {
  errors.push(`Invalid --default-theme "${defaultTheme}". Valid: ${VALID_THEMES.join(', ')}.`);
}
if (!registeredLocales.includes(targetLocale)) {
  errors.push(
    `Unknown --default-locale "${targetLocale}". Registered locales: ${registeredLocales.join(', ')}.`
  );
}
if (opts.ctaPage !== undefined && !/^[a-z0-9-]+$/.test(opts.ctaPage)) {
  errors.push(`Invalid --cta-page "${opts.ctaPage}". Expected lowercase page key.`);
}
if (opts.businessType !== undefined && !VALID_BUSINESS_TYPES.includes(opts.businessType)) {
  errors.push(
    `Invalid --business-type "${opts.businessType}". Valid: ${VALID_BUSINESS_TYPES.join(', ')}.`
  );
}
if (opts.mapEmbedUrl !== undefined && opts.mapEmbedUrl.trim() !== '') {
  try {
    const parsedMapUrl = new URL(opts.mapEmbedUrl.trim());
    if (!['http:', 'https:'].includes(parsedMapUrl.protocol)) {
      errors.push(`Invalid --map-url "${opts.mapEmbedUrl}". Expected http:// or https:// URL.`);
    }
  } catch {
    errors.push(`Invalid --map-url "${opts.mapEmbedUrl}". Expected valid URL.`);
  }
}
let parsedGeo;
let clearGeo = false;
if (opts.geo !== undefined) {
  const rawGeo = opts.geo.trim();
  if (rawGeo === '') {
    clearGeo = true;
  } else {
    const parts = rawGeo.split(',').map((s) => s.trim());
    const lat = parts.length === 2 ? Number(parts[0]) : NaN;
    const lng = parts.length === 2 ? Number(parts[1]) : NaN;
    if (
      parts.length !== 2 ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      errors.push(
        `Invalid --geo "${opts.geo}". Expected "<lat>,<lng>" with lat in [-90, 90] and lng in [-180, 180].`
      );
    } else {
      parsedGeo = { lat, lng };
    }
  }
}

const VALID_LOGO_EXTS = new Set(['.svg', '.png', '.webp', '.jpg', '.jpeg']);
const resolveLogoInput = (rawPath, flagName) => {
  if (!rawPath) return null;
  const resolved = path.resolve(rootDir, rawPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    errors.push(`File not found for ${flagName}: "${rawPath}".`);
    return null;
  }
  const ext = path.extname(resolved).toLowerCase();
  if (!VALID_LOGO_EXTS.has(ext)) {
    errors.push(
      `Unsupported file format for ${flagName}: "${ext || 'none'}". Use .svg, .png, .webp, or .jpg.`
    );
    return null;
  }
  return { resolved, ext };
};

const lightLogoAsset = opts.logo ? resolveLogoInput(opts.logo, '--logo') : null;
const darkLogoAsset = opts.logoDark ? resolveLogoInput(opts.logoDark, '--logo-dark') : null;

if (errors.length > 0) {
  for (const msg of errors) console.error(`❌ ${msg}`);
  process.exit(1);
}

const resolvedPrimaryHex = primary || themePresets.palettes[preset].primary;

config.site.name = name;
config.site.shortName = shortName;
config.site.description = description;
config.site.author = author;
config.site.contactEmail = email;

config.brand.defaultTheme = defaultTheme;
config.brand.preset = preset;
if (primary) config.brand.primaryColor = primary.toLowerCase();
else delete config.brand.primaryColor;
if (accent) config.brand.accentColor = accent.toLowerCase();
else delete config.brand.accentColor;
config.brand.fontPreset = fontPreset;
config.brand.rtlFontPreset = rtlFontPreset;
config.brand.socialCardMode = socialCardMode;
config.brand.themeColor = resolvedPrimaryHex.toLowerCase();

const brandDir = path.join(rootDir, 'public', 'brand');
const removeBrandPrefix = (prefix) => {
  if (!fs.existsSync(brandDir)) return;
  for (const file of fs.readdirSync(brandDir)) {
    if (file.startsWith(`${prefix}.`)) {
      fs.rmSync(path.join(brandDir, file), { force: true });
    }
  }
};

if (opts.logo === '') {
  delete config.brand.logo;
  removeBrandPrefix('logo');
  removeBrandPrefix('logo-dark');
} else if (lightLogoAsset || darkLogoAsset) {
  fs.mkdirSync(brandDir, { recursive: true });
  const nextLogo = {
    ...(config.brand.logo ?? {}),
    alt: config.brand.logo?.alt || name,
    showText: config.brand.logo?.showText ?? true,
  };
  if (lightLogoAsset) {
    removeBrandPrefix('logo');
    const destName = `logo${lightLogoAsset.ext}`;
    fs.copyFileSync(lightLogoAsset.resolved, path.join(brandDir, destName));
    nextLogo.light = `/brand/${destName}`;
  }
  if (darkLogoAsset) {
    removeBrandPrefix('logo-dark');
    const destName = `logo-dark${darkLogoAsset.ext}`;
    fs.copyFileSync(darkLogoAsset.resolved, path.join(brandDir, destName));
    nextLogo.dark = `/brand/${destName}`;
  } else if (opts.logoDark === '') {
    removeBrandPrefix('logo-dark');
    delete nextLogo.dark;
  }
  config.brand.logo = nextLogo;
}

config.ui = {
  ...(config.ui ?? {}),
  ...(opts.ctaPage !== undefined ? { ctaPage: opts.ctaPage } : {}),
  ...(!opts.keepDemoBanner
    ? {
        topBanner: {
          ...(config.ui?.topBanner ?? {}),
          enabled: false,
        },
      }
    : {}),
};
if (opts.blog !== undefined && config.content?.types?.blog) {
  config.content.types.blog.enabled = opts.blog;
}
if (opts.projects !== undefined && config.content?.types?.projects) {
  config.content.types.projects.enabled = opts.projects;
}

config.social = {
  github: opts.github ?? config.social?.github ?? '',
  twitter: opts.twitter ?? config.social?.twitter ?? '',
  linkedin: opts.linkedin ?? config.social?.linkedin ?? '',
  instagram: opts.instagram ?? config.social?.instagram ?? '',
  telegram: opts.telegram ?? config.social?.telegram ?? '',
};

const nextBusiness = {
  ...(config.business ?? {}),
  ...(opts.businessType !== undefined ? { type: opts.businessType } : {}),
  ...(opts.legalName !== undefined ? { legalName: opts.legalName.trim() } : {}),
  ...(opts.phone !== undefined ? { phone: opts.phone.trim() } : {}),
  ...(opts.whatsapp !== undefined ? { whatsapp: opts.whatsapp.trim() } : {}),
  ...(opts.businessTelegram !== undefined ? { telegram: opts.businessTelegram.trim() } : {}),
  ...(opts.address !== undefined ? { address: opts.address.trim() } : {}),
  ...(opts.city !== undefined ? { city: opts.city.trim() } : {}),
  ...(opts.country !== undefined ? { country: opts.country.trim() } : {}),
  ...(opts.workingHours !== undefined ? { workingHours: opts.workingHours.trim() } : {}),
  ...(opts.mapEmbedUrl !== undefined ? { mapEmbedUrl: opts.mapEmbedUrl.trim() } : {}),
};
if (clearGeo) {
  delete nextBusiness.geo;
} else if (parsedGeo) {
  nextBusiness.geo = parsedGeo;
}
config.business = nextBusiness;

writeClientConfig(config, { rootDir, sparse: true });
console.log('✅ Updated client/config.json.');

if (opts.blueprint !== undefined) {
  const syncResult = syncCollections(rootDir);
  if (syncResult.ymlChanged || syncResult.missingDirs.length > 0) {
    console.log(
      `✅ Synced content collections (.pages.yml: ${syncResult.ymlChanged ? 'updated' : 'unchanged'}, created dirs: ${syncResult.missingDirs.length}).`
    );
  }
}

try {
  if (opts.singleLang === true) {
    const soloResult = switchToSingleLocale(targetLocale, {
      rootDir,
      keepContent: opts.keepContent,
      allowDraftHome: opts.allowDraft,
      compile: false,
    });
    if (soloResult.changed) {
      console.log(
        `✅ Enabled single-language mode on "${targetLocale}"` +
          (soloResult.removedLocales.length
            ? ` (archived: ${soloResult.removedLocales.join(', ')})`
            : '') +
          '.'
      );
    }
  } else if (targetLocale !== currentDefaultLocale) {
    switchDefaultLocale(targetLocale, {
      rootDir,
      allowDraftHome: opts.allowDraft,
      compile: false,
    });
    console.log(`✅ Switched default locale to "${targetLocale}".`);
  }
} catch (error) {
  console.error('❌ Locale update failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Keep `site_description` in sync in the active default client dictionary when modified or on 'en'
const targetCore = stripSchema(readCoreMessages(targetLocale, rootDir));
const targetClient = stripSchema(readClientMessages(targetLocale, rootDir));
const currentSiteDesc = targetClient.site_description ?? targetCore.site_description;
if ((descExplicit || targetLocale === 'en') && currentSiteDesc !== description) {
  targetClient.site_description = description;
  writeClientMessages(targetLocale, targetClient, rootDir);
  console.log(`✅ Synchronized site_description in client/messages/${targetLocale}.json.`);
}

console.log('🔄 Compiling Paraglide messages...');
compileMessages(rootDir);

if (!opts.skipAssets) {
  console.log('🎨 Refreshing brand icons & default social card...');
  execFileSync(
    process.execPath,
    [path.join(rootDir, 'scripts', 'generate-assets.mjs'), '--brand-only', '--force'],
    { cwd: rootDir, stdio: 'inherit' }
  );
}

console.log('\n🎉 Brand & site initialization complete!');
console.log(`   Site: ${name} (${shortName})`);
console.log(`   Palette: ${preset}${primary ? ` + primary ${primary}` : ''}${accent ? ` + accent ${accent}` : ''}`);
console.log(`   Fonts: latin=${fontPreset}, rtl=${rtlFontPreset}`);
console.log(`   OG Mode: ${socialCardMode} | Default locale: ${targetLocale}`);
console.log('   Next: run `npm run doctor && npm run lint && npm run build` to verify.');
