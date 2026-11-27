import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  buildHtaccessHeaders,
  buildNetlifyHeaders,
  buildNginxHeadersConf,
} from '../../../scripts/lib/deploy-headers.mjs';
import {
  buildHtaccessRedirects,
  buildNetlifyRedirects,
  buildNginxRedirects,
  isInternalRedirectTarget,
  isWildcardRedirectSource,
  normalizeRedirectKey,
  validateRedirects,
  type RedirectRule,
} from './redirects';

describe('Config-driven Redirects Engine (src/libs/content/redirects.ts)', () => {
  it('normalizes internal redirect paths and detects external destinations', () => {
    expect(normalizeRedirectKey('/old-path/')).toBe('/old-path');
    expect(normalizeRedirectKey('/old-blog/*/')).toBe('/old-blog/*');
    expect(normalizeRedirectKey('/old-blog/*')).toBe('/old-blog/*');
    expect(normalizeRedirectKey('/pricing/?utm=1')).toBe('/pricing');
    expect(normalizeRedirectKey('/')).toBe('/');

    expect(isWildcardRedirectSource('/old-blog/*')).toBe(true);
    expect(isWildcardRedirectSource('/exact-path/')).toBe(false);

    expect(isInternalRedirectTarget('/pricing/')).toBe(true);
    expect(isInternalRedirectTarget('/fa/contact/#form')).toBe(true);
    expect(isInternalRedirectTarget('https://example.com/guide')).toBe(false);
    expect(isInternalRedirectTarget('//cdn.example.com/file')).toBe(false);
  });

  it('flags invalid syntax, mid-path globs, orphan splats, duplicates, self-loops, and cycles', () => {
    expect(validateRedirects([])).toEqual([]);
    expect(
      validateRedirects([
        { from: '/old/', to: '/new/', status: 301 },
        { from: '/old-blog/*', to: '/blog/:splat', status: 301 },
        { from: '/ext/', to: 'https://example.com', status: 302 },
      ])
    ).toEqual([]);

    expect(validateRedirects([{ from: 'no-slash', to: '/new/', status: 301 }]).length).toBeGreaterThan(0);
    expect(validateRedirects([{ from: '/a/*/b', to: '/c/', status: 301 }]).length).toBeGreaterThan(0);
    expect(validateRedirects([{ from: '/exact', to: '/blog/:splat', status: 301 }]).length).toBeGreaterThan(0);
    expect(validateRedirects([{ from: '/old/', to: 'relative-target', status: 301 }]).length).toBeGreaterThan(0);
    expect(validateRedirects([{ from: '/same', to: '/same/', status: 301 }]).length).toBeGreaterThan(0);
    expect(validateRedirects([{ from: '/a/*', to: '/a/:splat', status: 301 }]).length).toBeGreaterThan(0);
    expect(
      validateRedirects([
        { from: '/dup', to: '/a/', status: 301 },
        { from: '/dup/', to: '/b/', status: 302 },
      ]).length
    ).toBeGreaterThan(0);
    expect(
      validateRedirects([
        { from: '/a/', to: '/b/', status: 301 },
        { from: '/b/', to: '/c/', status: 301 },
        { from: '/c/', to: '/a/', status: 301 },
      ]).length
    ).toBeGreaterThan(0);
  });

  it('builds deterministic Netlify _redirects, Nginx snippets, and Apache .htaccess rules', () => {
    const rules: RedirectRule[] = [
      { from: '/old-blog/*', to: '/blog/:splat', status: 301 },
      { from: '/legacy', to: '/about/', status: 301 },
      { from: '/promo/', to: 'https://example.com/offer', status: 302 },
      { from: '/legacy-docs/*', to: '/docs/', status: 302 },
    ];

    const netlify = buildNetlifyRedirects(rules);
    expect(netlify.indexOf('/legacy /about/ 301')).toBeLessThan(
      netlify.indexOf('/old-blog/* /blog/:splat 301')
    );
    expect(netlify).toContain('/promo/ https://example.com/offer 302');

    const nginx = buildNginxRedirects(rules);
    expect(nginx).toContain('location = /legacy { return 301 /about/; }');
    expect(nginx).toContain('location = /promo/ { return 302 https://example.com/offer; }');
    expect(nginx).toContain('location ^~ /old-blog/ { rewrite ^/old-blog/(.*)$ /blog/$1 permanent; }');
    expect(nginx).toContain('location ^~ /legacy-docs/ { return 302 /docs/; }');

    const htaccess = buildHtaccessRedirects(rules);
    expect(htaccess).toContain('<IfModule mod_rewrite.c>');
    expect(htaccess).toContain('RewriteRule ^legacy/?$ /about/ [R=301,L]');
    expect(htaccess).toContain('RewriteRule ^promo/?$ https://example.com/offer [R=302,L]');
    expect(htaccess).toContain('RewriteRule ^old-blog/(.*)$ /blog/$1 [R=301,L]');
    expect(htaccess).toContain('RewriteRule ^legacy-docs/(.*)$ /docs/ [R=302,L]');
    expect(htaccess.indexOf('RewriteRule ^legacy/?$')).toBeLessThan(
      htaccess.indexOf('RewriteRule ^old-blog/(.*)$')
    );
  });

  it('keeps public/_headers synchronized with Nginx and Apache deploy header builders (SSOT)', () => {
    const publicHeaders = fs.readFileSync(
      path.resolve(import.meta.dirname, '..', '..', '..', 'public', '_headers'),
      'utf-8'
    );
    expect(buildNetlifyHeaders()).toBe(publicHeaders);

    const nginx = buildNginxHeadersConf();
    expect(nginx).toContain('add_header X-Content-Type-Options "nosniff" always;');
    expect(nginx).toContain('add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;');
    expect(nginx).toContain('location ^~ /_astro/');
    expect(nginx).toContain('public, max-age=31536000, immutable');

    const htaccess = buildHtaccessHeaders();
    expect(htaccess).toContain('Header always set X-Frame-Options "SAMEORIGIN"');
    expect(htaccess).toContain('<FilesMatch "\\.webp$">');
    expect(htaccess).toContain('Header set Cache-Control "public, max-age=2592000"');
  });
});
