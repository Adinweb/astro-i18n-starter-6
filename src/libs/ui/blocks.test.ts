import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

const HERO_SECTIONS = [
  'LandingHeroSplit',
  'HeroCenteredEditorial',
  'HeroDashboardShowcase',
  'HeroCommandCli',
  'HeroInteractivePrompt',
  'HeroProofMarquee',
] as const;

const COMPOSABLE_SECTIONS = [
  'LandingHeroSplit',
  'HeroCenteredEditorial',
  'HeroDashboardShowcase',
  'HeroCommandCli',
  'HeroInteractivePrompt',
  'HeroProofMarquee',
  'BentoCapabilities',
  'ProofStatsRow',
  'FaqAccordion',
  'CtaBanner',
  'PricingSection',
  'TestimonialGrid',
  'TeamSection',
  'PartnerLogos',
  'NewsletterBanner',
  'PromoBanner',
  'AboutSplitSection',
  'ProcessSteps',
  'FeatureTabsSection',
  'ComparisonTable',
  'FeatureCardGrid',
  'ImageGallerySection',
  'LatestPostsSection',
  'ContactSplitSection',
  'CarouselSection',
  'ProductShowcaseGrid',
  'AuthFormCard',
  'ParallaxSection',
] as const;

const UI_PRIMITIVES = [
  'UiBadge',
  'UiAlert',
  'AvatarGroup',
  'Breadcrumbs',
  'HeroPreviewNav',
  'HeroParallaxLayer',
  'UiPagination',
  'UiModal',
  'UiTooltip',
  'UiProgress',
  'UiSwitch',
  'UiCheckbox',
  'UiInput',
  'UiDropdown',
  'SocialLinks',
] as const;

const ALL_REUSABLE_COMPONENTS = [...COMPOSABLE_SECTIONS, ...UI_PRIMITIVES] as const;

const FORBIDDEN_PHYSICAL_CLASS =
  /^(?:-?m[lr]-|p[lr]-|-?(?:left|right)-|text-(?:left|right)$|border-[lr](?:$|-)|rounded-(?:[tb])?[lr](?:$|-))/;

describe('PrebuiltUI-Adapted Reusable Corporate & Landing Blocks', () => {
  it('all reusable blocks/primitives exist and use RTL logical properties without raw <svg> blobs or hex colors', () => {
    for (const component of ALL_REUSABLE_COMPONENTS) {
      const filePath = path.join(rootDir, `src/components/${component}.astro`);
      expect(fs.existsSync(filePath), `Missing component: ${component}`).toBe(true);

      const source = fs.readFileSync(filePath, 'utf-8');
      expect(source).not.toMatch(/<svg[\s>]/i);
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/data-trig-direction\s*=\s*["'](?:left|right)["']/);

      const markup = source.split(/^---$/m).slice(2).join('---');
      const quotedStrings = [...markup.matchAll(/["']([^"'\n]+)["']/g)].map((m) => m[1]);
      for (const str of quotedStrings) {
        for (const token of str.split(/\s+/).filter(Boolean)) {
          const utility = token.replace(/^(?:[a-z0-9-[\]=]+:)+/, '');
          expect(
            FORBIDDEN_PHYSICAL_CLASS.test(utility),
            `Physical class "${token}" found in ${component}.astro`
          ).toBe(false);
        }
      }

      expect(source).toContain('resolveComponentLocale');
    }
  });

  it('all section blocks declare data-trig viewport reveal attributes', () => {
    for (const block of COMPOSABLE_SECTIONS) {
      const source = fs.readFileSync(
        path.join(rootDir, `src/components/${block}.astro`),
        'utf-8'
      );
      expect(source).toContain('data-trig');
    }
  });

  it('all non-hero section blocks wrap via PageSection and never emit competing <h1> tags', () => {
    for (const block of COMPOSABLE_SECTIONS) {
      if ((HERO_SECTIONS as readonly string[]).includes(block)) continue;
      const source = fs.readFileSync(
        path.join(rootDir, `src/components/${block}.astro`),
        'utf-8'
      );
      expect(source).toContain('PageSection');
      expect(source).not.toMatch(/<h1[\s>]/i);
    }
  });

  it('all 13 UI primitives never emit competing <h1> tags', () => {
    for (const primitive of UI_PRIMITIVES) {
      const source = fs.readFileSync(
        path.join(rootDir, `src/components/${primitive}.astro`),
        'utf-8'
      );
      expect(source).not.toMatch(/<h1[\s>]/i);
    }
  });

  it('hero sections support <h1> and configurable headingTag for nested showcase previews', () => {
    for (const heroName of HERO_SECTIONS) {
      const hero = fs.readFileSync(
        path.join(rootDir, `src/components/${heroName}.astro`),
        'utf-8'
      );
      expect(hero).toMatch(/<h1[\s>]/);
      expect(hero).toContain("headingTag = 'h1'");
    }
  });
});
