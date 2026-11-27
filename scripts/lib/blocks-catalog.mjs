/**
 * Generates a compact (< 5 KB) Markdown component & Props reference (`docs/BLOCKS-API.md`)
 * directly from `interface Props` and `= Astro.props` defaults in `src/components/*.astro`
 * and `src/components/ui/*.astro` using the TypeScript AST.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const MAX_BLOCKS_API_BYTES = 5120;

const HERO_NAMES = new Set([
  'LandingHeroSplit',
  'HeroCenteredEditorial',
  'HeroDashboardShowcase',
  'HeroCommandCli',
  'HeroInteractivePrompt',
  'HeroProofMarquee',
  'HeroFloatingOrbSplit',
]);

const SECTION_NAMES = new Set([
  'SectionComposer',
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
]);

const SHOWCASE_NAMES = new Set([
  'BentoGrid',
  'LatestPostsCarousel',
  'SwipeableTabs',
  'TestimonialMarquee',
]);

const SHARED_SECTION_PROPS = new Set(['id', 'locale', 'surface', 'spacing', 'contained', 'class']);
const HERO_WRAPPER_PROPS = new Set([
  'backdrop',
  'framedRails',
  'parallaxImage',
  'parallaxAlt',
  'parallaxSpeed',
  'parallaxOverlay',
  'topBanner',
  'showPreviewNav',
  'previewNavVariant',
  'previewBrand',
  'previewLinks',
  'previewCta',
  'compact',
]);

function extractFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : '';
}

function compactType(raw) {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/readonly\s+/g, '')
    .replace(/\s*\|\s*/g, '|')
    .replace(/(?:ContentImage|ImageMetadata)/g, 'Image')
    .replace(/Locale\s*\|\s*string/g, 'Locale')
    .trim();
}

function compactDefault(raw) {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (cleaned.length > 22) return '…';
  return cleaned;
}

