/**
 * Local Dev & Standalone Studio API handler (`/__studio/` in `astro dev`, or `npm run studio`).
 *
 * Strictly uses Node built-ins + existing project scripts/helpers (`site-apply`,
 * `config`, `blueprints`, `content-types`, `frontmatter`, `i18n-sync`, `blocks-catalog`,
 * `content-sync`, `redirects`, `compile-messages`) with strict input validation,
 * path confinement, SVG sanitization, allow-listed CLI execution (no shell), and a
 * write mutex so Astro SSG output (`dist/`) remains 100% pure static HTML.
 */
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { BLUEPRINTS } from './blueprints.mjs';
import {
  buildBlocksCatalog,
  extractSectionArraySchemas,
  HERO_BLOCK_NAMES,
  HERO_PRIORITY_PROPS,
  STRUCTURAL_SECTION_NAMES,
} from './blocks-catalog.mjs';
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
import {
  collectSectionAssetRefs,
  findUnoptimizedPublicUploads,
  isExistingAssetRef,
} from './image-reference.mjs';
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
import { findPlaceholderSlugs } from './slug.mjs';
import { renderStudioHtml } from './studio-ui.mjs';
import { assertSafeSvg } from './svg-sanitize.mjs';
import { isPlaceholderSiteUrl, isPlaceholderSocialUrl } from './validate.mjs';
import { syncCollections } from '../content-sync.mjs';
import { upsertEnvContent } from '../client-bootstrap.mjs';

const execFileAsync = promisify(execFile);
const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const MAX_BODY_BYTES = 4 * 1024 * 1024;
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
const VALID_MENU_DISPLAY_MODES = new Set(['dropdown', 'list']);
const VALID_ITEM_CHILDREN_DISPLAY = new Set(['inherit', 'dropdown', 'list']);
const VALID_FOOTER_SLOT_MODES = new Set(['append', 'replace']);
const SAFE_MENU_ID_RE = /^[a-zA-Z0-9_-]+$/;
const SAFE_HERO_VALUES = new Set(['none', 'minimal', 'default', true, false]);
const SAFE_CONTAINER_VALUES = new Set(['canvas', 'contained', 'prose']);
const ALLOWED_LOGO_MIMES = new Map([
  ['image/svg+xml', '.svg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/jpeg', '.jpg'],
]);
const ALLOWED_ASSET_EXTS = new Map([
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.avif', 'image/avif'],
  ['.ico', 'image/x-icon'],
]);
const ALLOWED_UPLOAD_ASSET_MIMES = new Map([
  ['image/svg+xml', '.svg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/jpeg', '.jpg'],
  ['image/avif', '.avif'],
]);

