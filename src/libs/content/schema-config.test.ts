import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COLLECTION_SCHEMAS,
  getCanonicalFilterParam,
  resolveCollectionSchema,
  toFilterFieldDefs,
} from './schema-config';
import {
  formatEntryFieldForDisplay,
  serializeCollectionEntries,
  sortCollectionEntries,
} from './catalog-utils';
import { buildSyncedPagesYml } from '../../../scripts/content-sync.mjs';
import { getKnownTypes } from '../../../scripts/lib/content-types.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

describe('src/libs/content/schema-config.ts & collection browser integration', () => {
  it('resolves built-in projects and blog schemas with full backward compatibility', () => {
    const projectsSchema = resolveCollectionSchema('projects');
    expect(projectsSchema.sortBy).toBe('year');
    expect(projectsSchema.sortOrder).toBe('desc');
    expect(projectsSchema.card.badgeField).toBe('stack');
    expect(projectsSchema.card.metaFields).toEqual(['client', 'year']);

    const defs = toFilterFieldDefs(projectsSchema.fields);
    expect(defs.map((d) => [d.name, d.param, d.mode])).toEqual([
      ['categories', 'category', 'single'],
      ['stack', 'stack', 'multi'],
    ]);

    const blogSchema = resolveCollectionSchema('blog');
    expect(blogSchema.sortBy).toBe('publishedAt');
    expect(DEFAULT_COLLECTION_SCHEMAS.blog.card.badgeField).toBe('categories');
  });

  it('merges custom fields onto built-in collections and resolves custom schemas like gallery', () => {
    const gallerySchema = resolveCollectionSchema('gallery', {
      fields: [
        {
          name: 'medium',
          type: 'enum',
          options: ['oil', 'watercolor', 'digital'],
          labels: { en: 'Medium', fa: 'تکنیک' },
          filter: { enabled: true, mode: 'single' },
          showOnCard: 'badge',
        },
        {
          name: 'year',
          type: 'number',
          min: 2000,
          max: 2030,
          labels: { en: 'Year', fa: 'سال' },
          filter: { enabled: true, mode: 'range' },
          showOnCard: 'meta',
        },
        {
          name: 'featured',
          type: 'boolean',
          labels: { en: 'Featured', fa: 'ویژه' },
          filter: { enabled: true, mode: 'toggle' },
        },
      ],
      card: { aspectRatio: 'square', layout: 'gallery', badgeLimit: 2 },
      sortBy: 'year',
      sortOrder: 'desc',
    });

    expect(gallerySchema.card).toEqual({
      layout: 'gallery',
      aspectRatio: 'square',
      badgeField: 'medium',
      badgeLimit: 2,
      metaFields: ['year'],
    });
    expect(toFilterFieldDefs(gallerySchema.fields).map((d) => [d.name, d.mode])).toEqual([
      ['medium', 'single'],
      ['year', 'range'],
      ['featured', 'toggle'],
    ]);
    expect(getCanonicalFilterParam({ name: 'categories' })).toBe('category');
    expect(getCanonicalFilterParam({ name: 'tags' })).toBe('tag');
  });

  it('sorts and serializes generic collection entries for catalog APIs', async () => {
    const entries = [
      {
        id: 'beta/en',
        data: {
          title: 'Beta Work',
          slug: 'beta',
          description: 'Second item',
          client: 'Acme',
          year: 2023,
          categories: ['engineering'],
          stack: ['Astro'],
        },
      },
      {
        id: 'alpha/en',
        data: {
          title: 'Alpha Work',
          slug: 'alpha',
          description: 'First item',
          client: 'Nova',
          year: 2025,
          categories: ['design'],
          stack: ['React', 'Tailwind'],
        },
      },
    ];

    const config = {
      key: 'projects',
      ...resolveCollectionSchema('projects'),
    };
    const sorted = sortCollectionEntries([...entries], config, 'en');
    expect(sorted.map((item) => item.data.slug)).toEqual(['alpha', 'beta']);
    expect(formatEntryFieldForDisplay('projects', 'year', 2025, config, 'en')).toBe('2025');

    const catalog = await serializeCollectionEntries('projects', entries, config, 'en');
    expect(catalog).toHaveLength(2);
    expect(catalog[0]).toMatchObject({
      title: 'Alpha Work',
      client: 'Nova',
      year: 2025,
      badges: ['React', 'Tailwind'],
      metaText: 'Nova · 2025',
    });
    expect(catalog[0]?.values).toMatchObject({
      client: 'Nova',
      year: 2025,
      categories: ['design'],
      stack: ['React', 'Tailwind'],
    });
  });

  it('keeps CollectionBrowser.astro RTL-safe, ChronoTrig-compliant, and zero raw-SVG', () => {
    const source = fs.readFileSync(
      path.join(rootDir, 'src/components/CollectionBrowser.astro'),
      'utf-8'
    );
    expect(source).not.toMatch(/<svg[\s>]/i);
    expect(source).not.toMatch(/data-trig-direction\s*=\s*["'](?:left|right)["']/);
    expect(source).toContain('resolveComponentLocale');
    expect(source).toContain('replayStaggerGrid(grid)');
    expect(source).toContain('data-trig-once="true"');
    expect(source).toContain('data-trig-stagger');
    expect(source).toContain('data-pagefind-ignore');
  });

  it('recognizes config-defined collections in scripts and syncs .pages.yml cleanly', () => {
    const customConfig = {
      content: {
        types: {
          pages: { enabled: true },
          blog: { enabled: true },
          projects: { enabled: true },
          gallery: {
            enabled: true,
            base: 'gallery',
            labels: { en: 'Gallery', fa: 'گالری' },
            fields: [
              {
                name: 'medium',
                type: 'enum',
                options: ['oil', 'digital'],
                required: true,
                labels: { en: 'Medium', fa: 'تکنیک' },
                filter: { enabled: true, mode: 'single' },
              },
            ],
          },
        },
      },
    };

    const known = getKnownTypes(rootDir, customConfig);
    expect(known).toContain('gallery');

    const existingPagesYml = fs.readFileSync(path.join(rootDir, '.pages.yml'), 'utf-8');
    const synced = buildSyncedPagesYml(existingPagesYml, [
      { key: 'pages', enabled: true },
      { key: 'blog', enabled: true },
      { key: 'projects', enabled: true },
      {
        key: 'gallery',
        enabled: true,
        labels: { en: 'Gallery', fa: 'گالری' },
        fields: customConfig.content.types.gallery.fields,
      },
    ]);

    expect(synced).toContain('- name: gallery');
    expect(synced).toContain('path: src/content/gallery');
    expect(synced).toContain('values: ["oil", "digital"]');
    expect(synced).toContain('- name: settings');

    // Clean baseline repo produces byte-identical .pages.yml
    const unchanged = buildSyncedPagesYml(existingPagesYml, [
      { key: 'pages', enabled: true },
      { key: 'blog', enabled: true },
      { key: 'projects', enabled: true },
    ]);
    expect(unchanged).toBe(existingPagesYml);
  });
});
