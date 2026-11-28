#!/usr/bin/env node
/**
 * Cleanly resets client-level configuration overrides (`client/config.json`,
 * `client/cms.json`, `deploy/`, and `public/brand/`) back to `{}` so an agency
 * can start a fresh client project without touching core `app.config.json` or `src/`.
 *
 * Usage:
 *   npm run site:reset -- --yes [--clean-starter]
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { clientConfigPathFor, cmsConfigPathFor } from './lib/config.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: npm run site:reset -- --yes [options]

Options:
  --yes / -y          Confirm resetting client/config.json, client/cms.json, deploy/, and public/brand/
  --clean-starter     Also run "npm run starter:seed -- --clean --yes" to strip demo pages/posts/projects
  --clean-aistudio    Also remove dev-only public/assets/aistudio/ reference folder
`);
  process.exit(0);
}

let confirmed = args.includes('--yes') || args.includes('-y') || args.includes('--force');
const cleanStarter = args.includes('--clean-starter');
const cleanAiStudio = args.includes('--clean-aistudio');

if (!confirmed && process.stdin.isTTY) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  confirmed = await new Promise((resolve) => {
    rl.question(
      '⚠️  Reset client/config.json, client/cms.json, deploy/, and public/brand/ back to clean defaults? (y/N): ',
      (answer) => {
        rl.close();
        resolve(/^y(es)?$/i.test(answer.trim()));
      }
    );
  });
}

if (!confirmed) {
  console.error('❌ Reset cancelled. Pass `-- --yes` to run non-interactively.');
  process.exit(1);
}

for (const cfgPath of [clientConfigPathFor(rootDir), cmsConfigPathFor(rootDir)]) {
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(cfgPath, '{}\n', 'utf-8');
}

for (const relDir of ['deploy', path.join('public', 'brand')]) {
  fs.rmSync(path.join(rootDir, relDir), { recursive: true, force: true });
}

if (cleanAiStudio) {
  fs.rmSync(path.join(rootDir, 'public', 'assets', 'aistudio'), { recursive: true, force: true });
}

if (cleanStarter) {
  execFileSync(process.execPath, [path.join(rootDir, 'scripts', 'seed-starter.mjs'), '--clean', '--yes'], {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

console.log('✅ Reset client/config.json and client/cms.json to `{}`.');
console.log('✅ Cleaned generated deploy/ and public/brand/ artifacts.');
if (cleanAiStudio) {
  console.log('✅ Removed dev-only public/assets/aistudio/ reference folder.');
}
console.log('   Next: run `npm run client:bootstrap` or `npm run site:init` to configure a new client.');
