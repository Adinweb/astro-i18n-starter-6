import type { ImageMetadata } from 'astro';
import type { getImage } from 'astro:assets';

/**
 * Unified image value accepted across content schemas, declarative `sections`
 * props, `<SectionComposer />`, and `<ResponsiveImage />`:
 * - `ImageMetadata` resolved from `src/assets/` or `src/content/` via Astro/Vite
 * - Root-relative `public/` paths (such as Studio uploads `/uploads/...`) or `https://...` URLs
 */
export type ContentImage = ImageMetadata | string;

export interface CatalogCoverResolution {
  src: string | null;
  width: number | null;
  height: number | null;
}

export function isImageMetadata(value: unknown): value is ImageMetadata {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ImageMetadata).src === 'string' &&
    typeof (value as ImageMetadata).width === 'number' &&
    typeof (value as ImageMetadata).height === 'number'
  );
}

/**
 * Computes strictly ascending responsive `widths` capped at the source asset's
 * intrinsic width so Astro never upscales raster images.
 */
export function computeWidths(source: ImageMetadata, targets: readonly number[]): number[] {
  const unique = [...new Set([...targets, source.width])]
    .filter((w) => Number.isFinite(w) && w > 0 && w <= source.width)
    .sort((a, b) => a - b);
  return unique.length > 0 ? unique : [source.width];
}

/**
 * Resolves either an `ImageMetadata` object or a string path/URL into a usable URL.
 */
export function resolveContentImageUrl(
  image: ContentImage | null | undefined,
  toAbsolute: (path: string) => string = (value) => value
): string | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') {
    const trimmed = image.trim();
    return trimmed ? toAbsolute(trimmed) : undefined;
  }
  return image.src ? toAbsolute(image.src) : undefined;
}

/**
 * Shared cover-image resolver for serialized JSON catalogs (`/api/blog-posts*.json`
 * and `/api/collections/.../*.json`). Optimizes Astro `ImageMetadata` covers to
 * WebP and preserves `/uploads/...` or external string URLs cleanly.
 */
export async function resolveCatalogCover(
  rawImage: unknown,
  getImageFn: typeof getImage,
  maxWidth = 800
): Promise<CatalogCoverResolution> {
  if (!rawImage) {
    return { src: null, width: null, height: null };
  }

  if (typeof rawImage === 'string') {
    const trimmed = rawImage.trim();
    return {
      src: trimmed || null,
      width: null,
      height: null,
    };
  }

  if (!isImageMetadata(rawImage)) {
    return { src: null, width: null, height: null };
  }

  if (rawImage.format === 'svg') {
    return {
      src: rawImage.src,
      width: rawImage.width || null,
      height: rawImage.height || null,
    };
  }

  const targetWidth = Math.min(maxWidth, rawImage.width);
  const optimized = await getImageFn({
    src: rawImage,
    width: targetWidth,
    format: 'webp',
    quality: 75,
  });

  return {
    src: optimized.src,
    width: Number(optimized.attributes.width) || targetWidth,
    height:
      Number(optimized.attributes.height) ||
      Math.round((targetWidth * rawImage.height) / rawImage.width),
  };
}
