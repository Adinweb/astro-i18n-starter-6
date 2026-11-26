#!/usr/bin/env node
/**
 * Standalone local Dev Studio server (`npm run studio`).
 *
 * Exposes the exact same GUI and local API endpoints mounted at `/__studio/`
 * during `astro dev`, allowing template setup, config management, content
 * scaffolding, i18n syncing, and CLI diagnostics from any browser window.
 *
 * Usage:
 *   npm run studio [-- --port=4322 --host=127.0.0.1 --preview-url=http://localhost:3000]
 */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStudioHandler } from './lib/studio-api.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: npm run studio [-- --port=4322 --host=127.0.0.1 --preview-url=http://localhost:3000]

Options:
  --port=<num>         Port to listen on (default: 4322)
  --host=<addr>        Host interface to bind (default: 127.0.0.1)
  --preview-url=<url>  Optional live Astro dev site URL linked in Studio header
`);
  process.exit(0);
}

const portArg = args.find((a) => a.startsWith('--port='));
const hostArg = args.find((a) => a.startsWith('--host='));
const previewArg = args.find((a) => a.startsWith('--preview-url='));

const port = portArg ? Number(portArg.slice('--port='.length)) || 4322 : 4322;
const host = hostArg ? hostArg.slice('--host='.length) : '127.0.0.1';
const previewUrl = previewArg ? previewArg.slice('--preview-url='.length) : '';

const handler = createStudioHandler({ rootDir, previewUrl });
const server = http.createServer((req, res) => {
  handler(req, res);
});

server.listen(port, host, () => {
  console.log(`\n🎛️  Astro Starter Studio ready at http://${host}:${port}/`);
  if (previewUrl) {
    console.log(`   Linked preview site: ${previewUrl}`);
  }
  console.log('   Press Ctrl+C to stop.\n');
});
