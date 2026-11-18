#!/usr/bin/env node
/**
 * Seeds or cleans the optional `starter-kit/` demo package into `src/content/` and `client/`.
 *
 * Usage:
 *   npm run starter:seed -- [--all|--pages|--blog|--projects|--assets|--nav|--messages] [--blueprint=corporate|agency|portfolio|medical] [--clean] [--force] [--yes]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyBlueprintToConfig, VALID_BLUEPRINTS } from './lib/blueprints.mjs';
import { readMergedConfig, writeClientConfig } from './lib/config.mjs';
import { compileMessages } from './lib/compile-messages.mjs';
import {
  readClientLocales,
  readClientMessages,
  readJsonIfExists,
  stripSchema,
  writeClientMessages,
} from './lib/merge-messages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const starterDir = path.join(rootDir, 'starter-kit');

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const blueprintArg = rawArgs.find((arg) => arg.startsWith('--blueprint='));
const blueprintKey = blueprintArg ? blueprintArg.slice('--blueprint='.length).trim() : null;
const isClean = args.has('--clean');
const force = args.has('--force') || args.has('--yes');

const selectiveFlags = ['--pages', '--blog', '--projects', '--assets', '--nav', '--messages'];
const hasSelective = selectiveFlags.some((flag) => args.has(flag));
const seedAll = args.has('--all') || !hasSelective;

const wantPages = seedAll || args.has('--pages');
const wantBlog = seedAll || args.has('--blog');
const wantProjects = seedAll || args.has('--projects');
const wantAssets = seedAll || args.has('--assets');
const wantNav = seedAll || args.has('--nav');
const wantMessages = seedAll || args.has('--messages');

const MINIMAL_CLIENT_NAV = `import type { Locale } from '@/i18n/locales';
import type { FooterColumn, NavItem, NavContext } from '@/libs/config/navigation';
import * as m from '@/paraglide/messages';

export interface ClientPageNavItem {
  readonly group: string;
  readonly icon: string;
  readonly label: (locale: Locale) => string;
}

/**
 * Pages listed in the primary header, mobile drawer, and footer pages column.
 * A page only renders once at least one published translation exists for the active locale.
 */
export const CLIENT_PAGE_ITEMS: readonly ClientPageNavItem[] = [
  { group: 'home', icon: 'home', label: (locale: Locale) => m.nav_home({}, { locale }) },
];

/**
 * Optional client-owned primary navigation items appended after content types
 * (for example custom dropdowns or anchor links).
 */
export async function getClientPrimaryExtras(_ctx: NavContext): Promise<NavItem[]> {
  return [];
}

/**
 * Optional extra footer columns appended alongside generated footer columns.
 */
export async function getClientFooterColumns(_ctx: NavContext): Promise<FooterColumn[]> {
  return [];
}

/**
 * Optional legal links rendered in the bottom footer bar.
 */
