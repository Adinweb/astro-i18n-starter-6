import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import rawConfig from '../app.config.json';
import clientConfig from '../client/config.json';
import cmsConfig from '../client/cms.json';
import { clientCollections } from '../client/content';
import { mergeLayeredConfig } from './libs/config/defaults';
import type { CollectionFieldConfig } from './libs/content/schema-config';
import {
  baseCollectionSchema,
  buildConfiguredCollections,
  buildFieldsZodShape,
  pageSlugSchema,
  slugSchema,
  type ConfiguredCollectionInput,
} from './libs/content/zod-schema';
import { pageSectionItemSchema } from './libs/ui/sections';

const mergedAppConfig = mergeLayeredConfig(
  rawConfig as Record<string, unknown>,
  clientConfig as Record<string, unknown>,
  cmsConfig as Record<string, unknown>
);
const configuredTypes =
  ((mergedAppConfig.content as { types?: Record<string, ConfiguredCollectionInput> } | undefined)
    ?.types ?? {}) as Record<string, ConfiguredCollectionInput>;

const BUILT_IN_PROJECT_RESERVED = new Set([
  'title',
  'slug',
  'description',
  'image',
  'author',
  'publishedAt',
  'updatedAt',
  'categories',
  'tags',
  'draft',
  'client',
  'year',
  'link',
  'stack',
]);

const BUILT_IN_BLOG_RESERVED = new Set([
  'title',
  'slug',
  'description',
  'image',
  'author',
  'publishedAt',
  'updatedAt',
  'categories',
  'tags',
  'draft',
]);

const blogExtraFields: readonly CollectionFieldConfig[] = configuredTypes.blog?.fields ?? [];
const projectExtraFields: readonly CollectionFieldConfig[] = configuredTypes.projects?.fields ?? [];

/**
 * Collections combine built-in core collections (`pages`, `blog`, `projects`),
 * client-defined collections in `client/content.ts`, and config-driven
 * collections declared under `content.types.<key>.fields`.
 */
export const collections = {
  pages: defineCollection({
    loader: glob({
      pattern: '**/*.{md,mdx}',
      base: './src/content/pages',
      generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
    }),
    schema: ({ image }) =>
      baseCollectionSchema({ image }).extend({
        slug: pageSlugSchema,
        hero: z.union([z.boolean(), z.enum(['none', 'minimal', 'default'])]).default('none'),
        container: z.enum(['canvas', 'contained', 'prose']).default('canvas'),
        flushTop: z.boolean().default(false),
        template: z.string().min(1).optional(),
        sections: z.array(pageSectionItemSchema).optional(),
      }),
  }),
  blog: defineCollection({
    loader: glob({
      pattern: '**/*.{md,mdx}',
      base: './src/content/blog',
      generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
    }),
    schema: ({ image }) =>
      baseCollectionSchema({ image }).extend({
        slug: slugSchema
          .min(1, 'Blog posts need a non-empty slug.')
          .refine(
            (value) => value !== 'page',
            'Slug "page" is reserved for pagination (/blog/page/<n>/).'
          ),
        publishedAt: z.coerce.date(),
        ...buildFieldsZodShape(blogExtraFields, image, BUILT_IN_BLOG_RESERVED),
      }),
  }),
  projects: defineCollection({
    loader: glob({
      pattern: '**/*.{md,mdx}',
      base: './src/content/projects',
      generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
    }),
    schema: ({ image }) =>
      baseCollectionSchema({ image }).extend({
        slug: slugSchema
          .min(1, 'Projects need a non-empty slug.')
          .refine(
            (value) => value !== 'page',
            'Slug "page" is reserved for pagination (/projects/page/<n>/).'
          ),
        client: z.string().min(1).optional(),
        year: z.number().int().min(1990).max(2100).optional(),
        link: z.url().optional(),
        stack: z.array(z.string().min(1)).default([]),
        ...buildFieldsZodShape(projectExtraFields, image, BUILT_IN_PROJECT_RESERVED),
      }),
  }),
  ...clientCollections,
  ...buildConfiguredCollections(configuredTypes, [
    'pages',
    'blog',
    'projects',
    ...Object.keys(clientCollections),
  ]),
};
