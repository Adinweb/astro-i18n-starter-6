/**
 * Local Dev & Standalone Studio API handler (`/__studio/` in `astro dev`, or `npm run studio`).
 *
 * Strictly uses Node built-ins + existing project scripts/helpers (`site-apply`,
 * `config`, `blueprints`, `content-types`, `frontmatter`, `i18n-sync`, `blocks-catalog`)
 * with strict input validation, allow-listed CLI execution (no shell), and a
 * write mutex so Astro SSG output (`dist/`) remains 100% pure static HTML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { BLUEPRINTS } from './blueprints.mjs';
import { buildBlocksCatalog } from './blocks-catalog.mjs';
import {
  deepMergeConfig,
  readClientConfig,
  readCoreAndClientConfig,
  readMergedConfig,
  writeClientConfig,
} from './config.mjs';
import { readContentTypes } from './content-types.mjs';
import { parseFrontmatter, stringifyFrontmatter } from './frontmatter.mjs';
import { syncDictionaryKeys } from './i18n-sync.mjs';
import { readLocaleConfig } from './locales.mjs';
import { readClientMessages, stripSchema } from './merge-messages.mjs';
import { applySiteSpec, validateSiteSpec } from './site-apply.mjs';
import { renderStudioHtml } from './studio-ui.mjs';

const execFileAsync = promisify(execFile);
const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const SAFE_KEY_RE = /^[a-z0-9-]+$/;
const SAFE_I18N_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SAFE_LOCALE_RE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
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

function assertSafeKey(value, label) {
  if (typeof value !== 'string' || !SAFE_KEY_RE.test(value.trim())) {
    throw new Error(`Invalid ${label}: expected lowercase letters, digits, or hyphens.`);
  }
  return value.trim();
}

function assertSafeLocale(value) {
  if (typeof value !== 'string' || !SAFE_LOCALE_RE.test(value.trim())) {
    throw new Error('Invalid locale code (expected e.g. "en", "fa", "ar", "en-US").');
  }
  return value.trim();
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
      const { data } = parseFrontmatter(raw);
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

export function getStudioState(rootDir = defaultRootDir) {
  const mergedConfig = readMergedConfig(rootDir);
  const clientConfig = readClientConfig(rootDir);
  const localeConfig = readLocaleConfig(rootDir);
  const contentTypes = readContentTypes(mergedConfig, rootDir);
  const presetsPath = path.join(rootDir, 'src', 'libs', 'config', 'theme-presets.json');
  const fallbackPresetsPath = path.join(defaultRootDir, 'src', 'libs', 'config', 'theme-presets.json');
  const themePresets = JSON.parse(
    fs.readFileSync(fs.existsSync(presetsPath) ? presetsPath : fallbackPresetsPath, 'utf-8')
  );

  const pages = listContentGroups(rootDir, 'pages', localeConfig.locales);
  const collections = {};
  for (const type of contentTypes) {
    if (type.key === 'pages') continue;
    collections[type.key] = listContentGroups(rootDir, type.key, localeConfig.locales);
  }

  const syncPreview = syncDictionaryKeys(rootDir, { dryRun: true, compile: false });
  const clientMessages = {};
  for (const loc of localeConfig.locales) {
    clientMessages[loc] = stripSchema(readClientMessages(loc, rootDir));
  }

  const starterSeeded = fs.existsSync(path.join(rootDir, 'starter-kit'));

  return {
    rootDir,
    hasEnv: fs.existsSync(path.join(rootDir, '.env')),
    starterAvailable: starterSeeded,
    config: mergedConfig,
    clientOverrides: clientConfig,
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
    messages: {
      clientByLocale: clientMessages,
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
      const args = [binScript('new-page.mjs'), group];
      if (payload.title) args.push(`--title=${String(payload.title)}`);
      if (payload.slug) args.push(`--slug=${String(payload.slug)}`);
      if (payload.locale) args.push(`--locale=${assertSafeLocale(payload.locale)}`);
      if (payload.preset === 'landing') args.push('--preset=landing');
      if (payload.publish) args.push('--publish');
      return { cmd: node, args };
    }
    case 'remove:page': {
      const group = assertSafeKey(payload.group, 'page group');
      const args = [binScript('remove-page.mjs'), group, '--yes'];
      if (payload.locale) args.push(`--locale=${assertSafeLocale(payload.locale)}`);
      if (payload.noCleanNav) args.push('--no-clean-nav');
      return { cmd: node, args };
    }
    case 'new:post': {
      const group = assertSafeKey(payload.group, 'post group');
      const args = [binScript('new-post.mjs'), group];
      if (payload.title) args.push(`--title=${String(payload.title)}`);
      if (payload.slug) args.push(`--slug=${String(payload.slug)}`);
      if (payload.locale) args.push(`--locale=${assertSafeLocale(payload.locale)}`);
      if (payload.categories) args.push(`--categories=${String(payload.categories)}`);
      if (payload.tags) args.push(`--tags=${String(payload.tags)}`);
      if (payload.publish) args.push('--publish');
      return { cmd: node, args };
    }
    case 'remove:post': {
      const group = assertSafeKey(payload.group, 'post group');
      const args = [binScript('remove-post.mjs'), group, '--yes'];
      if (payload.locale) args.push(`--locale=${assertSafeLocale(payload.locale)}`);
      return { cmd: node, args };
    }
    case 'content:new': {
      const type = assertSafeKey(payload.type, 'collection type');
      const group = assertSafeKey(payload.group, 'entry group');
      const args = [binScript('content-new.mjs'), type, group];
      if (payload.title) args.push(`--title=${String(payload.title)}`);
      if (payload.locale) args.push(`--locale=${assertSafeLocale(payload.locale)}`);
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
    case 'i18n:add-lang': {
      const code = assertSafeLocale(payload.code);
      const args = [binScript('add-language.mjs'), code];
      if (payload.dir && ['ltr', 'rtl'].includes(payload.dir)) args.push(`--dir=${payload.dir}`);
      if (payload.name) args.push(`--name=${String(payload.name)}`);
      if (payload.htmlLang) args.push(`--html-lang=${String(payload.htmlLang)}`);
      if (payload.fontFamily) args.push(`--font=${String(payload.fontFamily)}`);
      args.push('--compile');
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
      const key = String(payload.key ?? '').trim();
      if (!SAFE_I18N_KEY_RE.test(key)) {
        throw new Error('Invalid message key (use alphanumeric + underscore, starting with a letter or _).');
      }
      const args = [binScript('i18n-add.mjs'), key];
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
  const group = assertSafeKey(payload.group, 'page group');
  const locale = assertSafeLocale(payload.locale);
  const groupDir = path.join(rootDir, 'src', 'content', 'pages', group);
  const mdxPath = path.join(groupDir, `${locale}.mdx`);
  const mdPath = path.join(groupDir, `${locale}.md`);
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
    }
    if (payload.sections.length === 0) {
      delete nextData.sections;
    } else {
      nextData.sections = payload.sections.map((s) => ({
        block: s.block,
        props: s.props && typeof s.props === 'object' && !Array.isArray(s.props) ? s.props : {},
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

  const brandDir = path.join(rootDir, 'public', 'brand');
  fs.mkdirSync(brandDir, { recursive: true });
  const prefix = variant === 'dark' ? 'logo-dark' : 'logo';
  for (const existing of fs.readdirSync(brandDir)) {
    if (existing.startsWith(`${prefix}.`)) {
      fs.rmSync(path.join(brandDir, existing), { force: true });
    }
  }
  const destFile = `${prefix}${ext}`;
  const destPath = path.join(brandDir, destFile);
  fs.writeFileSync(destPath, bytes);
  return { publicPath: `/brand/${destFile}`, file: path.relative(rootDir, destPath) };
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
      if (origUrl === '/__studio') {
        res.statusCode = 302;
        res.setHeader('Location', '/__studio/');
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
          let nextFullConfig;
          if (replaceRaw) {
            nextFullConfig = deepMergeConfig(readCoreAndClientConfig(rootDir), {});
            // Replace client overrides while preserving merged core defaults underneath
            const coreSnapshot = JSON.parse(
              fs.readFileSync(path.join(rootDir, 'app.config.json'), 'utf-8')
            );
            nextFullConfig = deepMergeConfig(coreSnapshot, partial);
          } else {
            const current = readCoreAndClientConfig(rootDir);
            nextFullConfig = deepMergeConfig(current, partial);
          }
          const sparse = writeClientConfig(nextFullConfig, { rootDir, sparse: true });
          return { ok: true, clientOverrides: sparse };
        });

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
        const cmdSpec = buildAllowListedCommand(action, body.payload ?? body, rootDir);
        const result = await withWriteLock(() => runCommandSteps(cmdSpec, rootDir));
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