export async function getClientLegalNavigation(_ctx: NavContext): Promise<NavItem[]> {
  return [];
}
`;

function listDirNames(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function copyGroupDirs(srcDir, dstDir, label) {
  let count = 0;
  fs.mkdirSync(dstDir, { recursive: true });
  for (const name of listDirNames(srcDir)) {
    const src = path.join(srcDir, name);
    const dst = path.join(dstDir, name);
    if (fs.existsSync(dst) && !force) {
      console.log(`⏭️  Skipped existing ${label}/${name} (pass --force to overwrite)`);
      continue;
    }
    fs.cpSync(src, dst, { recursive: true, force: true });
    count += 1;
  }
  return count;
}

function removeGroupDirs(starterSubdir, targetSubdir) {
  let count = 0;
  for (const name of listDirNames(starterSubdir)) {
    const target = path.join(targetSubdir, name);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
      count += 1;
    }
  }
  return count;
}

function seedStarterMessages(locales) {
  const starterMessagesDir = path.join(starterDir, 'messages');
  const enStarter = stripSchema(readJsonIfExists(path.join(starterMessagesDir, 'en.json')));

  for (const locale of locales) {
    const locFile = path.join(starterMessagesDir, `${locale}.json`);
    const locStarter = fs.existsSync(locFile)
      ? stripSchema(readJsonIfExists(locFile))
      : Object.fromEntries(
          Object.entries(enStarter).map(([k, v]) => [k, typeof v === 'string' ? `[TODO: ${locale}] ${v}` : v])
        );

    const currentClient = stripSchema(readClientMessages(locale, rootDir));
    const merged = { ...locStarter, ...currentClient };
    if (force) {
      Object.assign(merged, locStarter);
    }
    writeClientMessages(locale, merged, rootDir);
  }
}

function cleanStarterMessages(locales) {
  const enStarter = stripSchema(readJsonIfExists(path.join(starterDir, 'messages', 'en.json')));
  const demoKeys = new Set(Object.keys(enStarter));

  for (const locale of locales) {
    const currentClient = stripSchema(readClientMessages(locale, rootDir));
    let changed = false;
    for (const key of Object.keys(currentClient)) {
      if (demoKeys.has(key)) {
        delete currentClient[key];
        changed = true;
      }
    }
    if (changed) {
      writeClientMessages(locale, currentClient, rootDir);
    }
  }
}

if (!fs.existsSync(starterDir)) {
  console.error('❌ Missing starter-kit/ directory.');
  process.exit(1);
}

const { locales = ['en', 'fa'] } = readClientLocales(rootDir);

if (isClean) {
  const removedPages = wantPages
    ? removeGroupDirs(path.join(starterDir, 'content', 'pages'), path.join(rootDir, 'src', 'content', 'pages'))
    : 0;
  const removedBlog = wantBlog
    ? removeGroupDirs(path.join(starterDir, 'content', 'blog'), path.join(rootDir, 'src', 'content', 'blog'))
    : 0;
  const removedProjects = wantProjects
    ? removeGroupDirs(path.join(starterDir, 'content', 'projects'), path.join(rootDir, 'src', 'content', 'projects'))
    : 0;

  if (wantAssets) {
    fs.rmSync(path.join(rootDir, 'src', 'assets', 'germancert'), { recursive: true, force: true });
  }
  if (wantNav) {
    fs.writeFileSync(path.join(rootDir, 'client', 'navigation.ts'), MINIMAL_CLIENT_NAV, 'utf-8');
  }
  if (wantMessages) {
    cleanStarterMessages(locales);
  }

  compileMessages(rootDir);
  console.log(
    `🧹 Cleaned starter-kit demo items (pages: ${removedPages}, blog: ${removedBlog}, projects: ${removedProjects}).`
  );
  process.exit(0);
}

const stats = {
  pages: wantPages
    ? copyGroupDirs(path.join(starterDir, 'content', 'pages'), path.join(rootDir, 'src', 'content', 'pages'), 'pages')
    : 0,
  blog: wantBlog
    ? copyGroupDirs(path.join(starterDir, 'content', 'blog'), path.join(rootDir, 'src', 'content', 'blog'), 'blog')
    : 0,
  projects: wantProjects
    ? copyGroupDirs(path.join(starterDir, 'content', 'projects'), path.join(rootDir, 'src', 'content', 'projects'), 'projects')
    : 0,
};

if (wantAssets && fs.existsSync(path.join(starterDir, 'assets', 'germancert'))) {
  fs.cpSync(path.join(starterDir, 'assets', 'germancert'), path.join(rootDir, 'src', 'assets', 'germancert'), {
    recursive: true,
    force: true,
  });
}

if (wantMessages) {
  seedStarterMessages(locales);
}

if (wantNav) {
  fs.copyFileSync(path.join(starterDir, 'navigation.ts'), path.join(rootDir, 'client', 'navigation.ts'));
}

if (blueprintKey) {
  if (!VALID_BLUEPRINTS.includes(blueprintKey)) {
    console.error(
      `❌ Invalid --blueprint "${blueprintKey}". Valid: ${VALID_BLUEPRINTS.join(', ')}.`
    );
    process.exit(1);
  }
  const presetsPath = path.join(rootDir, 'src', 'libs', 'config', 'theme-presets.json');
  const rootPresets = JSON.parse(fs.readFileSync(presetsPath, 'utf-8'));
  const merged = readMergedConfig(rootDir);
  applyBlueprintToConfig(merged, blueprintKey, { rootPresets });
  writeClientConfig(merged, { rootDir, sparse: true });
  console.log(`✅ Applied blueprint "${blueprintKey}" to client/config.json.`);
}

compileMessages(rootDir);
console.log(
  `✅ Seeded starter-kit (pages: ${stats.pages}, blog: ${stats.blog}, projects: ${stats.projects}).`
);
