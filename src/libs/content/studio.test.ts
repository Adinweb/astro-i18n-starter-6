import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStudioHandler } from '../../../scripts/lib/studio-api.mjs';

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
    body,
  }: { method?: string; url?: string; originalUrl?: string; body?: unknown }
) {
  const req = new EventEmitter() as EventEmitter & {
    method: string;
    url: string;
    originalUrl?: string;
    destroy: () => void;
  };
  req.method = method;
  req.url = url;
  if (originalUrl !== undefined) req.originalUrl = originalUrl;
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
});
