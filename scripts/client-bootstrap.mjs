#!/usr/bin/env node
/**
 * One-step client project bootstrap wizard (`npm run client:bootstrap`).
 *
 * Chains client workspace reset/seeding, `site:init` brand/blueprint/locale setup,
 * `.env` origin & form endpoint configuration, logo-derived favicon/PWA/OG asset
 * generation, and `doctor` verification in a single command (interactive or `--yes`).
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { VALID_BLUEPRINTS } from './lib/blueprints.mjs';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');

function sanitizeEnvValue(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Updates or appends environment variables inside `.env` content while
 * preserving unrelated lines and ordering.
 */
export function upsertEnvContent(existingRaw = '', updates = {}) {
  const cleanUpdates = {};
  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined || val === null) continue;
    cleanUpdates[key] = sanitizeEnvValue(val);
  }

  const lines = existingRaw ? existingRaw.replace(/\r\n/g, '\n').split('\n') : [];
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  const seen = new Set();
  const nextLines = lines.map((line) => {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (!match) return line;
    const key = match[1];
    if (!(key in cleanUpdates)) return line;
    seen.add(key);
    return `${key}=${cleanUpdates[key]}`;
  });

  for (const [key, val] of Object.entries(cleanUpdates)) {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${val}`);
    }
  }

  return `${nextLines.join('\n')}\n`;
}

const SITE_INIT_PASS_THROUGH_PREFIXES = new Set([
  'name',
  'short-name',
  'desc',
  'description',
  'author',
  'email',
  'blueprint',
  'preset',
  'primary',
  'accent',
  'font',
  'rtl-font',
  'og-mode',
  'default-theme',
  'logo',
  'logo-dark',
  'default-locale',
  'blog',
  'projects',
  'cta-page',
  'business-type',
  'legal-name',
  'phone',
  'whatsapp',
  'business-telegram',
  'address',
  'city',
  'country',
  'working-hours',
  'map-url',
  'geo',
  'github',
  'twitter',
  'linkedin',
  'instagram',
  'telegram',
]);

const SITE_INIT_BOOLEAN_FLAGS = new Set([
  '--single-lang',
  '--multi-lang',
  '--delete-content',
  '--allow-draft',
  '--blog',
  '--no-blog',
  '--projects',
  '--no-projects',
  '--keep-demo-banner',
]);

async function runBootstrap() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: npm run client:bootstrap [options]

Workflow steps:
  --reset                        Reset client/config.json, client/cms.json, deploy/, public/brand/ first
  --seed=<all|clean|pages|...>   Seed starter-kit content or pass --seed=clean / --clean-starter
  --handoff                      Run strict \`doctor --handoff\` at the end (default: standard \`doctor\`)
  --skip-assets                  Skip regenerating icons / og-default.png
  --skip-doctor                  Skip running doctor at the end
  --yes / -y                     Headless execution without prompts

Environment (.env):
  --site-url=<url>               Production SITE_URL (e.g. https://client.com)
  --api-url=<url>                PUBLIC_API_BASE_URL
  --contact-url=<url>            PUBLIC_CONTACT_API_URL
  --newsletter-url=<url>         PUBLIC_NEWSLETTER_API_URL
  --turnstile-key=<key>          PUBLIC_TURNSTILE_SITE_KEY
  --web3forms-key=<key>          PUBLIC_WEB3FORMS_KEY
  --from-logo=<path>             Override logo file used to derive favicons/PWA icons

Plus all \`site:init\` flags:
  --name, --short-name, --desc, --author, --email, --blueprint=<${VALID_BLUEPRINTS.join('|')}>,
  --preset, --primary, --accent, --font, --rtl-font, --og-mode, --default-theme,
  --logo, --logo-dark, --default-locale, --single-lang, --multi-lang, --blog, --projects,
  --business-type, --legal-name, --phone, --whatsapp, --business-telegram,
  --address, --city, --country, --working-hours, --map-url, --geo=<lat,lng>, ...
`);
    process.exit(0);
  }

  const yes = args.includes('--yes') || args.includes('-y');
  const shouldReset = args.includes('--reset');
  const skipAssets = args.includes('--skip-assets');
  const skipDoctor = args.includes('--skip-doctor');
  const strictHandoff = args.includes('--handoff') || args.includes('--strict');
  let cleanStarter = args.includes('--clean-starter');
  let seedMode = null;
  let fromLogoPath = '';

  const envUpdates = {};
  const siteInitArgs = [];

  for (const arg of args) {
    if (SITE_INIT_BOOLEAN_FLAGS.has(arg)) {
      siteInitArgs.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    if (!arg.startsWith('--') || eq === -1) continue;
    const key = arg.slice(2, eq);
    const val = arg.slice(eq + 1);

    if (SITE_INIT_PASS_THROUGH_PREFIXES.has(key)) {
      siteInitArgs.push(arg);
      if (key === 'logo' && !fromLogoPath && val.trim()) fromLogoPath = val.trim();
    } else if (key === 'seed') {
      seedMode = val.trim();
      if (seedMode === 'clean') cleanStarter = true;
    } else if (key === 'from-logo') {
      fromLogoPath = val.trim();
    } else if (key === 'site-url') {
      envUpdates.SITE_URL = val;
    } else if (key === 'api-url') {
      envUpdates.PUBLIC_API_BASE_URL = val;
    } else if (key === 'contact-url') {
      envUpdates.PUBLIC_CONTACT_API_URL = val;
    } else if (key === 'newsletter-url') {
      envUpdates.PUBLIC_NEWSLETTER_API_URL = val;
    } else if (key === 'turnstile-key') {
      envUpdates.PUBLIC_TURNSTILE_SITE_KEY = val;
    } else if (key === 'web3forms-key') {
      envUpdates.PUBLIC_WEB3FORMS_KEY = val;
    }
  }

  if (!yes && process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (question, fallback = '') =>
      new Promise((resolve) => {
        const suffix = fallback ? ` [${fallback}]` : '';
        rl.question(`${question}${suffix}: `, (answer) => {
          const trimmed = answer.trim();
          resolve(trimmed || fallback);
        });
      });

    try {
      console.log('\n🧭 One-Step Client Project Bootstrap\n');
      if (seedMode === null && !cleanStarter) {
        const mode = await ask('Content setup (keep / seed / clean)', 'keep');
        if (mode === 'seed') seedMode = 'all';
        else if (mode === 'clean') cleanStarter = true;
      }
      if (!('SITE_URL' in envUpdates)) {
        const urlVal = await ask('Production SITE_URL (leave empty to skip .env update)', '');
        if (urlVal) envUpdates.SITE_URL = urlVal;
      }
      if (!siteInitArgs.some((a) => a.startsWith('--blueprint='))) {
        const bp = await ask(`Industry blueprint (${VALID_BLUEPRINTS.join(', ')})`, 'corporate');
        if (bp) siteInitArgs.push(`--blueprint=${bp}`);
      }
      if (!siteInitArgs.some((a) => a.startsWith('--logo='))) {
        const logoInput = await ask('Client logo file path (optional, e.g. public/logo.svg)', '');
        if (logoInput) {
          siteInitArgs.push(`--logo=${logoInput}`);
          fromLogoPath = logoInput;
        }
      }
    } finally {
      rl.close();
    }
  }

  const runNodeScript = (scriptRel, scriptArgs = []) => {
    execFileSync(process.execPath, [path.join(rootDir, 'scripts', scriptRel), ...scriptArgs], {
      cwd: rootDir,
      stdio: 'inherit',
    });
  };

  if (shouldReset) {
    console.log('1/5 🧹 Resetting client overrides...');
    runNodeScript('site-reset.mjs', ['--yes']);
  }

  if (cleanStarter) {
    console.log('2/5 🧱 Cleaning demo content to bare starter...');
    runNodeScript('seed-starter.mjs', ['--clean', '--yes']);
  } else if (seedMode) {
    console.log(`2/5 🌱 Seeding starter-kit (${seedMode})...`);
    const seedFlag = seedMode === 'all' ? '--all' : `--${seedMode.replace(/^--/, '')}`;
    runNodeScript('seed-starter.mjs', [seedFlag, '--yes']);
  }

  console.log('3/5 🎨 Configuring client brand, blueprint & locales...');
  const initFlags = [...siteInitArgs, '--skip-assets'];
  if (yes || !process.stdin.isTTY) initFlags.push('--yes');
  runNodeScript('site-init.mjs', initFlags);

  if (Object.keys(envUpdates).length > 0) {
    console.log('4/5 🔐 Updating .env configuration...');
    const envPath = path.join(rootDir, '.env');
    const existingEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    fs.writeFileSync(envPath, upsertEnvContent(existingEnv, envUpdates), 'utf-8');
    console.log(`✅ Updated .env (${Object.keys(envUpdates).join(', ')})`);
  } else {
    console.log('4/5 ⏭️  No .env overrides supplied (existing .env / .env.example untouched).');
  }

  if (!skipAssets) {
    console.log('🖼️  Generating favicon suite, PWA icons & default OG card...');
    const assetArgs = ['--brand-only', '--force'];
    if (fromLogoPath) assetArgs.push(`--from-logo=${fromLogoPath}`);
    runNodeScript('generate-assets.mjs', assetArgs);
  }

  if (!skipDoctor) {
    console.log(strictHandoff ? '5/5 🩺 Running strict handoff check...' : '5/5 🩺 Running project doctor...');
    runNodeScript('doctor.mjs', strictHandoff ? ['--handoff'] : []);
  }

  console.log('\n🎉 Client project bootstrap finished!');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  runBootstrap().catch((error) => {
    console.error('❌ Bootstrap failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
