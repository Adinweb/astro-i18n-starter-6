import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStudioHandler } from '../../../scripts/lib/studio-api.mjs';
import { findUnsafeSvgReason, isSafeSvg } from '../../../scripts/lib/svg-sanitize.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');

function copyDirRecursive(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createSandbox(tmpRoot: string) {
  fs.copyFileSync(path.join(repoRoot, 'app.config.json'), path.join(tmpRoot, 'app.config.json'));
  fs.copyFileSync(path.join(repoRoot, '.pages.yml'), path.join(tmpRoot, '.pages.yml'));
  fs.copyFileSync(path.join(repoRoot, 'package.json'), path.join(tmpRoot, 'package.json'));
  if (fs.existsSync(path.join(repoRoot, 'metadata.json'))) {
    fs.copyFileSync(path.join(repoRoot, 'metadata.json'), path.join(tmpRoot, 'metadata.json'));
  }

  const nmSrc = path.join(repoRoot, 'node_modules');
  const nmDest = path.join(tmpRoot, 'node_modules');
  if (fs.existsSync(nmSrc) && !fs.existsSync(nmDest)) {
    fs.symlinkSync(nmSrc, nmDest, 'dir');
  }

  copyDirRecursive(path.join(repoRoot, 'client'), path.join(tmpRoot, 'client'));
  copyDirRecursive(path.join(repoRoot, 'messages'), path.join(tmpRoot, 'messages'));
  copyDirRecursive(path.join(repoRoot, 'src/content/pages/home'), path.join(tmpRoot, 'src/content/pages/home'));
  if (fs.existsSync(path.join(repoRoot, 'src/content/blog'))) {
    copyDirRecursive(path.join(repoRoot, 'src/content/blog'), path.join(tmpRoot, 'src/content/blog'));
  }
  fs.mkdirSync(path.join(tmpRoot, 'src/components'), { recursive: true });
  copyDirRecursive(path.join(repoRoot, 'src/components'), path.join(tmpRoot, 'src/components'));
  copyDirRecursive(path.join(repoRoot, 'scripts'), path.join(tmpRoot, 'scripts'));
}

async function invokeStudio(
  handler: ReturnType<typeof createStudioHandler>,
  {
    method = 'GET',
    url = '/',
    originalUrl,
    headers: reqHeaders,
    body,
  }: {
    method?: string;
    url?: string;
    originalUrl?: string;
    headers?: Record<string, string>;
    body?: unknown;
  }
) {
  const req = new EventEmitter() as EventEmitter & {
    method: string;
    url: string;
    originalUrl?: string;
    headers?: Record<string, string>;
    destroy: () => void;
  };
  req.method = method;
  req.url = url;
  if (originalUrl !== undefined) req.originalUrl = originalUrl;
  if (reqHeaders !== undefined) req.headers = reqHeaders;
  req.destroy = () => {};

  const headers: Record<string, string> = {};
  let rawBody = '';
  const res = {
    statusCode: 200,
    setHeader(name: string, val: string) {
      headers[name.toLowerCase()] = val;
    },
    end(chunk = '') {
      rawBody += chunk;
    },
  };

  const pending = handler(req as never, res as never);
  queueMicrotask(() => {
    if (body !== undefined) {
      const text = typeof body === 'string' ? body : JSON.stringify(body);
      req.emit('data', Buffer.from(text, 'utf-8'));
    }
    req.emit('end');
  });
  await pending;

  return {
    status: res.statusCode,
    headers,
    text: rawBody,
    json: headers['content-type']?.includes('application/json') ? JSON.parse(rawBody) : null,
  };
}

describe('Dev Studio API & UI (studio-api.mjs / studio-ui.mjs)', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-gui-'));
    createSandbox(tmpRoot);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('redirects /__studio (preserving query) to /__studio/ and serves bilingual Studio HTML UI', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const redir = await invokeStudio(handler, {
      method: 'GET',
      url: '/?tab=cms',
      originalUrl: '/__studio?tab=cms',
    });
    expect(redir.status).toBe(302);
    expect(redir.headers.location).toBe('/__studio/?tab=cms');

    const html = await invokeStudio(handler, {
      method: 'GET',
      url: '/',
      originalUrl: '/__studio/',
    });
    expect(html.status).toBe(200);
    expect(html.headers['content-type']).toContain('text/html');
    expect(html.text).toContain('Astro Starter Studio');
    expect(html.text).toContain('api/site-apply');
    expect(html.text).toContain('api/content-type-save');
    expect(html.text).toContain('api/cms-save');
    expect(html.text).toContain('api/project-meta');
  });

  it('returns enriched workspace state with projectMeta, pagesYml, messages, 29 blocks, and collections', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });
    const res = await invokeStudio(handler, { method: 'GET', url: '/api/state' });

    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(res.json.sectionBlocks).toHaveLength(29);
    expect(res.json.blueprints.catalog).toBeDefined();
    expect(res.json.locales.locales).toEqual(['en', 'fa']);
    expect(res.json.projectMeta.packageJson.name).toBeDefined();
    expect(res.json.coreAndClientConfig).toBeDefined();
    expect(res.json.pagesYml.exists).toBe(true);
    expect(res.json.messages.coreByLocale.en).toBeDefined();
    expect(res.json.pages.some((p: { group: string }) => p.group === 'home')).toBe(true);
  });

  it('updates package.json, metadata.json, and allowlisted .env keys while rejecting unsafe URLs or names', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const okRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/project-meta',
      body: {
        packageJson: {
          name: 'acme-client-web',
          version: '2.1.0',
          description: 'Acme Corp multilingual site',
          author: 'Studio Agency',
        },
        metadataJson: {
          name: 'Acme Client Portal',
          description: 'Portal description',
        },
        env: {
          SITE_URL: 'https://acme.example.com',
          PUBLIC_CONTACT_API_URL: '/api/contact',
          SECRET_BYPASS_TEST: 'should-not-write',
        },
      },
    });
    expect(okRes.status).toBe(200);
    expect(okRes.json.updatedFiles).toEqual(['package.json', 'metadata.json', '.env']);

    const pkg = JSON.parse(fs.readFileSync(path.join(tmpRoot, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('acme-client-web');
    expect(pkg.version).toBe('2.1.0');

    const envRaw = fs.readFileSync(path.join(tmpRoot, '.env'), 'utf-8');
    expect(envRaw).toContain('SITE_URL=https://acme.example.com');
    expect(envRaw).toContain('PUBLIC_CONTACT_API_URL=/api/contact');
    expect(envRaw).not.toContain('SECRET_BYPASS_TEST');

    const badPkg = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/project-meta',
      body: { packageJson: { name: 'Invalid UpperCase Name!' } },
    });
    expect(badPkg.status).toBe(400);

    const badEnv = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/project-meta',
      body: { env: { SITE_URL: 'javascript:alert(1)' } },
    });
    expect(badEnv.status).toBe(400);
  });

  it('keeps client/config.json and client/cms.json strictly isolated and validates flat business fields', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const cmsRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/cms-save',
      body: {
        cms: {
          business: { legalName: 'CMS Only Legal Co', phone: '+98211234567' },
          ui: { topBanner: { enabled: true, messageByLocale: { en: 'CMS Promo' } } },
        },
      },
    });
    expect(cmsRes.status).toBe(200);
    expect(cmsRes.json.cmsOverrides.business.legalName).toBe('CMS Only Legal Co');

    const cfgRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: {
        patch: {
          site: { name: 'Studio Verified Brand' },
          ui: { ctaPage: 'contact' },
          analytics: { ga4Id: 'G-TEST123456' },
        },
      },
    });
    expect(cfgRes.status).toBe(200);
    expect(cfgRes.json.clientOverrides.site.name).toBe('Studio Verified Brand');
    // Must NOT leak cmsOverrides into client/config.json!
    expect(cfgRes.json.clientOverrides.business?.legalName).toBeUndefined();

    const badBiz = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: { patch: { business: { address: { streetAddress: 'Nested object not allowed' } } } },
    });
    expect(badBiz.status).toBe(400);

    const resetCms = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/cms-save',
      body: { reset: true },
    });
    expect(resetCms.status).toBe(200);
    expect(resetCms.json.cmsOverrides).toEqual({});
  });

  it('creates, syncs to .pages.yml, and deletes custom schema-driven content types cleanly', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const createRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-type-save',
      body: {
        key: 'services',
        base: 'services',
        enabled: true,
        index: true,
        paginated: true,
        perPage: 6,
        labels: { en: 'Services', fa: 'خدمات' },
        card: { layout: 'grid', aspectRatio: 'video', badgeField: 'tier', badgeLimit: 2 },
        fields: [
          {
            name: 'tier',
            type: 'enum',
            options: ['starter', 'pro', 'enterprise'],
            required: true,
            showOnCard: 'badge',
            filter: { enabled: true, mode: 'single', param: 'tier' },
          },
        ],
      },
    });
    expect(createRes.status).toBe(200);
    expect(createRes.json.typeConfig.schemaDriven).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, 'src/content/services'))).toBe(true);
    const pagesYml = fs.readFileSync(path.join(tmpRoot, '.pages.yml'), 'utf-8');
    expect(pagesYml).toContain('name: services');

    const delRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-type-delete',
      body: { key: 'services', deleteFiles: true },
    });
    expect(delRes.status).toBe(200);
    expect(fs.existsSync(path.join(tmpRoot, 'src/content/services'))).toBe(false);
  }, 25000);

  it('reads, creates, and updates localized MDX entries via /api/content-entry', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    // Create missing locale entry suggestion
    const getMissing = await invokeStudio(handler, {
      method: 'GET',
      url: '/api/content-entry?collection=pages&group=home&locale=de',
    });
    expect(getMissing.status).toBe(200);
    expect(getMissing.json.exists).toBe(false);
    expect(getMissing.json.frontmatter.slug).toBe('');

    // Save updated English home MDX
    const saveRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-entry',
      body: {
        collection: 'pages',
        group: 'home',
        locale: 'en',
        frontmatter: {
          title: 'Updated Home Title',
          slug: '',
          draft: false,
          hero: 'none',
          container: 'canvas',
        },
        body: '## Studio Updated Content\n\nClean static MDX.',
      },
    });
    expect(saveRes.status).toBe(200);
    const savedRaw = fs.readFileSync(path.join(tmpRoot, 'src/content/pages/home/en.mdx'), 'utf-8');
    expect(savedRaw).toContain('Updated Home Title');
    expect(savedRaw).toContain('## Studio Updated Content');

    const secRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/page-sections',
      body: {
        group: 'home',
        locale: 'en',
        hero: 'none',
        container: 'canvas',
        flushTop: true,
        sections: [{ block: 'LandingHeroSplit', props: { titleLead: 'Studio Built' } }],
      },
    });
    expect(secRes.status).toBe(200);
    expect(secRes.json.data.sections).toHaveLength(1);
    expect(secRes.json.data.sections[0].block).toBe('LandingHeroSplit');

    // Reject path traversal
    const badPath = await invokeStudio(handler, {
      method: 'GET',
      url: '/api/content-entry?collection=pages&group=../secret&locale=en',
    });
    expect(badPath.status).toBe(400);
  });

  it('updates locale metadata, compiles translation dictionary updates, and runs fixed i18n:add CLI', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const lmRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/locale-meta',
      body: { locale: 'fa', name: 'فارسی (ایران)', dir: 'rtl', htmlLang: 'fa-IR' },
    });
    expect(lmRes.status).toBe(200);
    expect(lmRes.json.meta.htmlLang).toBe('fa-IR');

    const cliAdd = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/run-cli',
      body: {
        action: 'i18n:add',
        payload: { category: 'custom', key: 'banner_note', translations: { en: 'Hello', fa: 'سلام' } },
      },
    });
    expect(cliAdd.status).toBe(200);

    const msgSave = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/messages-save',
      body: {
        updatesByLocale: { en: { custom_banner_note: 'Updated Hello' } },
      },
    });
    expect(msgSave.status).toBe(200);
    const enClient = JSON.parse(fs.readFileSync(path.join(tmpRoot, 'client/messages/en.json'), 'utf-8'));
    expect(enClient.custom_banner_note).toBe('Updated Hello');
  }, 30000);

  it('uploads safe SVG logos, rejects SVG XSS scripts, and rejects disallowed CLI/traversal actions', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const svgB64 = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>').toString('base64');
    const logoRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/upload-logo',
      body: { variant: 'light', dataUrl: `data:image/svg+xml;base64,${svgB64}` },
    });
    expect(logoRes.status).toBe(200);
    expect(logoRes.json.publicPath).toBe('/brand/logo.svg');
    expect(fs.existsSync(path.join(tmpRoot, 'public/brand/logo.svg'))).toBe(true);

    const xssSvgB64 = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
    const badSvgRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/upload-logo',
      body: { variant: 'light', dataUrl: `data:image/svg+xml;base64,${xssSvgB64}` },
    });
    expect(badSvgRes.status).toBe(400);

    const badAction = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/run-cli',
      body: { action: 'rm -rf /' },
    });
    expect(badAction.status).toBe(400);
    expect(badAction.json.ok).toBe(false);

    const badKey = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/run-cli',
      body: { action: 'new:page', payload: { group: '../escape' } },
    });
    expect(badKey.status).toBe(400);
    expect(badKey.json.ok).toBe(false);
  });

  it('supports site:apply dry-run and full execution through /api/site-apply', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });
    const spec = {
      blueprint: 'catalog',
      site: { name: 'Bazar Tech', description: 'Modern hardware shop' },
      brand: { preset: 'amber' },
      pages: {
        about: {
          publish: true,
          nav: { icon: 'info' },
          locales: {
            en: { title: 'About Us', slug: 'about', draft: false },
            fa: { title: 'درباره ما', slug: 'درباره-ما', draft: false },
          },
        },
      },
    };

    const dry = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/site-apply',
      body: { spec, dryRun: true, skipAssets: true },
    });
    expect(dry.status).toBe(200);
    expect(dry.json.dryRun).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, 'src/content/pages/about/en.mdx'))).toBe(false);

    const applied = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/site-apply',
      body: { spec, dryRun: false, skipAssets: true },
    });
    expect(applied.status).toBe(200);
    expect(applied.json.ok).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, 'src/content/pages/about/en.mdx'))).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, 'src/content/products'))).toBe(true);
  }, 20000);

  it('serves syntactically valid Studio JS using spec.locale and spec.ui.homeSections', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });
    const html = await invokeStudio(handler, {
      method: 'GET',
      url: '/',
      originalUrl: '/__studio/',
    });
    expect(html.status).toBe(200);
    const match = html.text.match(/<script>([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    expect(() => new Function(match![1])).not.toThrow();
    const wizFn = match![1].slice(
      match![1].indexOf('function buildWizardSpec()'),
      match![1].indexOf('function updateChrome()')
    );
    expect(wizFn).toContain('locale: {');
    expect(wizFn).not.toContain('locales: {');
    expect(wizFn).toContain('spec.ui = { homeSections: wizardDraft.homeSections }');
    expect(match![1]).toContain("'content:new'");
  });

  it('forwards --slug:<locale> cleanly in new:page, new:post, and content:new and populates schema defaults', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const pageRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/run-cli',
      body: {
        action: 'new:page',
        payload: { group: 'careers', title: 'Careers', slug: 'join-us', locale: 'en', publish: true },
      },
    });
    expect(pageRes.status).toBe(200);
    const careersEn = fs.readFileSync(path.join(tmpRoot, 'src/content/pages/careers/en.mdx'), 'utf-8');
    expect(careersEn).toMatch(/slug:\s*["']?join-us["']?/);

    const postRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/run-cli',
      body: {
        action: 'new:post',
        payload: { group: 'launch-note', title: 'Launch', slug: 'custom-launch', locale: 'en', publish: true },
      },
    });
    expect(postRes.status).toBe(200);
    const postEn = fs.readFileSync(path.join(tmpRoot, 'src/content/blog/launch-note/en.mdx'), 'utf-8');
    expect(postEn).toMatch(/slug:\s*["']?custom-launch["']?/);

    const ctRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-type-save',
      body: {
        key: 'catalogs',
        base: 'catalogs',
        enabled: true,
        index: true,
        fields: [
          { name: 'tier', type: 'enum', options: ['basic', 'pro'], default: 'pro', required: true },
          { name: 'seats', type: 'number', default: '25', required: true },
          { name: 'featured', type: 'boolean', default: 'true', required: false },
        ],
      },
    });
    expect(ctRes.status).toBe(200);
    expect(ctRes.json.typeConfig.fields[1].default).toBe(25);
    expect(ctRes.json.typeConfig.fields[2].default).toBe(true);

    const entryCli = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/run-cli',
      body: {
        action: 'content:new',
        payload: {
          type: 'catalogs',
          group: 'enterprise-pack',
          title: 'Enterprise Pack',
          slug: 'enterprise-slug',
          desc: 'Custom package description',
          locale: 'en',
          publish: true,
        },
      },
    });
    expect(entryCli.status).toBe(200);
    const catEn = fs.readFileSync(path.join(tmpRoot, 'src/content/catalogs/enterprise-pack/en.mdx'), 'utf-8');
    expect(catEn).toMatch(/slug:\s*["']?enterprise-slug["']?/);
    expect(catEn).toMatch(/tier:\s*["']?pro["']?/);

    const missingDe = await invokeStudio(handler, {
      method: 'GET',
      url: '/api/content-entry?collection=catalogs&group=enterprise-pack&locale=de',
    });
    expect(missingDe.status).toBe(200);
    expect(missingDe.json.exists).toBe(false);
    expect(missingDe.json.frontmatter.tier).toBe('pro');
    expect(missingDe.json.frontmatter.seats).toBe(25);
  }, 30000);

  it('cleans empty optional navigation/banner fields and coerces CMS redirect/banner numeric types', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const cfgRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: {
        patch: {
          site: { authors: { ali: { name: 'Ali' } } },
          ui: {
            navigation: {
              pages: [{ group: 'about', icon: '' }],
              footerColumns: [{ key: 'links', items: [{ group: '', href: '/custom/', label: 'Custom' }] }],
            },
            topBanner: {
              enabled: true,
              id: 'promo-1',
              icon: '',
              startsAt: '',
              endsAt: '',
              dismissTtlDays: '',
              dismissVersion: 2,
            },
          },
          redirects: [{ from: '/old-a', to: '/about/', status: '302' }],
        },
      },
    });
    expect(cfgRes.status).toBe(200);
    expect(cfgRes.json.clientOverrides.ui.navigation.pages[0].icon).toBeUndefined();
    expect(cfgRes.json.clientOverrides.ui.navigation.footerColumns[0].items[0].group).toBeUndefined();
    expect(cfgRes.json.clientOverrides.redirects[0].status).toBe(302);

    const badAuthor = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: { patch: { site: { authors: { emptyAuth: { name: '' } } } } },
    });
    expect(badAuthor.status).toBe(400);

    const cmsRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/cms-save',
      body: {
        cms: {
          business: { geo: { lat: '35.6892', lng: '51.3890' } },
          ui: { topBanner: { enabled: false, dismissTtlDays: '14', dismissVersion: '3' } },
          redirects: [{ from: '/legacy', to: '/', status: '301' }],
        },
      },
    });
    expect(cmsRes.status).toBe(200);
    expect(cmsRes.json.cmsOverrides.ui.topBanner.enabled).toBe(false);
    expect(cmsRes.json.cmsOverrides.ui.topBanner.dismissTtlDays).toBe(14);
    expect(cmsRes.json.cmsOverrides.ui.topBanner.dismissVersion).toBe(3);
    expect(cmsRes.json.cmsOverrides.business.geo).toEqual({ lat: 35.6892, lng: 51.389 });
    expect(cmsRes.json.cmsOverrides.redirects[0].status).toBe(301);
  });

  it('supports replace:true deletion in config-save while preserving content.types and enforcing strict schema rules', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    // Seed a content type + two authors + localized names first
    await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-type-save',
      body: {
        key: 'services',
        base: 'services',
        enabled: true,
        index: true,
        fields: [{ name: 'price', type: 'number', min: 10, max: 500, required: true }],
      },
    });
    const seeded = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: {
        patch: {
          site: {
            localizedNames: { en: 'Acme EN', de: 'Acme DE' },
            authors: { a1: { name: 'Alice' }, a2: { name: 'Bob' } },
          },
        },
      },
    });
    expect(seeded.status).toBe(200);

    // Replace config without author a2 and without empty localizedName de, omitting content -> preserves content.types!
    const replaced = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: {
        replace: true,
        patch: {
          brand: {
            themeColor: '#123456',
            backgroundColor: '#ffffff',
            socialCardMode: 'default',
          },
          site: {
            localizedNames: { en: 'Acme EN', de: '' },
            authors: { a1: { name: 'Alice' } },
          },
        },
      },
    });
    expect(replaced.status).toBe(200);
    expect(replaced.json.clientOverrides.site.authors.a2).toBeUndefined();
    expect(replaced.json.clientOverrides.site.localizedNames?.de).toBeUndefined();
    expect(replaced.json.clientOverrides.brand.socialCardMode).toBe('default');
    expect(replaced.json.clientOverrides.content?.types?.services).toBeDefined();

    // Reject invalid config values matching src/libs/config/app.ts
    const badConfigs = [
      { brand: { themeColor: '' } },
      { brand: { backgroundColor: 'not-hex' } },
      { brand: { socialCardMode: 'invalid-mode' } },
      { ui: { navbar: { initialTopOffset: 999 } } },
      { ui: { motion: { revealDurationMs: 50 } } },
      { business: { geo: { lat: 120, lng: 50 } } },
      { ui: { topBanner: { startsAt: '2026-05-01T00:00:00Z', endsAt: '2026-04-01T00:00:00Z' } } },
      { ui: { topBanner: { items: [{ id: 'p', ctaHref: 'javascript:alert(1)' }] } } },
      { ui: { quickContact: { channels: ['telegram', 'icq'] } } },
      { social: { github: 'notaurl' } },
    ];
    for (const patch of badConfigs) {
      const res = await invokeStudio(handler, {
        method: 'POST',
        url: '/api/config-save',
        body: { patch },
      });
      expect(res.status).toBe(400);
    }
  });

  it('enforces custom field bounds/options on content-type-save and content-entry', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const badCt = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-type-save',
      body: {
        key: 'badtype',
        base: 'badtype',
        fields: [{ name: 'score', type: 'number', min: 100, max: 10 }],
      },
    });
    expect(badCt.status).toBe(400);

    const badEnum = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-type-save',
      body: {
        key: 'badtype',
        base: 'badtype',
        fields: [{ name: 'tier', type: 'enum', options: ['a', 'b'], default: 'c' }],
      },
    });
    expect(badEnum.status).toBe(400);

    const goodCt = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-type-save',
      body: {
        key: 'offers',
        base: 'offers',
        enabled: true,
        index: true,
        card: { layout: 'grid', badgeLimit: 2 },
        search: { enabled: true, fields: ['title'], placeholder: { en: 'Search offers...' } },
        fields: [
          {
            name: 'discount',
            type: 'number',
            min: 0,
            max: 100,
            required: true,
            filter: { enabled: true, mode: 'multi', labels: { en: 'Discount' }, allLabel: { en: 'All' } },
          },
          { name: 'deadline', type: 'date', required: false },
          { name: 'externalUrl', type: 'url', required: false },
        ],
      },
    });
    expect(goodCt.status).toBe(200);
    expect(goodCt.json.typeConfig.fields[0].min).toBe(0);
    expect(goodCt.json.typeConfig.fields[0].max).toBe(100);
    expect(goodCt.json.typeConfig.search.placeholder.en).toBe('Search offers...');

    // Missing required custom field
    const missingReq = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-entry',
      body: {
        collection: 'offers',
        group: 'spring-sale',
        locale: 'en',
        frontmatter: { title: 'Spring Sale', slug: 'spring-sale', draft: false },
        body: 'Details',
      },
    });
    expect(missingReq.status).toBe(400);

    // Out-of-bounds number field
    const outOfRange = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-entry',
      body: {
        collection: 'offers',
        group: 'spring-sale',
        locale: 'en',
        frontmatter: { title: 'Spring Sale', slug: 'spring-sale', discount: 150 },
        body: 'Details',
      },
    });
    expect(outOfRange.status).toBe(400);

    // Invalid URL & invalid date
    const badDate = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-entry',
      body: {
        collection: 'offers',
        group: 'spring-sale',
        locale: 'en',
        frontmatter: { title: 'Spring Sale', slug: 'spring-sale', discount: 0, deadline: 'not-a-date' },
        body: 'Details',
      },
    });
    expect(badDate.status).toBe(400);

    // Valid numeric 0 passes required + min:0 check
    const validZero = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-entry',
      body: {
        collection: 'offers',
        group: 'spring-sale',
        locale: 'en',
        frontmatter: {
          title: 'Spring Sale',
          slug: 'spring-sale',
          discount: 0,
          deadline: '2026-12-31',
          externalUrl: 'https://example.com/offer',
        },
        body: 'Details',
      },
    });
    expect(validZero.status).toBe(200);
  });

  it('serves updated Studio UI with valid JS, accurate palette swatches, block surfaces, and replace:true', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });
    const stateRes = await invokeStudio(handler, { method: 'GET', url: '/api/state' });
    expect(stateRes.status).toBe(200);
    expect(Array.isArray(stateRes.json.registeredTemplates)).toBe(true);
    expect(stateRes.json.sectionBlocks.some((b: any) => b.name === 'FaqAccordion' && Array.isArray(b.props))).toBe(true);

    const html = await invokeStudio(handler, { method: 'GET', url: '/', originalUrl: '/__studio/' });
    expect(html.status).toBe(200);
    const script = html.text.match(/<script>([\s\S]*?)<\/script>/)![1];
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('p.primary');
    expect(script).not.toContain('p.themeColor');
    expect(script).toContain('replace: true');
    expect(script).toContain('skipAssets: Boolean(wizardDraft.skipAssets)');
    expect(script).toContain('registeredTemplates');
    expect(script).toContain("['default', 'surface', 'subtle']");
    expect(html.text).toContain('ui-health-badge');
    expect(script).toContain('api/health');
    expect(script).toContain('requireConsent');
  });

  it('computes live workspace health diagnostics via GET /api/health', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });
    const healthRes = await invokeStudio(handler, { method: 'GET', url: '/api/health' });
    expect(healthRes.status).toBe(200);
    expect(healthRes.json.ok).toBe(true);
    expect(['ok', 'warn', 'error']).toContain(healthRes.json.status);
    expect(healthRes.json.summary).toBeDefined();
    expect(typeof healthRes.json.summary.errors).toBe('number');
    expect(typeof healthRes.json.summary.warnings).toBe('number');
    expect(typeof healthRes.json.summary.passed).toBe('number');
    expect(Array.isArray(healthRes.json.checks)).toBe(true);
    expect(healthRes.json.checks.length).toBeGreaterThan(0);
    expect(
      healthRes.json.checks.every(
        (c: { level: string; message: string; tab: string }) =>
          ['ok', 'warn', 'error'].includes(c.level) && typeof c.message === 'string' && typeof c.tab === 'string'
      )
    ).toBe(true);
    expect(healthRes.json.checks.some((c: { tab: string }) => c.tab === 'i18n')).toBe(true);
  });

  it('supports tree menus with unique IDs, dropdown/list display modes, slots, and transient cleanup in Studio API & UI', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const stateRes = await invokeStudio(handler, { method: 'GET', url: '/api/state' });
    expect(stateRes.status).toBe(200);
    expect(Array.isArray(stateRes.json.availableIcons)).toBe(true);
    expect(stateRes.json.availableIcons).toContain('home');

    const html = await invokeStudio(handler, { method: 'GET', url: '/', originalUrl: '/__studio/' });
    expect(html.status).toBe(200);
    const script = html.text.match(/<script>([\s\S]*?)<\/script>/)![1];
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('resolveMenuNodeRef');
    expect(script).toContain('ui.navigation.menus');
    expect(script).toContain('ui.navigation.slots');
    expect(script).toContain('headerDisplayMode');
    expect(script).toContain('drawerDisplayMode');
    expect(script).toContain('footerDisplayMode');
    expect(script).toContain('data-slot-footer-mode');
    expect(script).toContain('data-menu-copy-mode');
    expect(script).toContain('<NavMenu menuId=');

    const saveRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: {
        patch: {
          ui: {
            navigation: {
              menus: [
                {
                  id: 'main-nav',
                  title: 'Main Nav',
                  titles: { en: 'Main Nav', fa: 'منوی اصلی' },
                  displayMode: 'dropdown',
                  items: [
                    { group: 'home', icon: 'home', _targetType: 'group' },
                    {
                      id: 'products',
                      label: 'Products',
                      _targetType: 'branch',
                      childrenDisplay: 'list',
                      children: [
                        {
                          href: '/blog/',
                          label: 'Blog Updates',
                          _targetType: 'href',
                          childrenDisplay: 'inherit',
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'company-nav',
                  title: 'Company Nav',
                  displayMode: 'list',
                  items: [{ group: 'about' }],
                },
              ],
              slots: {
                header: 'main-nav',
                headerDisplayMode: 'dropdown',
                drawer: 'main-nav',
                drawerDisplayMode: 'list',
                footer: [
                  { id: 'main-nav', displayMode: 'list' },
                  { id: 'company-nav', displayMode: 'inherit' },
                ],
                footerMode: 'replace',
                footerDisplayMode: 'inherit',
              },
            },
          },
        },
      },
    });
    expect(saveRes.status).toBe(200);
    const savedMenus = saveRes.json.clientOverrides.ui.navigation.menus;
    expect(savedMenus).toHaveLength(2);
    expect(savedMenus[0].id).toBe('main-nav');
    expect(savedMenus[0].items[0]._targetType).toBeUndefined();
    expect(savedMenus[0].items[1].childrenDisplay).toBe('list');
    expect(savedMenus[0].items[1].children[0].childrenDisplay).toBeUndefined();
    expect(saveRes.json.clientOverrides.ui.navigation.slots).toEqual({
      header: 'main-nav',
      headerDisplayMode: 'dropdown',
      drawer: 'main-nav',
      drawerDisplayMode: 'list',
      footer: [{ id: 'main-nav', displayMode: 'list' }, 'company-nav'],
      footerMode: 'replace',
    });

    // Reject invalid slot displayMode
    const badSlotMode = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: {
        patch: {
          ui: {
            navigation: {
              slots: {
                headerDisplayMode: 'mega-grid',
              },
            },
          },
        },
      },
    });
    expect(badSlotMode.status).toBe(400);

    // Reject duplicate menu IDs
    const dupRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: {
        patch: {
          ui: {
            navigation: {
              menus: [
                { id: 'dup-id', items: [{ group: 'home' }] },
                { id: 'dup-id', items: [{ href: '/about/' }] },
              ],
            },
          },
        },
      },
    });
    expect(dupRes.status).toBe(400);

    // Reject unsafe protocol href in nested child
    const unsafeRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: {
        patch: {
          ui: {
            navigation: {
              menus: [
                {
                  id: 'xss-test',
                  items: [{ id: 'root', label: 'Root', children: [{ href: 'javascript:alert(1)' }] }],
                },
              ],
            },
          },
        },
      },
    });
    expect(unsafeRes.status).toBe(400);
  });

  it('lists assets, serves confined asset previews safely, and sanitizes uploaded assets', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    // Upload a tiny 1x1 PNG
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const uploadPng = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/upload-asset',
      body: { filename: 'Hero Banner!.png', dataUrl: `data:image/png;base64,${pngBase64}` },
    });
    expect(uploadPng.status).toBe(200);
    expect(uploadPng.json.assetPath).toBe('src/assets/uploads/hero-banner.png');
    expect(uploadPng.json.publicPath).toBe('src/assets/uploads/hero-banner.png');
    expect(fs.existsSync(path.join(tmpRoot, 'src/assets/uploads/hero-banner.png'))).toBe(true);

    // Upload safe SVG
    const svgClean = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/></svg>').toString('base64');
    const uploadSvg = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/upload-asset',
      body: { filename: 'badge.svg', dataUrl: `data:image/svg+xml;base64,${svgClean}` },
    });
    expect(uploadSvg.status).toBe(200);
    expect(uploadSvg.json.assetPath).toBe('src/assets/uploads/badge.svg');
    expect(uploadSvg.json.publicPath).toBe('src/assets/uploads/badge.svg');

    // Reject malicious SVG with <script>
    const svgXss = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
    const badSvg = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/upload-asset',
      body: { filename: 'evil.svg', dataUrl: `data:image/svg+xml;base64,${svgXss}` },
    });
    expect(badSvg.status).toBe(400);

    // List assets
    const listRes = await invokeStudio(handler, { method: 'GET', url: '/api/assets' });
    expect(listRes.status).toBe(200);
    expect(listRes.json.assets.some((a: { path: string }) => a.path === 'src/assets/uploads/hero-banner.png')).toBe(true);
    expect(listRes.json.assets.some((a: { path: string }) => a.path === 'src/assets/uploads/badge.svg')).toBe(true);

    // Preview SVG & PNG
    const prevSvg = await invokeStudio(handler, {
      method: 'GET',
      url: '/api/asset-preview?path=src%2Fassets%2Fuploads%2Fbadge.svg',
    });
    expect(prevSvg.status).toBe(200);
    expect(prevSvg.text).toContain('<circle');

    // Reject path traversal
    const traversal = await invokeStudio(handler, {
      method: 'GET',
      url: '/api/asset-preview?path=%2F..%2Fpackage.json',
    });
    expect(traversal.status).toBe(400);
  });

  it('exports/imports portable client bundles and exposes upgraded Studio UI tools cleanly', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const expRes = await invokeStudio(handler, { method: 'GET', url: '/api/client-bundle' });
    expect(expRes.status).toBe(200);
    expect(expRes.json.bundle.locales).toBeDefined();
    expect(expRes.json.bundle.config).toBeDefined();
    expect(expRes.json.bundle.cms).toBeDefined();
    expect(expRes.json.bundle.messages).toBeDefined();

    const importedBundle = {
      ...expRes.json.bundle,
      config: {
        ...expRes.json.bundle.config,
        site: { ...(expRes.json.bundle.config.site || {}), shortName: 'BundleBrand' },
      },
      cms: {
        ...expRes.json.bundle.cms,
        business: { ...((expRes.json.bundle.cms || {}).business || {}), phone: '+1-555-0199' },
      },
      messages: {
        ...expRes.json.bundle.messages,
        en: { ...(expRes.json.bundle.messages.en || {}), custom_bundle_key: 'Imported Text' },
      },
    };
    const impRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/client-bundle',
      body: { bundle: importedBundle },
    });
    expect(impRes.status).toBe(200);
    expect(impRes.json.ok).toBe(true);

    const stateAfter = await invokeStudio(handler, { method: 'GET', url: '/api/state' });
    expect(stateAfter.json.config.site.shortName).toBe('BundleBrand');
    expect(stateAfter.json.cmsOverrides.business.phone).toBe('+1-555-0199');
    expect(stateAfter.json.messages.clientByLocale.en.custom_bundle_key).toBe('Imported Text');

    // Reject invalid bundle payload
    const badBundle = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/client-bundle',
      body: {
        bundle: {
          locales: { defaultLocale: 'xx', locales: ['en'] },
        },
      },
    });
    expect(badBundle.status).toBe(400);

    // Check upgraded Studio HTML/JS parses and contains new productivity controls
    const html = await invokeStudio(handler, { method: 'GET', url: '/', originalUrl: '/__studio/' });
    expect(html.status).toBe(200);
    expect(html.text).toContain('preview-iframe');
    expect(html.text).toContain('btn-media');
    const script = html.text.match(/<script>([\s\S]*?)<\/script>/)![1];
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('hasAnyDirty');
    expect(script).toContain('data-menu-collapse');
    expect(script).toContain('data-pick-icon');
    expect(script).toContain('data-pick-asset');
    expect(script).toContain('menuJson');
    expect(script).toContain('clientBundle');
    expect(script).toContain('toggle-entry-ref');
    expect(script).toContain('toggle-entry-preview');
    expect(script).toContain('data-cli="preflight"');
    expect(script).toContain('X-Studio-Token');
  });

  it('enforces Studio HTTP Origin, Sec-Fetch-Site, Content-Type, CSRF token, aistudio asset exclusion, and deep SVG sanitization', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    // Exclude public/assets/aistudio from listed Studio assets
    const aistudioDir = path.join(tmpRoot, 'public', 'assets', 'aistudio');
    fs.mkdirSync(aistudioDir, { recursive: true });
    fs.writeFileSync(path.join(aistudioDir, 'scratch.png'), Buffer.from('fake'));
    const assetsRes = await invokeStudio(handler, { method: 'GET', url: '/api/assets' });
    expect(assetsRes.status).toBe(200);
    expect(
      assetsRes.json.assets.some((a: { path: string }) => a.path.includes('/assets/aistudio/'))
    ).toBe(false);

    // Extract CSRF token from rendered Studio HTML
    const uiRes = await invokeStudio(handler, {
      method: 'GET',
      url: '/',
      originalUrl: '/__studio/',
      headers: { host: 'localhost:3000', 'sec-fetch-site': 'same-origin' },
    });
    expect(uiRes.status).toBe(200);
    const bootMatch = uiRes.text.match(/const BOOT = (\{[^;\n]+\});/);
    expect(bootMatch).not.toBeNull();
    const bootJson = JSON.parse(bootMatch![1]);
    expect(typeof bootJson.csrfToken).toBe('string');
    expect(bootJson.csrfToken.length).toBeGreaterThanOrEqual(32);

    // Reject cross-site Sec-Fetch-Site
    const crossSite = await invokeStudio(handler, {
      method: 'GET',
      url: '/api/state',
      headers: { host: 'localhost:3000', 'sec-fetch-site': 'cross-site' },
    });
    expect(crossSite.status).toBe(403);

    // Reject mismatched Origin
    const badOrigin = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/cms-save',
      headers: {
        host: 'localhost:3000',
        origin: 'https://evil.example',
        'content-type': 'application/json',
        'x-studio-token': bootJson.csrfToken,
      },
      body: { reset: true },
    });
    expect(badOrigin.status).toBe(403);

    // Reject non-JSON Content-Type
    const badType = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/cms-save',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        'content-type': 'text/plain',
        'x-studio-token': bootJson.csrfToken,
      },
      body: { reset: true },
    });
    expect(badType.status).toBe(415);

    // Reject missing/wrong CSRF token
    const badToken = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/cms-save',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
        'x-studio-token': 'wrong-token',
      },
      body: { reset: true },
    });
    expect(badToken.status).toBe(403);

    // Accept valid same-origin request with CSRF token + JSON Content-Type
    const validPost = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/cms-save',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        'content-type': 'application/json',
        'x-studio-token': bootJson.csrfToken,
      },
      body: { reset: true },
    });
    expect(validPost.status).toBe(200);

    // Verify shared SVG sanitizer blocks entity obfuscation, SMIL animate, external <use>, and CSS @import
    expect(isSafeSvg('<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/></svg>')).toBe(true);
    expect(
      findUnsafeSvgReason('<svg><a href="j&#x61;vascript:alert(1)"><rect width="10" height="10"/></a></svg>')
    ).toBeTruthy();
    expect(
      findUnsafeSvgReason('<svg><animate attributeName="href" values="javascript:alert(1)"/></svg>')
    ).toBeTruthy();
    expect(
      findUnsafeSvgReason('<svg><use href="https://evil.example/sprite.svg#icon"/></svg>')
    ).toBeTruthy();
    expect(
      isSafeSvg('<svg><defs><circle id="dot" r="2"/></defs><use href="#dot"/></svg>')
    ).toBe(true);
    expect(
      findUnsafeSvgReason('<svg><style>@import url("https://evil.example/a.css");</style></svg>')
    ).toBeTruthy();
  });

  it('supports confined asset deletion under src/assets/uploads, collection templates metadata, and full social health warnings', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    // 1. Upload an SVG asset and delete it safely via /api/delete-asset
    const svgBase64 = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/></svg>').toString('base64');
    const upRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/upload-asset',
      body: { filename: 'sample-card.svg', dataUrl: `data:image/svg+xml;base64,${svgBase64}` },
    });
    expect(upRes.status).toBe(200);
    expect(upRes.json.assetPath).toBe('src/assets/uploads/sample-card.svg');
    expect(fs.existsSync(path.join(tmpRoot, 'src/assets/uploads/sample-card.svg'))).toBe(true);

    const badDel = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/delete-asset',
      body: { path: 'src/assets/uploads/../../app.config.json' },
    });
    expect(badDel.status).toBe(400);

    const nonUploadDel = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/delete-asset',
      body: { path: '/og-default.png' },
    });
    expect(nonUploadDel.status).toBe(400);

    const delRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/delete-asset',
      body: { path: 'src/assets/uploads/sample-card.svg' },
    });
    expect(delRes.status).toBe(200);
    expect(delRes.json.deleted).toBe('src/assets/uploads/sample-card.svg');
    expect(fs.existsSync(path.join(tmpRoot, 'src/assets/uploads/sample-card.svg'))).toBe(false);

    // 2. Expose CLIENT_COLLECTION_TEMPLATES keys including collection:entry style keys
    fs.writeFileSync(
      path.join(tmpRoot, 'client/templates/index.ts'),
      `export const CLIENT_PAGE_TEMPLATES = { customLanding: null };\nexport const CLIENT_COLLECTION_TEMPLATES = { 'blog:entry': null, caseStudy: null };\n`,
      'utf-8'
    );
    const stateRes = await invokeStudio(handler, { method: 'GET', url: '/api/state' });
    expect(stateRes.status).toBe(200);
    expect(stateRes.json.registeredTemplates).toEqual(['customLanding']);
    expect(stateRes.json.registeredCollectionTemplates).toEqual(['blog:entry', 'caseStudy']);

    // 3. Flag placeholder social URLs beyond github
    await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: {
        patch: {
          social: {
            github: 'https://github.com/acme-client',
            instagram: 'https://instagram.com',
            telegram: 'https://t.me/',
          },
        },
      },
    });
    const healthRes = await invokeStudio(handler, { method: 'GET', url: '/api/health' });
    expect(healthRes.status).toBe(200);
    const checkMessages = healthRes.json.checks.map((c: { message: string }) => c.message);
    expect(checkMessages.some((msg: string) => msg.includes('social.instagram'))).toBe(true);
    expect(checkMessages.some((msg: string) => msg.includes('social.telegram'))).toBe(true);
    expect(checkMessages.some((msg: string) => msg.includes('social.github'))).toBe(false);
  });

  it('exposes arraySchemas in /api/state, renders valid studio-ui script, flags section/upload/slug health issues, and scopes audit-i18n & doctor checks', async () => {
    const { execFileSync } = await import('node:child_process');
    const handler = createStudioHandler({ rootDir: tmpRoot });

    // 1. /api/state exposes AST-extracted arraySchemas
    const stateRes = await invokeStudio(handler, { method: 'GET', url: '/api/state' });
    expect(stateRes.status).toBe(200);
    const faqBlock = stateRes.json.sectionBlocks.find((b: { name: string }) => b.name === 'FaqAccordion');
    const pricingBlock = stateRes.json.sectionBlocks.find((b: { name: string }) => b.name === 'PricingSection');
    const teamBlock = stateRes.json.sectionBlocks.find((b: { name: string }) => b.name === 'TeamSection');
    expect(faqBlock?.arraySchemas?.items?.kind).toBe('object[]');
    expect(pricingBlock?.arraySchemas?.tiers?.fields?.some((f: { name: string }) => f.name === 'cta')).toBe(true);
    expect(teamBlock?.arraySchemas?.members?.fields?.find((f: { name: string }) => f.name === 'avatar')?.isImage).toBe(true);

    // 2. Studio HTML renders syntactically valid inline <script> with repeater, toolbar, preview & wizard health strip
    const uiRes = await invokeStudio(handler, { method: 'GET', url: '/' });
    expect(uiRes.status).toBe(200);
    const html = uiRes.text || '';
    const scriptMatches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
    expect(scriptMatches.length).toBeGreaterThanOrEqual(1);
    for (const m of scriptMatches) {
      expect(() => new Function(m[1])).not.toThrow();
    }
    expect(html).toContain('secItem:');
    expect(html).toContain('data-sec-arr-add');
    expect(html).toContain('parentModal');
    expect(html).toContain('data-preview-url');
    expect(html).toContain('data-mdx-fmt');
    expect(html).toContain('entry:mdx-body');
    expect(html).toContain('wiz-health-strip');

    // 3. Health diagnostics catch broken parallaxImage, unoptimized public/uploads raster, and placeholder slug
    await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: {
        patch: {
          ui: {
            homeSections: [
              { block: 'ParallaxSection', props: { title: 'Hero', parallaxImage: '/missing-parallax.jpg' } },
            ],
          },
        },
      },
    });
    fs.mkdirSync(path.join(tmpRoot, 'public/uploads'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'public/uploads/heavy-banner.png'), 'png-bytes');
    const sampleBlogDir = path.join(tmpRoot, 'src/content/blog/demo-placeholder');
    fs.mkdirSync(sampleBlogDir, { recursive: true });
    fs.writeFileSync(
      path.join(sampleBlogDir, 'en.mdx'),
      `---\ntitle: "Demo Post"\nslug: "demo-placeholder-en"\ndescription: "Desc"\npublishedAt: 2026-06-01\ndraft: false\nsections:\n  - block: TeamSection\n    props:\n      members:\n        - name: "Sara"\n          avatar: "./missing-avatar.jpg"\n---\n\nBody.\n`,
      'utf-8'
    );

    const healthRes = await invokeStudio(handler, { method: 'GET', url: '/api/health' });
    expect(healthRes.status).toBe(200);
    const msgs = healthRes.json.checks.map((c: { message: string }) => c.message);
    expect(msgs.some((m: string) => m.includes('/missing-parallax.jpg'))).toBe(true);
    expect(msgs.some((m: string) => m.includes('public/uploads/heavy-banner.png') || m.includes('public/uploads/'))).toBe(true);
    expect(msgs.some((m: string) => m.includes('demo-placeholder') || m.toLowerCase().includes('placeholder'))).toBe(true);

    // 4. doctor.mjs --json catches broken section asset in config & frontmatter
    let doctorJson: { findings?: Array<{ title: string; level: string }> } = {};
    try {
      const out = execFileSync(process.execPath, [path.join(tmpRoot, 'scripts/doctor.mjs'), '--json'], {
        cwd: tmpRoot,
        encoding: 'utf-8',
      });
      doctorJson = JSON.parse(out);
    } catch (err: any) {
      doctorJson = JSON.parse(err.stdout || '{}');
    }
    const doctorTitles = (doctorJson.findings || []).map((f) => f.title);
    expect(doctorTitles.some((t) => t.includes('/missing-parallax.jpg'))).toBe(true);
    expect(doctorTitles.some((t) => t.includes('./missing-avatar.jpg'))).toBe(true);
    expect(doctorTitles.some((t) => t.includes('public/uploads/'))).toBe(true);

    // 5. audit-i18n.mjs ignores local `m.foo()` without `paraglide/messages` import, and catches undefined `m.*()` when imported
    const cleanHelperFile = path.join(tmpRoot, 'src/local-m-var.ts');
    fs.writeFileSync(cleanHelperFile, 'export function f(m: { bogusKey(): string }) { return m.bogusKey(); }\n', 'utf-8');
    // Reset placeholder slug & missing parallax from tmpRoot so cleanHelperFile is isolated for audit-i18n run?
    // audit-i18n does NOT fail on missing-parallax or placeholder slug (those are doctor checks); remove missing-avatar blog or add missing fa.mdx? audit-i18n only warns on missing fa.mdx!
    const cleanAudit = execFileSync(process.execPath, [path.join(tmpRoot, 'scripts/audit-i18n.mjs'), '--json'], {
      cwd: tmpRoot,
      encoding: 'utf-8',
    });
    const cleanAuditJson = JSON.parse(cleanAudit);
    expect(cleanAuditJson.ok).toBe(true);
    expect(cleanAuditJson.errors.some((e: string) => e.includes('bogusKey'))).toBe(false);

    const realImportFile = path.join(tmpRoot, 'src/real-paraglide.ts');
    fs.writeFileSync(
      realImportFile,
      `import * as msgNs from './paraglide/messages';\nexport const x = msgNs.${'missing_audit_test_key'}({});\n`,
      'utf-8'
    );
    let failAuditJson: { ok?: boolean; errors?: string[] } = {};
    try {
      execFileSync(process.execPath, [path.join(tmpRoot, 'scripts/audit-i18n.mjs'), '--json'], {
        cwd: tmpRoot,
        encoding: 'utf-8',
      });
    } catch (err: any) {
      failAuditJson = JSON.parse(err.stdout || '{}');
    }
    expect(failAuditJson.ok).toBe(false);
    expect(failAuditJson.errors?.some((e) => e.includes('missing_audit_test_key'))).toBe(true);
  }, 20000);

  it('persists and strips per-entry noindex via /api/content-entry and exposes Studio noindex + Jalali helpers', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const saveNoindex = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-entry',
      body: {
        collection: 'pages',
        group: 'campaign-landing',
        locale: 'en',
        frontmatter: {
          title: 'Private Campaign',
          slug: 'campaign-landing',
          description: 'Unindexed campaign page',
          draft: false,
          noindex: true,
        },
        body: '\n# Private Campaign\n\nCampaign body.\n',
      },
    });
    expect(saveNoindex.status).toBe(200);
    const mdxPath = path.join(tmpRoot, 'src/content/pages/campaign-landing/en.mdx');
    expect(fs.readFileSync(mdxPath, 'utf-8')).toContain('noindex: true');

    const saveIndexed = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/content-entry',
      body: {
        collection: 'pages',
        group: 'campaign-landing',
        locale: 'en',
        frontmatter: {
          title: 'Public Campaign',
          slug: 'campaign-landing',
          description: 'Indexed campaign page',
          draft: false,
          noindex: false,
        },
        body: '\n# Public Campaign\n\nCampaign body.\n',
      },
    });
    expect(saveIndexed.status).toBe(200);
    expect(fs.readFileSync(mdxPath, 'utf-8')).not.toContain('noindex:');

    const uiRes = await invokeStudio(handler, { method: 'GET', url: '/' });
    expect(uiRes.status).toBe(200);
    const html = uiRes.text || '';
    expect(html).toContain('data-efm-bool="noindex"');
    expect(html).toContain('data-efm-jalali');

    const scriptMatch = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/);
    expect(scriptMatch).toBeTruthy();
    const jalaliBlockMatch = scriptMatch![1].match(
      /function normalizeDateDigits[\s\S]*?function renderJalaliHelperInput/
    );
    expect(jalaliBlockMatch).toBeTruthy();
    const fn = new Function(
      `${jalaliBlockMatch![0].replace(/function renderJalaliHelperInput$/, '')}
      return { isoToJalaliInput, jalaliToIsoDate };`
    );
    const { isoToJalaliInput, jalaliToIsoDate } = fn();
    expect(isoToJalaliInput('2025-03-20')).toBe('1403/12/30');
    expect(jalaliToIsoDate('1403/12/30')).toBe('2025-03-20');
    expect(jalaliToIsoDate('1404/12/30')).toBeNull();
    expect(jalaliToIsoDate('۱۴۰۵/۰۹/۰۶')).toBe('2026-11-27');
    expect(isoToJalaliInput('2026-11-27')).toBe('1405/09/06');
  });
});




