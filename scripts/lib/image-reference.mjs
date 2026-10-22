/**
 * The `image` field of a content entry is a path **relative to the entry
 * file** (`./cover.png`). Astro's `image()` schema helper resolves it, checks
 * that the file exists and hands the entry ready-made image metadata, so the
 * CLI speaks in exactly the same language.
 *
 * Because the reference is relative to the entry file, a custom artwork has
 * to *sit* next to the content. The CLI therefore copies the file into the
 * group folder and points the frontmatter at the copy.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Undoes the mangling Git Bash applies to an argument that starts with a
 * slash: `/images/x.png` becomes `C:/Program Files/Git/images/x.png`.
 *
 * Only an absolute value can be mangled that way, so a relative path that
 * happens to contain a `Git/` segment (`assets/Git/logo.png`) is left alone.
 */
function stripGitRoot(value) {
  if (!/^(?:[A-Za-z]:)?[\\/]/.test(value)) return value;
  const mangled = value.match(/^(?:[A-Za-z]:)?[\\/]?(?:.*[\\/])?Git[\\/](.+)$/);
  return mangled ? mangled[1] : value;
}

/**
 * Normalizes an image path into a reference relative to the content file.
 *
 * Returns an empty string when the value cannot be mapped to a reference.
 */
export function normalizeImageReference(value) {
  let raw = String(value ?? '').trim();
  if (!raw) return '';

  raw = stripGitRoot(raw);

  // Any other absolute Windows path points outside the project.
  if (/^[A-Za-z]:[\\/]/.test(raw)) return '';

  const cleaned = raw
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .trim();

  if (!cleaned) return '';
  return `./${cleaned}`;
}

/**
 * Resolves the `--image` option into the value written to the frontmatter.
 *
 * Returns an empty string when the entry opts out of its own artwork
 * (`--image=none`) and falls back to the shared image, and `null` when the
 * value cannot be mapped to a reference.
 */
export function resolveImageOption(raw, fallback) {
  const value = String(raw ?? '').trim();
  if (value.toLowerCase() === 'none') return '';
  const normalized = normalizeImageReference(value);
  if (!normalized) return null;
  return normalized || fallback;
}

/**
 * Locates the artwork file an `--image` value points at.
 *
 * The value is looked up next to the content first (a reference relative to
 * the entry file), then against the project root, which is how every other
 * path a CLI argument takes is resolved.
 *
 * Returns the absolute path of an existing file, or `null` when there is
 * none.
 */
export function findArtworkFile(value, rootDir, groupDir) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const relative = raw.replace(/\\/g, '/').replace(/^\.\//, '');
  const candidates = [];

  if (groupDir) {
    candidates.push(path.resolve(groupDir, relative));
  }
  candidates.push(path.resolve(rootDir, stripGitRoot(raw).replace(/^[\\/]+/, '')));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/**
 * Places an artwork file next to the content that uses it and returns the
 * reference to write to the frontmatter.
 *
 * A file that already sits in the group folder under a name the artwork
 * generator will not overwrite is referenced as-is. Every other file is
 * copied into the group folder, because the frontmatter reference is
 * relative to the entry file.
 */
export function placeArtwork({ sourceFile, groupDir, group }) {
  const fileName = path.basename(sourceFile);
  const extension = path.extname(fileName);
  // `assets:generate` writes `<group>.png` for every group, so a custom file
  // that would collide with that name is stored under a different one.
  const generatedName = `${group}.png`.toLowerCase();
  const inGroupDir =
    path.dirname(path.resolve(sourceFile)).toLowerCase() ===
    path.resolve(groupDir).toLowerCase();

  if (inGroupDir && fileName.toLowerCase() !== generatedName) {
    return `./${fileName}`;
  }

  const targetName =
    fileName.toLowerCase() === generatedName ? `${group}-custom${extension}` : fileName;
  const targetFile = path.join(groupDir, targetName);

  fs.mkdirSync(groupDir, { recursive: true });
  if (path.resolve(targetFile).toLowerCase() !== path.resolve(sourceFile).toLowerCase()) {
    fs.copyFileSync(sourceFile, targetFile);
  }
  return `./${targetName}`;
}

/**
 * Turns an `--image` value into a reference that is guaranteed to point at a
 * file that sits next to the content.
 *
 * The file is looked up next to the content group first and against the
 * project root second, then copied into the group folder — the frontmatter
 * reference is relative to the entry file, so the artwork has to live there.
 *
 * Returns `null` when no such file exists. The caller then reports the
 * problem instead of writing a reference the build would reject.
 */
export function placeArtworkFor({ value, rootDir, groupDir, group }) {
  const sourceFile = findArtworkFile(value, rootDir, groupDir);
  if (!sourceFile) return null;
  return placeArtwork({ sourceFile, groupDir, group });
}
