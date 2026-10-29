/**
 * Frontmatter helpers shared by the content scaffolding scripts.
 *
 * `new:page` and `new:post` both read and rewrite the same MDX entries; keeping
 * one parser/serializer means a value that round-trips through one command is
 * preserved by the other. Only the flat frontmatter shape this starter uses is
 * supported: scalars and one-line string arrays.
 */

const UNQUOTED_DATE_KEYS = new Set(['publishedAt', 'updatedAt']);

export function escapeYamlString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function unescapeYamlDoubleQuoted(value) {
  return String(value).replace(/\\(["\\])/g, '$1');
}

function parseScalarToken(token) {
  const trimmed = token.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return unescapeYamlDoubleQuoted(trimmed.slice(1, -1));
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

export function parseFrontmatter(rawContent) {
  const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: rawContent };
  }

  const fmText = match[1];
  const body = match[2];
  const data = {};

  for (const line of fmText.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    if (!key) continue;
    const rawValue = line.slice(colonIdx + 1).trim();

    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      const inner = rawValue.slice(1, -1).trim();
      data[key] = inner
        ? inner
            .split(',')
            .map((item) => parseScalarToken(item))
            .filter(Boolean)
        : [];
      continue;
    }

    let value = rawValue;
    if (
      (rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'") && rawValue.length >= 2)
    ) {
      value = parseScalarToken(rawValue);
    } else if (rawValue === 'true') {
      value = true;
    } else if (rawValue === 'false') {
      value = false;
    }

    data[key] = value;
  }

  return { data, body };
}

export function stringifyFrontmatter(data, body) {
  const lines = ['---'];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      const items = value.map((item) => `"${escapeYamlString(item)}"`);
      lines.push(`${key}: [${items.join(', ')}]`);
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else if (value instanceof Date) {
      lines.push(`${key}: ${value.toISOString().split('T')[0]}`);
    } else if (UNQUOTED_DATE_KEYS.has(key)) {
      // Dates stay unquoted so the content schema can coerce them cleanly.
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: "${escapeYamlString(value)}"`);
    }
  }

  lines.push('---');

  // Keep the file's own line ending, so updating a file does not rewrite it
  // with mixed endings — and so a CRLF body keeps its leading blank line.
  const eol = body.includes('\r\n') ? '\r\n' : '\n';
  const cleanBody = /^\r?\n/.test(body) ? body : eol + body;
  return lines.join(eol) + cleanBody;
}

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
