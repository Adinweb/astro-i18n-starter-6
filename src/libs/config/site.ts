import { z } from 'astro/zod';

const siteConfigSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1),
  description: z.string().min(1),
  defaultLocale: z.string().default('en'),
});

export const siteConfig = siteConfigSchema.parse({
  url: process.env.SITE_URL || 'https://example.com',
  name: 'Astro i18n Starter',
  description: 'Production-grade, multi-lingual Astro v7 starter template with RTL support.',
  defaultLocale: 'en',
});
