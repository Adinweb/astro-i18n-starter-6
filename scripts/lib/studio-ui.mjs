/**
 * Self-contained bilingual (Persian RTL / English LTR) Dev & Setup Studio UI
 * served at `/__studio/` (dev only) or via `npm run studio`.
 *
 * Loads `scripts/lib/studio-ui.html` and injects sanitized boot configuration.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'studio-ui.html');

export function renderStudioHtml({ mountedInDev = false, previewUrl = '', csrfToken = '' } = {}) {
  const sitePreviewHref = mountedInDev ? '/' : previewUrl || '';
  const initialConfig = JSON.stringify({ mountedInDev, sitePreviewHref, csrfToken }).replace(
    /</g,
    '\\u003c'
  );
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  return template.replace('__STUDIO_BOOT_JSON__', initialConfig);
}
