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

  const nmSrc = path.join(repoRoot, 'node_modules');
  const nmDest = path.join(tmpRoot, 'node_modules');
  if (fs.existsSync(nmSrc) && !fs.existsSync(nmDest)) {
    fs.symlinkSync(nmSrc, nmDest, 'dir');
  }

  copyDirRecursive(path.join(repoRoot, 'client'), path.join(tmpRoot, 'client'));
  copyDirRecursive(path.join(repoRoot, 'messages'), path.join(tmpRoot, 'messages'));
  copyDirRecursive(path.join(repoRoot, 'src/content/pages/home'), path.join(tmpRoot, 'src/content/pages/home'));
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

  it('redirects /__studio to /__studio/ and serves bilingual Studio HTML UI', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const redir = await invokeStudio(handler, {
      method: 'GET',
      url: '/',
      originalUrl: '/__studio',
    });
    expect(redir.status).toBe(302);
    expect(redir.headers.location).toBe('/__studio/');

    const html = await invokeStudio(handler, {
      method: 'GET',
      url: '/',
      originalUrl: '/__studio/',
    });
    expect(html.status).toBe(200);
    expect(html.headers['content-type']).toContain('text/html');
    expect(html.text).toContain('Astro Starter Studio');
    expect(html.text).toContain('api/site-apply');
  });

  it('returns workspace state with 29 composable blocks, blueprints, locales, and pages', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });
    const res = await invokeStudio(handler, { method: 'GET', url: '/api/state' });

    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(res.json.sectionBlocks).toHaveLength(29);
    expect(res.json.blueprints.catalog).toBeDefined();
    expect(res.json.locales.locales).toEqual(['en', 'fa']);
    expect(res.json.pages.some((p: { group: string }) => p.group === 'home')).toBe(true);
  });

  it('saves sparse config overrides and updates page sections cleanly', async () => {
    const handler = createStudioHandler({ rootDir: tmpRoot });

    const cfgRes = await invokeStudio(handler, {
      method: 'POST',
      url: '/api/config-save',
      body: {
        patch: {
          site: { name: 'Studio Verified Brand' },
          ui: { ctaPage: 'contact' },
        },
      },
    });
    expect(cfgRes.status).toBe(200);
    expect(cfgRes.json.clientOverrides.site.name).toBe('Studio Verified Brand');

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
  });

  it('uploads valid SVG logo safely and rejects disallowed CLI actions or path traversal', async () => {
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
