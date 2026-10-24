// @ts-check
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

const require = createRequire(import.meta.url);

/**
 * The `components` directory of the installed `astro` package.
 *
 * `astro:transitions` is a *virtual* module, so the import it carries —
 * `astro/components/ClientRouter.astro` — is resolved with a virtual importer
 * that has no directory of its own. Vite then has to look up the `astro`
 * package to apply its `exports` map (`"./components/*"`) before it can reach
 * the file. When that package lookup comes up empty, the bare specifier
 * survives the SSR import analysis, the module runner hands the `.astro` file
 * to Node's native ESM loader, and the dev server dies with
 * `TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".astro"`.
 *
 * Aliasing the prefix to the installed package turns the package lookup into a
 * plain file resolution, which cannot come up empty. The target is the very
 * path the `exports` map resolves to, so nothing else about the import
 * changes. `astro/package.json` is published by the package's `exports` map,
 * so resolving it is a supported lookup.
 */
const astroComponentsDir = path.join(
  path.dirname(require.resolve('astro/package.json')),
  'components',
);

const isBuild = process.env.npm_lifecycle_event === 'build' || process.argv.includes('build');
if (isBuild) {
  process.env.NODE_ENV = 'production';
}
const mode = isBuild ? 'production' : 'development';

// Application-level values live in one file (see src/libs/config/app.ts).
// It is read here rather than imported so the dev server, the fallback site
// origin, and the app all share the same port.
const appConfig = JSON.parse(
  fs.readFileSync(new URL('./app.config.json', import.meta.url), 'utf-8')
);
const { host: serverHost, port: serverPort } = appConfig.server;
const fallbackSite = `http://localhost:${serverPort}`;

/**
 * Reads a variable from one `.env` file.
 *
 * A key may be defined more than once in one file. The last definition wins,
 * the way dotenv resolves it, so this reader never reports a value that Vite
 * would have overridden.
 *
 * @param {URL} fileUrl
 * @param {string} key
 * @returns {string | undefined}
 */
function readEnvFile(fileUrl, key) {
  let content;
  try {
    content = fs.readFileSync(fileUrl, 'utf-8');
  } catch {
    // The file does not exist; keep looking.
    return undefined;
  }

  let result;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || match[1] !== key) continue;

    const value = match[2].trim();
    const quote = value[0];
    if (value.length > 1 && (quote === '"' || quote === "'") && value.endsWith(quote)) {
      result = value.slice(1, -1);
      continue;
    }

    // An unquoted value ends at the first inline comment; a `#` that is part
    // of the value (a URL fragment) is kept.
    const comment = value.indexOf(' #');
    result = comment === -1 ? value : value.slice(0, comment).trim();
  }

  return result;
}

/**
 * Minimal `.env` reader. Astro injects the resolved `site` into
 * `import.meta.env.SITE`, so this is the only place that needs to read it.
 *
 * The file list and its precedence mirror Vite's, so a value that Vite would
 * see is seen here too: `.env` is overridden by `.env.local`, which is
 * overridden by `.env.<mode>`, which is overridden by `.env.<mode>.local`.
 * The shell environment always wins over every file.
 *
 * @param {string} key
 * @returns {string | undefined}
 */
function readEnvValue(key) {
  let value;
  for (const file of ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]) {
    const found = readEnvFile(new URL(file, import.meta.url), key);
    // A later file overrides an earlier one, so the highest priority file
    // that defines the key is the one that wins.
    if (found !== undefined) value = found;
  }
  return value;
}

const siteUrl = process.env.SITE_URL ?? readEnvValue('SITE_URL') ?? process.env.APP_URL;

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

const site = siteUrl ?? fallbackSite;

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
  // Canonical trailing slashes are enforced on all generated URLs by `localizeHref`
  // (`src/i18n/paths.ts`). Keeping `trailingSlash: 'ignore'` (per PRD §4) ensures
  // slash-less URLs (e.g. `/unknown`, `/fa/unknown`, `/404`) render the custom
  // `src/pages/404.astro` page instead of Astro's built-in trailing-slash 404 screen.
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  compressHTML: true,
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        'astro/components': astroComponentsDir,
      },
    },
    server: {
      allowedHosts: true,
    },
  },
  server: {
    host: serverHost,
    port: serverPort,
  },
});
