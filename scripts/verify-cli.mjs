#!/usr/bin/env node
/**
 * End-to-end check of every documented CLI workflow.
 *
 * The script copies the project into a throwaway directory, runs each command
 * exactly as the guide documents it, and prints a PASS/FAIL line per claim.
 * It never touches the working copy.
 *
 * Usage: node scripts/verify-cli.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readMergedConfig } from './lib/config.mjs';

const rootDir = path.resolve(import.meta.dirname, '..');
const results = [];

function record(ok, label, detail = '') {
  results.push({ ok, label, detail });
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'} — ${label}${detail ? ` (${detail})` : ''}`);
}

// The sandbox lives in the system temp directory: it must never be picked up
// by the test runner, the type checker or the dead-code check of the project.
const SANDBOX_ROOT = path.join(os.tmpdir(), 'astro-i18n-starter-verify');

/**
 * Writes `pnpm` and `npm` shims into the sandbox.
 *
 * Content/i18n scripts can fall back to calling the package manager for
 * `messages:compile`. A real package manager must never run inside the sandbox
 * because it would try to resolve or mutate dependencies outside the sandbox.
 */
function writePackageManagerShims(binDir, projectDir) {
  fs.mkdirSync(binDir, { recursive: true });
  const compileScript = path.join(projectDir, 'scripts', 'messages-compile.mjs');

  for (const name of ['pnpm', 'npm']) {
    fs.writeFileSync(
      path.join(binDir, name),
      [
        '#!/bin/sh',
        '# Sandbox shim: compiles merged messages of the sandbox copy, nothing else.',
        'if [ "$1" = "run" ] && [ "$2" = "messages:compile" ]; then',
        `  node "${compileScript}" || true`,
        'fi',
        'exit 0',
        '',
      ].join('\n'),
      'utf-8'
    );
    fs.chmodSync(path.join(binDir, name), 0o755);

    fs.writeFileSync(
      path.join(binDir, `${name}.cmd`),
      [
        '@echo off',
        'if "%1"=="run" if "%2"=="messages:compile" (',
        `  node "${compileScript}"`,
        ')',
        'exit /b 0',
        '',
      ].join('\n'),
      'utf-8'
    );
  }
}

/**
 * Resolves the directory of an installed package, supporting both flat npm and pnpm layouts.
 *
 * @param {string} name
 * @param {string} fromDir
 * @returns {string | null}
 */
