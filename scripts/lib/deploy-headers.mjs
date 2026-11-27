// @ts-check

/**
 * Single Source of Truth (SSOT) for static hosting security & cache headers across
 * Cloudflare Pages / Netlify (`public/_headers`), Nginx (`deploy/nginx-headers.conf`),
 * and Apache / LiteSpeed (`deploy/.htaccess-headers`).
 */

export const DEPLOY_SECURITY_HEADERS = [
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'SAMEORIGIN'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
  ['Cross-Origin-Opener-Policy', 'same-origin'],
];

export const OPTIONAL_CSP_HEADER =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://plausible.io https://www.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://plausible.io https://api.web3forms.com https://formspree.io; frame-src https://challenges.cloudflare.com; base-uri 'self'; form-action 'self' https://api.web3forms.com https://formspree.io; object-src 'none'";

export const DEPLOY_CACHE_RULES = [
  {
    netlifyPath: '/_astro/*',
    nginxLocation: '^~ /_astro/',
    apacheFilesMatch: null,
    apacheRewritePath: '^_astro/',
    cacheControl: 'public, max-age=31536000, immutable',
  },
  {
    netlifyPath: '/pagefind/*',
    nginxLocation: '^~ /pagefind/',
    apacheFilesMatch: null,
    apacheRewritePath: '^pagefind/',
    cacheControl: 'public, max-age=604800',
  },
  {
    netlifyPath: '/og/*',
    nginxLocation: '^~ /og/',
    apacheFilesMatch: null,
    apacheRewritePath: '^og/',
    cacheControl: 'public, max-age=86400',
  },
  {
    netlifyPath: '/api/*',
    nginxLocation: '^~ /api/',
    apacheFilesMatch: null,
    apacheRewritePath: '^api/',
    cacheControl: 'public, max-age=3600',
  },
  {
    netlifyPath: '/chronotrig.min.js',
    nginxLocation: '= /chronotrig.min.js',
    apacheFilesMatch: '^chronotrig\\.min\\.js$',
    apacheRewritePath: null,
    cacheControl: 'public, max-age=604800',
  },
  {
    netlifyPath: '/site.webmanifest',
    nginxLocation: '= /site.webmanifest',
    apacheFilesMatch: '^site\\.webmanifest$',
    apacheRewritePath: null,
    cacheControl: 'public, max-age=3600',
  },
  {
    netlifyPath: '/*.webp',
    nginxLocation: '~* \\.webp$',
    apacheFilesMatch: '\\.webp$',
    apacheRewritePath: null,
    cacheControl: 'public, max-age=2592000',
  },
  {
    netlifyPath: '/*.svg',
    nginxLocation: '~* \\.svg$',
    apacheFilesMatch: '\\.svg$',
    apacheRewritePath: null,
    cacheControl: 'public, max-age=2592000',
  },
  {
    netlifyPath: '/*.png',
    nginxLocation: '~* \\.png$',
    apacheFilesMatch: '\\.png$',
    apacheRewritePath: null,
    cacheControl: 'public, max-age=2592000',
  },
  {
    netlifyPath: '/*.ico',
    nginxLocation: '~* \\.ico$',
    apacheFilesMatch: '\\.ico$',
    apacheRewritePath: null,
    cacheControl: 'public, max-age=2592000',
  },
];

/**
 * Formats Cloudflare Pages / Netlify `public/_headers`.
 *
 * @returns {string}
 */
export function buildNetlifyHeaders() {
  const lines = [
    '# Static hosting security & caching headers (Cloudflare Pages / Netlify)',
    '',
    '/*',
    ...DEPLOY_SECURITY_HEADERS.map(([name, value]) => `  ${name}: ${value}`),
    '  # Optional strict Content-Security-Policy (review & enable for your client\'s allowed analytics/form hosts):',
    `  # Content-Security-Policy: ${OPTIONAL_CSP_HEADER}`,
    '',
  ];

  for (const rule of DEPLOY_CACHE_RULES) {
    lines.push(rule.netlifyPath, `  Cache-Control: ${rule.cacheControl}`, '');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * Formats an Nginx `server {}` include file (`deploy/nginx-headers.conf`) matching `public/_headers`.
 *
 * @returns {string}
 */
export function buildNginxHeadersConf() {
  const lines = [
    '# Auto-generated at build time from scripts/lib/deploy-headers.mjs (SSOT).',
    '# Include inside your Nginx `server { ... }` block.',
    '',
    ...DEPLOY_SECURITY_HEADERS.map(
      ([name, value]) => `add_header ${name} "${value}" always;`
    ),
    `# Optional strict Content-Security-Policy (uncomment & adjust allowed hosts as needed):`,
    `# add_header Content-Security-Policy "${OPTIONAL_CSP_HEADER}" always;`,
    '',
  ];

  for (const rule of DEPLOY_CACHE_RULES) {
    lines.push(`location ${rule.nginxLocation} {`);
    for (const [name, value] of DEPLOY_SECURITY_HEADERS) {
      lines.push(`  add_header ${name} "${value}" always;`);
    }
    lines.push(`  add_header Cache-Control "${rule.cacheControl}" always;`, '}', '');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * Formats an Apache / LiteSpeed `.htaccess` security & caching snippet (`deploy/.htaccess-headers`).
 *
 * @returns {string}
 */
export function buildHtaccessHeaders() {
  const lines = [
    '# Auto-generated at build time from scripts/lib/deploy-headers.mjs (SSOT).',
    '# Append inside your Apache / LiteSpeed `.htaccess` file at site root.',
    '<IfModule mod_headers.c>',
    ...DEPLOY_SECURITY_HEADERS.map(
      ([name, value]) => `  Header always set ${name} "${value}"`
    ),
    '  # Optional strict Content-Security-Policy (uncomment & adjust allowed hosts as needed):',
    `  # Header always set Content-Security-Policy "${OPTIONAL_CSP_HEADER}"`,
  ];

  for (const rule of DEPLOY_CACHE_RULES) {
    if (rule.apacheFilesMatch) {
      lines.push(
        `  <FilesMatch "${rule.apacheFilesMatch}">`,
        `    Header set Cache-Control "${rule.cacheControl}"`,
        '  </FilesMatch>'
      );
    } else if (rule.apacheRewritePath) {
      lines.push(
        `  <If "%{REQUEST_URI} =~ m#${rule.apacheRewritePath}#">`,
        `    Header set Cache-Control "${rule.cacheControl}"`,
        '  </If>'
      );
    }
  }

  lines.push('</IfModule>');
  return `${lines.join('\n')}\n`;
}
