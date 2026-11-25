#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { readLocaleConfig } from './lib/locales.mjs';
import { readMergedConfig } from './lib/config.mjs';
import {
  DEFAULT_CLS_BUDGET,
  DEFAULT_JS_BUDGET_KB,
  evaluateClsMetric,
  evaluateJsBudget,
  isTrackedAppScriptUrl,
  summarizeAxeViolations,
} from './lib/qa-metrics.mjs';

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
  if (candidate !== distDir && !candidate.startsWith(distDir + path.sep)) return null;

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
          window.__qaCls = 0;
          if (typeof PerformanceObserver === 'function') {
            try {
              const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  if (!entry.hadRecentInput && typeof entry.value === 'number') {
                    window.__qaCls += entry.value;
                  }
                }
              });
              observer.observe({ type: 'layout-shift', buffered: true });
            } catch {}
          }
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
        await page.waitForTimeout(180);

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

        const perfAndDom = await page.evaluate(() => {
          const scriptResources = performance
            .getEntriesByType('resource')
            .filter((entry) => entry.initiatorType === 'script' || entry.name.endsWith('.js'))
            .map((entry) => ({
              name: entry.name,
              bytes: entry.transferSize || entry.decodedBodySize || 0,
            }));

          const imgsWithoutAlt = Array.from(document.querySelectorAll('img')).filter((img) => {
            const hidden = img.getAttribute('aria-hidden') === 'true' || img.closest('[aria-hidden="true"]');
            if (hidden) return false;
            return !img.hasAttribute('alt');
          }).length;

          const h1Count = document.querySelectorAll('h1').length;
          return {
            cls: typeof window.__qaCls === 'number' ? window.__qaCls : 0,
            scriptResources,
            imgsWithoutAlt,
            h1Count,
          };
        });

        const clsBudget = Number(process.env.QA_CLS_BUDGET) || DEFAULT_CLS_BUDGET;
        const clsEval = evaluateClsMetric(perfAndDom.cls, clsBudget);
        record(
          clsEval.ok,
          `${label}: CLS <= ${clsEval.budget}`,
          `cls=${clsEval.value}`
        );

        const jsBudgetKb = Number(process.env.QA_JS_BUDGET_KB) || DEFAULT_JS_BUDGET_KB;
        const appScriptBytes = perfAndDom.scriptResources
          .filter((entry) => isTrackedAppScriptUrl(entry.name, origin))
          .reduce((sum, entry) => sum + entry.bytes, 0);
        const jsEval = evaluateJsBudget(appScriptBytes, jsBudgetKb);
        record(
          jsEval.ok,
          `${label}: JS payload <= ${jsEval.budgetKb} KB`,
          `${jsEval.totalKb} KB`
        );

        record(
          perfAndDom.imgsWithoutAlt === 0,
          `${label}: all visible <img> tags declare alt`,
          `missing=${perfAndDom.imgsWithoutAlt}`
        );
        record(
          perfAndDom.h1Count === 1,
          `${label}: single top-level <h1> landmark`,
          `count=${perfAndDom.h1Count}`
        );

        const axeResult = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        const axeSummary = summarizeAxeViolations(axeResult.violations);
        record(
          axeSummary.ok,
          `${label}: zero critical/serious WCAG a11y violations`,
          axeSummary.summaryLines.join(' | ')
        );

        await context.close();
      }
    }
  }

  // Interactive flows (Search modal, Mobile Drawer, QuickContact vs CookieConsent, ImageGallery lightbox)
  {
    // 1. Desktop Search modal open & close
    const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktopPage = await desktopCtx.newPage();
    await desktopPage.goto(`${origin}/`, { waitUntil: 'load' });
    await desktopPage.waitForTimeout(150);

    const searchBtn = desktopPage.locator('[data-open-search]').first();
    if ((await searchBtn.count()) > 0 && (await searchBtn.isVisible())) {
      await searchBtn.click();
      await desktopPage.waitForTimeout(80);
      const modalOpen = await desktopPage.evaluate(() =>
        Boolean(document.querySelector('[data-search-modal][open]'))
      );
      record(modalOpen, 'Interactive: desktop Search modal opens on trigger click');
      if (modalOpen) {
        await desktopPage.locator('#search-close-btn').click();
        await desktopPage.waitForTimeout(80);
        const modalClosed = await desktopPage.evaluate(
          () => !document.querySelector('[data-search-modal][open]')
        );
        record(modalClosed, 'Interactive: desktop Search modal closes cleanly');
      }
    }
    await desktopCtx.close();

    // 2. Mobile Drawer open/close + QuickContact vs CookieConsent behavior
    const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto(`${origin}/`, { waitUntil: 'load' });
    await mobilePage.waitForTimeout(150);

    const menuBtn = mobilePage.locator('[data-mobile-menu-btn]').first();
    if ((await menuBtn.count()) > 0 && (await menuBtn.isVisible())) {
      await menuBtn.click();
      await mobilePage.waitForTimeout(120);
      const drawerOpen = await mobilePage.evaluate(() =>
        Boolean(document.querySelector('[data-mobile-menu].is-open'))
      );
      record(drawerOpen, 'Interactive: mobile drawer opens with .is-open');
      if (drawerOpen) {
        await mobilePage.locator('[data-close-menu]').first().click();
        await mobilePage.waitForTimeout(120);
        const drawerClosed = await mobilePage.evaluate(
          () => !document.querySelector('[data-mobile-menu].is-open')
        );
        record(drawerClosed, 'Interactive: mobile drawer closes cleanly');
      }
    }

    const hasQuickWidget = (await mobilePage.locator('[data-quick-contact-widget]').count()) > 0;
    const hasCookieBanner = (await mobilePage.locator('[data-cookie-banner]').count()) > 0;
    if (hasQuickWidget && hasCookieBanner) {
      const hiddenWhileUndecided = await mobilePage.evaluate(() => {
        const banner = document.querySelector('[data-cookie-banner]');
        const quick = document.querySelector('[data-quick-contact-widget]');
        return Boolean(banner && !banner.hasAttribute('hidden') && quick?.hasAttribute('hidden'));
      });
      record(
        hiddenWhileUndecided,
        'Interactive: QuickContactWidget stays hidden while undecided CookieConsent banner is visible'
      );

      const acceptBtn = mobilePage.locator('[data-cookie-accept-banner]').first();
      if ((await acceptBtn.count()) > 0 && (await acceptBtn.isVisible())) {
        await acceptBtn.click();
        await mobilePage.waitForTimeout(120);
        const quickVisibleAfterAccept = await mobilePage.evaluate(() => {
          const quick = document.querySelector('[data-quick-contact-widget]');
          return Boolean(quick && !quick.hasAttribute('hidden'));
        });
        record(
          quickVisibleAfterAccept,
          'Interactive: QuickContactWidget reveals once CookieConsent is decided'
        );
        if (quickVisibleAfterAccept) {
          await mobilePage.locator('[data-quick-contact-toggle]').click();
          await mobilePage.waitForTimeout(80);
          const expanded = await mobilePage.getAttribute('[data-quick-contact-toggle]', 'aria-expanded');
          record(expanded === 'true', 'Interactive: QuickContactWidget expands channels on click');
          await mobilePage.locator('[data-quick-contact-toggle]').click();
        }
      }
    }
    await mobileCtx.close();

    // 3. ImageGallerySection multi-slide lightbox (when /components/ is built)
    if (resolveDistFile('/components/')) {
      const galleryCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const galleryPage = await galleryCtx.newPage();
      await galleryPage.goto(`${origin}/components/`, { waitUntil: 'load' });
      await galleryPage.waitForTimeout(150);

      const opener = galleryPage.locator('[data-gallery-open]').first();
      if ((await opener.count()) > 0) {
        await opener.scrollIntoViewIfNeeded();
        await opener.click();
        await galleryPage.waitForTimeout(100);
        const galleryState = await galleryPage.evaluate(() => {
          const dialog = document.querySelector('[data-gallery-dialog]');
          const counter = dialog?.querySelector('[data-dialog-counter]')?.textContent?.trim() || '';
          return {
            open: Boolean(dialog?.hasAttribute('open')),
            counter,
          };
        });
        record(galleryState.open, 'Interactive: ImageGallerySection lightbox dialog opens');

        const nextBtn = galleryPage.locator('[data-gallery-dialog] [data-gallery-next]').first();
        if (galleryState.open && (await nextBtn.isVisible()) && !(await nextBtn.isDisabled())) {
          const beforeCounter = galleryState.counter;
          await nextBtn.click();
          await galleryPage.waitForTimeout(80);
          const afterCounter = await galleryPage.evaluate(
            () =>
              document
                .querySelector('[data-gallery-dialog] [data-dialog-counter]')
                ?.textContent?.trim() || ''
          );
          record(
            Boolean(afterCounter && afterCounter !== beforeCounter),
            'Interactive: ImageGallerySection lightbox cycles slides cleanly',
            `${beforeCounter} -> ${afterCounter}`
          );
        }

        if (galleryState.open) {
          await galleryPage.locator('[data-gallery-dialog] [data-gallery-close]').first().click();
          await galleryPage.waitForTimeout(80);
          const dialogClosed = await galleryPage.evaluate(
            () => !document.querySelector('[data-gallery-dialog][open]')
          );
          record(dialogClosed, 'Interactive: ImageGallerySection lightbox closes cleanly');
        }
      }
      await galleryCtx.close();
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
