#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const pageKey = args.find((a) => !a.startsWith('--'));
let targetLocale = '';
let force = false;
let cleanNav = true; // default true when removing a whole page

for (const arg of args) {
  if (arg.startsWith('--locale=')) targetLocale = arg.slice(9);
  else if (arg === '--no-clean-nav') cleanNav = false;
  else if (arg === '--clean-nav') cleanNav = true;
  else if (arg === '--force' || arg === '-y' || arg === '--yes') force = true;
}

if (!pageKey) {
  console.error('Usage: npm run remove:page <page-key> [--locale=<locale>] [--no-clean-nav] [--force]');
  process.exit(1);
}

if (pageKey === 'home' && !force) {
  console.error('❌ Refusing to delete critical "home" page without --force flag.');
  process.exit(1);
}

const rootDir = process.cwd();
const targetGroupDir = path.join(rootDir, 'src', 'content', 'pages', pageKey);

if (!fs.existsSync(targetGroupDir)) {
  console.error(`❌ Page group directory not found: ${targetGroupDir}`);
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
      ? `"${targetLocale}.mdx" in page "${pageKey}"`
      : `entire page group for "${pageKey}" (all languages)`;
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
    console.log(`✅ Deleted: src/content/pages/${pageKey}/${targetLocale}.mdx`);
  } else if (fs.existsSync(targetMd)) {
    fs.unlinkSync(targetMd);
    console.log(`✅ Deleted: src/content/pages/${pageKey}/${targetLocale}.md`);
  } else {
    console.error(`❌ File for locale "${targetLocale}" not found in ${targetGroupDir}`);
    process.exit(1);
  }
} else {
  fs.rmSync(targetGroupDir, { recursive: true, force: true });
  console.log(`✅ Successfully removed page group: src/content/pages/${pageKey}/`);

  // Clean nav translation key if present
  if (cleanNav) {
    const navKey = `nav_${pageKey}`;
    const messagesDir = path.join(rootDir, 'messages');
    if (fs.existsSync(messagesDir)) {
      const files = fs.readdirSync(messagesDir).filter((f) => f.endsWith('.json'));
      let modified = false;

      for (const file of files) {
        const filePath = path.join(messagesDir, file);
        try {
          const dict = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (dict[navKey]) {
            delete dict[navKey];
            fs.writeFileSync(filePath, JSON.stringify(dict, null, 2) + '\n', 'utf-8');
            modified = true;
          }
        } catch {
          // ignore parse errors
        }
      }

      if (modified) {
        console.log(`🧹 Cleaned translation key "${navKey}" from dictionaries.`);
        console.log('🔄 Recompiling Paraglide messages...');
        try {
          execSync('npm run messages:compile', { stdio: 'inherit' });
          console.log('🎉 Paraglide recompiled successfully.');
        } catch (e) {
          console.warn('⚠️ Warning: Failed to recompile Paraglide messages:', e.message);
        }
      }
    }
  }
}
