#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import { resolveChromiumExecutable } from './lib/chromium.mjs';
import { readMergedConfig } from './lib/config.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { readLocaleConfig } from './lib/locales.mjs';
import {
  DEFAULT_LIGHTHOUSE_THRESHOLDS,
  evaluateLighthouseResult,
} from './lib/qa-metrics.mjs';
import { resolveDistFile, startDistStaticServer } from './lib/static-server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found. Run "npm run build" before "npm run qa:lighthouse".');
  process.exit(1);
}

const executablePath = resolveChromiumExecutable();
if (!executablePath) {
  console.error(
    '❌ No Chromium / Chrome binary found for Lighthouse. Install Playwright Chromium or set CHROME_PATH.'
  );
  process.exit(1);
}

const localeConfig = readLocaleConfig(rootDir);
const mergedConfig = readMergedConfig(rootDir);
const defaultLocale = localeConfig.defaultLocale || 'en';
const secondaryLocale =
  localeConfig.locales.find((loc) => loc !== defaultLocale) ?? null;

function resolvePageRoute(group, locale) {
  const mdxPath = path.join(rootDir, 'src', 'content', 'pages', group, `${locale}.mdx`);
  if (!fs.existsSync(mdxPath)) return null;
  const { data } = parseFrontmatter(fs.readFileSync(mdxPath, 'utf-8'));
  if (data.draft === true) return null;
  const slug = typeof data.slug === 'string' ? data.slug.trim() : '';
  if (!slug && group !== 'home') return null;
  const prefix = locale === defaultLocale ? '' : `/${locale}`;
  const candidate = slug ? `${prefix}/${slug}/` : `${prefix || ''}/`;
  return resolveDistFile(distDir, candidate) ? candidate : null;
}

const routes = ['/'];
if (secondaryLocale && resolveDistFile(distDir, `/${secondaryLocale}/`)) {
  routes.push(`/${secondaryLocale}/`);
}
const blogCfg = mergedConfig.content?.types?.blog;
if (blogCfg?.enabled !== false && blogCfg?.index !== false) {
  const blogRoute = `/${blogCfg?.base || 'blog'}/`;
  if (resolveDistFile(distDir, blogRoute)) routes.push(blogRoute);
}
const contactRoute = resolvePageRoute('contact', defaultLocale);
if (contactRoute) routes.push(contactRoute);

const thresholds = {
  performance:
    Number(process.env.QA_LH_PERFORMANCE) || DEFAULT_LIGHTHOUSE_THRESHOLDS.performance,
  accessibility:
    Number(process.env.QA_LH_ACCESSIBILITY) || DEFAULT_LIGHTHOUSE_THRESHOLDS.accessibility,
  bestPractices:
    Number(process.env.QA_LH_BEST_PRACTICES) || DEFAULT_LIGHTHOUSE_THRESHOLDS.bestPractices,
  seo: Number(process.env.QA_LH_SEO) || DEFAULT_LIGHTHOUSE_THRESHOLDS.seo,
  cls: Number(process.env.QA_CLS_BUDGET) || DEFAULT_LIGHTHOUSE_THRESHOLDS.cls,
};

function startHeadlessChrome(binPath) {
  return new Promise((resolve, reject) => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-chrome-'));
    const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
    const args = [
      '--headless',
      '--remote-debugging-port=0',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      ...(isRoot ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
      'about:blank',
    ];

    const child = spawn(binPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGKILL');
        fs.rmSync(userDataDir, { recursive: true, force: true });
        reject(new Error(`Timed out waiting for Chrome DevTools port (${stderr.trim()})`));
      }
    }, 15_000);

    const onOutput = (chunk) => {
      const text = chunk.toString();
      stderr += text;
      const match = stderr.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//i);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve({
          port: Number(match[1]),
          close: async () => {
            child.kill('SIGTERM');
            await new Promise((r) => setTimeout(r, 250));
            if (!child.killed) child.kill('SIGKILL');
            fs.rmSync(userDataDir, { recursive: true, force: true });
          },
        });
      }
    };

    child.stderr.on('data', onOutput);
    child.stdout.on('data', onOutput);
    child.on('error', (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        fs.rmSync(userDataDir, { recursive: true, force: true });
        reject(error);
      }
    });
    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        fs.rmSync(userDataDir, { recursive: true, force: true });
        reject(new Error(`Chrome exited early with code ${code}: ${stderr.trim()}`));
      }
    });
  });
}

console.log(
  `🔦 Running Lighthouse QA across ${routes.length} route(s) (Perf >= ${thresholds.performance}, A11y >= ${thresholds.accessibility}, BP >= ${thresholds.bestPractices}, SEO >= ${thresholds.seo}, CLS <= ${thresholds.cls})...\n`
);

const { server, origin } = await startDistStaticServer(distDir);
let chrome;
let hasFailure = false;

try {
  chrome = await startHeadlessChrome(executablePath);

  for (const route of routes) {
    const url = `${origin}${encodeURI(route)}`;
    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 375,
        height: 812,
        deviceScaleFactor: 2,
        disabled: false,
      },
      throttlingMethod: 'provided',
    });

    const summary = evaluateLighthouseResult(runnerResult?.lhr, thresholds);
    const line = `Perf=${summary.scores.performance} A11y=${summary.scores.accessibility} BP=${summary.scores.bestPractices} SEO=${summary.scores.seo} CLS=${summary.cls}`;

    if (summary.ok) {
      console.log(`✅ ${route} — ${line}`);
    } else {
      hasFailure = true;
      console.error(`❌ ${route} — ${line} (${summary.failures.join(', ')})`);
      const lhr = runnerResult?.lhr;
      if (lhr) {
        const shiftItems = lhr.audits?.['layout-shift-elements']?.details?.items ?? [];
        if (summary.cls > thresholds.cls && shiftItems.length > 0) {
          console.error(
            `   ↳ shift elements: ${shiftItems
              .slice(0, 5)
              .map((i) => `${i?.node?.selector || i?.node?.snippet || 'unknown'} (+${Number(i?.score ?? 0).toFixed(4)})`)
              .join(', ')}`
          );
        }
        const seoRefFailures = (lhr.categories?.seo?.auditRefs ?? [])
          .filter((r) => lhr.audits?.[r.id]?.score !== 1 && lhr.audits?.[r.id]?.score !== null)
          .map((r) => r.id);
        if (seoRefFailures.length > 0) {
          console.error(`   ↳ seo failures: ${seoRefFailures.join(', ')}`);
        }
      }
    }
  }
} finally {
  await chrome?.close();
  server.close();
}

if (hasFailure) {
  console.error('\n❌ Lighthouse QA failed threshold checks.');
  process.exit(1);
}
console.log('\n✨ Lighthouse QA passed all thresholds!');
