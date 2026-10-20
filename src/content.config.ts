import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/**
 * Slugs may contain Unicode letters, digits, combining marks, and the
 * zero-width joiners Persian/Arabic words rely on. Hyphen, ZWNJ (U+200C), and
 * ZWJ (U+200D) are the only permitted separators, and none may be doubled.
 */
const SLUG_PART = /^[\p{L}\p{N}\p{M}]+$/u;

function isValidSlug(value: string): boolean {
  if (value === '') return true;
  return value.split(/[\u200C\u200D-]/u).every((part) => SLUG_PART.test(part));
}

const slugSchema = z.string().refine(
  isValidSlug,
  'Use letters, digits, and single hyphens or zero-width joiners only (empty is allowed only for the home page).'
);

const baseSchema = z.object({
  title: z.string().min(1),
  slug: slugSchema,
  description: z.string().optional(),
  image: z.string().startsWith('/').optional(),
  author: z.string().min(1).optional(),
  publishedAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
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
