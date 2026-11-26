/**
 * Local Dev & Standalone Studio API handler (`/__studio/` in `astro dev`, or `npm run studio`).
 *
 * Strictly uses Node built-ins + existing project scripts/helpers (`site-apply`,
 * `config`, `blueprints`, `content-types`, `frontmatter`, `i18n-sync`, `blocks-catalog`,
 * `content-sync`, `redirects`, `compile-messages`) with strict input validation,
 * path confinement, SVG sanitization, allow-listed CLI execution (no shell), and a
 * write mutex so Astro SSG output (`dist/`) remains 100% pure static HTML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { BLUEPRINTS } from './blueprints.mjs';
import { buildBlocksCatalog } from './blocks-catalog.mjs';
import { compileMessages } from './compile-messages.mjs';
import {
  cmsConfigPathFor,
  deepMergeConfig,
  readClientConfig,
  readCmsConfig,
  readCoreAndClientConfig,
  readCoreConfig,
  readMergedConfig,
  sanitizeCmsConfig,
  writeClientConfig,
} from './config.mjs';
import {
  CORE_TYPES,
  countTodos,
  countWords,
  getKnownTypes,
  readClientCollectionKeys,
  readContentTypes,
} from './content-types.mjs';
import { parseFrontmatter, stringifyFrontmatter } from './frontmatter.mjs';
import { syncDictionaryKeys } from './i18n-sync.mjs';
import { readLocaleConfig, writeLocaleConfig } from './locales.mjs';
import {
  readClientMessages,
  readCoreMessages,
  readMergedMessages,
  stripSchema,
  writeClientMessages,
} from './merge-messages.mjs';
import { validateRedirects } from './redirects.mjs';
import { applySiteSpec, validateSiteSpec } from './site-apply.mjs';
import { renderStudioHtml } from './studio-ui.mjs';
import { syncCollections } from '../content-sync.mjs';
import { upsertEnvContent } from '../client-bootstrap.mjs';

const execFileAsync = promisify(execFile);
const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const SAFE_KEY_RE = /^[a-z0-9-]+$/;
const SAFE_GROUP_RE = /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u;
const SAFE_FIELD_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const SAFE_I18N_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SAFE_LOCALE_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const SAFE_PKG_NAME_RE = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/i;
const TAXONOMY_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_PART_RE = /^[\p{L}\p{N}\p{M}]+$/u;

const ENV_ALLOWED_KEYS = [
  'SITE_URL',
  'PUBLIC_API_BASE_URL',
  'PUBLIC_CONTACT_API_URL',
  'PUBLIC_NEWSLETTER_API_URL',
  'PUBLIC_TURNSTILE_SITE_KEY',
  'PUBLIC_WEB3FORMS_KEY',
];

const RESERVED_BASES = new Set([
  'page',
  'pagefind',
  '_astro',
  'api',
  'rss',
  'og',
  'sitemap',
  'robots',
  'icons',
  'site.webmanifest',
  'llms.txt',
]);

const VALID_FIELD_TYPES = new Set([
  'string',
  'text',
  'number',
  'boolean',
  'date',
  'url',
  'image',
  'enum',
  'string[]',
  'taxonomy[]',
]);

const VALID_FILTER_MODES = new Set(['single', 'multi', 'select', 'toggle', 'range']);
const VALID_FILTER_SORTS = new Set(['alpha', 'count', 'config']);
const VALID_CARD_LAYOUTS = new Set(['grid', 'gallery', 'compact']);
const VALID_ASPECT_RATIOS = new Set(['video', 'square', 'portrait', 'auto']);
const VALID_THEME_MODES = new Set(['system', 'light', 'dark']);
const VALID_SOCIAL_CARD_MODES = new Set(['branded', 'artwork', 'default']);
const VALID_BANNER_VARIANTS = new Set(['primary', 'hero', 'surface', 'accent', 'info', 'warning']);
const VALID_BANNER_DISMISS_MODES = new Set(['session', 'persistent']);
const VALID_QUICK_CONTACT_CHANNELS = new Set(['phone', 'whatsapp', 'telegram']);
const VALID_MOBILE_BEHAVIORS = new Set(['lightweight', 'disable', 'full']);
const VALID_BUSINESS_TYPES = new Set([
  'Organization',
  'LocalBusiness',
  'ProfessionalService',
  'MedicalBusiness',
  'Store',
]);
const VALID_API_PROVIDERS = new Set(['custom', 'web3forms', 'formspree', 'basin', 'webhook']);
const SAFE_HERO_VALUES = new Set(['none', 'minimal', 'default', true, false]);
const SAFE_CONTAINER_VALUES = new Set(['canvas', 'contained', 'prose']);
const ALLOWED_LOGO_MIMES = new Map([
  ['image/svg+xml', '.svg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/jpeg', '.jpg'],
]);

const SECTION_BLOCKS_META = [
  { name: 'LandingHeroSplit', category: 'hero' },
  { name: 'HeroCenteredEditorial', category: 'hero' },
  { name: 'HeroDashboardShowcase', category: 'hero' },
  { name: 'HeroCommandCli', category: 'hero' },
  { name: 'HeroInteractivePrompt', category: 'hero' },
  { name: 'HeroProofMarquee', category: 'hero' },
  { name: 'HeroFloatingOrbSplit', category: 'hero' },
  { name: 'BentoCapabilities', category: 'section' },
  { name: 'ProofStatsRow', category: 'section' },
  { name: 'FaqAccordion', category: 'section' },
  { name: 'CtaBanner', category: 'section' },
  { name: 'PricingSection', category: 'section' },
  { name: 'TestimonialGrid', category: 'section' },
  { name: 'TeamSection', category: 'section' },
  { name: 'PartnerLogos', category: 'section' },
  { name: 'NewsletterBanner', category: 'section' },
  { name: 'PromoBanner', category: 'section' },
  { name: 'AboutSplitSection', category: 'section' },
  { name: 'ProcessSteps', category: 'section' },
  { name: 'FeatureTabsSection', category: 'section' },
  { name: 'ComparisonTable', category: 'section' },
  { name: 'FeatureCardGrid', category: 'section' },
  { name: 'ImageGallerySection', category: 'section' },
  { name: 'LatestPostsSection', category: 'section' },
  { name: 'ContactSplitSection', category: 'section' },
  { name: 'CarouselSection', category: 'section' },
  { name: 'ProductShowcaseGrid', category: 'section' },
  { name: 'AuthFormCard', category: 'section' },
  { name: 'ParallaxSection', category: 'section' },
];

const HERO_PRIORITY_PROPS = [
  'title',
  'titleLead',
  'titleAccent',
  'titleHighlight',
  'titleSecondary',
  'description',
  'eyebrow',
  'primaryCta',
  'secondaryCta',
  'image',
  'imageAlt',
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertSafeKey(value, label) {
  if (typeof value !== 'string' || !SAFE_KEY_RE.test(value.trim())) {
    throw new Error(`Invalid ${label}: expected lowercase letters, digits, or hyphens.`);
  }
  return value.trim();
}

function assertSafeGroupKey(value, label = 'entry group') {
  if (typeof value !== 'string' || !SAFE_GROUP_RE.test(value.trim())) {
    throw new Error(`Invalid ${label}: expected letters, digits, hyphens, or underscores.`);
  }
  return value.trim();
}

function assertSafeLocale(value) {
  if (typeof value !== 'string' || !SAFE_LOCALE_RE.test(value.trim())) {
    throw new Error('Invalid locale code (expected e.g. "en", "fa", "ar", "en-US").');
  }
  return value.trim();
}

function assertConfinedPath(baseDir, targetPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
    throw Object.assign(new Error('Invalid path outside allowed workspace directory.'), {
      statusCode: 400,
    });
  }
  return resolvedTarget;
}

function assertValidHttpUrl(raw, label) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid ${label} "${trimmed}": expected an http:// or https:// URL.`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Invalid ${label} "${trimmed}": only http:// and https:// schemes are allowed.`);
  }
  return trimmed;
}

function collectHttpUrlError(raw, label, errors, { allowRelative = false } = {}) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return;
  if (allowRelative && trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) {
      errors.push(`Invalid ${label} "${trimmed}": protocol-relative URLs are not allowed.`);
    }
    return;
  }
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      errors.push(`Invalid ${label} "${trimmed}": only http:// and https:// schemes are allowed.`);
    }
  } catch {
    errors.push(
      `Invalid ${label} "${trimmed}": expected an http:// or https:// URL${allowRelative ? ' or /path' : ''}.`
    );
  }
}

function isUnsafeProtocolHref(raw) {
  const normalized = String(raw ?? '').trim().replace(/[\u0000-\u0020]+/g, '').toLowerCase();
  return normalized.startsWith('javascript:') || normalized.startsWith('vbscript:') || normalized.startsWith('data:');
}

function isValidScheduleString(value) {
  const trimmed = String(value ?? '').trim();
  const dateOnlyMatch = DATE_ONLY_RE.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    return (
      dt.getUTCFullYear() === year &&
      dt.getUTCMonth() === month - 1 &&
      dt.getUTCDate() === day
    );
  }
  if (!ISO_DATETIME_RE.test(trimmed)) return false;
  return Number.isFinite(Date.parse(trimmed));
}

function parseScheduleBound(value, bound) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const target = DATE_ONLY_RE.test(trimmed)
    ? bound === 'start'
      ? `${trimmed}T00:00:00.000Z`
      : `${trimmed}T23:59:59.999Z`
    : trimmed;
  const ms = Date.parse(target);
  return Number.isFinite(ms) ? ms : null;
}

function isValidSlug(value) {
  if (value === '') return true;
  return value.split(/[\u200C\u200D-]/u).every((part) => SLUG_PART_RE.test(part));
}

function isValidPageSlug(value) {
  if (value === '') return true;
  return value.split('/').every((segment) => segment.length > 0 && isValidSlug(segment));
}

function readClientTemplateKeys(rootDir) {
  const tplPath = path.join(rootDir, 'client', 'templates', 'index.ts');
  if (!fs.existsSync(tplPath)) return [];
  const raw = fs.readFileSync(tplPath, 'utf-8');
  const match = raw.match(/CLIENT_PAGE_TEMPLATES[^=]*=\s*\{([\s\S]*?)\}/);
  if (!match) return [];
  const keys = [];
  for (const line of match[1].split(',')) {
    const m = line.trim().match(/^['"]?([a-zA-Z0-9_-]+)['"]?\s*(?::|$)/);
    if (m && m[1]) keys.push(m[1]);
  }
  return keys;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

function sendHtml(res, html) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(html);
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request payload exceeds 2 MB limit.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Malformed JSON request body.'), { statusCode: 400 }));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

function loadThemePresets(rootDir) {
  const presetsPath = path.join(rootDir, 'src', 'libs', 'config', 'theme-presets.json');
  const fallbackPresetsPath = path.join(defaultRootDir, 'src', 'libs', 'config', 'theme-presets.json');
  return JSON.parse(
    fs.readFileSync(fs.existsSync(presetsPath) ? presetsPath : fallbackPresetsPath, 'utf-8')
  );
}

function parseAllowListedEnv(rootDir) {
  const envPath = path.join(rootDir, '.env');
  const result = Object.fromEntries(ENV_ALLOWED_KEYS.map((k) => [k, '']));
  if (!fs.existsSync(envPath)) {
    return { exists: false, vars: result };
  }
  const raw = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    if (!ENV_ALLOWED_KEYS.includes(key)) continue;
    let value = match[2].trim();
    const quote = value[0];
    if (value.length > 1 && (quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    } else {
      const inlineComment = value.indexOf(' #');
      if (inlineComment !== -1) value = value.slice(0, inlineComment).trim();
    }
    result[key] = value;
  }
  return { exists: true, vars: result };
}

function readProjectMeta(rootDir) {
  const pkgPath = path.join(rootDir, 'package.json');
  let pkg = {};
  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
      pkg = {};
    }
  }

  const metaPath = path.join(rootDir, 'metadata.json');
  let appMeta = null;
  if (fs.existsSync(metaPath)) {
    try {
      appMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch {
      appMeta = null;
    }
  }

  const envInfo = parseAllowListedEnv(rootDir);

  return {
    packageJson: {
      name: typeof pkg.name === 'string' ? pkg.name : '',
      version: typeof pkg.version === 'string' ? pkg.version : '1.0.0',
      description: typeof pkg.description === 'string' ? pkg.description : '',
      author: typeof pkg.author === 'string' ? pkg.author : '',
      license: typeof pkg.license === 'string' ? pkg.license : 'MIT',
      private: Boolean(pkg.private),
    },
    metadataJson: {
      exists: Boolean(appMeta),
      name: typeof appMeta?.name === 'string' ? appMeta.name : '',
      description: typeof appMeta?.description === 'string' ? appMeta.description : '',
    },
    env: {
      exists: envInfo.exists,
      allowedKeys: ENV_ALLOWED_KEYS,
      vars: envInfo.vars,
    },
  };
}

function saveProjectMeta(rootDir, payload) {
  if (!isPlainObject(payload)) {
    throw new Error('Project metadata payload must be an object.');
  }

  const updatedFiles = [];

  if (isPlainObject(payload.packageJson)) {
    const pkgPath = path.join(rootDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const current = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const p = payload.packageJson;
      if (p.name !== undefined) {
        const name = String(p.name).trim();
        if (!SAFE_PKG_NAME_RE.test(name)) {
          throw new Error(
            `Invalid package.json name "${name}". Use lowercase npm slug characters (e.g. "client-acme-site").`
          );
        }
        current.name = name;
      }
      if (p.version !== undefined) {
        const ver = String(p.version).trim();
        if (!ver) throw new Error('package.json version cannot be empty.');
        current.version = ver;
      }
      if (p.description !== undefined) {
        const desc = String(p.description).trim();
        if (desc) current.description = desc;
        else delete current.description;
      }
      if (p.author !== undefined) {
        const author = String(p.author).trim();
        if (author) current.author = author;
        else delete current.author;
      }
      if (p.license !== undefined) {
        const license = String(p.license).trim();
        if (license) current.license = license;
      }
      fs.writeFileSync(pkgPath, `${JSON.stringify(current, null, 2)}\n`, 'utf-8');
      updatedFiles.push('package.json');
    }
  }

  if (isPlainObject(payload.metadataJson)) {
    const metaPath = path.join(rootDir, 'metadata.json');
    const current = fs.existsSync(metaPath)
      ? JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
      : { name: '', description: '', permissions: [], capabilities: [] };
    const m = payload.metadataJson;
    if (m.name !== undefined) {
      const name = String(m.name).trim();
      if (!name) throw new Error('metadata.json name cannot be empty.');
      current.name = name;
    }
    if (m.description !== undefined) {
      current.description = String(m.description).trim();
    }
    fs.writeFileSync(metaPath, `${JSON.stringify(current, null, 2)}\n`, 'utf-8');
    updatedFiles.push('metadata.json');
  }

  if (isPlainObject(payload.env)) {
    const updates = {};
    for (const key of ENV_ALLOWED_KEYS) {
      if (!(key in payload.env)) continue;
      const rawVal = String(payload.env[key] ?? '').trim();
      if (
        rawVal !== '' &&
        ['SITE_URL', 'PUBLIC_API_BASE_URL', 'PUBLIC_CONTACT_API_URL', 'PUBLIC_NEWSLETTER_API_URL'].includes(key)
      ) {
        if (key === 'SITE_URL' || !rawVal.startsWith('/')) {
          assertValidHttpUrl(rawVal, `.env ${key}`);
        }
      }
      updates[key] = rawVal;
    }
    if (Object.keys(updates).length > 0) {
      const envPath = path.join(rootDir, '.env');
      const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      fs.writeFileSync(envPath, upsertEnvContent(existing, updates), 'utf-8');
      updatedFiles.push('.env');
    }
  }

  return {
    ok: true,
    updatedFiles,
    projectMeta: readProjectMeta(rootDir),
  };
}

function validateTopBannerNode(tb, prefix, errors) {
  if (!isPlainObject(tb)) {
    errors.push(`${prefix} must be an object.`);
    return;
  }
  if (tb.id !== undefined && !String(tb.id).trim()) {
    errors.push(`${prefix}.id cannot be empty.`);
  }
  if (tb.variant !== undefined && !VALID_BANNER_VARIANTS.has(tb.variant)) {
    errors.push(`${prefix}.variant "${tb.variant}" is invalid.`);
  }
  if (tb.dismissMode !== undefined && !VALID_BANNER_DISMISS_MODES.has(tb.dismissMode)) {
    errors.push(`${prefix}.dismissMode "${tb.dismissMode}" must be "session" or "persistent".`);
  }
  if (tb.dismissTtlDays !== undefined) {
    const ttl = Number(tb.dismissTtlDays);
    if (typeof tb.dismissTtlDays === 'string' && tb.dismissTtlDays.trim() === '') {
      errors.push(`${prefix}.dismissTtlDays cannot be blank (omit to clear).`);
    } else if (!Number.isInteger(ttl) || ttl < 1 || ttl > 365) {
      errors.push(`${prefix}.dismissTtlDays must be an integer between 1 and 365.`);
    }
  }
  if (tb.dismissVersion !== undefined) {
    const ver = Number(tb.dismissVersion);
    if (typeof tb.dismissVersion === 'string' && tb.dismissVersion.trim() === '') {
      errors.push(`${prefix}.dismissVersion cannot be blank.`);
    } else if (!Number.isInteger(ver) || ver < 1) {
      errors.push(`${prefix}.dismissVersion must be a positive integer.`);
    }
  }
  if (tb.heightPx !== undefined) {
    const h = Number(tb.heightPx);
    if (typeof tb.heightPx === 'string' && tb.heightPx.trim() === '') {
      errors.push(`${prefix}.heightPx cannot be blank (omit to clear).`);
    } else if (!Number.isInteger(h) || h < 24 || h > 160) {
      errors.push(`${prefix}.heightPx must be an integer between 24 and 160.`);
    }
  }
  if (tb.ctaHref !== undefined && isUnsafeProtocolHref(tb.ctaHref)) {
    errors.push(`${prefix}.ctaHref uses a disallowed URL scheme.`);
  }
  if (isPlainObject(tb.ctaHrefByLocale)) {
    for (const [loc, href] of Object.entries(tb.ctaHrefByLocale)) {
      if (isUnsafeProtocolHref(href)) {
        errors.push(`${prefix}.ctaHrefByLocale.${loc} uses a disallowed URL scheme.`);
      }
    }
  }
  if (tb.startsAt !== undefined && tb.startsAt !== '' && !isValidScheduleString(tb.startsAt)) {
    errors.push(`${prefix}.startsAt "${tb.startsAt}" must be YYYY-MM-DD or ISO datetime.`);
  }
  if (tb.endsAt !== undefined && tb.endsAt !== '' && !isValidScheduleString(tb.endsAt)) {
    errors.push(`${prefix}.endsAt "${tb.endsAt}" must be YYYY-MM-DD or ISO datetime.`);
  }
  if (tb.startsAt && tb.endsAt) {
    const sMs = parseScheduleBound(tb.startsAt, 'start');
    const eMs = parseScheduleBound(tb.endsAt, 'end');
    if (sMs !== null && eMs !== null && eMs < sMs) {
      errors.push(`${prefix}.endsAt must not be earlier than startsAt.`);
    }
  }
}

function validateConfigObject(cfg, rootDir) {
  const errors = [];
  if (!isPlainObject(cfg)) return ['Configuration must be a JSON object.'];

  if (cfg.site !== undefined) {
    if (!isPlainObject(cfg.site)) {
      errors.push('site must be an object.');
    } else {
      for (const k of ['name', 'shortName', 'description']) {
        if (cfg.site[k] !== undefined && !String(cfg.site[k]).trim()) {
          errors.push(`site.${k} cannot be empty.`);
        }
      }
      if (
        cfg.site.contactEmail !== undefined &&
        String(cfg.site.contactEmail).trim() !== '' &&
        !EMAIL_RE.test(String(cfg.site.contactEmail).trim())
      ) {
        errors.push(`Invalid site.contactEmail "${cfg.site.contactEmail}".`);
      }
      if (cfg.site.localizedNames !== undefined) {
        if (!isPlainObject(cfg.site.localizedNames)) {
          errors.push('site.localizedNames must be an object.');
        } else {
          for (const [loc, val] of Object.entries(cfg.site.localizedNames)) {
            if (typeof val !== 'string') {
              errors.push(`site.localizedNames.${loc} must be a string.`);
            }
          }
        }
      }
      if (cfg.site.socialImage !== undefined) {
        if (!isPlainObject(cfg.site.socialImage)) {
          errors.push('site.socialImage must be an object.');
        } else {
          const si = cfg.site.socialImage;
          if (!String(si.path ?? '').startsWith('/')) {
            errors.push('site.socialImage.path must start with "/".');
          }
          const w = Number(si.width);
          const h = Number(si.height);
          if (!Number.isInteger(w) || w <= 0) {
            errors.push('site.socialImage.width must be a positive integer.');
          }
          if (!Number.isInteger(h) || h <= 0) {
            errors.push('site.socialImage.height must be a positive integer.');
          }
        }
      }
      if (isPlainObject(cfg.site.authors)) {
        for (const [id, author] of Object.entries(cfg.site.authors)) {
          if (!isPlainObject(author) || !String(author.name ?? '').trim()) {
            errors.push(`site.authors.${id}.name cannot be empty.`);
            continue;
          }
          for (const strKey of ['name', 'url', 'jobTitle', 'description', 'image']) {
            if (author[strKey] !== undefined && typeof author[strKey] !== 'string') {
              errors.push(`site.authors.${id}.${strKey} must be a plain string.`);
            }
          }
          if (author.url) {
            collectHttpUrlError(author.url, `site.authors.${id}.url`, errors, { allowRelative: true });
          }
          if (author.sameAs !== undefined) {
            if (!Array.isArray(author.sameAs)) {
              errors.push(`site.authors.${id}.sameAs must be an array.`);
            } else {
              author.sameAs.forEach((u, ui) => {
                collectHttpUrlError(u, `site.authors.${id}.sameAs[${ui}]`, errors);
              });
            }
          }
        }
      }
    }
  }

  if (cfg.brand !== undefined) {
    if (!isPlainObject(cfg.brand)) {
      errors.push('brand must be an object.');
    } else {
      const presets = loadThemePresets(rootDir);
      if (cfg.brand.preset && !(cfg.brand.preset in (presets.palettes ?? {}))) {
        errors.push(`Invalid brand.preset "${cfg.brand.preset}".`);
      }
      if (cfg.brand.fontPreset && !(cfg.brand.fontPreset in (presets.latinFonts ?? {}))) {
        errors.push(`Invalid brand.fontPreset "${cfg.brand.fontPreset}".`);
      }
      if (cfg.brand.rtlFontPreset && !(cfg.brand.rtlFontPreset in (presets.rtlFonts ?? {}))) {
        errors.push(`Invalid brand.rtlFontPreset "${cfg.brand.rtlFontPreset}".`);
      }
      if (cfg.brand.defaultTheme !== undefined && !VALID_THEME_MODES.has(cfg.brand.defaultTheme)) {
        errors.push(`Invalid brand.defaultTheme "${cfg.brand.defaultTheme}".`);
      }
      if (cfg.brand.socialCardMode !== undefined && !VALID_SOCIAL_CARD_MODES.has(cfg.brand.socialCardMode)) {
        errors.push(`Invalid brand.socialCardMode "${cfg.brand.socialCardMode}".`);
      }
      for (const reqHexKey of ['themeColor', 'backgroundColor']) {
        if (reqHexKey in cfg.brand) {
          const val = String(cfg.brand[reqHexKey] ?? '').trim();
          if (!HEX_COLOR_RE.test(val)) {
            errors.push(`Invalid brand.${reqHexKey} "${val}". Required 6-digit hex color like #4338ca.`);
          }
        }
      }
      for (const hexKey of ['primaryColor', 'accentColor', 'darkThemeColor']) {
        const val = cfg.brand[hexKey];
        if (val !== undefined && val !== '' && !HEX_COLOR_RE.test(String(val).trim())) {
          errors.push(`Invalid brand.${hexKey} "${val}". Expected 6-digit hex color like #4338ca.`);
        }
      }
      if (cfg.brand.logo !== undefined) {
        if (!isPlainObject(cfg.brand.logo)) {
          errors.push('brand.logo must be an object.');
        } else {
          for (const dimKey of ['width', 'height']) {
            if (cfg.brand.logo[dimKey] !== undefined) {
              const n = Number(cfg.brand.logo[dimKey]);
              if (!Number.isInteger(n) || n <= 0) {
                errors.push(`brand.logo.${dimKey} must be a positive integer.`);
              }
            }
          }
        }
      }
    }
  }

  if (cfg.ui !== undefined && isPlainObject(cfg.ui)) {
    if (cfg.ui.ctaPage !== undefined && !String(cfg.ui.ctaPage).trim()) {
      errors.push('ui.ctaPage cannot be empty.');
    }
    if (isPlainObject(cfg.ui.navbar)) {
      const nb = cfg.ui.navbar;
      const nbRanges = [
        ['initialTopOffset', 0, 400],
        ['stickyScrollThreshold', 0, 2000],
        ['stickyTopOffset', 0, 400],
        ['manualBannerOffset', 0, 600],
      ];
      for (const [k, min, max] of nbRanges) {
        if (nb[k] !== undefined) {
          const val = nb[k] === '' ? NaN : Number(nb[k]);
          if (!Number.isFinite(val) || val < min || val > max) {
            errors.push(`ui.navbar.${k} must be between ${min} and ${max}.`);
          }
        }
      }
    }
    if (isPlainObject(cfg.ui.topBanner)) {
      validateTopBannerNode(cfg.ui.topBanner, 'ui.topBanner', errors);
      if (cfg.ui.topBanner.items !== undefined) {
        if (!Array.isArray(cfg.ui.topBanner.items)) {
          errors.push('ui.topBanner.items must be an array.');
        } else {
          cfg.ui.topBanner.items.forEach((item, idx) => {
            validateTopBannerNode(item, `ui.topBanner.items[${idx}]`, errors);
          });
        }
      }
    }
    if (isPlainObject(cfg.ui.quickContact) && cfg.ui.quickContact.channels !== undefined) {
      if (!Array.isArray(cfg.ui.quickContact.channels)) {
        errors.push('ui.quickContact.channels must be an array.');
      } else {
        for (const ch of cfg.ui.quickContact.channels) {
          if (!VALID_QUICK_CONTACT_CHANNELS.has(ch)) {
            errors.push(`Invalid ui.quickContact.channels entry "${ch}".`);
          }
        }
      }
    }
    if (isPlainObject(cfg.ui.motion)) {
      const mt = cfg.ui.motion;
      const motionRanges = [
        ['revealDelayMs', 0, 5000],
        ['revealDurationMs', 100, 5000],
        ['revealDistancePx', 0, 240],
        ['revealSmallDistancePx', 0, 120],
        ['staggerStepMs', 0, 1000],
        ['smoothScrollLerp', 0.02, 1],
      ];
      for (const [k, min, max] of motionRanges) {
        if (mt[k] !== undefined) {
          const n = mt[k] === '' ? NaN : Number(mt[k]);
          if (!Number.isFinite(n) || n < min || n > max) {
            errors.push(`ui.motion.${k} must be between ${min} and ${max}.`);
          }
        }
      }
      if (mt.rootMargin !== undefined && !String(mt.rootMargin).trim()) {
        errors.push('ui.motion.rootMargin cannot be empty.');
      }
      if (mt.revealEasing !== undefined && (!String(mt.revealEasing).trim() || /[;\n{}]/.test(String(mt.revealEasing)))) {
        errors.push('ui.motion.revealEasing must be a valid CSS timing function without semicolons or braces.');
      }
      if (mt.mobileBehavior !== undefined && !VALID_MOBILE_BEHAVIORS.has(mt.mobileBehavior)) {
        errors.push(`Invalid ui.motion.mobileBehavior "${mt.mobileBehavior}".`);
      }
    }
    if (isPlainObject(cfg.ui.navigation)) {
      if (Array.isArray(cfg.ui.navigation.pages)) {
        cfg.ui.navigation.pages.forEach((p, i) => {
          if (!isPlainObject(p) || !String(p.group ?? '').trim()) {
            errors.push(`ui.navigation.pages[${i}].group is required.`);
          }
        });
      }
      if (Array.isArray(cfg.ui.navigation.footerColumns)) {
        cfg.ui.navigation.footerColumns.forEach((col, ci) => {
          if (!isPlainObject(col) || !String(col.key ?? '').trim()) {
            errors.push(`ui.navigation.footerColumns[${ci}].key is required.`);
            return;
          }
          if (Array.isArray(col.items)) {
            col.items.forEach((it, ii) => {
              if (!isPlainObject(it) || (!String(it.group ?? '').trim() && !String(it.href ?? '').trim())) {
                errors.push(`ui.navigation.footerColumns[${ci}].items[${ii}] must specify "group" or "href".`);
              } else if (it.href && isUnsafeProtocolHref(it.href)) {
                errors.push(`ui.navigation.footerColumns[${ci}].items[${ii}].href uses a disallowed URL scheme.`);
              }
            });
          }
        });
      }
    }
  }

  if (cfg.blog !== undefined && isPlainObject(cfg.blog)) {
    if (cfg.blog.postsPerPage !== undefined) {
      const ppp = cfg.blog.postsPerPage === '' ? NaN : Number(cfg.blog.postsPerPage);
      if (!Number.isInteger(ppp) || ppp < 1) {
        errors.push('blog.postsPerPage must be a positive integer.');
      }
    }
  }

  if (cfg.business !== undefined) {
    if (!isPlainObject(cfg.business)) {
      errors.push('business must be an object.');
    } else {
      if (cfg.business.type && !VALID_BUSINESS_TYPES.has(cfg.business.type)) {
        errors.push(`Invalid business.type "${cfg.business.type}".`);
      }
      for (const strKey of [
        'legalName',
        'phone',
        'whatsapp',
        'telegram',
        'address',
        'city',
        'country',
        'workingHours',
        'mapEmbedUrl',
      ]) {
        if (cfg.business[strKey] !== undefined && typeof cfg.business[strKey] !== 'string') {
          errors.push(`business.${strKey} must be a plain string (not a nested object).`);
        }
      }
      if (cfg.business.mapEmbedUrl) {
        collectHttpUrlError(cfg.business.mapEmbedUrl, 'business.mapEmbedUrl', errors);
      }
      if (cfg.business.geo !== undefined) {
        const lat = Number(cfg.business.geo?.lat);
        const lng = Number(cfg.business.geo?.lng);
        if (
          !isPlainObject(cfg.business.geo) ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          errors.push('business.geo must have valid numeric lat (-90..90) and lng (-180..180).');
        }
      }
    }
  }

  if (cfg.social !== undefined && isPlainObject(cfg.social)) {
    for (const [k, v] of Object.entries(cfg.social)) {
      if (typeof v !== 'string') {
        errors.push(`social.${k} must be a string.`);
      } else if (v.trim() !== '') {
        collectHttpUrlError(v, `social.${k}`, errors);
      }
    }
  }

  if (cfg.analytics !== undefined && isPlainObject(cfg.analytics)) {
    const a = cfg.analytics;
    if (a.ga4Id && !/^G-[A-Z0-9]{4,20}$/i.test(String(a.ga4Id).trim())) {
      errors.push(`Invalid analytics.ga4Id "${a.ga4Id}" (expected G-XXXXXXXXXX).`);
    }
    if (a.gtmId && !/^GTM-[A-Z0-9]{4,16}$/i.test(String(a.gtmId).trim())) {
      errors.push(`Invalid analytics.gtmId "${a.gtmId}" (expected GTM-XXXXXXX).`);
    }
    if (a.clarityId && !/^[a-z0-9]{6,20}$/i.test(String(a.clarityId).trim())) {
      errors.push(`Invalid analytics.clarityId "${a.clarityId}".`);
    }
    if (a.plausibleDomain && /[\s/]/.test(String(a.plausibleDomain).trim())) {
      errors.push(`Invalid analytics.plausibleDomain "${a.plausibleDomain}" (expected hostname like example.com).`);
    }
    if (
      a.umamiWebsiteId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        String(a.umamiWebsiteId).trim()
      )
    ) {
      errors.push(`Invalid analytics.umamiWebsiteId "${a.umamiWebsiteId}" (expected UUID).`);
    }
    if (a.umamiWebsiteId && !String(a.umamiSrc ?? '').trim()) {
      errors.push('analytics.umamiSrc is required when analytics.umamiWebsiteId is set.');
    }
    if (a.plausibleSrc && String(a.plausibleSrc).trim() !== '') {
      collectHttpUrlError(a.plausibleSrc, 'analytics.plausibleSrc', errors);
    }
    if (a.umamiSrc && String(a.umamiSrc).trim() !== '') {
      collectHttpUrlError(a.umamiSrc, 'analytics.umamiSrc', errors);
    }
  }

  if (cfg.cookies !== undefined && isPlainObject(cfg.cookies)) {
    const ck = cfg.cookies;
    if (ck.expirationDays !== undefined) {
      const days = ck.expirationDays === '' ? NaN : Number(ck.expirationDays);
      if (!Number.isInteger(days) || days < 1 || days > 400) {
        errors.push('cookies.expirationDays must be an integer between 1 and 400.');
      }
    }
    if (ck.consentVersion !== undefined) {
      const ver = ck.consentVersion === '' ? NaN : Number(ck.consentVersion);
      if (!Number.isInteger(ver) || ver < 1) {
        errors.push('cookies.consentVersion must be a positive integer.');
      }
    }
    if (ck.storageKey !== undefined && !/^[a-zA-Z0-9_-]+$/.test(String(ck.storageKey))) {
      errors.push('cookies.storageKey must contain only ASCII letters, digits, hyphens, or underscores.');
    }
  }

  if (cfg.api !== undefined && isPlainObject(cfg.api)) {
    if (cfg.api.provider !== undefined && !VALID_API_PROVIDERS.has(cfg.api.provider)) {
      errors.push(`Invalid api.provider "${cfg.api.provider}".`);
    }
    if (cfg.api.baseUrl !== undefined && String(cfg.api.baseUrl).trim() !== '') {
      collectHttpUrlError(cfg.api.baseUrl, 'api.baseUrl', errors, { allowRelative: true });
    }
    if (cfg.api.timeoutMs !== undefined) {
      const ms = cfg.api.timeoutMs === '' ? NaN : Number(cfg.api.timeoutMs);
      if (!Number.isInteger(ms) || ms < 1000 || ms > 60000) {
        errors.push('api.timeoutMs must be an integer between 1000 and 60000.');
      }
    }
    if (Array.isArray(cfg.api.topics)) {
      cfg.api.topics.forEach((tp, idx) => {
        if (!isPlainObject(tp) || !String(tp.value ?? '').trim()) {
          errors.push(`api.topics[${idx}].value cannot be empty.`);
        }
      });
    }
  }

  if (cfg.redirects !== undefined) {
    errors.push(...validateRedirects(cfg.redirects));
  }

  if (cfg.server !== undefined && isPlainObject(cfg.server)) {
    if (cfg.server.host !== undefined && !String(cfg.server.host).trim()) {
      errors.push('server.host cannot be empty.');
    }
    if (cfg.server.port !== undefined) {
      const port = cfg.server.port === '' ? NaN : Number(cfg.server.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        errors.push('server.port must be an integer between 1 and 65535.');
      }
    }
  }

  return errors;
}

function stripEmptyMapEntries(obj) {
  if (!isPlainObject(obj)) return {};
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
      .map(([k, v]) => [k, v.trim()])
  );
}

function cleanTopBannerNode(node) {
  if (!isPlainObject(node)) return node;
  const out = { ...node };
  if (out.icon === '') delete out.icon;
  for (const optKey of ['startsAt', 'endsAt', 'dismissTtlDays', 'heightPx', 'dismissVersion']) {
    if (out[optKey] === '' || out[optKey] === null) {
      delete out[optKey];
    }
  }
  for (const mapKey of ['badgeByLocale', 'messageByLocale', 'ctaLabelByLocale', 'ctaHrefByLocale']) {
    if (isPlainObject(out[mapKey])) {
      out[mapKey] = stripEmptyMapEntries(out[mapKey]);
    }
  }
  return out;
}

function cleanConfigBeforeWrite(cfg) {
  const next = structuredClone(cfg);

  if (isPlainObject(next.site)) {
    if (isPlainObject(next.site.localizedNames)) {
      next.site.localizedNames = stripEmptyMapEntries(next.site.localizedNames);
    }
    if (isPlainObject(next.site.authors)) {
      for (const auth of Object.values(next.site.authors)) {
        if (!isPlainObject(auth)) continue;
        if (Array.isArray(auth.sameAs)) {
          auth.sameAs = auth.sameAs.map((u) => String(u).trim()).filter(Boolean);
        }
      }
    }
  }

  // Clear optional empty hex overrides so preset palette takes effect
  if (isPlainObject(next.brand)) {
    if (next.brand.primaryColor === '') delete next.brand.primaryColor;
    if (next.brand.accentColor === '') delete next.brand.accentColor;
    if (next.brand.darkThemeColor === '') delete next.brand.darkThemeColor;
    if (isPlainObject(next.brand.logo)) {
      if (next.brand.logo.width === '' || next.brand.logo.width === 0 || next.brand.logo.width === null) {
        delete next.brand.logo.width;
      }
      if (next.brand.logo.height === '' || next.brand.logo.height === 0 || next.brand.logo.height === null) {
        delete next.brand.logo.height;
      }
      if (!next.brand.logo.light && !next.brand.logo.dark && !next.brand.logo.alt && next.brand.logo.showText !== false) {
        delete next.brand.logo;
      }
    }
  }

  if (isPlainObject(next.analytics)) {
    if (next.analytics.plausibleSrc === '') delete next.analytics.plausibleSrc;
    if (Object.keys(next.analytics).length === 0) delete next.analytics;
  }

  if (isPlainObject(next.business?.geo)) {
    const lat = next.business.geo.lat;
    const lng = next.business.geo.lng;
    if (
      lat === '' ||
      lat === null ||
      lat === undefined ||
      lng === '' ||
      lng === null ||
      lng === undefined ||
      !Number.isFinite(Number(lat)) ||
      !Number.isFinite(Number(lng))
    ) {
      delete next.business.geo;
    } else {
      next.business.geo = { lat: Number(lat), lng: Number(lng) };
    }
  }

  if (isPlainObject(next.ui)) {
    if (isPlainObject(next.ui.navigation)) {
      if (Array.isArray(next.ui.navigation.pages)) {
        next.ui.navigation.pages = next.ui.navigation.pages.map((p) => {
          if (!isPlainObject(p)) return p;
          const np = { ...p };
          if (np.icon === '') delete np.icon;
          if (np.label === '') delete np.label;
          if (isPlainObject(np.labels)) {
            np.labels = stripEmptyMapEntries(np.labels);
            if (Object.keys(np.labels).length === 0) delete np.labels;
          }
          return np;
        });
      }
      if (Array.isArray(next.ui.navigation.footerColumns)) {
        next.ui.navigation.footerColumns = next.ui.navigation.footerColumns.map((col) => {
          if (!isPlainObject(col)) return col;
          const nc = { ...col };
          if (nc.title === '') delete nc.title;
          if (isPlainObject(nc.titles)) {
            nc.titles = stripEmptyMapEntries(nc.titles);
            if (Object.keys(nc.titles).length === 0) delete nc.titles;
          }
          if (Array.isArray(nc.items)) {
            nc.items = nc.items.map((it) => {
              if (!isPlainObject(it)) return it;
              const ni = { ...it };
              if (ni.group === '') delete ni.group;
              if (ni.href === '') delete ni.href;
              if (ni.icon === '') delete ni.icon;
              if (ni.label === '') delete ni.label;
              if (isPlainObject(ni.labels)) {
                ni.labels = stripEmptyMapEntries(ni.labels);
                if (Object.keys(ni.labels).length === 0) delete ni.labels;
              }
              return ni;
            });
          }
          return nc;
        });
      }
      const hasPages = Array.isArray(next.ui.navigation.pages) && next.ui.navigation.pages.length > 0;
      const hasCols =
        Array.isArray(next.ui.navigation.footerColumns) && next.ui.navigation.footerColumns.length > 0;
      if (!hasPages && !hasCols) {
        delete next.ui.navigation;
      }
    }
    if (Array.isArray(next.ui.homeSections) && next.ui.homeSections.length === 0) {
      delete next.ui.homeSections;
    }
    if (isPlainObject(next.ui.topBanner)) {
      next.ui.topBanner = cleanTopBannerNode(next.ui.topBanner);
      if (Array.isArray(next.ui.topBanner.items)) {
        next.ui.topBanner.items = next.ui.topBanner.items.map((item) => cleanTopBannerNode(item));
      }
    }
  }

  if (isPlainObject(next.api)) {
    if (isPlainObject(next.api.endpoints) && next.api.endpoints.newsletter === '') {
      delete next.api.endpoints.newsletter;
    }
    if (Array.isArray(next.api.topics)) {
      next.api.topics = next.api.topics.map((tp) => {
        if (!isPlainObject(tp)) return tp;
        const nt = { ...tp };
        if (nt.label === '') delete nt.label;
        if (isPlainObject(nt.labels)) {
          nt.labels = stripEmptyMapEntries(nt.labels);
          if (Object.keys(nt.labels).length === 0) delete nt.labels;
        }
        return nt;
      });
      if (next.api.topics.length === 0) {
        delete next.api.topics;
      }
    }
  }

  if (Array.isArray(next.redirects)) {
    next.redirects = next.redirects.map((r) =>
      isPlainObject(r) ? { ...r, status: Number(r.status) === 302 ? 302 : 301 } : r
    );
    if (next.redirects.length === 0) {
      delete next.redirects;
    }
  }

  return next;
}

function pruneEmptyCmsObjects(obj) {
  if (!isPlainObject(obj)) return {};
  const walk = (node) => {
    if (Array.isArray(node)) {
      return node.map((x) => (isPlainObject(x) ? walk(x) : x)).filter((x) => x !== undefined);
    }
    if (!isPlainObject(node)) return node;
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (v === undefined || v === null) continue;
      if (isPlainObject(v)) {
        const sub = walk(v);
        if (sub && Object.keys(sub).length > 0) out[k] = sub;
      } else if (Array.isArray(v)) {
        const arr = walk(v);
        if (arr.length > 0) out[k] = arr;
      } else if (typeof v === 'string' && v === '') {
        // Keep empty string only if explicitly needed? Actually empty override strings in CMS layer override lower tiers with blank,
        // unless stripped as optional. Keep empty string out when cleaning unedited empty CMS fields? Wait: in cmsDraft user only sets fields they typed in!
        continue;
      } else {
        out[k] = v;
      }
    }
    return out;
  };
  return walk(obj) || {};
}

function listContentGroups(rootDir, collectionKey, locales) {
  const colDir = path.join(rootDir, 'src', 'content', collectionKey);
  if (!fs.existsSync(colDir)) return [];

  const groups = [];
  for (const entry of fs.readdirSync(colDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const group = entry.name;
    const groupDir = path.join(colDir, group);
    const localeInfo = {};

    for (const loc of locales) {
      const mdxPath = path.join(groupDir, `${loc}.mdx`);
      const mdPath = path.join(groupDir, `${loc}.md`);
      const target = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null;
      if (!target) continue;
      const raw = fs.readFileSync(target, 'utf-8');
      const { data, body } = parseFrontmatter(raw);
      localeInfo[loc] = {
        file: path.relative(rootDir, target),
        title: typeof data.title === 'string' ? data.title : '',
        slug: typeof data.slug === 'string' ? data.slug : '',
        description: typeof data.description === 'string' ? data.description : '',
        draft: Boolean(data.draft),
        hero: data.hero ?? 'none',
        container: data.container ?? 'canvas',
        flushTop: Boolean(data.flushTop),
        template: typeof data.template === 'string' ? data.template : undefined,
        sections: Array.isArray(data.sections) ? data.sections : [],
        words: countWords(body),
        todos: countTodos(raw),
      };
    }

    groups.push({ group, locales: localeInfo });
  }

  return groups.sort((a, b) => a.group.localeCompare(b.group));
}

function listArchivedLocales(rootDir) {
  const archiveDir = path.join(rootDir, '.locale-archive');
  if (!fs.existsSync(archiveDir)) return [];
  return fs
    .readdirSync(archiveDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function buildSectionSchemaCatalog(rootDir) {
  const rawCatalog = buildBlocksCatalog(rootDir);
  const byName = new Map();
  for (const entry of [...rawCatalog.heroes, ...rawCatalog.sections]) {
    byName.set(entry.name, entry.props);
  }

  return SECTION_BLOCKS_META.map((meta) => {
    const props = (byName.get(meta.name) ?? []).filter(
      (p) => !['locale', 'headingTag', 'class'].includes(p.name)
    );
    const sorted =
      meta.category === 'hero'
        ? [...props].sort((a, b) => {
            const ai = HERO_PRIORITY_PROPS.indexOf(a.name);
            const bi = HERO_PRIORITY_PROPS.indexOf(b.name);
            if (ai !== -1 && bi !== -1) return ai - bi;
            if (ai !== -1) return -1;
            if (bi !== -1) return 1;
            return 0;
          })
        : props;
    return {
      name: meta.name,
      category: meta.category,
      props: sorted.map((p) => ({
        name: p.name,
        optional: p.optional,
        type: p.type,
        defaultValue: p.defaultValue,
      })),
    };
  });
}

function enrichContentTypes(mergedConfig, rootDir) {
  const baseList = readContentTypes(mergedConfig, rootDir);
  const typesMap = mergedConfig.content?.types ?? {};
  const clientCodeKeys = new Set(readClientCollectionKeys(rootDir));

  return baseList.map((item) => {
    const raw = typesMap[item.key] ?? {};
    const source = CORE_TYPES.includes(item.key)
      ? 'core'
      : clientCodeKeys.has(item.key)
        ? 'client-code'
        : 'schema';
    return {
      ...item,
      source,
      icon: raw.icon,
      perPage: raw.perPage,
      sortBy: raw.sortBy,
      sortOrder: raw.sortOrder,
      card: raw.card,
      search: raw.search,
    };
  });
}

export function getStudioState(rootDir = defaultRootDir) {
  const coreConfig = readCoreConfig(rootDir);
  const clientConfig = readClientConfig(rootDir);
  const cmsConfig = readCmsConfig(rootDir);
  const coreAndClientConfig = readCoreAndClientConfig(rootDir);
  const mergedConfig = readMergedConfig(rootDir);
  const localeConfig = readLocaleConfig(rootDir);
  const contentTypes = enrichContentTypes(mergedConfig, rootDir);
  const themePresets = loadThemePresets(rootDir);

  const pages = listContentGroups(rootDir, 'pages', localeConfig.locales);
  const collections = {};
  for (const type of contentTypes) {
    if (type.key === 'pages') continue;
    collections[type.key] = listContentGroups(rootDir, type.key, localeConfig.locales);
  }

  const syncPreview = syncDictionaryKeys(rootDir, { dryRun: true, compile: false });
  const coreMessages = {};
  const clientMessages = {};
  const mergedMessages = {};
  const todoByLocale = {};

  for (const loc of localeConfig.locales) {
    coreMessages[loc] = stripSchema(readCoreMessages(loc, rootDir));
    clientMessages[loc] = stripSchema(readClientMessages(loc, rootDir));
    mergedMessages[loc] = stripSchema(readMergedMessages(loc, rootDir));
    todoByLocale[loc] = Object.entries(mergedMessages[loc])
      .filter(([, val]) => typeof val === 'string' && val.includes('[TODO:'))
      .map(([k]) => k);
  }

  const pagesYmlPath = path.join(rootDir, '.pages.yml');
  let pagesYmlStatus = {
    exists: fs.existsSync(pagesYmlPath),
    ymlChanged: false,
    missingDirs: [],
    raw: fs.existsSync(pagesYmlPath) ? fs.readFileSync(pagesYmlPath, 'utf-8') : '',
  };
  if (pagesYmlStatus.exists) {
    try {
      const check = syncCollections(rootDir, { check: true, dryRun: true });
      pagesYmlStatus.ymlChanged = check.ymlChanged;
      pagesYmlStatus.missingDirs = check.missingDirs;
    } catch {
      // Keep status readable even if custom .pages.yml anchors were altered manually
    }
  }

  const projectMeta = readProjectMeta(rootDir);
  const starterSeeded = fs.existsSync(path.join(rootDir, 'starter-kit'));

  return {
    rootDir,
    hasEnv: projectMeta.env.exists,
    starterAvailable: starterSeeded,
    projectMeta,
    coreConfig,
    coreAndClientConfig,
    config: mergedConfig,
    clientOverrides: clientConfig,
    cmsOverrides: cmsConfig,
    pagesYml: pagesYmlStatus,
    locales: {
      ...localeConfig,
      archived: listArchivedLocales(rootDir),
    },
    themePresets,
    blueprints: BLUEPRINTS,
    contentTypes,
    pages,
    collections,
    sectionBlocks: buildSectionSchemaCatalog(rootDir),
    registeredTemplates: readClientTemplateKeys(rootDir),
    messages: {
      coreByLocale: coreMessages,
      clientByLocale: clientMessages,
      mergedByLocale: mergedMessages,
      todoByLocale,
      missingTotal: syncPreview.totalAdded,
      missingByLocale: syncPreview.addedByLocale,
    },
  };
}

function buildAllowListedCommand(action, payload, rootDir) {
  const node = process.execPath;
  const binScript = (rel) => path.join(rootDir, 'scripts', rel);
  const localBin = (name) => path.join(rootDir, 'node_modules', '.bin', name);

  switch (action) {
    case 'new:page': {
      const group = assertSafeKey(payload.group, 'page group');
      const targetLocale = payload.locale
        ? assertSafeLocale(payload.locale)
        : readLocaleConfig(rootDir).defaultLocale || 'en';
      const args = [binScript('new-page.mjs'), group];
      if (payload.title) args.push(`--title=${String(payload.title)}`);
      if (payload.slug) args.push(`--slug:${targetLocale}=${String(payload.slug)}`);
      if (payload.locale) args.push(`--from=${targetLocale}`);
      if (payload.preset === 'landing') args.push('--preset=landing');
      if (payload.publish) args.push('--publish');
      return { cmd: node, args };
    }
    case 'remove:page': {
      const group = assertSafeGroupKey(payload.group, 'page group');
      const args = [binScript('remove-page.mjs'), group, '--yes'];
      if (payload.locale) args.push(`--locale=${assertSafeLocale(payload.locale)}`);
      if (payload.noCleanNav) args.push('--no-clean-nav');
      return { cmd: node, args };
    }
    case 'new:post': {
      const group = assertSafeKey(payload.group, 'post group');
      const targetLocale = payload.locale
        ? assertSafeLocale(payload.locale)
        : readLocaleConfig(rootDir).defaultLocale || 'en';
      const args = [binScript('new-post.mjs'), group];
      if (payload.collection) args.push(`--collection=${assertSafeKey(payload.collection, 'collection')}`);
      if (payload.title) args.push(`--title=${String(payload.title)}`);
      if (payload.slug) args.push(`--slug:${targetLocale}=${String(payload.slug)}`);
      if (payload.locale) args.push(`--from=${targetLocale}`);
      if (payload.categories) args.push(`--categories=${String(payload.categories)}`);
      if (payload.tags) args.push(`--tags=${String(payload.tags)}`);
      if (payload.publish) args.push('--publish');
      return { cmd: node, args };
    }
    case 'remove:post': {
      const group = assertSafeGroupKey(payload.group, 'entry group');
      const args = [binScript('remove-post.mjs'), group, '--yes'];
      if (payload.collection) args.push(`--collection=${assertSafeKey(payload.collection, 'collection')}`);
      if (payload.locale) args.push(`--locale=${assertSafeLocale(payload.locale)}`);
      return { cmd: node, args };
    }
    case 'content:new': {
      const type = assertSafeKey(payload.type, 'collection type');
      const group = assertSafeKey(payload.group, 'entry group');
      const targetLocale = payload.locale
        ? assertSafeLocale(payload.locale)
        : readLocaleConfig(rootDir).defaultLocale || 'en';
      const args = [binScript('content-new.mjs'), type, group];
      if (payload.title) args.push(`--title=${String(payload.title)}`);
      if (payload.description || payload.desc) {
        args.push(`--desc=${String(payload.description ?? payload.desc)}`);
      }
      if (payload.slug) args.push(`--slug:${targetLocale}=${String(payload.slug)}`);
      if (payload.locale) args.push(`--from=${targetLocale}`);
      if (payload.publish) args.push('--publish');
      return { cmd: node, args };
    }
    case 'content:enable': {
      const type = assertSafeKey(payload.type, 'content type');
      return { cmd: node, args: [binScript('content-toggle.mjs'), 'enable', type] };
    }
    case 'content:disable': {
      const type = assertSafeKey(payload.type, 'content type');
      return { cmd: node, args: [binScript('content-toggle.mjs'), 'disable', type] };
    }
    case 'content:sync': {
      const args = [binScript('content-sync.mjs')];
      if (payload.check) args.push('--check');
      return { cmd: node, args };
    }
    case 'content:status': {
      const args = [binScript('content-status.mjs')];
      if (payload.type) args.push(`--type=${assertSafeKey(payload.type, 'content type')}`);
      return { cmd: node, args };
    }
    case 'i18n:add-lang': {
      const code = assertSafeLocale(payload.code);
      const args = [binScript('add-language.mjs'), code];
      if (payload.dir && ['ltr', 'rtl'].includes(payload.dir)) args.push(`--dir=${payload.dir}`);
      if (payload.name) args.push(`--name=${String(payload.name)}`);
      if (payload.from) args.push(`--from=${assertSafeLocale(payload.from)}`);
      args.push(payload.withContent === false ? '--no-content' : '--with-content');
      args.push(payload.publish ? '--publish' : '--draft');
      return { cmd: node, args };
    }
    case 'i18n:remove-lang': {
      const code = assertSafeLocale(payload.code);
      const args = [binScript('remove-language.mjs'), code, '--yes'];
      args.push(payload.deleteContent ? '--delete-content' : '--keep-content');
      return { cmd: node, args };
    }
    case 'i18n:set-default': {
      const code = assertSafeLocale(payload.code);
      const args = [binScript('set-default-language.mjs'), code];
      if (payload.allowDraft) args.push('--allow-draft');
      return { cmd: node, args };
    }
    case 'i18n:solo': {
      const code = assertSafeLocale(payload.code);
      const args = [binScript('set-language-mode.mjs'), code, '--yes'];
      args.push(payload.deleteContent ? '--delete-content' : '--keep-content');
      if (payload.allowDraft) args.push('--allow-draft');
      return { cmd: node, args };
    }
    case 'i18n:add': {
      let category = String(payload.category ?? '').trim();
      let bareKey = String(payload.key ?? '').trim();
      if (!category && bareKey.includes('_')) {
        const idx = bareKey.indexOf('_');
        category = bareKey.slice(0, idx);
        bareKey = bareKey.slice(idx + 1);
      } else if (!category) {
        category = 'custom';
      }
      const fullKey = `${category}_${bareKey}`;
      if (!category || !bareKey || !SAFE_I18N_KEY_RE.test(fullKey)) {
        throw new Error(
          'Invalid message key (use alphanumeric + underscore, e.g. category "hero" and key "cta_note").'
        );
      }
      const args = [binScript('i18n-add.mjs'), `--category=${category}`, `--key=${bareKey}`];
      if (payload.translations && typeof payload.translations === 'object') {
        for (const [loc, val] of Object.entries(payload.translations)) {
          const safeLoc = assertSafeLocale(loc);
          if (typeof val === 'string' && val.trim() !== '') {
            args.push(`--${safeLoc}=${val}`);
          }
        }
      }
      return { cmd: node, args };
    }
    case 'i18n:sync-keys': {
      const args = [binScript('i18n-sync-keys.mjs')];
      if (payload.dryRun) args.push('--dry-run');
      return { cmd: node, args };
    }
    case 'messages:compile':
      return { cmd: node, args: [binScript('messages-compile.mjs')] };
    case 'blocks:catalog': {
      const args = [binScript('blocks-catalog.mjs')];
      if (payload.check) args.push('--check');
      return { cmd: node, args };
    }
    case 'assets:generate': {
      const args = [binScript('generate-assets.mjs')];
      if (payload.brandOnly) args.push('--brand-only');
      if (payload.force) args.push('--force');
      return { cmd: node, args };
    }
    case 'starter:seed': {
      const args = [binScript('seed-starter.mjs'), '--yes'];
      if (payload.clean) args.push('--clean');
      return { cmd: node, args };
    }
    case 'site:reset': {
      const args = [binScript('site-reset.mjs'), '--yes'];
      if (payload.cleanStarter) args.push('--clean-starter');
      return { cmd: node, args };
    }
    case 'audit:i18n':
      return { cmd: node, args: [binScript('audit-i18n.mjs')] };
    case 'upstream:check':
      return { cmd: node, args: [binScript('upstream-check.mjs')] };
    case 'doctor': {
      const args = [binScript('doctor.mjs')];
      if (payload.handoff) args.push('--handoff');
      return { cmd: node, args };
    }
    case 'smoke':
      return { cmd: node, args: [binScript('smoke.mjs'), '--quiet'] };
    case 'link:check':
      return { cmd: node, args: [binScript('link-check.mjs'), '--quiet'] };
    case 'check:quick':
      return {
        chain: [
          { cmd: node, args: [binScript('messages-compile.mjs')] },
          { cmd: localBin('tsc'), args: ['--noEmit'] },
          { cmd: localBin('vitest'), args: ['run', '--no-isolate'] },
        ],
      };
    case 'lint':
      return {
        chain: [
          { cmd: node, args: [binScript('messages-compile.mjs')] },
          { cmd: localBin('astro'), args: ['check'] },
          { cmd: localBin('tsc'), args: ['--noEmit'] },
        ],
      };
    case 'knip':
      return { cmd: localBin('knip'), args: [] };
    case 'build':
      return {
        chain: [
          { cmd: node, args: [binScript('messages-compile.mjs')] },
          { cmd: node, args: [binScript('audit-i18n.mjs'), '--quiet'] },
          { cmd: localBin('astro'), args: ['build'] },
          { cmd: node, args: [binScript('index-pagefind.mjs')] },
        ],
      };
    default:
      throw new Error(`Unsupported or disallowed Studio CLI action "${String(action)}".`);
  }
}

async function runCommandSteps(spec, rootDir) {
  const steps = spec.chain ?? [spec];
  const outputs = [];
  const start = Date.now();

  for (const step of steps) {
    const { stdout, stderr } = await execFileAsync(step.cmd, step.args, {
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    });
    if (stdout) outputs.push(stdout.trimEnd());
    if (stderr) outputs.push(stderr.trimEnd());
  }

  return {
    ok: true,
    durationMs: Date.now() - start,
    output: outputs.filter(Boolean).join('\n'),
  };
}

function savePageSections(rootDir, payload) {
  const group = assertSafeGroupKey(payload.group, 'page group');
  const locale = assertSafeLocale(payload.locale);
  const pagesRoot = path.join(rootDir, 'src', 'content', 'pages');
  const groupDir = assertConfinedPath(pagesRoot, path.join(pagesRoot, group));
  const mdxPath = assertConfinedPath(groupDir, path.join(groupDir, `${locale}.mdx`));
  const mdPath = assertConfinedPath(groupDir, path.join(groupDir, `${locale}.md`));
  const filePath = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null;
  if (!filePath) {
    throw new Error(`Page "${group}" does not have a "${locale}" entry.`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, body } = parseFrontmatter(raw);
  const nextData = { ...data };

  if (payload.hero !== undefined) {
    if (!SAFE_HERO_VALUES.has(payload.hero)) throw new Error('Invalid hero mode.');
    nextData.hero = payload.hero;
  }
  if (payload.container !== undefined) {
    if (!SAFE_CONTAINER_VALUES.has(payload.container)) throw new Error('Invalid container mode.');
    nextData.container = payload.container;
  }
  if (payload.flushTop !== undefined) {
    nextData.flushTop = Boolean(payload.flushTop);
  }
  if (payload.sections !== undefined) {
    if (!Array.isArray(payload.sections)) {
      throw new Error('sections must be an array.');
    }
    const validSet = new Set(SECTION_BLOCKS_META.map((b) => b.name));
    for (const sec of payload.sections) {
      if (!sec || typeof sec !== 'object' || !validSet.has(sec.block)) {
        throw new Error(`Invalid section block "${sec?.block ?? ''}".`);
      }
      if (sec.props !== undefined && !isPlainObject(sec.props)) {
        throw new Error(`Section "${sec.block}" props must be a plain JSON object.`);
      }
    }
    if (payload.sections.length === 0) {
      delete nextData.sections;
    } else {
      nextData.sections = payload.sections.map((s) => ({
        block: s.block,
        props: isPlainObject(s.props) ? s.props : {},
      }));
    }
  }

  fs.writeFileSync(filePath, stringifyFrontmatter(nextData, body), 'utf-8');
  return { file: path.relative(rootDir, filePath), data: nextData };
}

function assertSafeSvg(bytes) {
  const text = bytes.toString('utf-8');
  if (!/<svg[\s>]/i.test(text)) {
    throw new Error('Uploaded SVG does not contain a valid <svg> root element.');
  }
  const unsafePatterns = [
    /<script[\s>]/i,
    /<foreignObject[\s>]/i,
    /<iframe[\s>]/i,
    /<object[\s>]/i,
    /<embed[\s>]/i,
    /\bon[a-z]+\s*=/i,
    /(?:javascript|vbscript):/i,
  ];
  for (const re of unsafePatterns) {
    if (re.test(text)) {
      throw new Error('Rejected SVG logo containing unsafe active content (script/event/iframe).');
    }
  }
}

function saveUploadedLogo(rootDir, payload) {
  const variant = payload.variant === 'dark' ? 'dark' : 'light';
  const dataUrl = String(payload.dataUrl ?? '');
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error('Invalid logo data URL. Upload SVG, PNG, WebP, or JPG.');
  }
  const mime = match[1].toLowerCase();
  const ext = ALLOWED_LOGO_MIMES.get(mime);
  if (!ext) {
    throw new Error(`Unsupported logo MIME type "${mime}".`);
  }

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > 1024 * 1024) {
    throw new Error('Logo image must be between 1 byte and 1 MB.');
  }
  if (mime === 'image/svg+xml') {
    assertSafeSvg(bytes);
  }

  const brandDir = path.join(rootDir, 'public', 'brand');
  fs.mkdirSync(brandDir, { recursive: true });
  const prefix = variant === 'dark' ? 'logo-dark' : 'logo';
  for (const existing of fs.readdirSync(brandDir)) {
    if (existing.startsWith(`${prefix}.`)) {
      fs.rmSync(assertConfinedPath(brandDir, path.join(brandDir, existing)), { force: true });
    }
  }
  const destFile = `${prefix}${ext}`;
  const destPath = assertConfinedPath(brandDir, path.join(brandDir, destFile));
  fs.writeFileSync(destPath, bytes);
  return { publicPath: `/brand/${destFile}`, file: path.relative(rootDir, destPath) };
}

function validateAndNormalizeContentType(payload, existingMergedConfig, rootDir) {
  if (!isPlainObject(payload)) {
    throw new Error('Content type payload must be an object.');
  }
  const key = assertSafeKey(payload.key, 'content type key');
  const localeConfig = readLocaleConfig(rootDir);
  const existingTypes = readContentTypes(existingMergedConfig, rootDir);
  const isPages = key === 'pages';

  let base = '';
  if (!isPages) {
    base = String(payload.base ?? key).trim().replace(/^\/+|\/+$/g, '');
    if (!SAFE_KEY_RE.test(base)) {
      throw new Error(`Invalid base "${base}": expected lowercase letters, digits, or hyphens.`);
    }
    if (RESERVED_BASES.has(base) || localeConfig.locales.includes(base)) {
      throw new Error(`Base "${base}" is reserved by core routes or active locales.`);
    }
    const collision = existingTypes.find((t) => t.key !== key && t.base === base);
    if (collision) {
      throw new Error(`Base "${base}" is already used by content type "${collision.key}".`);
    }
  }

  const next = {
    enabled: isPages ? true : payload.enabled !== false,
    base,
    index: isPages ? false : payload.index !== false,
    paginated: isPages ? false : Boolean(payload.paginated),
    feed: isPages ? false : Boolean(payload.feed),
    nav: isPages ? true : payload.nav !== false,
  };

  const clientCodeKeys = new Set(readClientCollectionKeys(rootDir));
  if (!CORE_TYPES.includes(key) && !clientCodeKeys.has(key)) {
    next.schemaDriven = true;
  } else if (payload.schemaDriven !== undefined) {
    next.schemaDriven = Boolean(payload.schemaDriven);
  }

  if (payload.icon && String(payload.icon).trim()) {
    next.icon = String(payload.icon).trim();
  }
  if (isPlainObject(payload.labels)) {
    const labels = Object.fromEntries(
      Object.entries(payload.labels)
        .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
        .map(([k, v]) => [assertSafeLocale(k), v.trim()])
    );
    if (Object.keys(labels).length > 0) next.labels = labels;
  }
  if (isPlainObject(payload.descriptions)) {
    const descriptions = Object.fromEntries(
      Object.entries(payload.descriptions)
        .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
        .map(([k, v]) => [assertSafeLocale(k), v.trim()])
    );
    if (Object.keys(descriptions).length > 0) next.descriptions = descriptions;
  }
  if (payload.perPage !== undefined && payload.perPage !== '' && payload.perPage !== null) {
    const perPage = Number(payload.perPage);
    if (!Number.isInteger(perPage) || perPage < 1) {
      throw new Error('perPage must be a positive integer.');
    }
    next.perPage = perPage;
  }
  if (payload.sortBy && String(payload.sortBy).trim()) {
    next.sortBy = String(payload.sortBy).trim();
  }
  if (payload.sortOrder !== undefined && payload.sortOrder !== '' && payload.sortOrder !== null) {
    if (!['asc', 'desc'].includes(payload.sortOrder)) {
      throw new Error(`Invalid sortOrder "${payload.sortOrder}": expected "asc" or "desc".`);
    }
    next.sortOrder = payload.sortOrder;
  }

  if (isPlainObject(payload.card)) {
    const card = {};
    if (payload.card.layout && VALID_CARD_LAYOUTS.has(payload.card.layout)) {
      card.layout = payload.card.layout;
    }
    if (payload.card.aspectRatio && VALID_ASPECT_RATIOS.has(payload.card.aspectRatio)) {
      card.aspectRatio = payload.card.aspectRatio;
    }
    if (payload.card.badgeField && String(payload.card.badgeField).trim()) {
      card.badgeField = String(payload.card.badgeField).trim();
    }
    if (payload.card.badgeLimit !== undefined && payload.card.badgeLimit !== '' && payload.card.badgeLimit !== null) {
      const bl = Number(payload.card.badgeLimit);
      if (!Number.isInteger(bl) || bl < 0 || bl > 10) {
        throw new Error('card.badgeLimit must be an integer between 0 and 10.');
      }
      card.badgeLimit = bl;
    }
    if (Array.isArray(payload.card.metaFields) && payload.card.metaFields.length > 0) {
      card.metaFields = payload.card.metaFields.map((s) => String(s).trim()).filter(Boolean);
    }
    if (Object.keys(card).length > 0) next.card = card;
  }

  if (isPlainObject(payload.search)) {
    const search = { enabled: payload.search.enabled !== false };
    if (Array.isArray(payload.search.fields) && payload.search.fields.length > 0) {
      search.fields = payload.search.fields.map((s) => String(s).trim()).filter(Boolean);
    }
    if (isPlainObject(payload.search.placeholder)) {
      const ph = Object.fromEntries(
        Object.entries(payload.search.placeholder)
          .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
          .map(([k, v]) => [assertSafeLocale(k), v.trim()])
      );
      if (Object.keys(ph).length > 0) search.placeholder = ph;
    }
    next.search = search;
  }

  const sanitizeLocalizedMap = (rawMap) => {
    if (!isPlainObject(rawMap)) return undefined;
    const out = Object.fromEntries(
      Object.entries(rawMap)
        .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
        .map(([k, v]) => [assertSafeLocale(k), v.trim()])
    );
    return Object.keys(out).length > 0 ? out : undefined;
  };

  if (Array.isArray(payload.fields)) {
    const seenNames = new Set();
    const seenParams = new Set();
    const cleanedFields = [];

    for (const rawField of payload.fields) {
      if (!isPlainObject(rawField)) continue;
      const name = String(rawField.name ?? '').trim();
      if (!SAFE_FIELD_NAME_RE.test(name)) {
        throw new Error(`Invalid field name "${name}": expected valid identifier.`);
      }
      if (seenNames.has(name)) {
        throw new Error(`Duplicate field name "${name}" in content type "${key}".`);
      }
      seenNames.add(name);

      const type = String(rawField.type ?? 'string');
      if (!VALID_FIELD_TYPES.has(type)) {
        throw new Error(`Invalid field type "${type}" on field "${name}".`);
      }

      const f = {
        name,
        type,
        required: Boolean(rawField.required),
        cms: rawField.cms !== false,
      };
      if (rawField.label && String(rawField.label).trim()) f.label = String(rawField.label).trim();
      const fieldLabels = sanitizeLocalizedMap(rawField.labels);
      if (fieldLabels) f.labels = fieldLabels;

      if (type === 'number') {
        if (rawField.min !== undefined && rawField.min !== '' && rawField.min !== null) {
          const minVal = Number(rawField.min);
          if (!Number.isFinite(minVal)) {
            throw new Error(`Field "${name}" min "${rawField.min}" must be a finite number.`);
          }
          f.min = minVal;
        }
        if (rawField.max !== undefined && rawField.max !== '' && rawField.max !== null) {
          const maxVal = Number(rawField.max);
          if (!Number.isFinite(maxVal)) {
            throw new Error(`Field "${name}" max "${rawField.max}" must be a finite number.`);
          }
          f.max = maxVal;
        }
        if (f.min !== undefined && f.max !== undefined && f.min > f.max) {
          throw new Error(`Field "${name}" min (${f.min}) cannot exceed max (${f.max}).`);
        }
      }

      if (type === 'enum') {
        const opts = Array.isArray(rawField.options)
          ? rawField.options.map((o) => String(o).trim()).filter(Boolean)
          : String(rawField.options ?? '')
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean);
        if (opts.length === 0) {
          throw new Error(`Enum field "${name}" must define at least one option.`);
        }
        f.options = opts;
        if (isPlainObject(rawField.optionLabels)) {
          const cleanedOptLabels = {};
          for (const [optKey, locMap] of Object.entries(rawField.optionLabels)) {
            if (!opts.includes(optKey)) continue;
            const cleanLocMap = sanitizeLocalizedMap(locMap);
            if (cleanLocMap) cleanedOptLabels[optKey] = cleanLocMap;
          }
          if (Object.keys(cleanedOptLabels).length > 0) {
            f.optionLabels = cleanedOptLabels;
          }
        }
      }
      if (rawField.default !== undefined && rawField.default !== '' && rawField.default !== null) {
        if (type === 'number') {
          const n = Number(rawField.default);
          if (!Number.isFinite(n)) {
            throw new Error(`Number field "${name}" default "${rawField.default}" must be finite.`);
          }
          if (f.min !== undefined && n < f.min) {
            throw new Error(`Number field "${name}" default (${n}) is below min (${f.min}).`);
          }
          if (f.max !== undefined && n > f.max) {
            throw new Error(`Number field "${name}" default (${n}) exceeds max (${f.max}).`);
          }
          f.default = n;
        } else if (type === 'boolean') {
          if (typeof rawField.default === 'boolean') {
            f.default = rawField.default;
          } else if (rawField.default === 'true' || rawField.default === 'false') {
            f.default = rawField.default === 'true';
          }
        } else if (type === 'string[]' || type === 'taxonomy[]') {
          f.default = Array.isArray(rawField.default)
            ? rawField.default.map((x) => String(x).trim()).filter(Boolean)
            : String(rawField.default)
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean);
        } else {
          const defStr = String(rawField.default);
          if (type === 'enum' && f.options && !f.options.includes(defStr)) {
            throw new Error(`Enum field "${name}" default "${defStr}" must be one of [${f.options.join(', ')}].`);
          }
          f.default = defStr;
        }
      }
      if (rawField.searchable !== undefined) f.searchable = Boolean(rawField.searchable);
      if (
        rawField.showOnCard === true ||
        rawField.showOnCard === false ||
        ['badge', 'meta', 'subtitle'].includes(rawField.showOnCard)
      ) {
        f.showOnCard = rawField.showOnCard;
      }
      if (rawField.showOnEntry !== undefined) f.showOnEntry = Boolean(rawField.showOnEntry);

      if (isPlainObject(rawField.filter) && rawField.filter.enabled !== false && rawField.filter.mode) {
        if (!VALID_FILTER_MODES.has(rawField.filter.mode)) {
          throw new Error(`Invalid filter mode "${rawField.filter.mode}" on field "${name}".`);
        }
        const param = rawField.filter.param
          ? String(rawField.filter.param).trim()
          : name === 'categories'
            ? 'category'
            : name === 'tags'
              ? 'tag'
              : name;
        if (!/^[a-zA-Z0-9_-]+$/.test(param)) {
          throw new Error(`Invalid filter param "${param}" on field "${name}".`);
        }
        if (seenParams.has(param)) {
          throw new Error(`Duplicate filter query param "${param}" on field "${name}".`);
        }
        seenParams.add(param);
        const filterLabels = sanitizeLocalizedMap(rawField.filter.labels);
        const filterAllLabel = sanitizeLocalizedMap(rawField.filter.allLabel);
        const filterObj = {
          enabled: true,
          mode: rawField.filter.mode,
          ...(rawField.filter.param ? { param } : {}),
          ...(rawField.filter.label ? { label: String(rawField.filter.label).trim() } : {}),
          ...(filterLabels ? { labels: filterLabels } : {}),
          ...(filterAllLabel ? { allLabel: filterAllLabel } : {}),
          ...(VALID_FILTER_SORTS.has(rawField.filter.sort) ? { sort: rawField.filter.sort } : {}),
        };
        f.filter = filterObj;
      }

      cleanedFields.push(f);
    }
    if (cleanedFields.length > 0) next.fields = cleanedFields;
  }

  return { key, config: next };
}

function saveContentType(rootDir, payload) {
  const current = readCoreAndClientConfig(rootDir);
  const { key, config: ctConfig } = validateAndNormalizeContentType(payload, current, rootDir);

  current.content = current.content ?? {};
  current.content.types = current.content.types ?? {};
  current.content.types[key] = ctConfig;

  const sparse = writeClientConfig(current, { rootDir, sparse: true });
  const syncResult = syncCollections(rootDir, { check: false });
  const i18nResult = syncDictionaryKeys(rootDir, { dryRun: false, compile: true });

  return {
    ok: true,
    key,
    typeConfig: ctConfig,
    clientOverrides: sparse,
    syncResult,
    i18nSync: i18nResult,
  };
}

function deleteContentType(rootDir, payload) {
  const key = assertSafeKey(payload.key, 'content type key');
  if (CORE_TYPES.includes(key)) {
    throw new Error(`Core content type "${key}" cannot be deleted; disable it instead.`);
  }
  const clientCodeKeys = new Set(readClientCollectionKeys(rootDir));
  if (clientCodeKeys.has(key)) {
    throw new Error(
      `Content type "${key}" is exported from client/content.ts; remove it there or disable it instead.`
    );
  }

  const clientCfg = readClientConfig(rootDir);
  if (isPlainObject(clientCfg.content?.types) && key in clientCfg.content.types) {
    delete clientCfg.content.types[key];
    if (Object.keys(clientCfg.content.types).length === 0) {
      delete clientCfg.content.types;
    }
    if (clientCfg.content && Object.keys(clientCfg.content).length === 0) {
      delete clientCfg.content;
    }
  }
  const coreCfg = readCoreConfig(rootDir);
  const nextMerged = deepMergeConfig(coreCfg, clientCfg);
  const sparse = writeClientConfig(nextMerged, { rootDir, sparse: true });

  if (payload.deleteFiles === true) {
    const contentRoot = path.join(rootDir, 'src', 'content');
    const colDir = assertConfinedPath(contentRoot, path.join(contentRoot, key));
    if (fs.existsSync(colDir)) {
      fs.rmSync(colDir, { recursive: true, force: true });
    }
  }

  const syncResult = syncCollections(rootDir, { check: false });
  return { ok: true, key, clientOverrides: sparse, syncResult };
}

function readContentEntry(rootDir, collectionRaw, groupRaw, localeRaw) {
  const collection = assertSafeKey(collectionRaw, 'collection');
  const known = new Set(getKnownTypes(rootDir));
  if (!known.has(collection)) {
    throw new Error(`Unknown collection "${collection}".`);
  }
  const group = assertSafeGroupKey(groupRaw, 'entry group');
  const locale = assertSafeLocale(localeRaw);

  const contentRoot = path.join(rootDir, 'src', 'content');
  const colDir = assertConfinedPath(contentRoot, path.join(contentRoot, collection));
  const groupDir = assertConfinedPath(colDir, path.join(colDir, group));
  const mdxPath = assertConfinedPath(groupDir, path.join(groupDir, `${locale}.mdx`));
  const mdPath = assertConfinedPath(groupDir, path.join(groupDir, `${locale}.md`));
  const existingPath = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null;

  const mergedCfg = readMergedConfig(rootDir);
  const typeFields = mergedCfg.content?.types?.[collection]?.fields ?? [];
  const coerceEntryBySchema = (fmObj) => {
    for (const field of typeFields) {
      if (field.type === 'number' && typeof fmObj[field.name] === 'string' && fmObj[field.name].trim() !== '') {
        const n = Number(fmObj[field.name]);
        if (Number.isFinite(n)) fmObj[field.name] = n;
      }
    }
    if (collection === 'projects' && typeof fmObj.year === 'string' && fmObj.year.trim() !== '') {
      const y = Number(fmObj.year);
      if (Number.isFinite(y)) fmObj.year = y;
    }
    return fmObj;
  };

  if (existingPath) {
    const raw = fs.readFileSync(existingPath, 'utf-8');
    const { data, body } = parseFrontmatter(raw);
    return {
      ok: true,
      exists: true,
      collection,
      group,
      locale,
      file: path.relative(rootDir, existingPath),
      frontmatter: coerceEntryBySchema(data),
      body: body.replace(/^\n+/, ''),
    };
  }

  // Suggest defaults from defaultLocale or any existing file in groupDir
  const { defaultLocale } = readLocaleConfig(rootDir);
  let sourceData = {};
  if (fs.existsSync(groupDir)) {
    const candidates = [
      path.join(groupDir, `${defaultLocale}.mdx`),
      path.join(groupDir, `${defaultLocale}.md`),
      ...fs
        .readdirSync(groupDir)
        .filter((f) => /\.(mdx|md)$/.test(f))
        .map((f) => path.join(groupDir, f)),
    ];
    const sourceFile = candidates.find((c) => fs.existsSync(c));
    if (sourceFile) {
      sourceData = coerceEntryBySchema(parseFrontmatter(fs.readFileSync(sourceFile, 'utf-8')).data);
    }
  }

  const customSuggested = {};
  for (const field of typeFields) {
    if (sourceData[field.name] !== undefined) {
      customSuggested[field.name] = sourceData[field.name];
    } else if (field.default !== undefined) {
      customSuggested[field.name] = field.default;
    }
  }

  const suggestedFrontmatter = {
    title: sourceData.title ? `[TODO: ${locale}] ${sourceData.title}` : group,
    slug: collection === 'pages' && group === 'home' ? '' : `${group}-${locale}`,
    description: sourceData.description ? `[TODO: ${locale}] ${sourceData.description}` : '',
    draft: true,
    ...(sourceData.image ? { image: sourceData.image } : {}),
    ...(collection === 'pages'
      ? {
          hero: sourceData.hero ?? 'none',
          container: sourceData.container ?? 'canvas',
          flushTop: Boolean(sourceData.flushTop),
          ...(sourceData.template ? { template: sourceData.template } : {}),
        }
      : {}),
    ...(collection === 'blog'
      ? {
          publishedAt: sourceData.publishedAt || new Date().toISOString().slice(0, 10),
          ...(sourceData.author ? { author: sourceData.author } : {}),
          ...(Array.isArray(sourceData.categories) ? { categories: sourceData.categories } : {}),
          ...(Array.isArray(sourceData.tags) ? { tags: sourceData.tags } : {}),
        }
      : {}),
    ...(collection === 'projects'
      ? {
          ...(sourceData.client ? { client: sourceData.client } : {}),
          ...(sourceData.year !== undefined ? { year: sourceData.year } : {}),
          ...(sourceData.link ? { link: sourceData.link } : {}),
          ...(Array.isArray(sourceData.stack) ? { stack: sourceData.stack } : {}),
          ...(Array.isArray(sourceData.categories) ? { categories: sourceData.categories } : {}),
        }
      : {}),
    ...customSuggested,
  };

  return {
    ok: true,
    exists: false,
    collection,
    group,
    locale,
    file: path.relative(rootDir, mdxPath),
    frontmatter: suggestedFrontmatter,
    body: '',
  };
}

function saveContentEntry(rootDir, payload) {
  if (!isPlainObject(payload)) throw new Error('Entry payload must be an object.');
  const collection = assertSafeKey(payload.collection, 'collection');
  const known = new Set(getKnownTypes(rootDir));
  if (!known.has(collection)) {
    throw new Error(`Unknown collection "${collection}".`);
  }
  const group = assertSafeGroupKey(payload.group, 'entry group');
  const locale = assertSafeLocale(payload.locale);
  if (!isPlainObject(payload.frontmatter)) {
    throw new Error('frontmatter must be an object.');
  }

  const fm = { ...payload.frontmatter };
  const title = String(fm.title ?? '').trim();
  if (!title) throw new Error('frontmatter.title is required.');
  fm.title = title;

  const slug = fm.slug !== undefined ? String(fm.slug).trim() : '';
  if (collection !== 'pages') {
    if (!slug) throw new Error('Non-page entries require a non-empty frontmatter.slug.');
    if (slug === 'page') throw new Error('Slug "page" is reserved for pagination.');
    if (!isValidSlug(slug)) {
      throw new Error(`Invalid slug "${slug}": use letters, digits, and single hyphens or zero-width joiners only.`);
    }
  } else {
    if (!isValidPageSlug(slug)) {
      throw new Error(`Invalid page slug "${slug}": omit leading/trailing "/" and avoid empty segments.`);
    }
  }
  fm.slug = slug;

  if (collection === 'pages') {
    if (fm.hero !== undefined && !SAFE_HERO_VALUES.has(fm.hero)) {
      throw new Error(`Invalid page hero "${String(fm.hero)}".`);
    }
    if (fm.container !== undefined && !SAFE_CONTAINER_VALUES.has(fm.container)) {
      throw new Error(`Invalid page container "${String(fm.container)}".`);
    }
    if (fm.sections !== undefined) {
      if (!Array.isArray(fm.sections)) throw new Error('sections must be an array.');
      const validSet = new Set(SECTION_BLOCKS_META.map((b) => b.name));
      for (const sec of fm.sections) {
        if (!isPlainObject(sec) || !validSet.has(sec.block)) {
          throw new Error(`Invalid section block "${sec?.block ?? ''}".`);
        }
        if (sec.props !== undefined && !isPlainObject(sec.props)) {
          throw new Error(`Section "${sec.block}" props must be a JSON object.`);
        }
      }
      if (fm.sections.length === 0) delete fm.sections;
    }
  }

  if (collection === 'blog') {
    if (!fm.publishedAt || !Number.isFinite(Date.parse(String(fm.publishedAt)))) {
      throw new Error('Blog entries require a valid frontmatter.publishedAt date (YYYY-MM-DD).');
    }
  }
  if (fm.publishedAt && !Number.isFinite(Date.parse(String(fm.publishedAt)))) {
    throw new Error(`Invalid publishedAt date "${fm.publishedAt}".`);
  }
  if (fm.updatedAt && !Number.isFinite(Date.parse(String(fm.updatedAt)))) {
    throw new Error(`Invalid updatedAt date "${fm.updatedAt}".`);
  }

  for (const taxKey of ['categories', 'tags']) {
    if (Array.isArray(fm[taxKey])) {
      for (const tagVal of fm[taxKey]) {
        if (!TAXONOMY_KEY_RE.test(String(tagVal))) {
          throw new Error(
            `Invalid ${taxKey} key "${tagVal}": use lowercase ASCII letters, digits, and single hyphens.`
          );
        }
      }
    }
  }

  if (collection === 'projects') {
    if (fm.year !== undefined && fm.year !== '') {
      const y = Number(fm.year);
      if (!Number.isInteger(y) || y < 1990 || y > 2100) {
        throw new Error('projects.year must be an integer between 1990 and 2100.');
      }
      fm.year = y;
    }
    if (fm.link !== undefined && String(fm.link).trim() !== '') {
      assertValidHttpUrl(fm.link, 'projects.link');
    }
  }

  const mergedCfg = readMergedConfig(rootDir);
  const typeFields = mergedCfg.content?.types?.[collection]?.fields ?? [];
  const reservedFieldKeys = new Set([
    'title',
    'slug',
    'description',
    'image',
    'author',
    'publishedAt',
    'updatedAt',
    'categories',
    'tags',
    'draft',
    ...(collection === 'projects' ? ['client', 'year', 'link', 'stack'] : []),
  ]);

  for (const field of typeFields) {
    if (!field?.name || reservedFieldKeys.has(field.name)) continue;
    const rawVal = fm[field.name];
    const isEmpty =
      rawVal === undefined ||
      rawVal === null ||
      (typeof rawVal === 'string' && rawVal.trim() === '');

    if (field.required && field.default === undefined) {
      if (isEmpty) {
        throw new Error(`Required field "${field.name}" cannot be empty.`);
      }
      if ((field.type === 'string[]' || field.type === 'taxonomy[]') && !Array.isArray(rawVal)) {
        throw new Error(`Field "${field.name}" must be an array.`);
      }
    }

    if (isEmpty) continue;

    if (field.type === 'number') {
      const n = Number(rawVal);
      if (!Number.isFinite(n)) throw new Error(`Field "${field.name}" must be a valid number.`);
      if (typeof field.min === 'number' && n < field.min) {
        throw new Error(`Field "${field.name}" (${n}) must be >= ${field.min}.`);
      }
      if (typeof field.max === 'number' && n > field.max) {
        throw new Error(`Field "${field.name}" (${n}) must be <= ${field.max}.`);
      }
      fm[field.name] = n;
    } else if (field.type === 'date') {
      if (!Number.isFinite(Date.parse(String(rawVal)))) {
        throw new Error(`Field "${field.name}" must be a valid date.`);
      }
    } else if (field.type === 'url') {
      assertValidHttpUrl(rawVal, `field "${field.name}"`);
    } else if (field.type === 'enum' && Array.isArray(field.options) && field.options.length > 0) {
      if (!field.options.includes(String(rawVal))) {
        throw new Error(`Field "${field.name}" value "${rawVal}" must be one of: ${field.options.join(', ')}.`);
      }
    } else if (field.type === 'taxonomy[]' && Array.isArray(rawVal)) {
      for (const item of rawVal) {
        if (!TAXONOMY_KEY_RE.test(String(item))) {
          throw new Error(
            `Field "${field.name}" item "${item}" must use lowercase ASCII letters, digits, and single hyphens.`
          );
        }
      }
    }
  }

  // Strip empty optional scalar values while retaining meaningful booleans/0/empty home slug
  for (const [k, v] of Object.entries(fm)) {
    if (k === 'slug' || k === 'title' || k === 'draft') continue;
    if (v === '' || v === undefined || v === null) delete fm[k];
    if (Array.isArray(v) && v.length === 0 && !['stack'].includes(k)) delete fm[k];
  }

  const contentRoot = path.join(rootDir, 'src', 'content');
  const colDir = assertConfinedPath(contentRoot, path.join(contentRoot, collection));
  const groupDir = assertConfinedPath(colDir, path.join(colDir, group));
  fs.mkdirSync(groupDir, { recursive: true });

  const mdPath = assertConfinedPath(groupDir, path.join(groupDir, `${locale}.md`));
  const mdxPath = assertConfinedPath(groupDir, path.join(groupDir, `${locale}.mdx`));
  const targetPath = fs.existsSync(mdPath) && !fs.existsSync(mdxPath) ? mdPath : mdxPath;

  const bodyText = typeof payload.body === 'string' ? payload.body.trimEnd() : '';
  const formattedBody = bodyText ? `\n${bodyText.replace(/^\n+/, '')}\n` : '\n';

  fs.writeFileSync(targetPath, stringifyFrontmatter(fm, formattedBody), 'utf-8');
  return {
    ok: true,
    file: path.relative(rootDir, targetPath),
    frontmatter: fm,
  };
}

function saveMessagesUpdates(rootDir, payload) {
  if (!isPlainObject(payload)) throw new Error('Messages payload must be an object.');
  const localeConfig = readLocaleConfig(rootDir);
  const activeSet = new Set(localeConfig.locales);
  const updatedLocales = [];

  if (isPlainObject(payload.updatesByLocale)) {
    for (const [locRaw, updates] of Object.entries(payload.updatesByLocale)) {
      const loc = assertSafeLocale(locRaw);
      if (!activeSet.has(loc)) {
        throw new Error(`Locale "${loc}" is not registered in client/locales.json.`);
      }
      if (!isPlainObject(updates)) continue;

      const currentClient = stripSchema(readClientMessages(loc, rootDir));
      const coreDict = stripSchema(readCoreMessages(loc, rootDir));
      let changed = false;

      for (const [key, value] of Object.entries(updates)) {
        if (!SAFE_I18N_KEY_RE.test(key)) {
          throw new Error(`Invalid dictionary key "${key}".`);
        }
        if (value === null) {
          if (key in currentClient) {
            delete currentClient[key];
            changed = true;
          }
        } else if (typeof value === 'string' || Array.isArray(value)) {
          // Avoid storing redundant identical override if core has exact same value
          if (key in coreDict && JSON.stringify(coreDict[key]) === JSON.stringify(value)) {
            if (key in currentClient) {
              delete currentClient[key];
              changed = true;
            }
          } else {
            currentClient[key] = value;
            changed = true;
          }
        }
      }

      if (changed) {
        writeClientMessages(loc, currentClient, rootDir);
        updatedLocales.push(loc);
      }
    }
  }

  if (Array.isArray(payload.deleteKeys) && payload.deleteKeys.length > 0) {
    for (const loc of localeConfig.locales) {
      const coreDict = stripSchema(readCoreMessages(loc, rootDir));
      const currentClient = stripSchema(readClientMessages(loc, rootDir));
      let changed = false;
      for (const key of payload.deleteKeys) {
        if (!SAFE_I18N_KEY_RE.test(key)) {
          throw new Error(`Invalid dictionary key "${key}".`);
        }
        if (key in coreDict) {
          throw new Error(`Key "${key}" is a core message key and cannot be deleted (only overridden).`);
        }
        if (key in currentClient) {
          delete currentClient[key];
          changed = true;
        }
      }
      if (changed) {
        writeClientMessages(loc, currentClient, rootDir);
        if (!updatedLocales.includes(loc)) updatedLocales.push(loc);
      }
    }
  }

  compileMessages(rootDir);
  return { ok: true, updatedLocales, compiled: true };
}

function saveLocaleMeta(rootDir, payload) {
  if (!isPlainObject(payload)) throw new Error('Locale metadata payload must be an object.');
  const locale = assertSafeLocale(payload.locale);
  const localeConfig = readLocaleConfig(rootDir);
  if (!localeConfig.locales.includes(locale)) {
    throw new Error(`Locale "${locale}" is not registered in client/locales.json.`);
  }

  const currentMeta = { ...(localeConfig.metadata?.[locale] ?? {}) };
  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (!name) throw new Error('Locale display name cannot be empty.');
    currentMeta.name = name;
  }
  if (payload.dir !== undefined) {
    if (!['ltr', 'rtl'].includes(payload.dir)) {
      throw new Error('Locale dir must be "ltr" or "rtl".');
    }
    currentMeta.dir = payload.dir;
  }
  if (payload.htmlLang !== undefined) {
    const hl = assertSafeLocale(payload.htmlLang);
    currentMeta.htmlLang = hl;
  }
  if (payload.fontFamily !== undefined) {
    const ff = String(payload.fontFamily).trim();
    if (!ff || /[;{}]/.test(ff)) {
      throw new Error('Invalid fontFamily value.');
    }
    currentMeta.fontFamily = ff;
  }

  localeConfig.metadata = {
    ...localeConfig.metadata,
    [locale]: currentMeta,
  };
  writeLocaleConfig(localeConfig, rootDir);
  compileMessages(rootDir);
  return { ok: true, locale, meta: currentMeta };
}

export function createStudioHandler({ rootDir = defaultRootDir, previewUrl = '' } = {}) {
  let writeLock = Promise.resolve();
  const withWriteLock = (fn) => {
    const run = writeLock.then(fn, fn);
    writeLock = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };

  return async function handleStudioRequest(req, res) {
    try {
      const rawUrl = req.url || '/';
      const parsed = new URL(rawUrl, 'http://localhost');
      let pathname = parsed.pathname;
      if (pathname.startsWith('/__studio')) {
        pathname = pathname.slice('/__studio'.length) || '/';
      }

      // Ensure `/__studio` (without trailing slash) redirects to `/__studio/` so relative fetch('api/...') always resolves
      const origUrl = req.originalUrl || '';
      const origPath = origUrl.split('?')[0];
      if (origPath === '/__studio') {
        const queryIdx = origUrl.indexOf('?');
        const suffix = queryIdx !== -1 ? origUrl.slice(queryIdx) : '';
        res.statusCode = 302;
        res.setHeader('Location', `/__studio/${suffix}`);
        res.end();
        return;
      }

      if (req.method === 'GET' && (pathname === '/' || pathname === '')) {
        const mountedInDev = origUrl.startsWith('/__studio');
        sendHtml(res, renderStudioHtml({ mountedInDev, previewUrl }));
        return;
      }

      if (req.method === 'GET' && pathname === '/api/state') {
        const state = getStudioState(rootDir);
        sendJson(res, 200, { ok: true, ...state });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/content-entry') {
        const collection = parsed.searchParams.get('collection') || '';
        const group = parsed.searchParams.get('group') || '';
        const locale = parsed.searchParams.get('locale') || '';
        const result = readContentEntry(rootDir, collection, group, locale);
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/content-entry') {
        const body = await readJsonBody(req);
        const result = await withWriteLock(() => saveContentEntry(rootDir, body));
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/project-meta') {
        const body = await readJsonBody(req);
        const result = await withWriteLock(() => saveProjectMeta(rootDir, body));
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/site-apply') {
        const body = await readJsonBody(req);
        const spec = body.spec && typeof body.spec === 'object' ? body.spec : body;
        const dryRun = Boolean(body.dryRun);
        const skipAssets = body.skipAssets !== undefined ? Boolean(body.skipAssets) : false;

        const errors = validateSiteSpec(spec, { rootDir });
        if (errors.length > 0) {
          sendJson(res, 400, { ok: false, errors, error: errors.join('\n') });
          return;
        }

        const result = await withWriteLock(() =>
          applySiteSpec(spec, { rootDir, dryRun, skipAssets })
        );
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/config-save') {
        const body = await readJsonBody(req);
        const partial = body.patch && typeof body.patch === 'object' ? body.patch : body;
        const replaceRaw = body.replace === true;

        const result = await withWriteLock(() => {
          const coreCfg = readCoreConfig(rootDir);
          const currentFull = readCoreAndClientConfig(rootDir);
          const base = replaceRaw
            ? deepMergeConfig(
                coreCfg,
                partial.content === undefined && currentFull.content !== undefined
                  ? { content: currentFull.content }
                  : {}
              )
            : currentFull;
          const nextFullConfig = cleanConfigBeforeWrite(deepMergeConfig(base, partial));
          const errors = validateConfigObject(nextFullConfig, rootDir);
          if (errors.length > 0) {
            throw Object.assign(new Error(errors.join('\n')), { statusCode: 400 });
          }
          const sparse = writeClientConfig(nextFullConfig, { rootDir, sparse: true });
          return { ok: true, clientOverrides: sparse };
        });

        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/cms-save') {
        const body = await readJsonBody(req);
        const reset = body.reset === true;
        const rawCms = isPlainObject(body.cms) ? body.cms : isPlainObject(body) && !('reset' in body) ? body : {};

        const result = await withWriteLock(() => {
          const cmsPath = cmsConfigPathFor(rootDir);
          fs.mkdirSync(path.dirname(cmsPath), { recursive: true });
          if (reset) {
            fs.writeFileSync(cmsPath, '{}\n', 'utf-8');
            return { ok: true, cmsOverrides: {} };
          }
          const cleaned = pruneEmptyCmsObjects(sanitizeCmsConfig(rawCms));
          if (isPlainObject(cleaned.ui?.topBanner)) {
            for (const numKey of ['dismissTtlDays', 'dismissVersion', 'heightPx']) {
              const rawVal = cleaned.ui.topBanner[numKey];
              if (rawVal !== undefined && typeof rawVal !== 'number') {
                const n = Number(rawVal);
                if (Number.isFinite(n)) cleaned.ui.topBanner[numKey] = n;
              }
            }
          }
          if (Array.isArray(cleaned.redirects)) {
            cleaned.redirects = cleaned.redirects.map((r) =>
              isPlainObject(r) ? { ...r, status: Number(r.status) === 302 ? 302 : 301 } : r
            );
            if (cleaned.redirects.length === 0) delete cleaned.redirects;
          }
          const mergedCheck = deepMergeConfig(readCoreAndClientConfig(rootDir), cleaned);
          const errors = validateConfigObject(mergedCheck, rootDir);
          if (errors.length > 0) {
            throw Object.assign(new Error(errors.join('\n')), { statusCode: 400 });
          }
          fs.writeFileSync(cmsPath, `${JSON.stringify(cleaned, null, 2)}\n`, 'utf-8');
          return { ok: true, cmsOverrides: cleaned };
        });

        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/content-type-save') {
        const body = await readJsonBody(req);
        const result = await withWriteLock(() => saveContentType(rootDir, body));
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/content-type-delete') {
        const body = await readJsonBody(req);
        const result = await withWriteLock(() => deleteContentType(rootDir, body));
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/messages-save') {
        const body = await readJsonBody(req);
        const result = await withWriteLock(() => saveMessagesUpdates(rootDir, body));
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/locale-meta') {
        const body = await readJsonBody(req);
        const result = await withWriteLock(() => saveLocaleMeta(rootDir, body));
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/page-sections') {
        const body = await readJsonBody(req);
        const result = await withWriteLock(() => savePageSections(rootDir, body));
        sendJson(res, 200, { ok: true, ...result });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/upload-logo') {
        const body = await readJsonBody(req);
        const result = await withWriteLock(() => saveUploadedLogo(rootDir, body));
        sendJson(res, 200, { ok: true, ...result });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/run-cli') {
        const body = await readJsonBody(req);
        const action = String(body.action ?? '').trim();
        const payload = body.payload ?? body;
        const cmdSpec = buildAllowListedCommand(action, payload, rootDir);
        const result = await withWriteLock(async () => {
          const cliRes = await runCommandSteps(cmdSpec, rootDir);
          if (action === 'i18n:add-lang' && (payload.fontFamily || payload.htmlLang)) {
            saveLocaleMeta(rootDir, {
              locale: payload.code,
              ...(payload.fontFamily ? { fontFamily: payload.fontFamily } : {}),
              ...(payload.htmlLang ? { htmlLang: payload.htmlLang } : {}),
            });
          }
          return cliRes;
        });
        sendJson(res, 200, { ok: true, action, ...result });
        return;
      }

      sendJson(res, 404, { ok: false, error: `Unknown Studio route: ${req.method} ${pathname}` });
    } catch (error) {
      const status = Number(error?.statusCode) || 400;
      const stdout = typeof error?.stdout === 'string' ? error.stdout.trim() : '';
      const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : '';
      const details = [stdout, stderr].filter(Boolean).join('\n');
      sendJson(res, status, {
        ok: false,
        error: error?.message || 'Unexpected Studio error.',
        output: details || undefined,
      });
    }
  };
}
