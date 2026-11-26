import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const LINUX_CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
];

function collectPlaywrightBrowserBinaries(baseDir) {
  if (!baseDir || !fs.existsSync(baseDir)) return [];
  const results = [];

  const directHeadless = path.join(
    baseDir,
    'chrome-headless-shell-linux64',
    'chrome-headless-shell'
  );
  if (fs.existsSync(directHeadless)) results.push(directHeadless);

  let entries = [];
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('chromium-')) {
      for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const candidate = path.join(baseDir, entry.name, rel);
        if (fs.existsSync(candidate)) results.push(candidate);
      }
    } else if (entry.name.startsWith('chromium_headless_shell-')) {
      for (const rel of [
        'chrome-headless-shell-linux64/chrome-headless-shell',
        'chrome-headless-shell-linux/chrome-headless-shell',
      ]) {
        const candidate = path.join(baseDir, entry.name, rel);
        if (fs.existsSync(candidate)) results.push(candidate);
      }
    }
  }

  return results;
}

/**
 * Resolves a usable Chromium / Chrome Headless Shell binary path across CI
 * runners, local developer environments, and Playwright container caches.
 */
export function resolveChromiumExecutable() {
  const envCandidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
  ].filter(Boolean);

  for (const candidate of envCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  try {
    const defaultBin = chromium.executablePath();
    if (defaultBin && fs.existsSync(defaultBin)) {
      return defaultBin;
    }
  } catch {
    // Ignore lookup failure and fall back to container cache scanning.
  }

  const browserDirs = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    '/ms-playwright',
    path.join(os.homedir(), '.cache', 'ms-playwright'),
  ].filter(Boolean);

  for (const dir of browserDirs) {
    const found = collectPlaywrightBrowserBinaries(dir);
    if (found.length > 0) return found[0];
  }

  for (const candidate of LINUX_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return undefined;
}

/**
 * Launches headless Chromium using the resolved executable and container-safe
 * sandbox flags when running as root.
 */
export async function launchQaChromium() {
  const executablePath = resolveChromiumExecutable();
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  const args = [
    '--disable-dev-shm-usage',
    ...(isRoot ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
  ];

  return chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args,
  });
}
