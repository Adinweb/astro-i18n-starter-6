// @ts-check
import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

const isBuild = process.env.npm_lifecycle_event === 'build' || process.argv.includes('build');
const mode = isBuild ? 'production' : 'development';

/**
 * Minimal .env reader. Astro injects the resolved `site` into
 * `import.meta.env.SITE`, so this is the only place that needs to read it.
 * Shell environment always wins over the file.
 * @param {string} key
 * @returns {string | undefined}
 */
function readEnvValue(key) {
  for (const file of [`.env.${mode}`, '.env']) {
    try {
      const content = fs.readFileSync(new URL(file, import.meta.url), 'utf-8');
      const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, 'm'));
      if (match) {
        return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
      }
    } catch {
      // File does not exist; keep looking.
    }
  }
  return undefined;
}

const siteUrl = process.env.SITE_URL ?? readEnvValue('SITE_URL');

if (isBuild && !siteUrl) {
  throw new Error(
    'SITE_URL is required for production builds. Add it to .env or set it in the environment ' +
      '(for example: SITE_URL=https://your-domain.com), then run the build again.'
  );
}

const site = siteUrl ?? 'http://localhost:3000';

try {
  new URL(site);
} catch {
  throw new Error(`SITE_URL is not a valid absolute URL: "${site}"`);
}

// https://astro.build/config
export default defineConfig({
  site,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  compressHTML: true,
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
