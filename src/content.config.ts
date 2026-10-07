import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const baseSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
  draft: z.boolean().default(false),
});

export const collections = {
  pages: defineCollection({
    loader: glob({
      pattern: '**/*.{md,mdx}',
      base: './src/content/pages',
      generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
    }),
    schema: baseSchema,
  }),
  blog: defineCollection({
    loader: glob({
      pattern: '**/*.{md,mdx}',
      base: './src/content/blog',
      generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
    }),
    schema: baseSchema.extend({
      publishedAt: z.coerce.date(),
    }),
  }),
};
