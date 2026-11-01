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
 * Writes a `pnpm` shim into the sandbox.
 *
 * The content scripts call `pnpm run messages:compile` to refresh the
 * compiled messages. A real package manager must never run inside the
 * sandbox: pnpm rewrites the dependency links of the `node_modules` it finds
 * and would repoint the *working copy* at the sandbox. The shim therefore
 * runs the Paraglide compiler directly, against the sandbox copy only.
 */
function writePnpmShim(binDir, projectDir) {
  fs.mkdirSync(binDir, { recursive: true });
  const compiler = path.join(rootDir, 'node_modules', '@inlang', 'paraglide-js', 'bin', 'run.js');
  const project = path.join(projectDir, 'project.inlang');
  const outdir = path.join(projectDir, 'src', 'paraglide');

  fs.writeFileSync(
    path.join(binDir, 'pnpm'),
    [
      '#!/bin/sh',
      '# Sandbox shim: compiles the messages of the sandbox copy, nothing else.',
      'if [ "$1" = "run" ] && [ "$2" = "messages:compile" ]; then',
      `  node "${compiler}" compile --project "${project}" --outdir "${outdir}" || true`,
      'fi',
      'exit 0',
      '',
    ].join('\n'),
    'utf-8'
  );
  fs.chmodSync(path.join(binDir, 'pnpm'), 0o755);

  fs.writeFileSync(
    path.join(binDir, 'pnpm.cmd'),
    [
      '@echo off',
      'if "%1"=="run" if "%2"=="messages:compile" (',
      `  node "${compiler}" compile --project "${project}" --outdir "${outdir}"`,
      ')',
      'exit /b 0',
      '',
    ].join('\n'),
    'utf-8'
  );
}

