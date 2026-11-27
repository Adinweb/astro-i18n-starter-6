import type { ImageMetadata } from 'astro';
import { describe, it, expect, vi } from 'vitest';
import {
  computeWidths,
  isImageMetadata,
  resolveCatalogCover,
  resolveContentImageUrl,
} from './media';
import { externalOrPublicImageSchema } from './zod-schema';

const sampleMeta: ImageMetadata = {
  src: '/_astro/hero.hash.jpg',
  width: 1200,
  height: 800,
  format: 'jpg',
};

const sampleSvgMeta: ImageMetadata = {
  src: '/_astro/diagram.hash.svg',
  width: 640,
  height: 360,
  format: 'svg',
};

describe('src/libs/content/media.ts & externalOrPublicImageSchema', () => {
  it('distinguishes Astro ImageMetadata from string paths cleanly', () => {
    expect(isImageMetadata(sampleMeta)).toBe(true);
    expect(isImageMetadata('/uploads/hero.png')).toBe(false);
    expect(isImageMetadata(null)).toBe(false);
    expect(isImageMetadata({ src: '/x.png' })).toBe(false);
  });

  it('caps and deduplicates responsive widths at the source intrinsic width', () => {
    expect(computeWidths(sampleMeta, [480, 960, 1200, 1600])).toEqual([480, 960, 1200]);
    expect(computeWidths({ ...sampleMeta, width: 320 }, [480, 960])).toEqual([320]);
  });

  it('resolves URLs uniformly for both string paths and ImageMetadata objects', () => {
    const abs = (p: string) => (p.startsWith('http') ? p : `https://example.org${p}`);
    expect(resolveContentImageUrl(sampleMeta, abs)).toBe('https://example.org/_astro/hero.hash.jpg');
    expect(resolveContentImageUrl(' /uploads/cover.webp ', abs)).toBe(
      'https://example.org/uploads/cover.webp'
    );
    expect(resolveContentImageUrl('https://cdn.example.org/img.jpg', abs)).toBe(
      'https://cdn.example.org/img.jpg'
    );
    expect(resolveContentImageUrl('', abs)).toBeUndefined();
    expect(resolveContentImageUrl(null, abs)).toBeUndefined();
  });

  it('resolves catalog covers for Studio strings, SVGs, and raster ImageMetadata', async () => {
    const getImageMock = vi.fn().mockResolvedValue({
      src: '/_astro/cover.hash.webp',
      attributes: { width: '800', height: '533' },
    });

    expect(await resolveCatalogCover('/uploads/photo.jpg', getImageMock as never)).toEqual({
      src: '/uploads/photo.jpg',
      width: null,
      height: null,
    });
    expect(getImageMock).not.toHaveBeenCalled();

    expect(await resolveCatalogCover(sampleSvgMeta, getImageMock as never)).toEqual({
      src: '/_astro/diagram.hash.svg',
      width: 640,
      height: 360,
    });
    expect(getImageMock).not.toHaveBeenCalled();

    expect(await resolveCatalogCover(sampleMeta, getImageMock as never, 800)).toEqual({
      src: '/_astro/cover.hash.webp',
      width: 800,
      height: 533,
    });
    expect(getImageMock).toHaveBeenCalledTimes(1);
  });

  it('accepts root-relative public paths, src/assets paths, and https URLs while rejecting relative or unsafe image strings', () => {
    expect(externalOrPublicImageSchema.safeParse('/uploads/cover.webp').success).toBe(true);
    expect(externalOrPublicImageSchema.safeParse('src/assets/uploads/hero.png').success).toBe(true);
    expect(externalOrPublicImageSchema.safeParse('/src/assets/uploads/hero.png').success).toBe(true);
    expect(externalOrPublicImageSchema.safeParse('https://cdn.example.org/a.png').success).toBe(true);
    expect(externalOrPublicImageSchema.safeParse('src/assets/../secret.png').success).toBe(false);
    expect(externalOrPublicImageSchema.safeParse('//evil.example/a.png').success).toBe(false);
    expect(externalOrPublicImageSchema.safeParse('./missing.png').success).toBe(false);
    expect(externalOrPublicImageSchema.safeParse('javascript:alert(1)').success).toBe(false);
  });

  it('resolves existing src/assets images and returns undefined for missing src/assets paths', async () => {
    const { normalizePosixAssetPath, resolveAssetImage } = await import('./assets');
    expect(normalizePosixAssetPath('/src/assets/uploads/../hero/hero-0.jpg')).toBe(
      '/src/assets/hero/hero-0.jpg'
    );

    const resolved = await resolveAssetImage('src/assets/hero/hero-0.jpg');
    expect(resolved).toBeTruthy();

    const resolvedLeadingSlash = await resolveAssetImage('/src/assets/hero/hero-0.jpg');
    expect(resolvedLeadingSlash).toEqual(resolved);

    const resolvedRelative = await resolveAssetImage('./hero-0.jpg', 'src/assets/hero');
    expect(resolvedRelative).toEqual(resolved);

    expect(await resolveAssetImage('src/assets/does-not-exist.png')).toBeUndefined();
    expect(await resolveAssetImage('/uploads/static.webp')).toBe('/uploads/static.webp');
    expect(await resolveAssetImage('https://cdn.example.org/banner.jpg')).toBe(
      'https://cdn.example.org/banner.jpg'
    );
  });
});
