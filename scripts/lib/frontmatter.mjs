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
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

export function unescapeYamlDoubleQuoted(value) {
  return String(value).replace(/\\(["\\rn])/g, (_, ch) => {
    if (ch === 'n') return '\n';
    if (ch === 'r') return '\r';
    return ch;
  });
}

function parseScalarToken(token, parseNumbers = false) {
  const trimmed = token.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return unescapeYamlDoubleQuoted(trimmed.slice(1, -1));
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null' || trimmed === '~') return null;
  if (parseNumbers && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function parseTopLevelScalar(rawValue) {
  if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
    const inner = rawValue.slice(1, -1).trim();
    return inner
      ? inner
          .split(',')
          .map((item) => parseScalarToken(item, false))
          .filter((item) => item !== '')
      : [];
  }

  if (
    (rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'") && rawValue.length >= 2)
  ) {
    return parseScalarToken(rawValue, false);
  }
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;
  return rawValue;
}

function parseInlineValue(rawValue) {
  if (rawValue === '{}') return {};
  if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
    const inner = rawValue.slice(1, -1).trim();
    if (!inner) return [];
    const items = [];
    let current = '';
    let quote = null;
    for (let i = 0; i < inner.length; i += 1) {
      const ch = inner[i];
      if (quote) {
        current += ch;
        if (ch === quote && inner[i - 1] !== '\\') quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
        current += ch;
      } else if (ch === ',') {
        if (current.trim() !== '') items.push(parseScalarToken(current, true));
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim() !== '') items.push(parseScalarToken(current, true));
    return items;
  }
  return parseScalarToken(rawValue, true);
}

function lineIndent(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function nextMeaningfulIndex(lines, startIdx) {
  for (let i = startIdx; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith('#')) return i;
  }
  return -1;
}

function parseYamlBlock(lines, startIdx, baseIndent) {
  const firstIdx = nextMeaningfulIndex(lines, startIdx);
  if (firstIdx === -1) return { value: undefined, nextIdx: lines.length };

  const firstLine = lines[firstIdx];
  const firstIndent = lineIndent(firstLine);
  if (firstIndent < baseIndent) return { value: undefined, nextIdx: firstIdx };

  const firstTrimmed = firstLine.trim();
  if (firstTrimmed.startsWith('- ') || firstTrimmed === '-') {
    return parseYamlSequence(lines, firstIdx, firstIndent);
  }
  return parseYamlMapping(lines, firstIdx, firstIndent);
}

function parseYamlSequence(lines, startIdx, seqIndent) {
  const arr = [];
  let i = startIdx;

  while (i < lines.length) {
    i = nextMeaningfulIndex(lines, i);
    if (i === -1) {
      i = lines.length;
      break;
    }

    const line = lines[i];
    const indent = lineIndent(line);
    const trimmed = line.trim();
    if (indent < seqIndent || (indent === seqIndent && !trimmed.startsWith('-'))) {
      break;
    }

    const rest = trimmed.slice(1).trim();
    if (!rest) {
      const nested = parseYamlBlock(lines, i + 1, seqIndent + 1);
      arr.push(nested.value);
      i = nested.nextIdx;
      continue;
    }

    const colonMatch = rest.match(/^([A-Za-z0-9_.-]+|"[^"]+"|'[^']+')\s*:(?:\s+(.*)|())$/);
    if (colonMatch) {
      const itemObj = {};
      const itemKey = String(parseScalarToken(colonMatch[1], false));
      const rawVal = (colonMatch[2] ?? '').trim();
      const itemChildIndent = indent + 2;

      if (rawVal === '') {
        const nested = parseYamlBlock(lines, i + 1, itemChildIndent);
        itemObj[itemKey] = nested.value;
        i = nested.nextIdx;
      } else {
        itemObj[itemKey] = parseInlineValue(rawVal);
        i += 1;
      }

      const nextIdx = nextMeaningfulIndex(lines, i);
      if (nextIdx !== -1 && lineIndent(lines[nextIdx]) >= itemChildIndent && !lines[nextIdx].trim().startsWith('- ')) {
        const more = parseYamlMapping(lines, nextIdx, lineIndent(lines[nextIdx]));
        Object.assign(itemObj, more.value);
        i = more.nextIdx;
      }
      arr.push(itemObj);
    } else {
      arr.push(parseInlineValue(rest));
      i += 1;
    }
  }

  return { value: arr, nextIdx: i };
}

function parseYamlMapping(lines, startIdx, mapIndent) {
  const obj = {};
  let i = startIdx;

  while (i < lines.length) {
    i = nextMeaningfulIndex(lines, i);
    if (i === -1) {
      i = lines.length;
      break;
    }

    const line = lines[i];
    const indent = lineIndent(line);
    const trimmed = line.trim();
    if (indent < mapIndent || (indent === mapIndent && trimmed.startsWith('-'))) {
      break;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      i += 1;
      continue;
    }

    const key = String(parseScalarToken(trimmed.slice(0, colonIdx), false));
    const rawVal = trimmed.slice(colonIdx + 1).trim();
    if (!key) {
      i += 1;
      continue;
    }

    if (rawVal === '') {
      const nextIdx = nextMeaningfulIndex(lines, i + 1);
      if (
        nextIdx !== -1 &&
        (lineIndent(lines[nextIdx]) > indent ||
          (lineIndent(lines[nextIdx]) === indent && lines[nextIdx].trim().startsWith('-')))
      ) {
        const nested = parseYamlBlock(lines, nextIdx, lineIndent(lines[nextIdx]));
        obj[key] = nested.value;
        i = nested.nextIdx;
      } else {
        obj[key] = '';
        i += 1;
      }
    } else {
      obj[key] = parseInlineValue(rawVal);
      i += 1;
    }
  }

  return { value: obj, nextIdx: i };
}

export function parseFrontmatter(rawContent) {
  const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: rawContent };
  }

  const fmText = match[1];
  const body = match[2];
  const data = {};
  const lines = fmText.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Top-level keys only: ignore blank lines, comments, list markers, and indented children.
    if (!line || /^\s/.test(line) || line.startsWith('#') || line.startsWith('-')) {
      i += 1;
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      i += 1;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    if (!key) {
      i += 1;
      continue;
    }
    const rawValue = line.slice(colonIdx + 1).trim();

    if (rawValue === '') {
      const nextIdx = nextMeaningfulIndex(lines, i + 1);
      if (
        nextIdx !== -1 &&
        (lineIndent(lines[nextIdx]) > 0 || lines[nextIdx].trim().startsWith('-'))
      ) {
        const nested = parseYamlBlock(lines, nextIdx, lineIndent(lines[nextIdx]));
        data[key] = nested.value;
        i = nested.nextIdx;
        continue;
      }
      data[key] = '';
      i += 1;
      continue;
    }

    data[key] = parseTopLevelScalar(rawValue);
    i += 1;
  }

  return { data, body };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function isPrimitive(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function formatYamlKey(key) {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(key) ? key : `"${escapeYamlString(key)}"`;
}

function formatScalarYaml(value, key = '') {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (value === null) return 'null';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (UNQUOTED_DATE_KEYS.has(key)) return String(value);
  return `"${escapeYamlString(value)}"`;
}

function appendYamlBlock(lines, key, value, indentLevel) {
  if (value === undefined) return;
  const pad = '  '.repeat(indentLevel);
  const formattedKey = formatYamlKey(key);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${pad}${formattedKey}: []`);
      return;
    }
    if (value.every((item) => isPrimitive(item))) {
      const items = value.map((item) => formatScalarYaml(item));
      lines.push(`${pad}${formattedKey}: [${items.join(', ')}]`);
      return;
    }
    lines.push(`${pad}${formattedKey}:`);
    for (const item of value) {
      appendYamlArrayItem(lines, item, indentLevel + 1);
    }
    return;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      lines.push(`${pad}${formattedKey}: {}`);
      return;
    }
    lines.push(`${pad}${formattedKey}:`);
    for (const [childKey, childVal] of entries) {
      appendYamlBlock(lines, childKey, childVal, indentLevel + 1);
    }
    return;
  }

  lines.push(`${pad}${formattedKey}: ${formatScalarYaml(value, key)}`);
}

function appendYamlArrayItem(lines, item, indentLevel) {
  const pad = '  '.repeat(indentLevel);
  if (isPlainObject(item)) {
    const entries = Object.entries(item).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      lines.push(`${pad}- {}`);
      return;
    }
    const [firstKey, firstVal] = entries[0];
    if (Array.isArray(firstVal) || isPlainObject(firstVal)) {
      lines.push(`${pad}-`);
      for (const [k, v] of entries) {
        appendYamlBlock(lines, k, v, indentLevel + 1);
      }
      return;
    }
    lines.push(`${pad}- ${formatYamlKey(firstKey)}: ${formatScalarYaml(firstVal, firstKey)}`);
    for (const [k, v] of entries.slice(1)) {
      appendYamlBlock(lines, k, v, indentLevel + 1);
    }
    return;
  }

  if (Array.isArray(item)) {
    if (item.every((x) => isPrimitive(x))) {
      lines.push(`${pad}- [${item.map((x) => formatScalarYaml(x)).join(', ')}]`);
    } else {
      lines.push(`${pad}-`);
      for (const sub of item) appendYamlArrayItem(lines, sub, indentLevel + 1);
    }
    return;
  }

  lines.push(`${pad}- ${formatScalarYaml(item)}`);
}

export function stringifyFrontmatter(data, body) {
  const lines = ['---'];

  for (const [key, value] of Object.entries(data)) {
    appendYamlBlock(lines, key, value, 0);
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
