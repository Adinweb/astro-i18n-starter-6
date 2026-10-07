#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const pageKey = args.find((a) => !a.startsWith('--'));
let title = pageKey || 'New Page';

for (const arg of args) {
  if (arg.startsWith('--title=')) {
    title = arg.slice(8);
  }
}

if (!pageKey) {
  console.error('Usage: npm run new:page <page-key> [--title="<title>"]');
  process.exit(1);
}

const rootDir = process.cwd();
const targetDir = path.join(rootDir, 'src', 'content', 'pages', pageKey);

if (fs.existsSync(targetDir)) {
  console.error(`❌ Page group already exists: ${targetDir}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

const files = {
  'en.mdx': `---
title: "${title}"
slug: "${pageKey}"
description: "Description for ${title}"
draft: false
---

# ${title}

Content coming soon...
`,
  'de.mdx': `---
title: "[TODO: de] ${title}"
slug: "${pageKey}-de"
description: "[TODO: de] Description for ${title}"
draft: false
---

# [TODO: de] ${title}

Inhalt folgt in Kürze...
`,
  'fa.mdx': `---
title: "[TODO: fa] ${title}"
slug: "${pageKey}-fa"
description: "[TODO: fa] Description for ${title}"
draft: false
---

# [TODO: fa] ${title}

محتوا به زودی افزوده خواهد شد...
`,
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(targetDir, filename), content, 'utf-8');
}

console.log(`✅ Scaffolding complete in src/content/pages/${pageKey}/`);

// Register nav translation key
try {
  console.log(`🔄 Registering nav_${pageKey} translation key...`);
  execSync(
    `node scripts/i18n-add.mjs --category=nav --key=${pageKey} --fa="[TODO: fa] ${title}" --en="${title}" --de="[TODO: de] ${title}"`,
    { stdio: 'inherit' }
  );
} catch (e) {
  console.warn('⚠️ Warning: Failed to auto-register nav key:', e.message);
}
