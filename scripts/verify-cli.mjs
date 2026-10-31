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
import { execFileSync } from 'node:child_process';

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

  // The sandbox has no `node_modules` of its own: the scripts only need the
  // Node built-ins, and the message compiler is reached through the shim.
  writePnpmShim(path.join(SANDBOX_ROOT, 'bin'), copy);
  return copy;
}

function run(cwd, command, args, { allowFailure = false } = {}) {
  try {
    const stdout = execFileSync(command, args, {
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
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    if (!allowFailure) throw error;
    return {
      code: error.status ?? 1,
      stdout: error.stdout?.toString() ?? '',
      stderr: error.stderr?.toString() ?? '',
    };
  }
}

const sandbox = makeSandbox();
const read = (relative) => fs.readFileSync(path.join(sandbox, relative), 'utf-8');
const exists = (relative) => fs.existsSync(path.join(sandbox, relative));
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
    !read(`src/content/pages/contact/${altLoc}.mdx`).includes(`# [TODO: ${altLoc}] Contact Us`),
    'new:page does not duplicate the localized title in the body'
  );
  record(
    read(`src/content/pages/contact/${baseLoc}.mdx`).includes('image: "./contact.png"'),
    'new:page points the hero at the group artwork'
  );
  record(exists('src/content/pages/contact/contact.png'), 'new:page generates the group artwork');
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
  // 6. The working copy is untouched
  // ---------------------------------------------------------------------
  console.log('\n### 6. Isolation');
  record(
    !exists('node_modules'),
    'the sandbox has no node_modules of its own'
  );
  record(
    fs.existsSync(path.join(rootDir, 'node_modules', '@inlang', 'paraglide-js', 'bin', 'run.js')),
    'the dependency links of the working copy are intact'
  );
  record(
    !fs.existsSync(path.join(rootDir, 'src', 'content', 'pages', 'contact')) &&
      !fs.existsSync(path.join(rootDir, 'src', 'content', 'blog', 'ai-agents')),
    'the working copy keeps no scaffolded content'
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
