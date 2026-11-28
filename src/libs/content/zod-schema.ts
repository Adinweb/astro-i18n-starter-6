import fs from 'node:fs';
import path from 'node:path';
import { defineCollection, type ImageFunction } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import type { CollectionFieldConfig } from './schema-config';

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

export const slugSchema = z.string().refine(
  isValidSlug,
  'Use letters, digits, and single hyphens or zero-width joiners only (empty is allowed only for the home page).'
);

function isValidPageSlug(value: string): boolean {
  if (value === '') return true;
  return value.split('/').every((segment) => segment.length > 0 && isValidSlug(segment));
}

export const pageSlugSchema = z.string().refine(
  isValidPageSlug,
  'Use letters, digits, and single hyphens or zero-width joiners per path segment (no leading, trailing, or empty "/" segments).'
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

const SRC_ASSET_IMAGE_PATH_RE = /^\/?src\/assets\/(?!.*\.\.)[^\s]+$/i;

export const externalOrPublicImageSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      SRC_ASSET_IMAGE_PATH_RE.test(value) ||
      (value.startsWith('/') && !value.startsWith('//')) ||
      /^https?:\/\//i.test(value),
    'Use a local asset path (e.g. "src/assets/uploads/..."), a root-relative public path (e.g. "/uploads/..."), or an http(s) URL.'
  );

function flexibleImageSchema(image: ImageFunction) {
  return z.union([image(), externalOrPublicImageSchema]);
}

/**
 * Base schema shared by every content collection.
 */
export const baseCollectionSchema = ({ image }: { image: ImageFunction }) =>
  z.object({
    title: z.string().min(1),
    slug: slugSchema,
    description: z.string().optional(),
    image: flexibleImageSchema(image).optional(),
    author: z.string().min(1).optional(),
    publishedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    categories: z.array(taxonomyKey).default([]),
    tags: z.array(taxonomyKey).default([]),
    draft: z.boolean().default(false),
    noindex: z.boolean().default(false),
    template: z.string().min(1).optional(),
  });

function buildSingleFieldZod(field: CollectionFieldConfig, image: ImageFunction): z.ZodType {
  let schema: z.ZodType;

  switch (field.type) {
    case 'string':
    case 'text': {
      schema = z.string().min(1);
      break;
    }
    case 'number': {
      let num = z.coerce.number();
      if (typeof field.min === 'number') num = num.min(field.min);
      if (typeof field.max === 'number') num = num.max(field.max);
      schema = num;
      break;
    }
    case 'boolean': {
      schema = z.boolean();
      break;
    }
    case 'date': {
      schema = z.coerce.date();
      break;
    }
    case 'url': {
      schema = z.url();
      break;
    }
    case 'image': {
      schema = flexibleImageSchema(image);
      break;
    }
    case 'enum': {
      const options = (field.options ?? []).filter(Boolean);
      schema =
        options.length >= 1
          ? z.enum(options as [string, ...string[]])
          : z.string().min(1);
      break;
    }
    case 'string[]': {
      schema = z.array(z.string().min(1));
      break;
    }
    case 'taxonomy[]': {
      schema = z.array(taxonomyKey);
      break;
    }
    default: {
      schema = z.unknown();
      break;
    }
  }

  if (field.default !== undefined) {
    return schema.default(field.default as never);
  }
  if (field.type === 'string[]' || field.type === 'taxonomy[]') {
    return field.required ? schema : schema.default([]);
  }
  if (field.type === 'boolean' && !field.required) {
    return schema.default(false);
  }
  return field.required ? schema : schema.optional();
}

export function buildFieldsZodShape(
  fields: readonly CollectionFieldConfig[] | undefined,
  image: ImageFunction,
  reservedKeys: ReadonlySet<string> = new Set()
): Record<string, z.ZodType> {
  const shape: Record<string, z.ZodType> = {};
  if (!fields) return shape;

  for (const field of fields) {
    if (!field?.name || reservedKeys.has(field.name)) continue;
    shape[field.name] = buildSingleFieldZod(field, image);
  }

  return shape;
}

const BASE_SCHEMA_KEYS = new Set([
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
  'noindex',
  'template',
]);

export interface ConfiguredCollectionInput {
  enabled?: boolean;
  paginated?: boolean;
  schemaDriven?: boolean;
  fields?: readonly CollectionFieldConfig[];
}

export function buildConfiguredCollections(
  typesConfig: Record<string, ConfiguredCollectionInput> | undefined,
  existingKeys: readonly string[]
): Record<string, ReturnType<typeof defineCollection>> {
  const collections: Record<string, ReturnType<typeof defineCollection>> = {};
  if (!typesConfig) return collections;

  const existing = new Set(existingKeys);

  for (const [key, cfg] of Object.entries(typesConfig)) {
    if (existing.has(key)) continue;
    if (!Array.isArray(cfg?.fields) && cfg?.schemaDriven !== true) continue;

    const contentDir = path.resolve(process.cwd(), 'src', 'content', key);
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }

    const customFields = cfg.fields ?? [];
    collections[key] = defineCollection({
      loader: glob({
        pattern: '**/*.{md,mdx}',
        base: `./src/content/${key}`,
        generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
      }),
      schema: ({ image }) =>
        baseCollectionSchema({ image }).extend({
          slug: slugSchema
            .min(1, `${key} entries need a non-empty slug.`)
            .refine(
              (value) => value !== 'page',
              `Slug "page" is reserved for pagination (/${key}/page/<n>/).`
            ),
          ...buildFieldsZodShape(customFields, image, BASE_SCHEMA_KEYS),
        }),
    });
  }

  return collections;
}
