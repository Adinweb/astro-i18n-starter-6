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

/**
 * A build that will be **deployed** must know its public origin: the
 * canonical links, the sitemap and the feed are absolute. A local build is a
 * preview, where the origin is known, so it only warns. `CI` is the signal
 * (Astro sets `NODE_ENV=production` for every build, local ones included, so
 * it cannot tell the two apart), and `ASTRO_REQUIRE_SITE_URL` forces the
 * strict behaviour anywhere.
 */
const isDeployment =
  ['1', 'true', 'yes'].includes(String(process.env.CI ?? '').toLowerCase()) ||
  ['1', 'true', 'yes'].includes(String(process.env.ASTRO_REQUIRE_SITE_URL ?? '').toLowerCase());

if (isBuild && !siteUrl && isDeployment) {
  throw new Error(
    'SITE_URL is required for a deployment build. Add it to .env or set it in the environment ' +
      '(for example: SITE_URL=https://your-domain.com), then run the build again.'
  );
}

const site = siteUrl ?? 'http://localhost:4321';

if (isBuild && !siteUrl) {
  console.warn(
    `[astro] SITE_URL is not set — building with ${site}. ` +
      'Set SITE_URL in .env before deploying.'
  );
}

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
    port: 4321,
  },
});
