import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { siteConfig } from '@/libs/config/site';

export interface SocialImage {
  /** Absolute URL of the optimized card. */
  url: string;
  width: number;
  height: number;
}

/**
 * Builds the social card of a page.
 *
 * The artwork is cropped to the 1.91:1 ratio Open Graph asks for and encoded
 * as JPEG, so a crawler always receives a card of exactly the expected size —
 * never the full-size artwork, and never a PNG.
 *
 * Returns `undefined` when the page has no image of its own; the caller then
 * falls back to the site's default card.
 */
export async function getSocialImage(
  image?: ImageMetadata | null
): Promise<SocialImage | undefined> {
  if (!image) return undefined;

  const card = await getImage({
    src: image,
    width: siteConfig.ogImageWidth,
    height: siteConfig.ogImageHeight,
    fit: 'cover',
    format: 'jpeg',
    quality: 80,
  });

  return {
    url: new URL(card.src, siteConfig.url).href,
    width: Number(card.attributes.width),
    height: Number(card.attributes.height),
  };
}
