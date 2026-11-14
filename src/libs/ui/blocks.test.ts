import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

const COMPOSABLE_BLOCKS = [
  'LandingHeroSplit',
  'BentoCapabilities',
  'ProofStatsRow',
  'FaqAccordion',
  'CtaBanner',
  'PricingSection',
  'TestimonialGrid',
  'TeamSection',
  'PartnerLogos',
  'NewsletterBanner',
] as const;

const FORBIDDEN_PHYSICAL_CLASS =
  /^(?:-?m[lr]-|p[lr]-|-?(?:left|right)-|text-(?:left|right)$|border-[lr](?:$|-)|rounded-(?:[tb])?[lr](?:$|-))/;

describe('Composable Corporate & Landing Blocks', () => {
  it('all 10 blocks exist and use RTL logical properties without raw <svg> blobs or hex colors', () => {
    for (const block of COMPOSABLE_BLOCKS) {
      const filePath = path.join(rootDir, `src/components/${block}.astro`);
      expect(fs.existsSync(filePath), `Missing block component: ${block}`).toBe(true);

      const source = fs.readFileSync(filePath, 'utf-8');
      expect(source).not.toMatch(/<svg[\s>]/i);
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/data-trig-direction\s*=\s*["'](?:left|right)["']/);

      // Scan every class token inside template markup for physical directional utilities
      const markup = source.split(/^---$/m).slice(2).join('---');
      const quotedStrings = [...markup.matchAll(/["']([^"'\n]+)["']/g)].map((m) => m[1]);
      for (const str of quotedStrings) {
        for (const token of str.split(/\s+/).filter(Boolean)) {
          const utility = token.replace(/^(?:[a-z0-9-[\]=]+:)+/, '');
          expect(
            FORBIDDEN_PHYSICAL_CLASS.test(utility),
            `Physical class "${token}" found in ${block}.astro`
          ).toBe(false);
        }
      }

      expect(source).toContain('data-trig');
    }
  });

  it('non-hero section blocks wrap via PageSection and never emit competing <h1> tags', () => {
    for (const block of COMPOSABLE_BLOCKS) {
      if (block === 'LandingHeroSplit') continue;
      const source = fs.readFileSync(
        path.join(rootDir, `src/components/${block}.astro`),
        'utf-8'
      );
      expect(source).toContain('PageSection');
      expect(source).not.toMatch(/<h1[\s>]/i);
    }
  });

  it('LandingHeroSplit emits the sole <h1> for custom canvas landing pages', () => {
    const hero = fs.readFileSync(
      path.join(rootDir, 'src/components/LandingHeroSplit.astro'),
      'utf-8'
    );
    expect(hero).toMatch(/<h1[\s>]/);
  });
});
