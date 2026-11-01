/**
 * Argument validation shared by the content and language CLIs.
 *
 * Several commands turn a positional argument into a path (`src/content/<collection>/<key>`,
 * `messages/<locale>.json`) and then delete it. Without validation, a key such as
 * `../blog` escapes the collection and `remove:post ../pages` deletes the whole
 * pages collection. These guards keep every derived path inside the directory it
 * is supposed to describe.
 */

/**
 * Entry keys are folder names of a content group. They allow Unicode letters and
 * digits so localized group keys keep working, but never a path separator, dot,
 * or `..` segment.
 */
const ENTRY_KEY_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u;

/** Collection arguments name a directory directly under `src/content`. */
const COLLECTION_PATTERN = /^[a-z][a-z0-9-]*$/;

/** BCP-47-ish locale codes: `en`, `fa`, `pt-BR`, `zh-Hant-TW`. */
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

/**
 * @param {string} value
 * @param {string} [label]
 * @returns {string | null} An error message, or `null` when the key is safe.
 */
export function entryKeyError(value, label = 'entry key') {
  if (!value) return `❌ Missing ${label}.`;
  if (!ENTRY_KEY_PATTERN.test(value)) {
    return (
      `❌ Invalid ${label} "${value}". Use letters, digits, hyphens, or underscores — ` +
      'no slashes, dots, or ".." segments.'
    );
  }
  return null;
}

/**
 * @param {string} value
 * @returns {string | null}
 */
export function collectionError(value) {
  if (!value) return '❌ Missing collection name.';
  if (!COLLECTION_PATTERN.test(value)) {
    return `❌ Invalid collection "${value}". Use lowercase letters, digits, and hyphens.`;
  }
  return null;
}

/**
 * @param {string} value
 * @param {string} [label]
 * @returns {string | null}
 */
export function localeCodeError(value, label = 'locale') {
  if (!value) return `❌ Missing ${label}.`;
  if (!LOCALE_PATTERN.test(value)) {
    return `❌ Invalid ${label} "${value}". Use a locale code such as "en", "fa", or "pt-BR".`;
  }
  return null;
}
