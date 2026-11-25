import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COOKIE_CONFIG, UI_CONFIG } from './app';
import {
  CLIENT_COOKIE_CONFIG,
  CLIENT_MOTION_CONFIG,
  CLIENT_NAVBAR_CONFIG,
  CLIENT_QUICK_CONTACT_CONFIG,
} from './client';

const configDir = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(configDir, relativePath), 'utf8');
}

/** A runtime import of `app.ts` would bundle the Zod validator; `import type` is erased. */
const VALUE_IMPORT_OF_APP = /^import \{[^}]*\} from '@\/libs\/config\/app'/m;

describe('src/libs/config/client.ts', () => {
  // The browser copy is derived from the same file with the same defaults, so a
  // consent key or version can never differ between the build and the runtime.
  it('matches the Zod-validated configuration field for field', () => {
    expect(CLIENT_COOKIE_CONFIG).toEqual(COOKIE_CONFIG);
    expect(CLIENT_NAVBAR_CONFIG).toEqual(UI_CONFIG.navbar);
    expect(CLIENT_MOTION_CONFIG).toEqual(UI_CONFIG.motion);
    expect(CLIENT_QUICK_CONTACT_CONFIG).toEqual(UI_CONFIG.quickContact);
  });

  it('reads its own defaults without the validator', () => {
    const source = readSource('client.ts');
    expect(source).not.toMatch(/from '(astro\/)?zod'/);
    expect(source).not.toMatch(VALUE_IMPORT_OF_APP);
  });

  it('is the only config source the consent runtime loads', () => {
    const managerSource = readSource('../cookies/manager.ts');
    expect(managerSource).toMatch(/from '@\/libs\/config\/client'/);
    expect(managerSource).not.toMatch(VALUE_IMPORT_OF_APP);
  });
});
