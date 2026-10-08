#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import MagicString from 'magic-string';

const args = process.argv.slice(2);
let targetPath = '';
let namespace = 'common';
let autoAdd = false;
let replace = false;
let dryRun = false;

for (const arg of args) {
  if (arg.startsWith('--target=')) {
    targetPath = arg.slice(9);
  } else if (arg.startsWith('--key=')) {
    namespace = arg.slice(6);
  } else if (arg === '--auto-add') {
    autoAdd = true;
  } else if (arg === '--replace') {
    replace = true;
  } else if (arg === '--dry-run') {
    dryRun = true;
  }
}

if (!targetPath) {
  console.error('Usage: npm run i18n:extract -- --target=<file-or-dir> --key=<namespace> [--auto-add] [--replace] [--dry-run]');
  process.exit(1);
}

const rootDir = process.cwd();
const resolvedTarget = path.resolve(rootDir, targetPath);
if (!fs.existsSync(resolvedTarget)) {
  console.error(`Target path not found: ${resolvedTarget}`);
  process.exit(1);
}

const filesToProcess = [];
if (fs.statSync(resolvedTarget).isDirectory()) {
  function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, item.name);
      if (item.isDirectory()) walk(p);
      else if (item.name.endsWith('.astro') || item.name.endsWith('.mdx')) filesToProcess.push(p);
    }
  }
  walk(resolvedTarget);
} else {
  filesToProcess.push(resolvedTarget);
}

const inlangSettings = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'project.inlang', 'settings.json'), 'utf-8')
);
const LOCALES = inlangSettings.locales;

const dictsByLocale = {};
for (const loc of LOCALES) {
  const locPath = path.join(rootDir, 'messages', `${loc}.json`);
  if (fs.existsSync(locPath)) {
    dictsByLocale[loc] = JSON.parse(fs.readFileSync(locPath, 'utf-8'));
  }
}

let extractedCount = 0;

for (const file of filesToProcess) {
  const content = fs.readFileSync(file, 'utf-8');
  const s = new MagicString(content);

  // Split frontmatter and template if .astro
  let templateStart = 0;
  let hasFrontmatter = false;
  let frontmatterEnd = 0;

  if (file.endsWith('.astro') && content.startsWith('---')) {
    const secondFmIndex = content.indexOf('---', 3);
    if (secondFmIndex !== -1) {
      hasFrontmatter = true;
      frontmatterEnd = secondFmIndex + 3;
      templateStart = frontmatterEnd;
    }
  }

  const templateContent = content.slice(templateStart);

  // Match text nodes: >text<
  const textNodeRegex = />([^<>{}\r\n]+)</g;
  let mNode;
  const replacements = [];

  while ((mNode = textNodeRegex.exec(templateContent)) !== null) {
    const rawText = mNode[1].trim();
    if (rawText.length < 3) continue;
    if (rawText.startsWith('//') || rawText.startsWith('/*')) continue;

    const keySuffix = rawText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 30)
      .replace(/^_+|_+$/g, '');

    if (!keySuffix) continue;
    const key = `${namespace}_${keySuffix}`;

    const textOffsetInTemplate = mNode.index + mNode[0].indexOf(mNode[1]);
    const absoluteStart = templateStart + textOffsetInTemplate;
    const absoluteEnd = absoluteStart + mNode[1].length;

    replacements.push({
      key,
      text: rawText,
      start: absoluteStart,
      end: absoluteEnd,
    });
  }

  if (replacements.length > 0) {
    console.log(`Found ${replacements.length} string(s) in ${path.relative(rootDir, file)}`);

    for (const r of replacements) {
      extractedCount++;
      if (autoAdd) {
        if (dictsByLocale.en && !dictsByLocale.en[r.key]) {
          for (const loc of LOCALES) {
            if (!dictsByLocale[loc]) continue;
            dictsByLocale[loc][r.key] = loc === 'en' ? r.text : `[TODO: ${loc}] ${r.text}`;
          }
          console.log(`  + Key created: ${r.key} = "${r.text}" across locales: ${LOCALES.join(', ')}`);
        }
      }

      if (replace) {
        s.overwrite(r.start, r.end, `{m.${r.key}()}`);
      }
    }

    if (replace && file.endsWith('.astro')) {
      const currentCode = s.toString();
      if (!currentCode.includes("import * as m from '@/paraglide/messages'")) {
        if (hasFrontmatter) {
          s.appendRight(3, "\nimport * as m from '@/paraglide/messages';");
        } else {
          s.prepend("---\nimport * as m from '@/paraglide/messages';\n---\n\n");
        }
      }
    }

    if (!dryRun && replace) {
      fs.writeFileSync(file, s.toString(), 'utf-8');
      console.log(`  ✓ Updated ${path.relative(rootDir, file)}`);
    }
  }
}

if (autoAdd && !dryRun && extractedCount > 0) {
  const sortKeys = (obj) => {
    const sorted = {};
    Object.keys(obj).sort().forEach((k) => (sorted[k] = obj[k]));
    return sorted;
  };

  for (const loc of LOCALES) {
    if (!dictsByLocale[loc]) continue;
    const locPath = path.join(rootDir, 'messages', `${loc}.json`);
    fs.writeFileSync(locPath, JSON.stringify(sortKeys(dictsByLocale[loc]), null, 2) + '\n', 'utf-8');
  }
  console.log(`✅ Saved new dictionary keys across active messages/*.json files`);
}

console.log(`\n🎉 Extracted a total of ${extractedCount} item(s).`);
