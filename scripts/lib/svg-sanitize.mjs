// @ts-check

/**
 * Shared SVG sanitizer used as the Single Source of Truth by both Dev Studio
 * uploads (`scripts/lib/studio-api.mjs`) and asset generation (`scripts/generate-assets.mjs`).
 */

/**
 * Decodes numeric HTML/XML entities (decimal & hex) and strips null/control bytes
 * so entity-obfuscated payloads like `j&#x61;vascript:` cannot bypass checks.
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizeSvgForInspection(raw) {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : '';
    })
    .replace(/&#(\d+);?/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : '';
    });
}

const UNSAFE_SVG_CHECKS = [
  {
    pattern:
      /<(?:script|foreignObject|iframe|object|embed|animate|animateMotion|animateTransform|set|handler|meta|link)(?:[\s>/]|$)/i,
    reason: 'active or embedded element (<script>, <foreignObject>, <animate>, <iframe>, etc.)',
  },
  {
    pattern: /\bon[a-z0-9_-]+\s*=/i,
    reason: 'inline event handler attribute (on*)',
  },
  {
    pattern: /(?:javascript|vbscript)\s*:/i,
    reason: 'script URI scheme (javascript:/vbscript:)',
  },
  {
    pattern: /data\s*:\s*(?:text\/html|application\/|image\/svg\+xml)/i,
    reason: 'executable data: URI payload',
  },
  {
    pattern:
      /<use\b[^>]*\b(?:xlink:)?href\s*=\s*(?:['"]\s*(?!#)|[^'"\s#>])/i,
    reason: 'external <use> href reference (only local #fragment IDs are allowed)',
  },
  {
    pattern:
      /(?:@import\b|expression\s*\(|url\s*\(\s*['"]?\s*(?:https?:|\/\/|javascript:|vbscript:|data\s*:\s*(?:text\/html|image\/svg\+xml)))/i,
    reason: 'unsafe CSS directive or external url() inside SVG',
  },
];

/**
 * Returns `null` when the SVG markup is safe for static brand/asset usage,
 * or a descriptive rejection reason string otherwise.
 *
 * @param {Buffer | string} svgInput
 * @returns {string | null}
 */
export function findUnsafeSvgReason(svgInput) {
  const raw = Buffer.isBuffer(svgInput) ? svgInput.toString('utf-8') : String(svgInput ?? '');
  if (!/<svg[\s>]/i.test(raw)) {
    return 'Uploaded SVG does not contain a valid <svg> root element.';
  }

  const normalized = normalizeSvgForInspection(raw);
  for (const check of UNSAFE_SVG_CHECKS) {
    if (check.pattern.test(raw) || check.pattern.test(normalized)) {
      return `Rejected SVG containing unsafe active content (${check.reason}).`;
    }
  }

  return null;
}

/**
 * Returns `true` when the SVG passes all static safety checks.
 *
 * @param {Buffer | string} svgInput
 * @returns {boolean}
 */
export function isSafeSvg(svgInput) {
  return findUnsafeSvgReason(svgInput) === null;
}

/**
 * Throws a descriptive Error if the SVG markup fails safety validation.
 *
 * @param {Buffer | string} svgInput
 * @returns {void}
 */
export function assertSafeSvg(svgInput) {
  const reason = findUnsafeSvgReason(svgInput);
  if (reason) {
    throw new Error(reason);
  }
}
