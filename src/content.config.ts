import { defineCollection, type ImageFunction } from 'astro:content';
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

/**
 * Taxonomy keys double as URL query values and message keys, so they stay
 * ASCII, lowercase, and hyphen-separated. Visible labels are localized in
 * `src/libs/content/taxonomy.ts`.
 */
const taxonomyKey = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Use lowercase letters, digits, and single hyphens (for example "design-systems").'
  );

/**
 * Base schema shared by every content collection.
 *
 * `image` uses Astro's own `image()` helper. The frontmatter value is a path
 * relative to the content file (`./cover.png`); the content layer resolves it,
 * checks that the file exists, and hands the entry a ready-to-use
 * `ImageMetadata` — so the components never look a path up themselves and a
 * broken reference fails the build instead of shipping a missing picture.
 */
const baseSchema = ({ image }: { image: ImageFunction }) =>
  z.object({
    title: z.string().min(1),
    slug: slugSchema,
    description: z.string().optional(),
    image: image().optional(),
    author: z.string().min(1).optional(),
    publishedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    categories: z.array(taxonomyKey).default([]),
    tags: z.array(taxonomyKey).default([]),
    draft: z.boolean().default(false),
  });

export const collections = {
  pages: defineCollection({
    loader: glob({
      pattern: '**/*.{md,mdx}',
      base: './src/content/pages',
      generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
    }),
    schema: ({ image }) => baseSchema({ image }),
  }),
  blog: defineCollection({
    loader: glob({
      pattern: '**/*.{md,mdx}',
      base: './src/content/blog',
      generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
    }),
    schema: ({ image }) =>
      baseSchema({ image }).extend({
        // A blog post owns the `/blog/<slug>/` route, so an empty slug would
        // collide with the blog index itself.
        slug: slugSchema.min(1, 'Blog posts need a non-empty slug.'),
        publishedAt: z.coerce.date(),
      }),
  }),
};
