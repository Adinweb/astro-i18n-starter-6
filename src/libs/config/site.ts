import { z } from 'astro/zod';

const siteConfigSchema = z.object({
  url: z.url(),
  name: z.string().min(1),
  description: z.string().min(1),
  ogImage: z.string().startsWith('/'),
  // Dimensions of the generated default OG image (see scripts/generate-assets.mjs).
  ogImageWidth: z.number().int().positive(),
  ogImageHeight: z.number().int().positive(),
});

const fallbackUrl = 'http://localhost:3000';

export const siteConfig = siteConfigSchema.parse({
  // Astro injects `site` from astro.config.mjs into import.meta.env.SITE.
  url: import.meta.env.SITE || fallbackUrl,
  name: 'Astro i18n Starter',
  description: 'Production-grade, multi-lingual Astro v7 starter template with RTL support.',
  ogImage: '/og-default.png',
  ogImageWidth: 1200,
  ogImageHeight: 630,
});
