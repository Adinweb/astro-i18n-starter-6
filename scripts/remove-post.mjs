#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const args = process.argv.slice(2);
const groupSlug = args.find((a) => !a.startsWith('--'));
let collection = 'blog';
let targetLocale = '';
let force = false;

for (const arg of args) {
  if (arg.startsWith('--collection=')) collection = arg.slice(13);
  else if (arg.startsWith('--locale=')) targetLocale = arg.slice(9);
  else if (arg === '--force' || arg === '-y' || arg === '--yes') force = true;
}

if (!groupSlug) {
  console.error('Usage: npm run remove:post <group-slug> [--collection=<name>] [--locale=<locale>] [--force]');
  process.exit(1);
}

const rootDir = process.cwd();
const targetGroupDir = path.join(rootDir, 'src', 'content', collection, groupSlug);

if (!fs.existsSync(targetGroupDir)) {
  console.error(`❌ Post group directory not found: ${targetGroupDir}`);
  process.exit(1);
}

async function confirmDeletion() {
  if (force || !process.stdin.isTTY) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q) => new Promise((resolve) => rl.question(q, resolve));

  try {
    const targetDesc = targetLocale
      ? `"${targetLocale}.mdx" in post "${groupSlug}"`
      : `entire post directory for "${groupSlug}" (all languages)`;
    const answer = await question(
      `⚠️ Are you sure you want to delete ${targetDesc}? (y/n) [default: n]: `
    );
    const trimmed = answer.trim().toLowerCase();
    return trimmed === 'y' || trimmed === 'yes';
  } finally {
    rl.close();
  }
}

const proceed = await confirmDeletion();
if (!proceed) {
  console.log('🛑 Operation cancelled. No changes were made.');
  process.exit(0);
}

if (targetLocale) {
  const targetFile = path.join(targetGroupDir, `${targetLocale}.mdx`);
  const targetMd = path.join(targetGroupDir, `${targetLocale}.md`);

  if (fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
    console.log(`✅ Deleted: src/content/${collection}/${groupSlug}/${targetLocale}.mdx`);
  } else if (fs.existsSync(targetMd)) {
    fs.unlinkSync(targetMd);
    console.log(`✅ Deleted: src/content/${collection}/${groupSlug}/${targetLocale}.md`);
  } else {
    console.error(`❌ File for locale "${targetLocale}" not found in ${targetGroupDir}`);
    process.exit(1);
  }
} else {
  fs.rmSync(targetGroupDir, { recursive: true, force: true });
  console.log(`✅ Successfully removed article group: src/content/${collection}/${groupSlug}/`);
}
