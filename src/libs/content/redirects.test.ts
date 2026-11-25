import { describe, it, expect } from 'vitest';
import {
  buildNetlifyRedirects,
  buildNginxRedirects,
  isInternalRedirectTarget,
  normalizeRedirectKey,
  validateRedirects,
  type RedirectRule,
} from './redirects';

describe('Config-driven Redirects Engine (src/libs/content/redirects.ts)', () => {
  it('normalizes internal redirect paths and detects external destinations', () => {
    expect(normalizeRedirectKey('/old-path/')).toBe('/old-path');
    expect(normalizeRedirectKey('/pricing/?utm=1')).toBe('/pricing');
    expect(normalizeRedirectKey('/')).toBe('/');

    expect(isInternalRedirectTarget('/pricing/')).toBe(true);
    expect(isInternalRedirectTarget('/fa/contact/#form')).toBe(true);
    expect(isInternalRedirectTarget('https://example.com/guide')).toBe(false);
    expect(isInternalRedirectTarget('//cdn.example.com/file')).toBe(false);
  });

  it('flags invalid syntax, duplicate sources, self-loops, and cycles', () => {
    expect(validateRedirects([])).toEqual([]);
    expect(
      validateRedirects([
        { from: '/old/', to: '/new/', status: 301 },
        { from: '/ext/', to: 'https://example.com', status: 302 },
      ])
    ).toEqual([]);

    expect(validateRedirects([{ from: 'no-slash', to: '/new/', status: 301 }]).length).toBeGreaterThan(0);
    expect(validateRedirects([{ from: '/old/', to: 'relative-target', status: 301 }]).length).toBeGreaterThan(0);
    expect(validateRedirects([{ from: '/same', to: '/same/', status: 301 }]).length).toBeGreaterThan(0);
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

  it('builds deterministic Netlify _redirects and Nginx snippet files', () => {
    const rules: RedirectRule[] = [
      { from: '/legacy', to: '/about/', status: 301 },
      { from: '/promo/', to: 'https://example.com/offer', status: 302 },
    ];

    const netlify = buildNetlifyRedirects(rules);
    expect(netlify).toContain('/legacy /about/ 301');
    expect(netlify).toContain('/promo/ https://example.com/offer 302');

    const nginx = buildNginxRedirects(rules);
    expect(nginx).toContain('location = /legacy { return 301 /about/; }');
    expect(nginx).toContain('location = /promo/ { return 302 https://example.com/offer; }');
  });
});