const SECTION_BLOCKS_META = [
  ...HERO_BLOCK_NAMES.map((name) => ({ name, category: 'hero' })),
  ...STRUCTURAL_SECTION_NAMES.map((name) => ({ name, category: 'section' })),
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

function readClientTemplateKeys(rootDir, exportName = 'CLIENT_PAGE_TEMPLATES') {
  const tplPath = path.join(rootDir, 'client', 'templates', 'index.ts');
  if (!fs.existsSync(tplPath)) return [];
  const raw = fs.readFileSync(tplPath, 'utf-8');
  const escaped = exportName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = raw.match(new RegExp(`${escaped}[^=]*=\\s*\\{([\\s\\S]*?)\\}`));
  if (!match) return [];
  const keys = [];
  for (const line of match[1].split(',')) {
    const m = line.trim().match(/^['"]?([a-zA-Z0-9_:-]+)['"]?\s*(?::|$)/);
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
        const limitMb = Math.round(MAX_BODY_BYTES / (1024 * 1024));
        reject(Object.assign(new Error(`Request payload exceeds ${limitMb} MB limit.`), { statusCode: 413 }));
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
      if (cfg.ui.navigation.menus !== undefined) {
        if (!Array.isArray(cfg.ui.navigation.menus)) {
          errors.push('ui.navigation.menus must be an array.');
        } else {
          const seenMenuIds = new Set();
          const validateMenuItemsTree = (items, pathPrefix, depth = 0) => {
            if (depth > 10) {
              errors.push(`${pathPrefix}: maximum nesting depth (10) exceeded.`);
              return;
            }
            if (!Array.isArray(items)) {
              errors.push(`${pathPrefix} must be an array.`);
              return;
            }
            items.forEach((item, idx) => {
              const itemPath = `${pathPrefix}[${idx}]`;
              if (!isPlainObject(item)) {
                errors.push(`${itemPath} must be an object.`);
                return;
              }
              const hasTarget = Boolean(
                String(item.group ?? '').trim() ||
                  String(item.contentType ?? '').trim() ||
                  String(item.href ?? '').trim()
              );
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;
              if (!hasTarget && !hasChildren) {
                errors.push(
                  `${itemPath} must specify "group", "contentType", "href", or at least one child item.`
                );
              }
              if (item.href && isUnsafeProtocolHref(item.href)) {
                errors.push(`${itemPath}.href uses a disallowed URL scheme.`);
              }
              if (
                item.childrenDisplay !== undefined &&
                item.childrenDisplay !== '' &&
                !VALID_ITEM_CHILDREN_DISPLAY.has(item.childrenDisplay)
              ) {
                errors.push(
                  `${itemPath}.childrenDisplay must be "inherit", "dropdown", or "list".`
                );
              }
              if (item.children !== undefined) {
                validateMenuItemsTree(item.children, `${itemPath}.children`, depth + 1);
              }
            });
          };

          cfg.ui.navigation.menus.forEach((menu, mi) => {
            if (!isPlainObject(menu)) {
              errors.push(`ui.navigation.menus[${mi}] must be an object.`);
              return;
            }
            const menuId = String(menu.id ?? '').trim();
            if (!menuId) {
              errors.push(`ui.navigation.menus[${mi}].id is required.`);
            } else if (!SAFE_MENU_ID_RE.test(menuId)) {
              errors.push(
                `ui.navigation.menus[${mi}].id "${menuId}" must use ASCII letters, digits, "_" or "-".`
              );
            } else if (seenMenuIds.has(menuId)) {
              errors.push(`Duplicate ui.navigation.menus id "${menuId}".`);
            } else {
              seenMenuIds.add(menuId);
            }
            if (
              menu.displayMode !== undefined &&
              menu.displayMode !== '' &&
              !VALID_MENU_DISPLAY_MODES.has(menu.displayMode)
            ) {
              errors.push(`ui.navigation.menus[${mi}].displayMode must be "dropdown" or "list".`);
            }
            if (menu.items !== undefined) {
              validateMenuItemsTree(menu.items, `ui.navigation.menus[${mi}].items`);
            }
          });
        }
      }
      if (cfg.ui.navigation.slots !== undefined) {
        if (!isPlainObject(cfg.ui.navigation.slots)) {
          errors.push('ui.navigation.slots must be an object.');
        } else {
          const slots = cfg.ui.navigation.slots;
          for (const slotKey of ['header', 'drawer', 'legal']) {
            if (slots[slotKey] !== undefined && typeof slots[slotKey] !== 'string') {
              errors.push(`ui.navigation.slots.${slotKey} must be a string.`);
            }
          }
          for (const dmKey of ['headerDisplayMode', 'drawerDisplayMode', 'footerDisplayMode']) {
            if (
              slots[dmKey] !== undefined &&
              slots[dmKey] !== '' &&
              !VALID_ITEM_CHILDREN_DISPLAY.has(slots[dmKey])
            ) {
              errors.push(
                `ui.navigation.slots.${dmKey} must be "inherit", "dropdown", or "list".`
              );
            }
          }
          if (slots.footer !== undefined) {
            if (!Array.isArray(slots.footer)) {
              errors.push('ui.navigation.slots.footer must be an array of menu IDs or { id, displayMode } objects.');
            } else {
              slots.footer.forEach((entry, fi) => {
                if (typeof entry === 'string') return;
                if (!isPlainObject(entry) || !String(entry.id ?? '').trim()) {
                  errors.push(`ui.navigation.slots.footer[${fi}] must be a menu ID string or { id, displayMode } object.`);
                  return;
                }
                if (
                  entry.displayMode !== undefined &&
                  entry.displayMode !== '' &&
                  !VALID_ITEM_CHILDREN_DISPLAY.has(entry.displayMode)
                ) {
                  errors.push(
                    `ui.navigation.slots.footer[${fi}].displayMode must be "inherit", "dropdown", or "list".`
                  );
                }
              });
            }
          }
          if (
            slots.footerMode !== undefined &&
            slots.footerMode !== '' &&
            !VALID_FOOTER_SLOT_MODES.has(slots.footerMode)
          ) {
            errors.push('ui.navigation.slots.footerMode must be "append" or "replace".');
          }
        }
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
    for (const flag of ['consentMode', 'requireConsent', 'allowCookielessWithoutBanner']) {
      if (a[flag] !== undefined && typeof a[flag] !== 'boolean') {
        errors.push(`analytics.${flag} must be a boolean.`);
      }
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
      if (Array.isArray(next.ui.navigation.menus)) {
        const cleanMenuItemsTree = (items) =>
          items
            .filter((it) => isPlainObject(it))
            .map((it) => {
              const ni = { ...it };
              delete ni._targetType;
              for (const strKey of ['id', 'key', 'group', 'contentType', 'href', 'icon', 'label']) {
                if (typeof ni[strKey] === 'string') ni[strKey] = ni[strKey].trim();
                if (ni[strKey] === '') delete ni[strKey];
              }
              if (ni.external === false) delete ni.external;
              if (ni.childrenDisplay === '' || ni.childrenDisplay === 'inherit') {
                delete ni.childrenDisplay;
              }
              if (isPlainObject(ni.labels)) {
                ni.labels = stripEmptyMapEntries(ni.labels);
                if (Object.keys(ni.labels).length === 0) delete ni.labels;
              }
              if (Array.isArray(ni.children)) {
                ni.children = cleanMenuItemsTree(ni.children);
                if (ni.children.length === 0) delete ni.children;
              }
              return ni;
            });

        next.ui.navigation.menus = next.ui.navigation.menus
          .filter((menu) => isPlainObject(menu))
          .map((menu) => {
            const nm = { ...menu };
            if (typeof nm.id === 'string') nm.id = nm.id.trim();
            if (typeof nm.title === 'string') nm.title = nm.title.trim();
            if (nm.title === '') delete nm.title;
            if (isPlainObject(nm.titles)) {
              nm.titles = stripEmptyMapEntries(nm.titles);
              if (Object.keys(nm.titles).length === 0) delete nm.titles;
            }
            if (nm.displayMode === '') delete nm.displayMode;
            nm.items = Array.isArray(nm.items) ? cleanMenuItemsTree(nm.items) : [];
            return nm;
          });
      }
      if (isPlainObject(next.ui.navigation.slots)) {
        const ns = { ...next.ui.navigation.slots };
        for (const slotKey of ['header', 'drawer', 'legal']) {
          if (typeof ns[slotKey] === 'string') ns[slotKey] = ns[slotKey].trim();
          if (ns[slotKey] === '') delete ns[slotKey];
        }
        for (const dmKey of ['headerDisplayMode', 'drawerDisplayMode', 'footerDisplayMode']) {
          if (typeof ns[dmKey] === 'string') ns[dmKey] = ns[dmKey].trim();
          if (ns[dmKey] === '' || ns[dmKey] === 'inherit') delete ns[dmKey];
        }
        if (Array.isArray(ns.footer)) {
          const seenFooterIds = new Set();
          const cleanedFooter = [];
          for (const entry of ns.footer) {
            if (typeof entry === 'string') {
              const id = entry.trim();
              if (!id || seenFooterIds.has(id)) continue;
              seenFooterIds.add(id);
              cleanedFooter.push(id);
            } else if (isPlainObject(entry)) {
              const id = String(entry.id ?? '').trim();
              if (!id || seenFooterIds.has(id)) continue;
              seenFooterIds.add(id);
              const dm = typeof entry.displayMode === 'string' ? entry.displayMode.trim() : '';
              if (dm === 'dropdown' || dm === 'list') {
                cleanedFooter.push({ id, displayMode: dm });
              } else {
                cleanedFooter.push(id);
              }
            }
          }
          ns.footer = cleanedFooter;
          if (ns.footer.length === 0) delete ns.footer;
        }
        if (ns.footerMode === '' || ns.footerMode === 'append') {
          delete ns.footerMode;
        }
        if (Object.keys(ns).length === 0) {
          delete next.ui.navigation.slots;
        } else {
          next.ui.navigation.slots = ns;
        }
      }
      const hasPages = Array.isArray(next.ui.navigation.pages) && next.ui.navigation.pages.length > 0;
      const hasCols =
        Array.isArray(next.ui.navigation.footerColumns) && next.ui.navigation.footerColumns.length > 0;
      const hasMenus = Array.isArray(next.ui.navigation.menus) && next.ui.navigation.menus.length > 0;
      const hasSlots = isPlainObject(next.ui.navigation.slots) && Object.keys(next.ui.navigation.slots).length > 0;
      if (!hasPages && !hasCols && !hasMenus && !hasSlots) {
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
  const arraySchemas = extractSectionArraySchemas(rootDir);
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
      arraySchemas: arraySchemas[meta.name] || {},
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
    registeredTemplates: readClientTemplateKeys(rootDir, 'CLIENT_PAGE_TEMPLATES'),
    registeredCollectionTemplates: readClientTemplateKeys(rootDir, 'CLIENT_COLLECTION_TEMPLATES'),
    availableIcons: readAvailableIcons(rootDir),
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

function readAvailableIcons(rootDir) {
  const icons = new Set();
  const coreIconsPath = fs.existsSync(path.join(rootDir, 'src/libs/ui/icons.ts'))
    ? path.join(rootDir, 'src/libs/ui/icons.ts')
    : path.join(defaultRootDir, 'src/libs/ui/icons.ts');
  for (const absPath of [coreIconsPath, path.join(rootDir, 'client/icons.ts')]) {
    if (!fs.existsSync(absPath)) continue;
    const raw = fs.readFileSync(absPath, 'utf-8');
    const arrMatch = raw.match(/\[([\s\S]*?)\]\s*as\s*const/);
    if (!arrMatch) continue;
    for (const m of arrMatch[1].matchAll(/['"]([a-z0-9-]+)['"]/g)) {
      icons.add(m[1]);
    }
  }
  return [...icons];
}

export function getStudioHealth(rootDir = defaultRootDir) {
  const mergedConfig = readMergedConfig(rootDir);
  const localeConfig = readLocaleConfig(rootDir);
  const envInfo = parseAllowListedEnv(rootDir);
  const syncPreview = syncDictionaryKeys(rootDir, { dryRun: true, compile: false });
  const checks = [];

  const pushCheck = (level, message, hint, tab = 'config', subTab = '') => {
    checks.push({ level, message, hint, tab, subTab });
  };

  const configErrors = validateConfigObject(mergedConfig, rootDir);
  for (const err of configErrors) {
    pushCheck('error', err, 'Fix this configuration field in Config & Branding.', 'config', 'site');
  }

  const siteUrl = String(envInfo.vars?.SITE_URL || process.env.SITE_URL || '').trim();
  if (!siteUrl) {
    pushCheck(
      'warn',
      'SITE_URL is not configured in .env.',
      'Set SITE_URL to your production domain in Project & Wizard -> .env before deployment.',
      'wizard'
    );
  } else if (isPlaceholderSiteUrl(siteUrl)) {
    pushCheck(
      'warn',
      `SITE_URL ("${siteUrl}") still points to localhost or a placeholder domain.`,
      'Update SITE_URL to the client production URL before handoff.',
      'wizard'
    );
  } else {
    pushCheck('ok', `Production SITE_URL is set (${siteUrl}).`, '', 'wizard');
  }

  if (mergedConfig.site?.name === 'Astro i18n Starter') {
    pushCheck(
      'warn',
      'Site name is still set to the default "Astro i18n Starter".',
      'Customize site.name for your client brand.',
      'config',
      'site'
    );
  }

  const publicRoot = path.resolve(rootDir, 'public');
  const logoObj = mergedConfig.brand?.logo;
  for (const variant of ['light', 'dark']) {
    const rawLogo = typeof logoObj?.[variant] === 'string' ? logoObj[variant].trim() : '';
    if (!rawLogo || /^https?:\/\//i.test(rawLogo)) continue;
    const logoFile = path.resolve(publicRoot, rawLogo.replace(/^\/+/, ''));
    if (!logoFile.startsWith(publicRoot + path.sep) || !fs.existsSync(logoFile)) {
      pushCheck(
        'warn',
        `brand.logo.${variant} ("${rawLogo}") does not exist in public/.`,
        'Upload a brand logo or update Brand Logos in Config & Branding.',
        'config',
        'brand'
      );
    }
  }

  const hasEndpoint = Boolean(
    String(mergedConfig.api?.baseUrl || '').trim() ||
      String(envInfo.vars?.PUBLIC_API_BASE_URL || process.env.PUBLIC_API_BASE_URL || '').trim() ||
      String(envInfo.vars?.PUBLIC_CONTACT_API_URL || process.env.PUBLIC_CONTACT_API_URL || '').trim() ||
      mergedConfig.api?.provider === 'web3forms'
  );
  const contactEmail = String(mergedConfig.site?.contactEmail || '').trim();
  if (!hasEndpoint && !contactEmail) {
    pushCheck(
      'warn',
      'Both api.baseUrl and site.contactEmail are empty.',
      'Set site.contactEmail (mailto fallback) or configure a form API provider.',
      'config',
      'analytics'
    );
  } else {
    pushCheck('ok', 'Contact form destination is configured.', '', 'config', 'analytics');
  }

  for (const [socKey, rawVal] of Object.entries(mergedConfig.social || {})) {
    const val = String(rawVal || '').trim().replace(/\/+$/, '');
    if (isPlaceholderSocialUrl(val)) {
      pushCheck(
        'warn',
        `social.${socKey} still points to placeholder "${val}".`,
        'Set the client profile URL or clear the field.',
        'config',
        'business'
      );
    }
  }

  const analytics = mergedConfig.analytics || {};
  const cookiesEnabled = mergedConfig.cookies?.enabled !== false;
  const requireConsent = analytics.requireConsent !== false;
  const hasCookieDependentAnalytics = Boolean(analytics.ga4Id || analytics.gtmId || analytics.clarityId);
  const hasCookielessAnalytics = Boolean(
    analytics.plausibleDomain || (analytics.umamiWebsiteId && analytics.umamiSrc)
  );
  if (!cookiesEnabled) {
    if (hasCookieDependentAnalytics && requireConsent) {
      pushCheck(
        'warn',
        'GA4/GTM/Clarity are configured with cookies.enabled = false while analytics.requireConsent = true.',
        'Enable cookies.enabled or turn off analytics.requireConsent if no GDPR banner is used.',
        'config',
        'analytics'
      );
    }
    if (hasCookielessAnalytics && requireConsent && analytics.allowCookielessWithoutBanner !== true) {
      pushCheck(
        'warn',
        'Plausible/Umami are blocked because cookies.enabled is false without allowCookielessWithoutBanner.',
        'Enable allowCookielessWithoutBanner or turn off analytics.requireConsent.',
        'config',
        'analytics'
      );
    }
  }

  if (syncPreview.totalAdded > 0) {
    pushCheck(
      'warn',
      `${syncPreview.totalAdded} missing i18n dictionary key(s) detected across locales.`,
      'Run Sync Missing Keys in Locales & Dictionary.',
      'i18n'
    );
  } else {
    pushCheck('ok', 'All active locales have complete dictionary keys.', '', 'i18n');
  }

  let todoCount = 0;
  for (const loc of localeConfig.locales) {
    const mergedDict = stripSchema(readMergedMessages(loc, rootDir));
    for (const val of Object.values(mergedDict)) {
      if (typeof val === 'string' && val.includes('[TODO:')) {
        todoCount += 1;
      }
    }
  }
  if (todoCount > 0) {
    pushCheck(
      'warn',
      `${todoCount} dictionary message(s) still contain "[TODO:" placeholders.`,
      'Translate pending strings in Locales & Dictionary.',
      'i18n'
    );
  }

  const pagesYmlPath = path.join(rootDir, '.pages.yml');
  if (fs.existsSync(pagesYmlPath)) {
    try {
      const check = syncCollections(rootDir, { check: true, dryRun: true });
      if (check.ymlChanged || (check.missingDirs?.length || 0) > 0) {
        pushCheck(
          'warn',
          '.pages.yml or content directories are out of sync with configured content types.',
          'Click Sync Collections in CMS & Schemas.',
          'cms'
        );
      } else {
        pushCheck('ok', 'CMS schema (.pages.yml) and content directories are in sync.', '', 'cms');
      }
    } catch {
      pushCheck('warn', 'Could not verify .pages.yml sync status.', '', 'cms');
    }
  }

  const unoptimizedRasters = findUnoptimizedPublicUploads(rootDir);
  if (unoptimizedRasters.length > 0) {
    pushCheck(
      'warn',
      `${unoptimizedRasters.length} raster image(s) in public/uploads/ bypass build-time WebP optimization (${unoptimizedRasters.slice(0, 3).join(', ')}${unoptimizedRasters.length > 3 ? ', …' : ''}).`,
      'Store uploads in src/assets/uploads/ (automatic WebP optimization on build) or pre-compress to .webp.',
      'tools',
      'assets'
    );
  }

  const knownTypeSet = new Set(getKnownTypes(rootDir));
  const activeContentTypes = readContentTypes(mergedConfig, rootDir).filter(
    (type) => knownTypeSet.has(type.key) && (type.key === 'pages' || type.enabled !== false)
  );
  let brokenContentImages = 0;
  let contentTodoCount = 0;
  const placeholderContentSlugs = [];

  for (const type of activeContentTypes) {
    const colDir = path.join(rootDir, 'src', 'content', type.key);
    if (!fs.existsSync(colDir)) continue;
    for (const entry of fs.readdirSync(colDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const group = entry.name;
      const groupDir = path.join(colDir, group);
      for (const item of findPlaceholderSlugs(groupDir, group, localeConfig.locales)) {
        placeholderContentSlugs.push(`${type.key}/${group}/${item.locale}`);
      }
      for (const loc of localeConfig.locales) {
        const file = ['mdx', 'md']
          .map((ext) => path.join(groupDir, `${loc}.${ext}`))
          .find((candidate) => fs.existsSync(candidate));
        if (!file) continue;
        const source = fs.readFileSync(file, 'utf-8');
        if (source.includes('[TODO:')) contentTodoCount += 1;
        const { data } = parseFrontmatter(source);
        if (typeof data.image === 'string' && !isExistingAssetRef(data.image, rootDir, groupDir)) {
          brokenContentImages += 1;
        }
        if (Array.isArray(data.sections)) {
          for (const ref of collectSectionAssetRefs(data.sections)) {
            if (!isExistingAssetRef(ref, rootDir, groupDir)) brokenContentImages += 1;
          }
        }
      }
    }
  }

  if (brokenContentImages > 0) {
    pushCheck(
      'error',
      `${brokenContentImages} frontmatter/section image reference(s) point to missing files.`,
      'Fix or re-select broken image paths in Content & Pages.',
      'content'
    );
  }
  if (placeholderContentSlugs.length > 0) {
    pushCheck(
      'warn',
      `${placeholderContentSlugs.length} content entry slug(s) still use placeholder patterns (${placeholderContentSlugs.slice(0, 3).join(', ')}${placeholderContentSlugs.length > 3 ? ', …' : ''}).`,
      'Set localized native slugs in Content & Pages before publishing.',
      'content'
    );
  }
  if (contentTodoCount > 0) {
    pushCheck(
      'warn',
      `${contentTodoCount} content entry file(s) still contain "[TODO:" translation placeholders.`,
      'Translate remaining [TODO: …] content in Content & Pages.',
      'content'
    );
  }
  if (brokenContentImages === 0 && placeholderContentSlugs.length === 0 && contentTodoCount === 0) {
    pushCheck('ok', 'Content collections have valid image paths, native slugs, and no [TODO:] markers.', '', 'content');
  }

  const errors = checks.filter((c) => c.level === 'error').length;
  const warnings = checks.filter((c) => c.level === 'warn').length;
  const passed = checks.filter((c) => c.level === 'ok').length;
  const status = errors > 0 ? 'error' : warnings > 0 ? 'warn' : 'ok';

  return {
    ok: true,
    status,
    summary: { errors, warnings, passed },
    checks,
  };
}

function buildAllowListedCommand(action, payload, rootDir) {
  const node = process.execPath;
  const binScript = (rel) => path.join(rootDir, 'scripts', rel);
  const localNodeStep = (pkgName, binName, extraArgs = []) => {
    const pkgDir = path.join(rootDir, 'node_modules', ...pkgName.split('/'));
    const manifestPath = path.join(pkgDir, 'package.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const binField = manifest.bin;
        const relBin =
          typeof binField === 'string'
            ? binField
            : binField && typeof binField === 'object'
              ? binField[binName]
              : null;
        if (typeof relBin === 'string' && relBin.trim()) {
          return { cmd: node, args: [path.resolve(pkgDir, relBin), ...extraArgs] };
        }
      } catch {
        // Fall through to .bin lookup if package manifest cannot be read
      }
    }
    const ext = process.platform === 'win32' ? '.cmd' : '';
    return { cmd: path.join(rootDir, 'node_modules', '.bin', `${binName}${ext}`), args: extraArgs };
  };

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
          localNodeStep('typescript', 'tsc', ['--noEmit']),
          localNodeStep('vitest', 'vitest', ['run', '--no-isolate']),
        ],
      };
    case 'lint':
      return {
        chain: [
          { cmd: node, args: [binScript('messages-compile.mjs')] },
          localNodeStep('astro', 'astro', ['check']),
          localNodeStep('typescript', 'tsc', ['--noEmit']),
        ],
      };
    case 'knip':
      return localNodeStep('knip', 'knip', []);
    case 'build':
      return {
        chain: [
          { cmd: node, args: [binScript('messages-compile.mjs')] },
          { cmd: node, args: [binScript('audit-i18n.mjs'), '--quiet'] },
          localNodeStep('astro', 'astro', ['build']),
          { cmd: node, args: [binScript('index-pagefind.mjs')] },
        ],
      };
    case 'preflight':
      return {
        chain: [
          { cmd: node, args: [binScript('messages-compile.mjs')] },
          { cmd: node, args: [binScript('upstream-check.mjs')] },
          { cmd: node, args: [binScript('audit-i18n.mjs'), '--quiet'] },
          { cmd: node, args: [binScript('doctor.mjs')] },
          localNodeStep('vitest', 'vitest', ['run', '--no-isolate']),
          localNodeStep('astro', 'astro', ['build']),
          { cmd: node, args: [binScript('index-pagefind.mjs')] },
          { cmd: node, args: [binScript('smoke.mjs'), '--quiet'] },
          { cmd: node, args: [binScript('link-check.mjs'), '--quiet'] },
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

function listStudioAssets(rootDir) {
  const results = [];
  const walkImages = (baseDir, source, prefix) => {
    if (!fs.existsSync(baseDir)) return;
    const stack = [baseDir];
    while (stack.length > 0) {
      const dir = stack.pop();
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const abs = assertConfinedPath(baseDir, path.join(dir, entry.name));
        if (entry.isDirectory()) {
          if (
            entry.name === 'pagefind' ||
            entry.name === '_astro' ||
            (entry.name === 'aistudio' && path.basename(dir) === 'assets')
          ) {
            continue;
          }
          stack.push(abs);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!ALLOWED_ASSET_EXTS.has(ext)) continue;
          const rel = path.relative(baseDir, abs).split(path.sep).join('/');
          const stat = fs.statSync(abs);
          results.push({
            path: `${prefix}${rel}`,
            name: entry.name,
            source,
            ext: ext.slice(1),
            size: stat.size,
          });
        }
      }
    }
  };
  walkImages(path.join(rootDir, 'public'), 'public', '/');
  walkImages(path.join(rootDir, 'src', 'assets'), 'assets', 'src/assets/');
  results.sort((a, b) => a.path.localeCompare(b.path));
  return { ok: true, assets: results };
}

function readStudioAssetPreview(rootDir, rawAssetPath) {
  const relRaw = String(rawAssetPath ?? '').trim();
  if (!relRaw) {
    throw Object.assign(new Error('Asset path is required.'), { statusCode: 400 });
  }
  let targetPath;
  if (relRaw.startsWith('/')) {
    const publicDir = path.join(rootDir, 'public');
    targetPath = assertConfinedPath(publicDir, path.join(publicDir, relRaw.slice(1)));
  } else if (relRaw.startsWith('src/assets/')) {
    const assetsDir = path.join(rootDir, 'src', 'assets');
    targetPath = assertConfinedPath(assetsDir, path.join(assetsDir, relRaw.slice('src/assets/'.length)));
  } else {
    throw Object.assign(new Error('Asset preview path must start with "/" or "src/assets/".'), {
      statusCode: 400,
    });
  }
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
    throw Object.assign(new Error('Asset file not found.'), { statusCode: 404 });
  }
  const ext = path.extname(targetPath).toLowerCase();
  const mime = ALLOWED_ASSET_EXTS.get(ext);
  if (!mime) {
    throw Object.assign(new Error(`Unsupported asset extension "${ext}".`), { statusCode: 400 });
  }
  return { mime, bytes: fs.readFileSync(targetPath) };
}

function saveUploadedAsset(rootDir, payload) {
  if (!isPlainObject(payload)) throw new Error('Asset payload must be an object.');
  const dataUrl = String(payload.dataUrl ?? '');
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error('Invalid image data URL. Upload SVG, PNG, WebP, AVIF, or JPG.');
  }
  const mime = match[1].toLowerCase();
  const ext = ALLOWED_UPLOAD_ASSET_MIMES.get(mime);
  if (!ext) {
    throw new Error(`Unsupported image MIME type "${mime}".`);
  }
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > 1.5 * 1024 * 1024) {
    throw new Error('Uploaded image must be between 1 byte and 1.5 MB.');
  }
  if (mime === 'image/svg+xml') {
    assertSafeSvg(bytes);
  }

  const rawBase = String(payload.filename ?? 'asset')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const safeBase = rawBase || 'asset';
  const uploadsDir = path.join(rootDir, 'src', 'assets', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  let destFile = `${safeBase}${ext}`;
  let suffix = 2;
  while (fs.existsSync(path.join(uploadsDir, destFile))) {
    destFile = `${safeBase}-${suffix++}${ext}`;
  }
  const destPath = assertConfinedPath(uploadsDir, path.join(uploadsDir, destFile));
  fs.writeFileSync(destPath, bytes);
  const assetPath = `src/assets/uploads/${destFile}`;
  return {
    ok: true,
    assetPath,
    publicPath: assetPath,
    file: path.relative(rootDir, destPath),
    size: bytes.length,
  };
}

function deleteStudioAsset(rootDir, payload) {
  if (!isPlainObject(payload)) throw new Error('Asset delete payload must be an object.');
  const rawPath = String(payload.path ?? '').trim();
  if (!rawPath.startsWith('src/assets/uploads/')) {
    throw Object.assign(
      new Error('Only uploaded assets under "src/assets/uploads/" can be deleted from Studio.'),
      { statusCode: 400 }
    );
  }
  const uploadsDir = path.join(rootDir, 'src', 'assets', 'uploads');
  const rel = rawPath.slice('src/assets/uploads/'.length);
  if (!rel || rel.includes('\\') || rel.startsWith('/')) {
    throw Object.assign(new Error('Invalid uploaded asset path.'), { statusCode: 400 });
  }
  const targetPath = assertConfinedPath(uploadsDir, path.join(uploadsDir, rel));
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
    throw Object.assign(new Error('Uploaded asset file not found.'), { statusCode: 404 });
  }
  const ext = path.extname(targetPath).toLowerCase();
  if (!ALLOWED_ASSET_EXTS.has(ext)) {
    throw Object.assign(new Error(`Unsupported asset extension "${ext}".`), { statusCode: 400 });
  }
  fs.rmSync(targetPath, { force: true });
  return { ok: true, deleted: rawPath };
}

function exportClientBundle(rootDir) {
  const locales = readLocaleConfig(rootDir);
  const config = readClientConfig(rootDir);
  const cms = readCmsConfig(rootDir);
  const messages = {};
  for (const loc of locales.locales) {
    messages[loc] = stripSchema(readClientMessages(loc, rootDir));
  }
  return {
    ok: true,
    version: 1,
    exportedAt: new Date().toISOString(),
    bundle: {
      locales,
      config,
      cms,
      messages,
    },
  };
}

function importClientBundle(rootDir, payload) {
  if (!isPlainObject(payload)) throw new Error('Bundle payload must be an object.');
  const bundle = isPlainObject(payload.bundle) ? payload.bundle : payload;

  // 1. Validate locales if provided
  let nextLocales = readLocaleConfig(rootDir);
  if (bundle.locales !== undefined) {
    if (!isPlainObject(bundle.locales) || !Array.isArray(bundle.locales.locales) || bundle.locales.locales.length === 0) {
      throw new Error('bundle.locales.locales must be a non-empty array.');
    }
    const cleanLocales = bundle.locales.locales.map((l) => assertSafeLocale(l));
    const defaultLocale = assertSafeLocale(bundle.locales.defaultLocale ?? cleanLocales[0]);
    if (!cleanLocales.includes(defaultLocale)) {
      throw new Error(`bundle.locales.defaultLocale "${defaultLocale}" must be included in locales.`);
    }
    const cleanMeta = {};
    if (isPlainObject(bundle.locales.metadata)) {
      for (const [locRaw, meta] of Object.entries(bundle.locales.metadata)) {
        const loc = assertSafeLocale(locRaw);
        if (!isPlainObject(meta)) continue;
        cleanMeta[loc] = {
          ...(meta.name ? { name: String(meta.name).trim() } : {}),
          ...(meta.dir && ['ltr', 'rtl'].includes(meta.dir) ? { dir: meta.dir } : {}),
          ...(meta.htmlLang ? { htmlLang: assertSafeLocale(meta.htmlLang) } : {}),
          ...(meta.fontFamily && !/[;{}]/.test(String(meta.fontFamily))
            ? { fontFamily: String(meta.fontFamily).trim() }
            : {}),
        };
      }
    }
    nextLocales = {
      defaultLocale,
      locales: cleanLocales,
      metadata: cleanMeta,
    };
  }

  // 2. Validate config & cms merged before writing any files
  const coreCfg = readCoreConfig(rootDir);
  const nextConfigInput = bundle.config !== undefined ? bundle.config : readClientConfig(rootDir);
  if (!isPlainObject(nextConfigInput)) {
    throw new Error('bundle.config must be an object.');
  }
  const nextFullConfig = cleanConfigBeforeWrite(deepMergeConfig(coreCfg, nextConfigInput));
  const configErrors = validateConfigObject(nextFullConfig, rootDir);
  if (configErrors.length > 0) {
    throw Object.assign(new Error(configErrors.join('\n')), { statusCode: 400 });
  }

  const nextCmsInput = bundle.cms !== undefined ? bundle.cms : readCmsConfig(rootDir);
  if (!isPlainObject(nextCmsInput)) {
    throw new Error('bundle.cms must be an object.');
  }
  const cleanedCms = pruneEmptyCmsObjects(sanitizeCmsConfig(nextCmsInput));
  const mergedCmsErrors = validateConfigObject(deepMergeConfig(nextFullConfig, cleanedCms), rootDir);
  if (mergedCmsErrors.length > 0) {
    throw Object.assign(new Error(mergedCmsErrors.join('\n')), { statusCode: 400 });
  }

  // 3. Validate messages before writing
  const validatedMessages = {};
  if (bundle.messages !== undefined) {
    if (!isPlainObject(bundle.messages)) {
      throw new Error('bundle.messages must be an object keyed by locale.');
    }
    for (const [locRaw, dict] of Object.entries(bundle.messages)) {
      const loc = assertSafeLocale(locRaw);
      if (!isPlainObject(dict)) {
        throw new Error(`bundle.messages.${loc} must be an object.`);
      }
      const cleanDict = {};
      for (const [k, v] of Object.entries(dict)) {
        if (!SAFE_I18N_KEY_RE.test(k)) {
          throw new Error(`Invalid message key "${k}" in bundle.messages.${loc}.`);
        }
        if (typeof v === 'string' || (Array.isArray(v) && v.every((x) => typeof x === 'string'))) {
          cleanDict[k] = v;
        } else {
          throw new Error(`Message "${loc}.${k}" must be a string or array of strings.`);
        }
      }
      validatedMessages[loc] = cleanDict;
    }
  }

  // 4. Commit all validated client-tier files atomically inside writeLock
  if (bundle.locales !== undefined) {
    writeLocaleConfig(nextLocales, rootDir);
  }
  const sparseConfig = writeClientConfig(nextFullConfig, { rootDir, sparse: true });
  const cmsPath = cmsConfigPathFor(rootDir);
  fs.mkdirSync(path.dirname(cmsPath), { recursive: true });
  fs.writeFileSync(cmsPath, `${JSON.stringify(cleanedCms, null, 2)}\n`, 'utf-8');

  for (const [loc, dict] of Object.entries(validatedMessages)) {
    writeClientMessages(loc, dict, rootDir);
  }
  syncCollections(rootDir, { check: false });
  compileMessages(rootDir);

  return {
    ok: true,
    locales: nextLocales.locales,
    clientOverrides: sparseConfig,
    cmsOverrides: cleanedCms,
    updatedMessageLocales: Object.keys(validatedMessages),
  };
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
    'template',
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

function assertSafeStudioHttpRequest(req, pathname, expectedToken) {
  if (!req.headers) return;
  const headers = req.headers;

  const fetchSite = String(headers['sec-fetch-site'] ?? '').trim().toLowerCase();
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site' && fetchSite !== 'none') {
    throw Object.assign(new Error('Forbidden cross-site request to Studio API.'), { statusCode: 403 });
  }

  const host = String(headers.host ?? '').trim().toLowerCase();
  if (host) {
    for (const headerName of ['origin', 'referer']) {
      const rawOrigin = headers[headerName];
      if (!rawOrigin) continue;
      let parsedOrigin;
      try {
        parsedOrigin = new URL(String(rawOrigin));
      } catch {
        throw Object.assign(new Error(`Invalid ${headerName} header.`), { statusCode: 403 });
      }
      if (parsedOrigin.host.toLowerCase() !== host) {
        throw Object.assign(new Error(`Forbidden cross-origin ${headerName} for Studio API.`), {
          statusCode: 403,
        });
      }
    }
  }

  if (req.method === 'POST' && pathname.startsWith('/api/')) {
    const contentType = String(headers['content-type'] ?? '').toLowerCase();
    if (!contentType.includes('application/json')) {
      throw Object.assign(new Error('Studio API requires Content-Type: application/json.'), {
        statusCode: 415,
      });
    }
    const token = String(headers['x-studio-token'] ?? '');
    if (!token || token !== expectedToken) {
      throw Object.assign(new Error('Invalid or missing Studio CSRF token.'), { statusCode: 403 });
    }
  }
}

export function createStudioHandler({ rootDir = defaultRootDir, previewUrl = '' } = {}) {
  const csrfToken = randomBytes(24).toString('hex');
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

      assertSafeStudioHttpRequest(req, pathname, csrfToken);

      if (req.method === 'GET' && (pathname === '/' || pathname === '')) {
        const mountedInDev = origUrl.startsWith('/__studio');
        sendHtml(res, renderStudioHtml({ mountedInDev, previewUrl, csrfToken }));
        return;
      }

      if (req.method === 'GET' && pathname === '/api/state') {
        const state = getStudioState(rootDir);
        sendJson(res, 200, { ok: true, ...state });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/health') {
        const health = getStudioHealth(rootDir);
        sendJson(res, 200, health);
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

      if (req.method === 'GET' && pathname === '/api/assets') {
        sendJson(res, 200, listStudioAssets(rootDir));
        return;
      }

      if (req.method === 'GET' && pathname === '/api/asset-preview') {
        const assetPath = parsed.searchParams.get('path') || '';
        const { mime, bytes } = readStudioAssetPreview(rootDir, assetPath);
        res.statusCode = 200;
        res.setHeader('Content-Type', mime);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-store');
        if (mime === 'image/svg+xml') {
          res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
        }
        res.end(bytes);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/upload-asset') {
        const body = await readJsonBody(req);
        const result = await withWriteLock(() => saveUploadedAsset(rootDir, body));
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/delete-asset') {
        const body = await readJsonBody(req);
        const result = await withWriteLock(() => deleteStudioAsset(rootDir, body));
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/client-bundle') {
        sendJson(res, 200, exportClientBundle(rootDir));
        return;
      }

      if (req.method === 'POST' && pathname === '/api/client-bundle') {
        const body = await readJsonBody(req);
        const result = await withWriteLock(() => importClientBundle(rootDir, body));
        sendJson(res, 200, result);
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
