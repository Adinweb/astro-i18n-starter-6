import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, stringifyFrontmatter } from '../../../scripts/lib/frontmatter.mjs';
import { applyBlueprintToConfig, BLUEPRINTS, VALID_BLUEPRINTS } from '../../../scripts/lib/blueprints.mjs';
import {
  buildBlocksCatalog,
  generateBlocksApi,
  MAX_BLOCKS_API_BYTES,
  renderBlocksApiMarkdown,
} from '../../../scripts/lib/blocks-catalog.mjs';
import { syncDictionaryKeys } from '../../../scripts/lib/i18n-sync.mjs';
import { applySiteSpec, validateSiteSpec } from '../../../scripts/lib/site-apply.mjs';
import { HERO_SECTION_NAMES, SECTION_BLOCK_NAMES } from '@/libs/ui/sections';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function createSandboxWorkspace(tmpRoot: string) {
  for (const relFile of [
    'app.config.json',
    'client/config.json',
    'client/cms.json',
    'client/locales.json',
    'client/navigation.ts',
    'client/content.ts',
    '.pages.yml',
    'src/libs/config/theme-presets.json',
    'messages/core/en.json',
    'messages/core/fa.json',
    'client/messages/en.json',
    'client/messages/fa.json',
  ]) {
    const src = path.join(repoRoot, relFile);
    const dest = path.join(tmpRoot, relFile);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  // Minimal astro.png / cover fallback for artwork lookup
  const heroArt = path.join(repoRoot, 'src/assets/hero/hero-0.jpg');
  if (fs.existsSync(heroArt)) {
    const destHero = path.join(tmpRoot, 'src/assets/hero/hero-0.jpg');
    fs.mkdirSync(path.dirname(destHero), { recursive: true });
    fs.copyFileSync(heroArt, destHero);
  }

  // Minimal home pages in en & fa so locale switches have valid targets
  for (const locale of ['en', 'fa']) {
    const homeDir = path.join(tmpRoot, 'src/content/pages/home');
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(
      path.join(homeDir, `${locale}.mdx`),
      `---\ntitle: "${locale === 'fa' ? 'خانه' : 'Home'}"\nslug: ""\ndraft: false\n---\n\nHome body.\n`,
      'utf-8'
    );
  }
}

describe('Nested YAML Frontmatter & Agent DX Automation Tools', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-dx-'));
    createSandboxWorkspace(tmpRoot);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe('frontmatter.mjs nested YAML round-trip', () => {
    it('parses and serializes nested sections[] without polluting top-level keys', () => {
      const sample = {
        title: 'Landing Page',
        slug: 'landing',
        description: 'Composable page',
        hero: 'none',
        container: 'canvas',
        flushTop: true,
        image: './hero.png',
        draft: false,
        sections: [
          {
            block: 'LandingHeroSplit',
            props: {
              title: 'Nested Hero Title',
              image: './inner-hero.jpg',
              primaryCta: { label: 'Start', href: '/contact/' },
            },
          },
          {
            block: 'FeatureCardGrid',
            props: {
              columns: 3,
              items: [
                { title: 'Fast', description: 'Line one\nLine two', icon: 'bolt' },
                { title: 'RTL Native', description: 'Logical CSS', icon: 'globe' },
              ],
            },
          },
          {
            block: 'ProofStatsRow',
            props: {},
          },
        ],
        links: ['https://example.com', 'https://astro.build'],
      };

      const serialized = stringifyFrontmatter(sample, '\nBody note.\n');
      const { data, body } = parseFrontmatter(serialized) as { data: Record<string, any>; body: string };

      expect(data.title).toBe('Landing Page');
      expect(data.image).toBe('./hero.png');
      expect(data.flushTop).toBe(true);
      expect(data.draft).toBe(false);
      expect(Array.isArray(data.sections)).toBe(true);
      expect(data.sections).toHaveLength(3);
      expect(data.sections[0].block).toBe('LandingHeroSplit');
      expect(data.sections[0].props.title).toBe('Nested Hero Title');
      expect(data.sections[0].props.image).toBe('./inner-hero.jpg');
      expect(data.sections[0].props.primaryCta).toEqual({ label: 'Start', href: '/contact/' });
      expect(data.sections[1].props.columns).toBe(3);
      expect(data.sections[1].props.items).toHaveLength(2);
      expect(data.sections[1].props.items[0].description).toBe('Line one\nLine two');
      expect(data.sections[2].props).toEqual({});
      expect(data.links).toEqual(['https://example.com', 'https://astro.build']);

      // Verify multiline YAML sequence items containing URLs parse as strings rather than mappings
      const seqWithUrl = parseFrontmatter(
        '---\ntitle: "Links"\nslug: "links"\nmeta:\n  urls:\n    - https://example.com\n    - 12:30\n---\n\nBody\n'
      ) as { data: Record<string, any> };
      expect(seqWithUrl.data.meta.urls).toEqual(['https://example.com', '12:30']);
      expect(body).toContain('Body note.');
    });
  });

  describe('Industry Blueprints (blueprints.mjs)', () => {
    it('every blueprint declares domain contentTypes applied cleanly to config', () => {
      for (const name of VALID_BLUEPRINTS) {
        const bp = (BLUEPRINTS as Record<string, any>)[name];
        expect(bp.contentTypes, `Blueprint ${name} missing contentTypes`).toBeDefined();
        const cfg: Record<string, any> = {
          content: {
            types: {
              pages: { enabled: true, base: '' },
              blog: { enabled: true, base: 'blog' },
              projects: { enabled: true, base: 'projects' },
            },
          },
        };
        applyBlueprintToConfig(cfg, name);
        expect(cfg.brand.preset).toBe(bp.preset);
        for (const typeKey of Object.keys(bp.contentTypes)) {
          expect(cfg.content.types[typeKey]).toBeDefined();
        }
      }
    });
  });

  describe('blocks:catalog (docs/BLOCKS-API.md)', () => {
    it('matches SectionComposer blocks, stays under 5 KB, and stays synchronized on disk', () => {
      const catalog = buildBlocksCatalog(repoRoot) as {
        heroes: Array<{ name: string }>;
        sections: Array<{ name: string }>;
      };
      expect(catalog.heroes.map((h) => h.name)).toEqual([...HERO_SECTION_NAMES].sort());
      const sectionPlusComposer = [...SECTION_BLOCK_NAMES, 'SectionComposer'].filter(
        (n) => !HERO_SECTION_NAMES.includes(n as any)
      );
      expect(catalog.sections.map((s) => s.name)).toEqual(sectionPlusComposer.sort());

      const rendered = renderBlocksApiMarkdown(catalog);
      expect(Buffer.byteLength(rendered, 'utf-8')).toBeLessThan(MAX_BLOCKS_API_BYTES);

      const checkRes = generateBlocksApi({ rootDir: repoRoot, check: true });
      expect(checkRes.overBudget).toBe(false);
      expect(checkRes.changed).toBe(false);
    });
  });

  describe('i18n:sync-keys (i18n-sync.mjs)', () => {
    it('populates missing keys with English in defaultLocale and [TODO: <locale>] in others', () => {
      const targetDir = path.join(tmpRoot, 'src/components');
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(
        path.join(targetDir, 'SampleUsage.astro'),
        `---\n---\n<span>{m.${'custom_hero_badge'}({}, { locale })}</span>\n`,
        'utf-8'
      );

      const dry = syncDictionaryKeys(tmpRoot, { dryRun: true, compile: false }) as unknown as {
        totalAdded: number;
        addedByLocale: Record<string, string[]>;
      };
      expect(dry.totalAdded).toBeGreaterThanOrEqual(2);
      expect(dry.addedByLocale.en).toContain('custom_hero_badge');
      expect(dry.addedByLocale.fa).toContain('custom_hero_badge');

      const enBefore = JSON.parse(fs.readFileSync(path.join(tmpRoot, 'client/messages/en.json'), 'utf-8'));
      expect(enBefore.custom_hero_badge).toBeUndefined();

      const applied = syncDictionaryKeys(tmpRoot, { dryRun: false, compile: false }) as unknown as {
        addedByLocale: Record<string, string[]>;
      };
      expect(applied.addedByLocale.en).toContain('custom_hero_badge');

      const enAfter = JSON.parse(fs.readFileSync(path.join(tmpRoot, 'client/messages/en.json'), 'utf-8'));
      const faAfter = JSON.parse(fs.readFileSync(path.join(tmpRoot, 'client/messages/fa.json'), 'utf-8'));
      expect(enAfter.custom_hero_badge).toBe('Custom Hero Badge');
      expect(faAfter.custom_hero_badge).toBe('[TODO: fa] Custom Hero Badge');
    });
  });

  describe('site:apply (site-apply.mjs)', () => {
    it('validates invalid specs cleanly without mutating files', () => {
      const errors = validateSiteSpec(
        {
          blueprint: 'unknown-bp',
          site: { contactEmail: 'not-an-email', url: 'ftp://invalid.local' },
          brand: { preset: 'neon', primaryColor: 'red' },
          ui: {
            homeSections: [{ block: 'FakeSectionBlock', props: {} }],
            navigation: {
              pages: [{ label: 'Missing Group' }],
              footerColumns: [{ key: 'col1', items: [{ label: 'Broken' }] }],
            },
          },
          pages: {
            about: { slug: '/about/' },
          },
          entries: {
            nonexistent: { item1: { title: 'Test' } },
          },
        },
        { rootDir: tmpRoot }
      );
      expect(errors.length).toBeGreaterThanOrEqual(9);
    });

    it('supports --dry-run without disk writes and applies complete multi-locale specs in full mode', () => {
      const logoSrc = path.join(tmpRoot, 'logo-source.svg');
      fs.writeFileSync(logoSrc, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24"/></svg>');

      const spec = {
        blueprint: 'medical',
        site: {
          name: 'Tehran Care Clinic',
          shortName: 'Tehran Care',
          description: 'Specialist outpatient clinic',
          contactEmail: 'care@example.com',
        },
        brand: {
          preset: 'emerald',
          rtlFontPreset: 'vazirmatn',
          logo: {
            light: 'logo-source.svg',
            showText: true,
          },
        },
        ui: {
          ctaPage: 'services',
          navigation: {
            footerColumns: [
              {
                key: 'clinic',
                titles: { en: 'Clinic', fa: 'کلینیک' },
                items: [{ group: 'services', labels: { en: 'Services', fa: 'خدمات' } }],
              },
            ],
          },
          homeSections: [
            { block: 'HeroCenteredEditorial', props: { titleLead: 'Modern Healthcare' } },
            { block: 'CtaBanner', props: { title: 'Book an appointment' } },
          ],
        },
        pages: {
          services: {
            hero: 'none',
            container: 'canvas',
            flushTop: true,
            nav: { icon: 'heart' },
            publish: true,
            locales: {
              en: { title: 'Our Services', slug: 'services', description: 'Medical services overview' },
              fa: { title: 'خدمات ما', slug: 'خدمات', description: 'معرفی خدمات درمانی' },
            },
            sections: [
              { block: 'LandingHeroSplit', props: { title: 'Specialist Care' } },
              { block: 'FaqAccordion', props: { heading: 'FAQ' } },
            ],
          },
        },
        entries: {
          services: {
            'cardiology-visit': {
              publish: true,
              department: 'cardiology',
              accepting_patients: true,
              locales: {
                en: { title: 'Cardiology Clinic', slug: 'cardiology', description: 'Heart diagnostics' },
                fa: { title: 'کلینیک قلب', slug: 'قلب', description: 'تشخیص و درمان بیماری‌های قلبی' },
              },
            },
          },
        },
        messages: {
          en: { common_get_started: 'Book Visit' },
          fa: { common_get_started: 'رزرو نوبت' },
        },
      };

      const dryResult = applySiteSpec(spec, { rootDir: tmpRoot, dryRun: true, skipAssets: true });
      expect(dryResult.ok).toBe(true);
      expect(dryResult.dryRun).toBe(true);
      expect(fs.existsSync(path.join(tmpRoot, 'src/content/pages/services/en.mdx'))).toBe(false);
      expect(fs.existsSync(path.join(tmpRoot, 'public/brand/logo.svg'))).toBe(false);

      const realResult = applySiteSpec(spec, { rootDir: tmpRoot, dryRun: false, skipAssets: true });
      expect(realResult.ok).toBe(true);
      expect(realResult.copiedBrandFiles).toEqual(['public/brand/logo.svg']);
      expect(fs.existsSync(path.join(tmpRoot, 'public/brand/logo.svg'))).toBe(true);

      const clientCfg = JSON.parse(fs.readFileSync(path.join(tmpRoot, 'client/config.json'), 'utf-8'));
      expect(clientCfg.site.name).toBe('Tehran Care Clinic');
      expect(clientCfg.brand.logo.light).toBe('/brand/logo.svg');
      expect(clientCfg.ui.ctaPage).toBe('services');
      expect(clientCfg.ui.homeSections).toHaveLength(2);
      expect(clientCfg.ui.navigation.pages.some((p: any) => p.group === 'services' && p.icon === 'heart')).toBe(true);
      expect(clientCfg.content.types.services).toBeDefined();

      // Services page has nested sections preserved cleanly
      const servicesEn = fs.readFileSync(path.join(tmpRoot, 'src/content/pages/services/en.mdx'), 'utf-8');
      const parsedPage = parseFrontmatter(servicesEn) as { data: Record<string, any> };
      expect(parsedPage.data.title).toBe('Our Services');
      expect(parsedPage.data.sections).toHaveLength(2);
      expect(parsedPage.data.sections[0].block).toBe('LandingHeroSplit');

      // Custom collection entry from medical blueprint written cleanly
      const serviceFa = fs.readFileSync(path.join(tmpRoot, 'src/content/services/cardiology-visit/fa.mdx'), 'utf-8');
      const parsedService = parseFrontmatter(serviceFa) as { data: Record<string, any> };
      expect(parsedService.data.department).toBe('cardiology');
      expect(parsedService.data.accepting_patients).toBe(true);
      expect(parsedService.data.draft).toBe(false);

      // Synced & overridden messages
      const enMsgs = JSON.parse(fs.readFileSync(path.join(tmpRoot, 'client/messages/en.json'), 'utf-8'));
      const faMsgs = JSON.parse(fs.readFileSync(path.join(tmpRoot, 'client/messages/fa.json'), 'utf-8'));
      expect(faMsgs.common_get_started).toBe('رزرو نوبت');
      expect(enMsgs.services_field_department).toBe('Department');
      expect(faMsgs.services_field_department).toBe('[TODO: fa] Department');

      // .pages.yml synced with services collection from medical blueprint
      const pagesYml = fs.readFileSync(path.join(tmpRoot, '.pages.yml'), 'utf-8');
      expect(pagesYml).toContain('name: services');
    }, 20000);
  });
});
