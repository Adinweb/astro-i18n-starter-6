/**
 * Frontmatter helpers shared by the content scaffolding scripts.
 *
 * `new:page` and `new:post` both read and rewrite the same MDX entries; keeping
 * one parser/serializer means a value that round-trips through one command is
 * preserved by the other. Only the flat frontmatter shape this starter uses is
 * supported: scalars and one-line string arrays.
 */

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
    let value = line.slice(colonIdx + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      data[key] = inner
        ? inner
            .split(',')
            .map((item) => item.trim().replace(/^(["'])(.*)\1$/, '$2'))
            .filter(Boolean)
        : [];
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
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
      const items = value.map(
        (item) => `"${String(item).replace(/"/g, '\\"')}"`
      );
      lines.push(`${key}: [${items.join(', ')}]`);
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else if (key === 'publishedAt') {
      // Dates stay unquoted so the content schema can coerce them.
      lines.push(`${key}: ${value}`);
    } else {
      const stringValue = String(value).replace(/"/g, '\\"');
      lines.push(`${key}: "${stringValue}"`);
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
