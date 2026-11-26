import { z } from 'astro/zod';

/**
 * Single source of truth for composable section block names supported by
 * `<SectionComposer />`, `pages` frontmatter (`sections`), and `ui.homeSections`.
 */
export const HERO_SECTION_NAMES = [
  'LandingHeroSplit',
  'HeroCenteredEditorial',
  'HeroDashboardShowcase',
  'HeroCommandCli',
  'HeroInteractivePrompt',
  'HeroProofMarquee',
  'HeroFloatingOrbSplit',
] as const;

const STRUCTURAL_SECTION_NAMES = [
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

export const SECTION_BLOCK_NAMES = [
  ...HERO_SECTION_NAMES,
  ...STRUCTURAL_SECTION_NAMES,
] as const;

export type SectionBlockName = (typeof SECTION_BLOCK_NAMES)[number];

export const pageSectionItemSchema = z.object({
  block: z.enum(SECTION_BLOCK_NAMES),
  props: z.record(z.string(), z.unknown()).optional().default({}),
});

export type PageSectionConfig = z.infer<typeof pageSectionItemSchema>;
