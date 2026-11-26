import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export const STATIC_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

export function resolveDistFile(distDir, urlPath) {
  const rawPath = (urlPath || '/').split('?')[0] || '/';
  let cleanPath = rawPath;
  try {
    cleanPath = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  const candidate = path.resolve(distDir, `.${cleanPath}`);
  if (candidate !== distDir && !candidate.startsWith(distDir + path.sep)) return null;

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }
  const indexHtml = path.join(candidate, 'index.html');
  if (fs.existsSync(indexHtml) && fs.statSync(indexHtml).isFile()) {
    return indexHtml;
  }
  const htmlFile = `${candidate}.html`;
  if (fs.existsSync(htmlFile) && fs.statSync(htmlFile).isFile()) {
    return htmlFile;
  }
  return null;
}

export function startDistStaticServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const target = resolveDistFile(distDir, req.url || '/');
      if (target) {
        const ext = path.extname(target).toLowerCase();
        res.writeHead(200, {
          'Content-Type': STATIC_MIME_TYPES[ext] || 'application/octet-stream',
        });
        fs.createReadStream(target).pipe(res);
        return;
      }

      const notFoundPage = path.join(distDir, '404.html');
      if (fs.existsSync(notFoundPage)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(notFoundPage).pipe(res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to bind local QA server port'));
        return;
      }
      resolve({ server, origin: `http://127.0.0.1:${addr.port}` });
    });
  });
}
