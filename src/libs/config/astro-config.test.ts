import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import astroConfig from '../../../astro.config.mjs';

const require = createRequire(import.meta.url);

type AliasMap = Record<string, string>;
type ViteConfig = { vite?: { resolve?: { alias?: AliasMap } } };

const alias = (astroConfig as ViteConfig).vite?.resolve?.alias ?? {};

/**
 * `astro:transitions` is a virtual module, so the import it carries —
 * `astro/components/ClientRouter.astro` — is resolved with a virtual importer
 * that has no directory of its own. Vite then has to look the `astro` package
 * up to apply its `exports` map. When that lookup comes up empty the bare
 * specifier survives the SSR import analysis and Node's native ESM loader is
 * asked to import a `.astro` file, which it refuses:
 * `TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".astro"`.
 *
 * The alias in `astro.config.mjs` replaces that package lookup with a plain
 * file resolution. These tests pin the two things it must keep true.
 */
describe('astro.config.mjs — the astro/components alias', () => {
  it('maps astro/components to an absolute path', () => {
    const target = alias['astro/components'];
    expect(target).toBeDefined();
    expect(path.isAbsolute(target)).toBe(true);
  });

  it('points at the directory that really holds ClientRouter.astro', () => {
    const target = alias['astro/components'];
    expect(target).toBeDefined();
    expect(fs.existsSync(path.join(target, 'ClientRouter.astro'))).toBe(true);
  });

  it('resolves to the very file the package exports map resolves to', () => {
    const target = alias['astro/components'];
    expect(target).toBeDefined();
    // The alias is a shortcut, not a redirect: it must land on the same file
    // the package's own resolution would have produced.
    expect(path.join(target, 'ClientRouter.astro')).toBe(
      require.resolve('astro/components/ClientRouter.astro')
    );
  });
});