export function extractPropsFromAstro(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const frontmatter = extractFrontmatter(source);
  if (!frontmatter) return { props: [], defaults: {} };

  const sf = ts.createSourceFile(filePath, frontmatter, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const props = [];
  const defaults = {};

  function visit(node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'Props') {
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name) {
          const name = member.name.getText(sf);
          const optional = Boolean(member.questionToken);
          const typeText = member.type ? compactType(member.type.getText(sf)) : 'unknown';
          props.push({ name, optional, type: typeText });
        }
      }
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          decl.initializer &&
          decl.initializer.getText(sf).replace(/\s+/g, ' ').includes('Astro.props') &&
          ts.isObjectBindingPattern(decl.name)
        ) {
          for (const el of decl.name.elements) {
            if (el.initializer) {
              const propName = (el.propertyName ?? el.name).getText(sf);
              defaults[propName] = compactDefault(el.initializer.getText(sf));
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  const enriched = props.map((prop) => ({
    ...prop,
    defaultValue: defaults[prop.name],
  }));

  return { props: enriched, defaults };
}

function listAstroFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.astro'))
    .map((entry) => entry.name)
    .sort();
}

export function buildBlocksCatalog(rootDir = defaultRootDir) {
  const componentsDir = path.join(rootDir, 'src', 'components');
  const uiDir = path.join(componentsDir, 'ui');

  const topFiles = listAstroFiles(componentsDir);
  const uiFiles = listAstroFiles(uiDir);

  const catalog = {
    heroes: [],
    sections: [],
    showcases: [],
    core: [],
    ui: [],
  };

  for (const file of topFiles) {
    const name = file.replace(/\.astro$/, '');
    const relPath = `src/components/${file}`;
    const { props } = extractPropsFromAstro(path.join(componentsDir, file));
    const entry = { name, path: relPath, props };

    if (HERO_NAMES.has(name)) catalog.heroes.push(entry);
    else if (SECTION_NAMES.has(name)) catalog.sections.push(entry);
    else if (SHOWCASE_NAMES.has(name)) catalog.showcases.push(entry);
    else catalog.core.push(entry);
  }

  for (const file of uiFiles) {
    const name = file.replace(/\.astro$/, '');
    const relPath = `src/components/ui/${file}`;
    const { props } = extractPropsFromAstro(path.join(uiDir, file));
    catalog.ui.push({ name, path: relPath, props });
  }

  return catalog;
}

function formatCompactProp(prop) {
  const opt = prop.optional ? '?' : '';
  const type = prop.type
    .replace(/\s+/g, '')
    .replace(/Record<string,unknown>/g, 'obj')
    .replace(/readonly\s+/g, '');
  const shortType = type.length > 18 ? `${type.slice(0, 15)}…` : type;
  const def = prop.defaultValue !== undefined && prop.defaultValue !== '…' ? `=${prop.defaultValue}` : '';
  return `${prop.name}${opt}:${shortType}${def}`;
}

const HERO_PRIORITY_PROPS = [
  'title',
  'titleLead',
  'titleAccent',
  'titleHighlight',
  'titleSecondary',
  'description',
  'eyebrow',
  'primaryCta',
  'secondaryCta',
  'image',
  'imageAlt',
];

function renderSectionLine(entry, maxProps = 8, typed = true, skipHeroWrapper = false) {
  let filtered = entry.props.filter(
    (p) => !SHARED_SECTION_PROPS.has(p.name) && (!skipHeroWrapper || !HERO_WRAPPER_PROPS.has(p.name))
  );
  if (skipHeroWrapper) {
    filtered = [...filtered].sort((a, b) => {
      const ai = HERO_PRIORITY_PROPS.indexOf(a.name);
      const bi = HERO_PRIORITY_PROPS.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return 0;
    });
  }
  if (filtered.length === 0) return `- \`${entry.name}\``;
  const shown = filtered
    .slice(0, maxProps)
    .map((p) => (typed ? formatCompactProp(p) : `${p.name}${p.optional ? '?' : ''}`));
  const more = filtered.length > maxProps ? ` (+${filtered.length - maxProps})` : '';
  return `- \`${entry.name}\`: ${shown.join(', ')}${more}`;
}

function renderPackedList(entries, { stripShared = false, maxProps = 3 } = {}) {
  return entries
    .map((entry) => {
      const filtered = stripShared
        ? entry.props.filter((p) => !SHARED_SECTION_PROPS.has(p.name))
        : entry.props;
      const shown = filtered.slice(0, maxProps).map((p) => `${p.name}${p.optional ? '?' : ''}`);
      const more = filtered.length > maxProps ? `+${filtered.length - maxProps}` : '';
      return shown.length
        ? `${entry.name}(${shown.join(',')}${more ? `,${more}` : ''})`
        : entry.name;
    })
    .join(', ');
}

export function renderBlocksApiMarkdown(catalog) {
  const buildDoc = ({ heroMax, sectionMax, typed, packedMax }) =>
    [
      '# BLOCKS-API — Auto-Generated Component Props Reference',
      '',
      '> Auto-generated by `npm run blocks:catalog`. Shared section props: `id?`, `locale?`, `surface?` (`default|hero|surface|subtle`), `spacing?` (`sm|md|lg`), `contained?`, `class?`.',
      '> Shared hero props: `backdrop?`, `parallaxImage?`, `showPreviewNav?`, `topBanner?`, `headingTag?` (`h1|h2`), `compact?`. Compose via `sections: [{ block, props }]` or `ui.homeSections`.',
      '',
      '## Hero Sections (7)',
      ...catalog.heroes.map((e) => renderSectionLine(e, heroMax, typed, true)),
      '',
      '## Composable Section Blocks (22 + SectionComposer)',
      ...catalog.sections.map((e) => renderSectionLine(e, sectionMax, typed, false)),
      '',
      '## Interactive Showcases (4)',
      renderPackedList(catalog.showcases, { stripShared: true, maxProps: packedMax }),
      '',
      '## Core Components (`src/components/`)',
      renderPackedList(catalog.core, { stripShared: true, maxProps: packedMax }),
      '',
      '## UI Primitives (`src/components/ui/`)',
      renderPackedList(catalog.ui, { stripShared: false, maxProps: packedMax }),
      '',
    ].join('\n');

  for (const attempt of [
    { heroMax: 8, sectionMax: 7, typed: true, packedMax: 3 },
    { heroMax: 7, sectionMax: 6, typed: true, packedMax: 3 },
    { heroMax: 6, sectionMax: 5, typed: true, packedMax: 2 },
    { heroMax: 8, sectionMax: 8, typed: false, packedMax: 3 },
    { heroMax: 7, sectionMax: 6, typed: false, packedMax: 2 },
    { heroMax: 5, sectionMax: 5, typed: false, packedMax: 2 },
  ]) {
    const md = buildDoc(attempt);
    if (Buffer.byteLength(md, 'utf-8') < MAX_BLOCKS_API_BYTES) {
      return md;
    }
  }

  return buildDoc({ heroMax: 4, sectionMax: 4, typed: false, packedMax: 1 });
}

export function generateBlocksApi({ rootDir = defaultRootDir, check = false } = {}) {
  const catalog = buildBlocksCatalog(rootDir);
  const markdown = renderBlocksApiMarkdown(catalog);
  const bytes = Buffer.byteLength(markdown, 'utf-8');
  const outPath = path.join(rootDir, 'docs', 'BLOCKS-API.md');
  const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf-8') : null;
  const changed = existing !== markdown;
  const overBudget = bytes >= MAX_BLOCKS_API_BYTES;

  if (!check && !overBudget && changed) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, markdown, 'utf-8');
  }

  return {
    outPath,
    bytes,
    overBudget,
    changed,
    counts: {
      heroes: catalog.heroes.length,
      sections: catalog.sections.length,
      showcases: catalog.showcases.length,
      core: catalog.core.length,
      ui: catalog.ui.length,
    },
    catalog,
    markdown,
  };
}
