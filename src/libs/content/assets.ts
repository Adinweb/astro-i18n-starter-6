import type { ImageMetadata } from 'astro';
import type { ContentImage } from './media';

const ASSET_IMAGE_LOADERS = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/**/*.{png,jpg,jpeg,webp,avif,svg}'
);

export function normalizePosixAssetPath(input: string): string {
  const parts = input.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  return `/${stack.join('/')}`;
}

/**
 * Resolves a content image value (`ImageMetadata`, `"src/assets/..."`,
 * `"/src/assets/..."`, relative `"./..."` inside `entryDir`, or public/external
 * URL) into an Astro `ImageMetadata` asset when backed by `src/assets/`,
 * enabling automatic build-time optimization & WebP conversion.
 */
export async function resolveAssetImage(
  value: ContentImage | null | undefined,
  entryDir?: string
): Promise<ContentImage | undefined> {
  if (!value) return undefined;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const candidates: string[] = [];
  if (trimmed.startsWith('/src/')) {
    candidates.push(normalizePosixAssetPath(trimmed));
  } else if (trimmed.startsWith('src/')) {
    candidates.push(normalizePosixAssetPath(`/${trimmed}`));
  } else if (trimmed.startsWith('/')) {
    candidates.push(normalizePosixAssetPath(`/src${trimmed}`));
    candidates.push(normalizePosixAssetPath(`/src/assets${trimmed}`));
  } else if ((trimmed.startsWith('./') || trimmed.startsWith('../')) && entryDir) {
    const cleanDir = entryDir.startsWith('/') ? entryDir : `/${entryDir}`;
    candidates.push(normalizePosixAssetPath(`${cleanDir}/${trimmed}`));
  } else {
    if (entryDir) {
      const cleanDir = entryDir.startsWith('/') ? entryDir : `/${entryDir}`;
      candidates.push(normalizePosixAssetPath(`${cleanDir}/${trimmed}`));
    }
    candidates.push(normalizePosixAssetPath(`/src/assets/${trimmed}`));
  }

  for (const key of candidates) {
    const loader = ASSET_IMAGE_LOADERS[key];
    if (loader) {
      const mod = await loader();
      return mod.default;
    }
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('/src/') && !trimmed.startsWith('//')) {
    return normalizePosixAssetPath(trimmed);
  }
  return undefined;
}