function resolvePackageDir(name, fromDir) {
  try {
    const requireFrom = createRequire(path.join(fromDir, 'package.json'));
    let dir = path.dirname(requireFrom.resolve(name));
    while (true) {
      const manifestPath = path.join(dir, 'package.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        if (manifest.name === name) return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  } catch {
    return null;
  }
}

function makeSandbox() {
  fs.rmSync(SANDBOX_ROOT, { recursive: true, force: true });
  const copy = path.join(SANDBOX_ROOT, 'project');
  fs.mkdirSync(copy, { recursive: true });

  for (const entry of [
    '.gitignore',
    'app.config.json',
    'package.json',
    'astro.config.mjs',
    'tsconfig.json',
    'knip.json',
    'client',
    'starter-kit',
    'messages',
    'scripts',
    'public',
    'src',
  ]) {
    const source = path.join(rootDir, entry);
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, path.join(copy, entry), { recursive: true });
  }

  // Copy `magic-string` (used by block:adapt and i18n:extract) into sandbox node_modules
  // while leaving `@inlang/paraglide-js` out of sandbox node_modules to verify isolation.
  const magicStringDir = resolvePackageDir('magic-string', rootDir);
  if (magicStringDir) {
    const target = path.join(copy, 'node_modules', 'magic-string');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(magicStringDir, target, { recursive: true });

    const codecDir = resolvePackageDir('@jridgewell/sourcemap-codec', magicStringDir);
    if (codecDir) {
      const codecTarget = path.join(target, 'node_modules', '@jridgewell', 'sourcemap-codec');
      fs.mkdirSync(path.dirname(codecTarget), { recursive: true });
      fs.cpSync(codecDir, codecTarget, { recursive: true });
    }
  }

  // Ensure CLI sandbox scratch targets start clean even when verifying inside a customized client project.
  for (const scratch of [
    'src/content/pages/contact',
    'src/content/blog/ai-agents',
    'src/content/projects/demo-work',
    'src/content/projects/dormant-work',
    'src/content/blog/delegated-post',
  ]) {
    fs.rmSync(path.join(copy, scratch), { recursive: true, force: true });
  }

  writePackageManagerShims(path.join(SANDBOX_ROOT, 'bin'), copy);
  return copy;
}

function run(cwd, command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CI: '1',
      PARAGLIDE_BIN: path.join(rootDir, 'node_modules', '@inlang', 'paraglide-js', 'bin', 'run.js'),
      // The shim comes first, so the sandbox never starts a real package manager.
      PATH: `${path.join(SANDBOX_ROOT, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
      npm_config_verify_deps_before_run: 'false',
      npm_config_ignore_scripts: 'true',
    },
  });

  if (result.error) throw result.error;
  const code = result.status ?? 1;
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';

  if (code !== 0 && !allowFailure) {
    const error = new Error(`Command failed (${code}): ${command} ${args.join(' ')}`);
    error.status = code;
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  }
  return { code, stdout, stderr };
}

const sandbox = makeSandbox();
const read = (relative) => fs.readFileSync(path.join(sandbox, relative), 'utf-8');
const exists = (relative) => fs.existsSync(path.join(sandbox, relative));
const readBytes = (relative) => fs.readFileSync(path.join(sandbox, relative));

// Captured before any command runs: scaffolding must never replace artwork or
// brand assets that already exist in a client project.
const homeArtworkBefore = readBytes('src/content/pages/home/home.png');
const brandIconBefore = readBytes('public/icon-192.png');
const sandboxLocaleConfig = JSON.parse(read('client/locales.json'));
const sandboxLocales = sandboxLocaleConfig.locales;
const baseLoc = sandboxLocaleConfig.defaultLocale || 'en';
const altLocs = sandboxLocales.filter((loc) => loc !== baseLoc);
const altLoc = altLocs[0] || baseLoc;
const trackedSandboxTargets = [
  'src/content/pages/contact',
  'src/content/blog/ai-agents',
  'src/content/projects/demo-work',
  'src/content/projects/dormant-work',
  'src/content/blog/delegated-post',
];
const workingCopyPreState = Object.fromEntries(
  trackedSandboxTargets.map((rel) => [rel, fs.existsSync(path.join(rootDir, rel))])
);
const workingCopyProjectsEnabledBefore = readMergedConfig(rootDir).content.types.projects.enabled;
const workingCopyCoreAppConfigBefore = fs.readFileSync(path.join(rootDir, 'app.config.json'), 'utf-8');

try {
  // ---------------------------------------------------------------------
  // 1. new:page
  // ---------------------------------------------------------------------
  console.log('\n### 1. new:page');
  let result = run(sandbox, 'node', ['scripts/new-page.mjs', 'contact', '--title=Contact Us', `--from=${baseLoc}`]);
  record(result.code === 0, 'new:page creates a page group', result.stdout.trim().split('\n')[0]);
  record(
    sandboxLocales.every((loc) => exists(`src/content/pages/contact/${loc}.mdx`)),
    'new:page writes one file per locale'
  );
  record(
    read(`src/content/pages/contact/${baseLoc}.mdx`).includes('slug: "contact"'),
    'new:page uses the group key as the default-locale slug'
  );
  record(
    /draft: false/.test(read(`src/content/pages/contact/${baseLoc}.mdx`)) &&
      (altLoc === baseLoc || /draft: true/.test(read(`src/content/pages/contact/${altLoc}.mdx`))),
    'new:page publishes the source locale and drafts the others',
    `${baseLoc}=false, ${altLoc}=true`
  );
  record(
    altLoc === baseLoc || read(`src/content/pages/contact/${altLoc}.mdx`).includes(`slug: "contact-${altLoc}"`),
    'new:page uses a placeholder slug for an untranslated locale',
    read(`src/content/pages/contact/${altLoc}.mdx`).match(/slug: "[^"]*"/)?.[0] ?? 'none'
  );
  record(
    !read(`src/content/pages/contact/${baseLoc}.mdx`).includes('# Contact Us'),
    'new:page does not duplicate the frontmatter title in the body'
  );
  record(
    !read(`src/content/pages/contact/${baseLoc}.mdx`).includes('Description for'),
    'new:page does not invent a placeholder description'
  );
  record(
    !read(`src/content/pages/contact/${altLoc}.mdx`).includes(`# [TODO: ${altLoc}] Contact Us`),
    'new:page does not duplicate the localized title in the body'
  );
  record(
    read(`src/content/pages/contact/${baseLoc}.mdx`).includes('image: "./contact.png"'),
    'new:page points the hero at the group artwork'
  );
  record(exists('src/content/pages/contact/contact.png'), 'new:page generates the group artwork');
  record(
    readBytes('src/content/pages/home/home.png').equals(homeArtworkBefore),
    'new:page leaves the artwork of existing pages untouched'
  );
  record(
    readBytes('public/icon-192.png').equals(brandIconBefore),
    'new:page leaves existing brand assets untouched'
  );
  result = run(sandbox, 'node', ['scripts/new-page.mjs', '../escape', '--title=Escape'], {
    allowFailure: true,
  });
  record(
    result.code !== 0 && !exists('src/content/escape'),
    'new:page rejects a page key that would escape the pages collection'
  );
  result = run(sandbox, 'node', ['scripts/new-page.mjs', 'bad/key', '--title=Slash'], {
    allowFailure: true,
  });
  record(result.code !== 0, 'new:page rejects a page key with a path separator');
  record(
    JSON.parse(read(`client/messages/${altLoc}.json`)).nav_contact !== undefined,
    'new:page registers nav_contact in client/messages/'
  );

  // ---------------------------------------------------------------------
  // 2. new:post
  // ---------------------------------------------------------------------
  console.log('\n### 2. new:post');
  result = run(sandbox, 'node', [
    'scripts/new-post.mjs',
    'ai-agents',
    `--from=${baseLoc}`,
    '--title=AI Coding Agents',
    '--category=engineering',
    '--tags=astro,i18n',
    '--image=cover.png',
    '--publish',
  ]);
  record(result.code === 0, 'new:post creates an article group', result.stdout.trim().split('\n')[0]);
  record(
    sandboxLocales.every((loc) => exists(`src/content/blog/ai-agents/${loc}.mdx`)),
    'new:post writes one file per locale'
  );
  record(
    !read(`src/content/blog/ai-agents/${baseLoc}.mdx`).includes('# AI Coding Agents'),
    'new:post does not duplicate the frontmatter title in the body',
    read(`src/content/blog/ai-agents/${baseLoc}.mdx`)
      .split('---')
      .pop()
      .trim()
      .split('\n')[0]
  );
  record(
    !read(`src/content/blog/ai-agents/${altLoc}.mdx`).includes(`# [TODO: ${altLoc}] AI Coding Agents`),
    'new:post does not duplicate the localized title in the body'
  );
  record(
    !read(`src/content/blog/ai-agents/${baseLoc}.mdx`).includes(`[TODO: ${baseLoc}] Description`),
    'new:post does not leave a placeholder description in the source locale'
  );
  record(
    !read(`src/content/blog/ai-agents/${altLoc}.mdx`).includes('An introduction to our multi-lingual'),
    'new:post --from does not clone an unrelated article body'
  );
  record(
    read(`src/content/blog/ai-agents/${baseLoc}.mdx`).includes('categories: ["engineering"]') &&
      read(`src/content/blog/ai-agents/${baseLoc}.mdx`).includes('tags: ["astro", "i18n"]'),
    'new:post writes the taxonomy frontmatter'
  );
  record(
    !read(`src/content/blog/ai-agents/${baseLoc}.mdx`).includes('Description for'),
    'new:post does not invent a placeholder description'
  );
  record(
    read(`src/content/blog/ai-agents/${baseLoc}.mdx`).includes('image: "./ai-agents.png"') &&
      exists('src/content/blog/ai-agents/ai-agents.png'),
    'new:post falls back to the group artwork when the named one is missing'
  );
  record(
    /draft: false/.test(read(`src/content/blog/ai-agents/${baseLoc}.mdx`)) &&
      altLocs.every((loc) =>
        /draft: true/.test(read(`src/content/blog/ai-agents/${loc}.mdx`))
      ),
    'new:post --publish keeps placeholder locales as drafts'
  );

  // A post created without --publish must not leak into the other locales.
  run(sandbox, 'node', ['scripts/new-post.mjs', 'draft-post', `--from=${baseLoc}`, '--title=Draft Post']);
  record(
    /draft: false/.test(read(`src/content/blog/draft-post/${baseLoc}.mdx`)) &&
      (altLoc === baseLoc || /draft: true/.test(read(`src/content/blog/draft-post/${altLoc}.mdx`))),
    'new:post drafts the non-source locales by default'
  );

  result = run(
    sandbox,
    'node',
    ['scripts/new-post.mjs', 'clone-miss', '--title=Clone Miss', '--clone-from=missing-group'],
    { allowFailure: true }
  );
  record(
    result.code !== 0 && !exists('src/content/blog/clone-miss'),
    'new:post --clone-from failure leaves no partial article group'
  );

  run(sandbox, 'node', [
    'scripts/new-post.mjs',
    'publish-ready',
    `--from=${baseLoc}`,
    '--title=Publish Ready',
    '--publish',
    ...altLocs.flatMap((loc) => [
      `--title:${loc}=${loc === 'fa' ? 'آماده انتشار' : `Publish Ready ${loc.toUpperCase()}`}`,
      `--desc:${loc}=${loc === 'fa' ? 'توضیحات' : `Description ${loc.toUpperCase()}`}`,
    ]),
  ]);
  record(
    sandboxLocales.every((loc) =>
      /draft: false/.test(read(`src/content/blog/publish-ready/${loc}.mdx`))
    ),
    'new:post --publish publishes locales that have translations'
  );

  // ---------------------------------------------------------------------
  // 3. --update keeps the body
  // ---------------------------------------------------------------------
  console.log('\n### 3. new:post --update');
  const bodyBefore = read(`src/content/blog/ai-agents/${altLoc}.mdx`).split('---').slice(2).join('---');
  result = run(sandbox, 'node', [
    'scripts/new-post.mjs',
    'ai-agents',
    '--update',
    '--title=AI Coding Agents 2',
  ]);
  record(result.code === 0, 'new:post --update succeeds');
  record(
    read(`src/content/blog/ai-agents/${baseLoc}.mdx`).includes('title: "AI Coding Agents 2"'),
    'new:post --update rewrites the title of the source locale'
  );
  record(
    altLoc === baseLoc ||
      read(`src/content/blog/ai-agents/${altLoc}.mdx`).includes(`title: "[TODO: ${altLoc}] AI Coding Agents"`),
    'new:post --update leaves the other locales alone'
  );
  record(
    read(`src/content/blog/ai-agents/${altLoc}.mdx`).split('---').slice(2).join('---') === bodyBefore,
    'new:post --update leaves the body untouched'
  );

  result = run(sandbox, 'node', [
    'scripts/new-post.mjs',
    'ai-agents',
    '--sync-frontmatter',
    '--title=AI Coding Agents 2',
  ]);
  record(
    altLoc === baseLoc ||
      read(`src/content/blog/ai-agents/${altLoc}.mdx`).includes(`title: "[TODO: ${altLoc}] AI Coding Agents 2"`),
    'new:post --sync-frontmatter propagates the title to every locale'
  );

  // Quotes and backslashes in --title round-trip without breaking YAML or invoking a shell,
  // and recreating a missing locale during --update never injects a duplicate `# Title` H1.
  if (altLoc !== baseLoc) {
    fs.unlinkSync(path.join(sandbox, 'src', 'content', 'blog', 'ai-agents', `${altLoc}.mdx`));
  }
  result = run(sandbox, 'node', [
    'scripts/new-post.mjs',
    'ai-agents',
    '--update',
    '--title=AI "Agents" \\ Guide',
  ]);
  record(
    result.code === 0 &&
      read(`src/content/blog/ai-agents/${baseLoc}.mdx`).includes('title: "AI \\"Agents\\" \\\\ Guide"'),
    'new:post escapes quotes and backslashes in frontmatter safely'
  );
  record(
    exists(`src/content/blog/ai-agents/${altLoc}.mdx`) &&
      !/^\s*#\s+/m.test(read(`src/content/blog/ai-agents/${altLoc}.mdx`).split('---').slice(2).join('---')),
    'new:post --update recreates a missing locale without a duplicate # H1 heading'
  );

  // ---------------------------------------------------------------------
  // 4. i18n:add / i18n:add-batch
  // ---------------------------------------------------------------------
  console.log('\n### 4. i18n:add and i18n:add-batch');
  result = run(sandbox, 'node', [
    'scripts/i18n-add.mjs',
    '--category=contact',
    '--key=form_label',
    `--${baseLoc}=Send message`,
    ...(altLoc !== baseLoc ? [`--${altLoc}=ارسال پیام`] : []),
  ]);
  record(result.code === 0, 'i18n:add registers a key');
  record(
    JSON.parse(read(`client/messages/${baseLoc}.json`)).contact_form_label === 'Send message' &&
      (altLoc === baseLoc || JSON.parse(read(`client/messages/${altLoc}.json`)).contact_form_label === 'ارسال پیام'),
    'i18n:add writes explicit translations into client/messages/'
  );

  result = run(sandbox, 'node', [
    'scripts/i18n-add.mjs',
    '--category=contact',
    '--key=placeholder_label',
    `--${baseLoc}=Placeholder label`,
  ]);
  record(
    altLoc === baseLoc ||
      JSON.parse(read(`client/messages/${altLoc}.json`)).contact_placeholder_label === `[TODO: ${altLoc}] placeholder_label`,
    'i18n:add leaves a placeholder for the missing locales in client/messages/'
  );

  result = run(sandbox, 'node', [
    'scripts/i18n-add-batch.mjs',
    `--json={"cart_checkout":{"${baseLoc}":"Checkout"${altLoc !== baseLoc ? `,"${altLoc}":"تسویه حساب"` : ''}}}`,
  ]);
  record(result.code === 0, 'i18n:add-batch accepts inline JSON');
  record(
    JSON.parse(read(`client/messages/${baseLoc}.json`)).cart_checkout === 'Checkout',
    'i18n:add-batch writes the batch keys into client/messages/'
  );

  result = run(sandbox, 'node', [
    'scripts/i18n-add-batch.mjs',
    `--json={"submit":{"${baseLoc}":"Submit"}}`,
    '--category=contact',
  ]);
  record(result.code === 0, 'i18n:add-batch accepts --category');
  record(
    JSON.parse(read(`client/messages/${baseLoc}.json`)).contact_submit === 'Submit',
    'i18n:add-batch applies the --category prefix',
    Object.keys(JSON.parse(read(`client/messages/${baseLoc}.json`))).filter((k) => k.startsWith('contact_')).join(', ')
  );

  // ---------------------------------------------------------------------
  // 5. remove:page / remove:post
  // ---------------------------------------------------------------------
  console.log('\n### 5. remove:page and remove:post');
  result = run(sandbox, 'node', ['scripts/remove-post.mjs', '../pages', '--force'], {
    allowFailure: true,
  });
  record(
    result.code !== 0 && exists('src/content/pages/home'),
    'remove:post rejects a group slug that escapes the blog collection'
  );
  result = run(sandbox, 'node', ['scripts/remove-page.mjs', '../blog', '--force'], {
    allowFailure: true,
  });
  record(
    result.code !== 0 && exists('src/content/blog'),
    'remove:page rejects a page key that escapes the pages collection'
  );
  result = run(sandbox, 'node', ['scripts/remove-page.mjs', 'contact', `--locale=${altLoc}`, '--force']);
  record(result.code === 0, 'remove:page --locale removes one locale');
  record(
    !exists(`src/content/pages/contact/${altLoc}.mdx`) &&
      (altLoc === baseLoc || exists(`src/content/pages/contact/${baseLoc}.mdx`)),
    'remove:page --locale keeps the rest of the group'
  );
  record(
    JSON.parse(read(`client/messages/${altLoc}.json`)).nav_contact !== undefined,
    'remove:page --locale keeps the nav key in client/messages/'
  );
  result = run(sandbox, 'node', ['scripts/audit-i18n.mjs'], { allowFailure: true });
  record(
    result.code === 0,
    'the audit still passes after remove:page --locale',
    result.code === 0 ? '' : result.stdout.trim().split('\n').slice(-12).join(' | ')
  );

  result = run(sandbox, 'node', ['scripts/remove-page.mjs', 'contact', '--no-clean-nav', '--force']);
  record(result.code === 0, 'remove:page --no-clean-nav removes the whole group');
  record(
    JSON.parse(read(`client/messages/${baseLoc}.json`)).nav_contact !== undefined,
    'remove:page --no-clean-nav keeps the nav key'
  );
  record(!exists('src/content/pages/contact'), 'remove:page removes the group folder');

  result = run(sandbox, 'node', ['scripts/remove-post.mjs', 'ai-agents', `--locale=${altLoc}`, '--force']);
  record(result.code === 0, 'remove:post --locale removes one locale');
  result = run(sandbox, 'node', ['scripts/audit-i18n.mjs'], { allowFailure: true });
  record(
    result.code === 0,
    'the audit still passes after remove:post --locale',
    result.code === 0 ? '' : result.stdout.trim().split('\n').slice(-12).join(' | ')
  );
  run(sandbox, 'node', ['scripts/remove-post.mjs', 'ai-agents', '--force']);

  // ---------------------------------------------------------------------
  // 6. Language lifecycle
  // ---------------------------------------------------------------------
  console.log('\n### 6. i18n:add-lang and i18n:remove-lang');
  result = run(sandbox, 'node', ['scripts/add-language.mjs', 'zz', '--name=Zeta', '--no-content']);
  record(result.code === 0, 'i18n:add-lang registers a locale', result.stdout.trim().split('\n').pop());
  record(
    exists('client/messages/zz.json') &&
      JSON.parse(read('client/locales.json')).locales.includes('zz') &&
      JSON.parse(read('client/locales.json')).metadata.zz?.name === 'Zeta',
    'i18n:add-lang updates client/messages/zz.json and client/locales.json'
  );

  // Re-running the command must not throw away translations that already exist.
  const zetaDict = JSON.parse(read('client/messages/zz.json'));
  zetaDict.nav_home = 'Zeta Home';
  fs.writeFileSync(path.join(sandbox, 'client/messages/zz.json'), JSON.stringify(zetaDict, null, 2) + '\n');
  result = run(sandbox, 'node', ['scripts/add-language.mjs', 'zz', '--name=Zeta', '--no-content']);
  record(
    result.code === 0 && JSON.parse(read('client/messages/zz.json')).nav_home === 'Zeta Home',
    'i18n:add-lang re-run keeps existing translations'
  );

  result = run(sandbox, 'node', ['scripts/remove-language.mjs', 'zz', '--force', '--keep-content']);
  record(result.code === 0, 'i18n:remove-lang unregisters the locale');
  record(
    !exists('client/messages/zz.json') &&
      !JSON.parse(read('client/locales.json')).locales.includes('zz') &&
      !JSON.parse(read('client/locales.json')).metadata.zz,
    'i18n:remove-lang cleans client/messages/zz.json and client/locales.json'
  );
  result = run(sandbox, 'node', ['scripts/audit-i18n.mjs'], { allowFailure: true });
  record(
    result.code === 0,
    'the audit passes after a full add/remove language round trip',
    result.code === 0 ? '' : result.stdout.trim().split('\n').slice(-8).join(' | ')
  );

  if (altLoc !== baseLoc) {
    result = run(sandbox, 'node', ['scripts/set-default-language.mjs', altLoc]);
    record(
      result.code === 0 &&
        JSON.parse(read('client/locales.json')).defaultLocale === altLoc &&
        JSON.parse(read('client/locales.json')).locales[0] === altLoc,
      `i18n:set-default switches client/locales.json defaultLocale to ${altLoc}`
    );

    result = run(sandbox, 'node', ['scripts/audit-i18n.mjs'], { allowFailure: true });
    record(
      result.code === 0,
      `the audit passes while default locale is ${altLoc}`,
      result.code === 0 ? '' : result.stdout.trim().split('\n').slice(-8).join(' | ')
    );

    result = run(sandbox, 'node', ['scripts/set-default-language.mjs', baseLoc]);
    record(
      result.code === 0 &&
        JSON.parse(read('client/locales.json')).defaultLocale === baseLoc &&
        JSON.parse(read('client/locales.json')).locales[0] === baseLoc,
      `i18n:set-default restores client/locales.json defaultLocale back to ${baseLoc}`
    );
  }

  // ---------------------------------------------------------------------
  // 7. block:adapt and i18n:extract
  // ---------------------------------------------------------------------
  console.log('\n### 7. block:adapt and i18n:extract');
  const adaptSample = '<div class="ml-4 pr-2 text-left rounded-tl-lg border-l border-r-2 left-0 bg-white text-gray-500"></div>\n';
  fs.writeFileSync(path.join(sandbox, 'adapt-sample.astro'), adaptSample);

  result = run(sandbox, 'node', [
    'scripts/block-adapt.mjs',
    '--file=adapt-sample.astro',
    '--dry-run',
  ]);
  record(
    result.code === 0 && read('adapt-sample.astro') === adaptSample,
    'block:adapt --dry-run reports changes without writing them'
  );

  result = run(sandbox, 'node', ['scripts/block-adapt.mjs', '--file=adapt-sample.astro']);
  const adapted = read('adapt-sample.astro');
  record(
    result.code === 0 &&
      adapted.includes('ms-4') &&
      adapted.includes('pe-2') &&
      adapted.includes('text-start') &&
      adapted.includes('rounded-ss-lg') &&
      adapted.includes('border-s') &&
      adapted.includes('bg-bg') &&
      adapted.includes('text-muted') &&
      !/\b(?:ml|pr)-\d|text-left|border-l(?!-)|bg-white|text-gray-500/.test(adapted),
    'block:adapt rewrites physical classes to logical and semantic ones'
  );

  const extractSample =
    '---\nconst title = "Hello";\n---\n<section><p>Extract this sentence</p></section>\n';
  fs.writeFileSync(path.join(sandbox, 'extract-sample.astro'), extractSample);
  result = run(sandbox, 'node', [
    'scripts/i18n-extract.mjs',
    '--target=extract-sample.astro',
    '--key=test',
    '--replace',
    '--dry-run',
  ]);
  record(
    result.code === 0 &&
      read('extract-sample.astro') === extractSample &&
      !JSON.parse(read(`client/messages/${baseLoc}.json`)).test_extract_this_sentence,
    'i18n:extract --dry-run leaves the file and the dictionaries untouched'
  );
  record(
    /missing from (?:messages|merged .* dictionary)/.test(result.stderr),
    'i18n:extract warns when --replace references missing keys'
  );

  result = run(sandbox, 'node', [
    'scripts/i18n-extract.mjs',
    '--target=extract-sample.astro',
    '--key=test',
    '--replace',
    '--auto-add',
  ]);
  const extracted = read('extract-sample.astro');
  record(
    result.code === 0 &&
      extracted.includes("import * as m from '@/paraglide/messages'") &&
      extracted.includes("{m.test_extract_this_sentence({})}") &&
      JSON.parse(read(`client/messages/${altLoc === baseLoc ? baseLoc : altLoc}.json`)).test_extract_this_sentence !==
        undefined,
    'i18n:extract --replace --auto-add rewrites the template and registers the key in client/messages/'
  );

  // ---------------------------------------------------------------------
  // 8. Content types
  // ---------------------------------------------------------------------
  console.log('\n### 8. Content types: list, toggle, new');

  result = run(sandbox, 'node', ['scripts/content-list.mjs', '--json']);
  const listedTypes = JSON.parse(result.stdout);
  record(
    listedTypes.types.some((type) => type.key === 'projects' && type.enabled) &&
      listedTypes.types.some((type) => type.key === 'blog' && type.base === '/blog/'),
    'content:list --json describes every declared type and its state'
  );

  result = run(sandbox, 'node', ['scripts/content-toggle.mjs', 'disable', 'projects']);
  record(
    result.code === 0 &&
      JSON.parse(read('client/config.json')).content.types.projects.enabled === false &&
      JSON.parse(read('app.config.json')).content.types.projects.enabled === true,
    'content:disable writes sparse override to client/config.json without touching app.config.json'
  );

  result = run(sandbox, 'node', [
    'scripts/content-new.mjs',
    'projects',
    'dormant-work',
    '--title=Dormant',
  ]);
  record(
    result.code === 0 &&
      fs.existsSync(
        path.join(sandbox, 'src', 'content', 'projects', 'dormant-work', 'dormant-work.png')
      ),
    'content:new covers an entry of a disabled type too (re-enabling cannot break the build)'
  );

  result = run(sandbox, 'node', ['scripts/content-toggle.mjs', 'disable', 'pages'], {
    allowFailure: true,
  });
  record(
    result.code !== 0 && JSON.parse(read('app.config.json')).content.types.pages.enabled !== false,
    'content:disable refuses to disable the pages type'
  );

  result = run(sandbox, 'node', ['scripts/content-toggle.mjs', 'enable', 'projects']);
  record(
    result.code === 0 && readMergedConfig(sandbox).content.types.projects.enabled === true,
    'content:enable restores the type'
  );

  result = run(sandbox, 'node', [
    'scripts/content-new.mjs',
    'projects',
    'demo-work',
    '--title=Demo Work',
    `--from=${baseLoc}`,
    '--publish',
  ]);
  const demoSource = read(`src/content/projects/demo-work/${baseLoc}.mdx`);
  record(
    result.code === 0 &&
      /title: "Demo Work"/.test(demoSource) &&
      !/draft: true/.test(demoSource),
    'content:new publishes the source locale of a new entry group'
  );
  if (altLoc !== baseLoc) {
    const demoAlt = read(`src/content/projects/demo-work/${altLoc}.mdx`);
    record(
      /\[TODO:/.test(demoAlt) && /draft: true/.test(demoAlt),
      'content:new keeps untranslated locales as [TODO] drafts'
    );
  }
  record(
    fs.existsSync(path.join(sandbox, 'src', 'content', 'projects', 'demo-work', 'demo-work.png')),
    'content:new generates the group cover instead of shipping a broken image reference'
  );

  result = run(sandbox, 'node', [
    'scripts/content-new.mjs',
    'blog',
    'delegated-post',
    '--title=Delegated',
    '--publish',
  ]);
  record(
    result.code === 0 &&
      fs.existsSync(path.join(sandbox, 'src', 'content', 'blog', 'delegated-post', `${baseLoc}.mdx`)),
    'content:new delegates pages and blog to their own commands'
  );

  result = run(sandbox, 'node', ['scripts/content-new.mjs', 'projects', '../escape'], {
    allowFailure: true,
  });
  record(
    result.code !== 0 && !fs.existsSync(path.join(sandbox, 'src', 'content', 'escape')),
    'content:new rejects a group slug that escapes the collection'
  );

  // ---------------------------------------------------------------------
  // 9. doctor, content:status, link:check
  // ---------------------------------------------------------------------
  console.log('\n### 9. doctor, content:status, link:check');

  result = run(sandbox, 'node', ['scripts/doctor.mjs', '--json'], { allowFailure: true });
  const doctorReport = JSON.parse(result.stdout);
  record(
    result.code === 0 &&
      doctorReport.ok === true &&
      doctorReport.findings.some((finding) => finding.level === 'warn'),
    'doctor reports setup warnings as JSON without failing the build',
    result.code === 0
      ? `exit 0, ${doctorReport.warnings} warning(s)`
      : `exit ${result.code}: ${doctorReport.findings.find((finding) => finding.level === 'error')?.title ?? result.stderr.trim().split('\n')[0]}`
  );

  result = run(sandbox, 'node', ['scripts/content-status.mjs', '--json']);
  const status = JSON.parse(result.stdout);
  record(
    status.entries.some((entry) => entry.type === 'projects' && entry.group === 'demo-work') &&
      typeof status.complete === 'number',
    'content:status reports the per-locale readiness matrix'
  );

  const fakeDist = path.join(sandbox, 'fake-dist');
  fs.mkdirSync(path.join(fakeDist, 'ok'), { recursive: true });
  fs.writeFileSync(path.join(fakeDist, 'ok', 'index.html'), '<p id="present">ok</p>', 'utf-8');
  fs.writeFileSync(
    path.join(fakeDist, 'index.html'),
    '<a href="/ok/">ok</a><a href="/ok/#missing-anchor">broken anchor</a><a href="/missing-page/">broken</a>',
    'utf-8'
  );

  result = run(sandbox, 'node', ['scripts/link-check.mjs', '--dir=fake-dist', '--json'], {
    allowFailure: true,
  });
  const linkReport = JSON.parse(result.stdout);
  const brokenTargets = linkReport.broken.map((entry) => entry.target);
  record(
    result.code === 1 &&
      linkReport.broken.length === 2 &&
      brokenTargets.includes('/missing-page/') &&
      brokenTargets.includes('/ok/#missing-anchor'),
    'link:check fails on a link whose page or fragment was not built',
    brokenTargets.join(', ')
  );

  fs.writeFileSync(
    path.join(fakeDist, 'index.html'),
    '<a href="/ok/">ok</a><a href="/ok">also ok</a><a href="/ok/#present">anchor ok</a>',
    'utf-8'
  );
  result = run(sandbox, 'node', ['scripts/link-check.mjs', '--dir=fake-dist']);
  record(result.code === 0, 'link:check accepts directory, extension-less and anchored paths that resolve');

  // ---------------------------------------------------------------------
  // 10. Client delivery workflows: --preset=landing, site:init, i18n:solo
  // ---------------------------------------------------------------------
  console.log('\n### 10. Landing preset, site:init, and i18n:solo');

  result = run(sandbox, 'node', [
    'scripts/new-page.mjs',
    'offer',
    '--preset=landing',
    `--from=${baseLoc}`,
    '--title=Product Launch',
    '--publish',
  ]);
  const offerSource = read(`src/content/pages/offer/${baseLoc}.mdx`);
  record(
    result.code === 0 &&
      /hero:\s*"none"/.test(offerSource) &&
      /container:\s*"canvas"/.test(offerSource) &&
      /flushTop:\s*true/.test(offerSource) &&
      offerSource.includes('LandingHeroSplit') &&
      offerSource.includes('FaqAccordion') &&
      exists('src/content/pages/offer/offer.png'),
    'new:page --preset=landing scaffolds canvas landing blocks and artwork'
  );
  run(sandbox, 'node', ['scripts/remove-page.mjs', 'offer', '--force']);

  result = run(sandbox, 'node', [
    'scripts/site-init.mjs',
    '--name=Acme Digital',
    '--short-name=Acme',
    '--desc=Rapid web delivery studio',
    '--email=hello@acme.test',
    '--preset=emerald',
    '--primary=',
    '--accent=',
    '--font=jakarta',
    '--rtl-font=noto-arabic',
    '--og-mode=branded',
    '--blog=false',
    '--skip-assets',
    '--yes',
  ]);
  const initedMerged = readMergedConfig(sandbox);
  const initedClient = JSON.parse(read('client/config.json'));
  const untouchedCore = JSON.parse(read('app.config.json'));
  record(
    result.code === 0 &&
      initedMerged.site.name === 'Acme Digital' &&
      initedMerged.brand.preset === 'emerald' &&
      initedMerged.brand.themeColor === '#047857' &&
      initedMerged.brand.fontPreset === 'jakarta' &&
      initedMerged.brand.rtlFontPreset === 'noto-arabic' &&
      initedMerged.brand.socialCardMode === 'branded' &&
      initedMerged.content.types.blog.enabled === false &&
      initedClient.site?.name === 'Acme Digital' &&
      untouchedCore.site.name !== 'Acme Digital',
    'site:init writes sparse client/config.json overrides while keeping app.config.json clean'
  );

  if (altLoc !== baseLoc) {
    result = run(sandbox, 'node', ['scripts/set-language-mode.mjs', altLoc, '--force']);
    const soloLocales = JSON.parse(read('client/locales.json'));
    record(
      result.code === 0 &&
        soloLocales.locales.length === 1 &&
        soloLocales.defaultLocale === altLoc &&
        exists(`.locale-archive/${baseLoc}/messages.json`),
      `i18n:solo switches client/locales.json to single-language "${altLoc}" and archives removed locale content`
    );

    result = run(sandbox, 'node', ['scripts/audit-i18n.mjs'], { allowFailure: true });
    record(
      result.code === 0,
      'audit passes in solo mode with archived inactive locale content',
      result.code === 0 ? '' : result.stdout.trim().split('\n').slice(-8).join(' | ')
    );

    // Restore archived locale seamlessly via add-language + set-default
    result = run(sandbox, 'node', [
      'scripts/add-language.mjs',
      baseLoc,
      '--with-content',
    ]);
    const restored =
      result.code === 0 &&
      JSON.parse(read('client/locales.json')).locales.includes(baseLoc) &&
      exists(`src/content/pages/home/${baseLoc}.mdx`);
    record(restored, `i18n:add-lang restores archived locale "${baseLoc}" cleanly`);
    run(sandbox, 'node', ['scripts/set-default-language.mjs', baseLoc]);
  }

  // ---------------------------------------------------------------------
  // 11. Two-tier starter seed & upstream health check
  // ---------------------------------------------------------------------
  console.log('\n### 11. starter:seed and upstream:check');

  // Remove scratch drafts created in earlier sections so starter:seed/audit run on clean content
  for (const scratch of [
    'src/content/blog/draft-post',
    'src/content/blog/publish-ready',
    'src/content/blog/delegated-post',
    'src/content/projects/demo-work',
    'src/content/projects/dormant-work',
  ]) {
    fs.rmSync(path.join(sandbox, scratch), { recursive: true, force: true });
  }
  run(sandbox, 'node', ['scripts/content-toggle.mjs', 'enable', 'blog']);
  run(sandbox, 'node', ['scripts/content-toggle.mjs', 'enable', 'projects']);

  result = run(sandbox, 'node', ['scripts/seed-starter.mjs', '--yes']);
  record(
    result.code === 0 &&
      exists('src/content/pages/about/en.mdx') &&
      exists('src/content/blog/first-post/en.mdx') &&
      exists('src/content/projects/atlas-dashboard/en.mdx') &&
      read('client/navigation.ts').includes("'about'"),
    'starter:seed installs demo pages, blog posts, projects, and client/navigation.ts'
  );

  result = run(sandbox, 'node', ['scripts/audit-i18n.mjs'], { allowFailure: true });
  record(
    result.code === 0,
    'audit passes on seeded starter-kit demo state',
    result.code === 0 ? '' : result.stdout.trim().split('\n').slice(-8).join(' | ')
  );

  result = run(sandbox, 'node', ['scripts/upstream-check.mjs'], { allowFailure: true });
  record(
    result.code === 0,
    'upstream:check passes on seeded starter-kit demo state',
    result.code === 0 ? '' : result.stderr.trim().split('\n').slice(-4).join(' | ')
  );

  result = run(sandbox, 'node', ['scripts/seed-starter.mjs', '--clean', '--yes']);
  record(
    result.code === 0 &&
      !exists('src/content/pages/about') &&
      !exists('src/content/blog/first-post') &&
      !exists('src/content/projects/atlas-dashboard') &&
      exists('src/content/pages/home/en.mdx'),
    'starter:seed --clean removes demo items while preserving home and core structure'
  );

  result = run(sandbox, 'node', ['scripts/upstream-check.mjs'], { allowFailure: true });
  record(
    result.code === 0,
    'upstream:check passes after returning to clean minimal base state',
    result.code === 0 ? '' : result.stderr.trim().split('\n').slice(-4).join(' | ')
  );

  // ---------------------------------------------------------------------
  // 12. The working copy is untouched
  // ---------------------------------------------------------------------
  console.log('\n### 12. Isolation');
  record(
    !exists('node_modules/@inlang/paraglide-js'),
    'the sandbox has no Paraglide install of its own'
  );
  record(
    fs.existsSync(path.join(rootDir, 'node_modules', '@inlang', 'paraglide-js', 'bin', 'run.js')),
    'the dependency links of the working copy are intact'
  );
  record(
    trackedSandboxTargets.every(
      (rel) => fs.existsSync(path.join(rootDir, rel)) === workingCopyPreState[rel]
    ),
    'the working copy keeps no scaffolded content from the sandbox'
  );
  record(
    readMergedConfig(rootDir).content.types.projects.enabled === workingCopyProjectsEnabledBefore &&
      fs.readFileSync(path.join(rootDir, 'app.config.json'), 'utf-8') === workingCopyCoreAppConfigBefore,
    'the working copy keeps its content-type configuration and core app.config.json intact'
  );
} catch (error) {
  const extra = [error.stderr, error.stdout].filter(Boolean).join('\n').trim();
  record(false, 'verification script crashed', extra ? `${error.message}\n${extra}` : error.message);
} finally {
  fs.rmSync(SANDBOX_ROOT, { recursive: true, force: true });
}

const failed = results.filter((entry) => !entry.ok);
console.log(`\n----------------------------------------`);
console.log(`${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log('Failed checks:');
  for (const entry of failed) console.log(`  - ${entry.label} ${entry.detail}`);
  process.exit(1);
}