/**
 * Resolves the directory of an installed package, following pnpm's symlinks
 * and nested dependency layout.
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
    'app.config.json',
    'package.json',
    'astro.config.mjs',
    'tsconfig.json',
    'project.inlang',
    'messages',
    'scripts',
    'public',
    'src',
  ]) {
    const source = path.join(rootDir, entry);
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, path.join(copy, entry), { recursive: true });
  }

  // The sandbox has no Paraglide install of its own: the message compiler is
  // reached through the shim. `magic-string` (used by block:adapt and
  // i18n:extract) is copied in, because those two have no shim path. Its
  // dependency is copied next to it, the way the isolated pnpm store resolves
  // it, since pnpm does not hoist it to the top level.
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
  writePnpmShim(path.join(SANDBOX_ROOT, 'bin'), copy);
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
      // The shim comes first, so the sandbox never starts a real pnpm.
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
const sandboxSettings = JSON.parse(read('project.inlang/settings.json'));
const sandboxLocales = sandboxSettings.locales;
const baseLoc = sandboxSettings.baseLocale || 'en';
const altLocs = sandboxLocales.filter((loc) => loc !== baseLoc);
const altLoc = altLocs[0] || baseLoc;

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
    JSON.parse(read(`messages/${altLoc}.json`)).nav_contact !== undefined,
    'new:page registers nav_contact in every dictionary'
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
    JSON.parse(read(`messages/${baseLoc}.json`)).contact_form_label === 'Send message' &&
      (altLoc === baseLoc || JSON.parse(read(`messages/${altLoc}.json`)).contact_form_label === 'ارسال پیام'),
    'i18n:add writes the explicit translations'
  );

  result = run(sandbox, 'node', [
    'scripts/i18n-add.mjs',
    '--category=contact',
    '--key=placeholder_label',
    `--${baseLoc}=Placeholder label`,
  ]);
  record(
    altLoc === baseLoc ||
      JSON.parse(read(`messages/${altLoc}.json`)).contact_placeholder_label === `[TODO: ${altLoc}] placeholder_label`,
    'i18n:add leaves a placeholder for the missing locales'
  );

  result = run(sandbox, 'node', [
    'scripts/i18n-add-batch.mjs',
    `--json={"cart_checkout":{"${baseLoc}":"Checkout"${altLoc !== baseLoc ? `,"${altLoc}":"تسویه حساب"` : ''}}}`,
  ]);
  record(result.code === 0, 'i18n:add-batch accepts inline JSON');
  record(
    JSON.parse(read(`messages/${baseLoc}.json`)).cart_checkout === 'Checkout',
    'i18n:add-batch writes the batch keys'
  );

  result = run(sandbox, 'node', [
    'scripts/i18n-add-batch.mjs',
    `--json={"submit":{"${baseLoc}":"Submit"}}`,
    '--category=contact',
  ]);
  record(result.code === 0, 'i18n:add-batch accepts --category');
  record(
    JSON.parse(read(`messages/${baseLoc}.json`)).contact_submit === 'Submit',
    'i18n:add-batch applies the --category prefix',
    Object.keys(JSON.parse(read(`messages/${baseLoc}.json`))).filter((k) => k.startsWith('contact_')).join(', ')
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
    JSON.parse(read(`messages/${altLoc}.json`)).nav_contact !== undefined,
    'remove:page --locale keeps the nav key in every dictionary'
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
    JSON.parse(read(`messages/${baseLoc}.json`)).nav_contact !== undefined,
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
    exists('messages/zz.json') &&
      read('src/i18n/locales.ts').includes("'zz'") &&
      JSON.parse(read('project.inlang/settings.json')).locales.includes('zz'),
    'i18n:add-lang updates the dictionary, LOCALES, and inlang settings'
  );

  // Re-running the command must not throw away translations that already exist.
  const zetaDict = JSON.parse(read('messages/zz.json'));
  zetaDict.nav_home = 'Zeta Home';
  fs.writeFileSync(path.join(sandbox, 'messages/zz.json'), JSON.stringify(zetaDict, null, 2) + '\n');
  result = run(sandbox, 'node', ['scripts/add-language.mjs', 'zz', '--name=Zeta', '--no-content']);
  record(
    result.code === 0 && JSON.parse(read('messages/zz.json')).nav_home === 'Zeta Home',
    'i18n:add-lang re-run keeps existing translations'
  );

  result = run(sandbox, 'node', ['scripts/remove-language.mjs', 'zz', '--force', '--keep-content']);
  record(result.code === 0, 'i18n:remove-lang unregisters the locale');
  record(
    !exists('messages/zz.json') &&
      !read('src/i18n/locales.ts').includes("'zz'") &&
      !JSON.parse(read('project.inlang/settings.json')).locales.includes('zz'),
    'i18n:remove-lang cleans the dictionary, LOCALES, and inlang settings'
  );
  result = run(sandbox, 'node', ['scripts/audit-i18n.mjs'], { allowFailure: true });
  record(
    result.code === 0,
    'the audit passes after a full add/remove language round trip',
    result.code === 0 ? '' : result.stdout.trim().split('\n').slice(-8).join(' | ')
  );

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
      !JSON.parse(read(`messages/${baseLoc}.json`)).test_extract_this_sentence,
    'i18n:extract --dry-run leaves the file and the dictionaries untouched'
  );
  record(
    /missing from messages/.test(result.stderr),
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
      JSON.parse(read(`messages/${altLoc === baseLoc ? baseLoc : altLoc}.json`)).test_extract_this_sentence !==
        undefined,
    'i18n:extract --replace --auto-add rewrites the template and registers the key'
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
    result.code === 0 && JSON.parse(read('app.config.json')).content.types.projects.enabled === false,
    'content:disable switches the type off in app.config.json'
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
    result.code === 0 && JSON.parse(read('app.config.json')).content.types.projects.enabled === true,
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
  fs.writeFileSync(path.join(fakeDist, 'ok', 'index.html'), '<p>ok</p>', 'utf-8');
  fs.writeFileSync(
    path.join(fakeDist, 'index.html'),
    '<a href="/ok/">ok</a><a href="/missing-page/">broken</a>',
    'utf-8'
  );

  result = run(sandbox, 'node', ['scripts/link-check.mjs', '--dir=fake-dist', '--json'], {
    allowFailure: true,
  });
  const linkReport = JSON.parse(result.stdout);
  record(
    result.code === 1 &&
      linkReport.broken.length === 1 &&
      linkReport.broken[0].target === '/missing-page/',
    'link:check fails on an internal link whose target was not built'
  );

  fs.writeFileSync(
    path.join(fakeDist, 'index.html'),
    '<a href="/ok/">ok</a><a href="/ok">also ok</a>',
    'utf-8'
  );
  result = run(sandbox, 'node', ['scripts/link-check.mjs', '--dir=fake-dist']);
  record(result.code === 0, 'link:check accepts directory and extension-less paths that resolve');

  // ---------------------------------------------------------------------
  // 10. The working copy is untouched
  // ---------------------------------------------------------------------
  console.log('\n### 10. Isolation');
  record(
    !exists('node_modules/@inlang/paraglide-js'),
    'the sandbox has no Paraglide install of its own'
  );
  record(
    fs.existsSync(path.join(rootDir, 'node_modules', '@inlang', 'paraglide-js', 'bin', 'run.js')),
    'the dependency links of the working copy are intact'
  );
  record(
    !fs.existsSync(path.join(rootDir, 'src', 'content', 'pages', 'contact')) &&
      !fs.existsSync(path.join(rootDir, 'src', 'content', 'blog', 'ai-agents')) &&
      !fs.existsSync(path.join(rootDir, 'src', 'content', 'projects', 'demo-work')) &&
      !fs.existsSync(path.join(rootDir, 'src', 'content', 'projects', 'dormant-work')) &&
      !fs.existsSync(path.join(rootDir, 'src', 'content', 'blog', 'delegated-post')),
    'the working copy keeps no scaffolded content'
  );
  record(
    JSON.parse(
      fs.readFileSync(path.join(rootDir, 'app.config.json'), 'utf-8')
    ).content.types.projects.enabled === true,
    'the working copy keeps its content-type configuration'
  );
} catch (error) {
  record(false, 'verification script crashed', error.message);
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
