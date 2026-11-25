#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { readLocaleConfig } from './lib/locales.mjs';
import { readMergedConfig } from './lib/config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found. Run "npm run build" before "npm run qa:browser".');
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

function resolveDistFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0] || '/');
  const candidate = path.resolve(distDir, `.${cleanPath}`);
  if (!candidate.startsWith(distDir)) return null;

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }
  const indexHtml = path.join(candidate, 'index.html');
  if (fs.existsSync(indexHtml) && fs.statSync(indexHtml).isFile()) {
    return indexHtml;
  }
  const htmlFile = `${candidate}.html`;
  if (fs.existsSync(htmlFile) && fs.statSync(htmlFile).isFile()) {
    return htmlFile;
  }
  return null;
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const target = resolveDistFile(req.url || '/');
      if (target) {
        const ext = path.extname(target).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        fs.createReadStream(target).pipe(res);
        return;
      }

      const notFoundPage = path.join(distDir, '404.html');
      if (fs.existsSync(notFoundPage)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(notFoundPage).pipe(res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to bind local QA server port'));
        return;
      }
      resolve({ server, origin: `http://127.0.0.1:${addr.port}` });
    });
  });
}

const localeConfig = readLocaleConfig(rootDir);
const mergedConfig = readMergedConfig(rootDir);
const defaultLocale = localeConfig.defaultLocale || 'en';
const secondaryLocale =
  localeConfig.locales.find((loc) => loc !== defaultLocale) ?? null;

const candidateRoutes = ['/'];
if (secondaryLocale) {
  candidateRoutes.push(`/${secondaryLocale}/`);
}
const blogCfg = mergedConfig.content?.types?.blog;
if (blogCfg?.enabled !== false && blogCfg?.index !== false) {
  const base = blogCfg?.base || 'blog';
  const defaultBlogPath = `/${base}/`;
  if (resolveDistFile(defaultBlogPath)) {
    candidateRoutes.push(defaultBlogPath);
  }
  if (secondaryLocale) {
    const secBlogPath = `/${secondaryLocale}/${base}/`;
    if (resolveDistFile(secBlogPath)) {
      candidateRoutes.push(secBlogPath);
    }
  }
}

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
];
const THEMES = ['light', 'dark'];

let checks = 0;
const failures = [];

function record(ok, label, detail = '') {
  checks += 1;
  if (!ok) {
    failures.push(detail ? `${label} (${detail})` : label);
    console.error(`❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log(
  `🌐 Running Playwright Layout QA across ${candidateRoutes.length} route(s), ${VIEWPORTS.length} viewports, ${THEMES.length} themes...\n`
);

const { server, origin } = await startStaticServer();
let browser;

try {
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error(
      `❌ Failed to launch Playwright Chromium (${err instanceof Error ? err.message : String(err)}). Run "npx playwright install chromium" if browser binaries are missing.`
    );
    process.exitCode = 1;
    throw err;
  }

  for (const route of candidateRoutes) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
        });
        await context.addInitScript((selectedTheme) => {
          try {
            window.localStorage.setItem('theme', selectedTheme);
          } catch {}
        }, theme);

        const page = await context.newPage();
        const runtimeErrors = [];
        page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            runtimeErrors.push(`console.error: ${msg.text()}`);
          }
        });

        await page.goto(`${origin}${route}`, { waitUntil: 'load' });
        await page.waitForTimeout(160);

        const label = `${route} [${viewport.name} ${viewport.width}x${viewport.height}, ${theme}]`;

        record(runtimeErrors.length === 0, `${label}: zero runtime errors`, runtimeErrors.join('; '));

        const topMetrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const header = document.querySelector('[data-site-header]');
          const bannerRegion = document.querySelector('[data-site-top-banner-region]');
          const visibleBanners = Array.from(
            document.querySelectorAll('[data-site-top-banner]')
          ).filter((el) => !el.hidden && el.getBoundingClientRect().height > 0);
          const cookieBanner = document.querySelector('[data-cookie-banner]');
          const quickContact = document.querySelector('[data-quick-contact-widget]');

          const headerRect = header ? header.getBoundingClientRect() : null;
          const bannerRect = bannerRegion ? bannerRegion.getBoundingClientRect() : null;
          const cookieRect =
            cookieBanner && !cookieBanner.hasAttribute('hidden') && cookieBanner.getBoundingClientRect().height > 0
              ? cookieBanner.getBoundingClientRect()
              : null;
          const quickRect =
            quickContact && !quickContact.hasAttribute('hidden') && quickContact.getBoundingClientRect().height > 0
              ? quickContact.getBoundingClientRect()
              : null;

          const rectsOverlap = (a, b) =>
            Boolean(
              a &&
                b &&
                !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)
            );

          return {
            themeAttr: docEl.dataset.theme || '',
            scrollWidth: docEl.scrollWidth,
            innerWidth: window.innerWidth,
            headerTop: headerRect ? headerRect.top : null,
            headerHeight: headerRect ? headerRect.height : null,
            bannerBottom: visibleBanners.length > 0 && bannerRect ? bannerRect.bottom : null,
            cookieAndQuickOverlap: rectsOverlap(cookieRect, quickRect),
          };
        });

        record(topMetrics.themeAttr === theme, `${label}: theme applied`, `got "${topMetrics.themeAttr}"`);
        record(
          topMetrics.scrollWidth <= topMetrics.innerWidth + 1,
          `${label}: zero horizontal overflow`,
          `scrollWidth=${topMetrics.scrollWidth} innerWidth=${topMetrics.innerWidth}`
        );

        if (topMetrics.bannerBottom !== null && topMetrics.headerTop !== null) {
          record(
            topMetrics.headerTop >= topMetrics.bannerBottom - 1,
            `${label}: header sits cleanly below top banner`,
            `headerTop=${topMetrics.headerTop} bannerBottom=${topMetrics.bannerBottom}`
          );
        }

        if (viewport.name === 'mobile' && topMetrics.headerHeight !== null) {
          record(
            topMetrics.headerHeight <= viewport.height * 0.15,
            `${label}: mobile header height <= 15% viewport`,
            `height=${topMetrics.headerHeight}`
          );
        }

        record(
          !topMetrics.cookieAndQuickOverlap,
          `${label}: quick-contact widget does not overlap cookie banner`
        );

        await page.evaluate(() => window.scrollTo(0, 260));
        await page.waitForTimeout(120);

        if (mergedConfig.ui?.stickyHeader !== false) {
          const stuckHeader = await page.evaluate(() => {
            const header = document.querySelector('[data-site-header]');
            if (!header) return null;
            const r = header.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, vh: window.innerHeight };
          });
          if (stuckHeader) {
            record(
              stuckHeader.top >= -1 && stuckHeader.bottom <= stuckHeader.vh,
              `${label}: sticky header stays visible on scroll`,
              `top=${stuckHeader.top} bottom=${stuckHeader.bottom}`
            );
          }
        }

        await context.close();
      }
    }
  }
} finally {
  await browser?.close();
  server.close();
}

console.log(`\n📊 Browser QA summary: ${checks - failures.length}/${checks} checks passed.`);
if (failures.length > 0) {
  console.error('\nFailures:');
  for (const f of failures) {
    console.error(` - ${f}`);
  }
  process.exit(1);
}
console.log('✨ Browser Layout QA passed with zero regressions!');
