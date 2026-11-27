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

export const HERO_BLOCK_NAMES = [
  'LandingHeroSplit',
  'HeroCenteredEditorial',
  'HeroDashboardShowcase',
  'HeroCommandCli',
  'HeroInteractivePrompt',
  'HeroProofMarquee',
  'HeroFloatingOrbSplit',
];

export const STRUCTURAL_SECTION_NAMES = [
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
];

export const ALL_SECTION_BLOCK_NAMES = [
  ...HERO_BLOCK_NAMES,
  ...STRUCTURAL_SECTION_NAMES,
];

const HERO_NAMES = new Set(HERO_BLOCK_NAMES);

const SECTION_NAMES = new Set([
  'SectionComposer',
  ...STRUCTURAL_SECTION_NAMES,
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

export const HERO_PRIORITY_PROPS = [
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

function parseModuleAst(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const code = filePath.endsWith('.astro') ? extractFrontmatter(source) : source;
  const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const interfaces = new Map();
  const typeAliases = new Map();
  const imports = new Map();

  for (const stmt of sf.statements) {
    if (ts.isInterfaceDeclaration(stmt)) {
      interfaces.set(stmt.name.text, { node: stmt, sf });
    } else if (ts.isTypeAliasDeclaration(stmt)) {
      typeAliases.set(stmt.name.text, { node: stmt, sf });
    } else if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
      const spec = stmt.moduleSpecifier.text;
      const clause = stmt.importClause;
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const el of clause.namedBindings.elements) {
          const localName = el.name.text;
          const importedName = (el.propertyName ?? el.name).text;
          imports.set(localName, { spec, importedName });
        }
      }
    }
  }

  return { sf, interfaces, typeAliases, imports, filePath };
}

function resolveImportedFile(spec, currentFile, rootDir) {
  let baseCandidate = null;
  if (spec.startsWith('@/')) {
    const rel = spec.slice(2);
    const roots = rootDir === defaultRootDir ? [rootDir] : [rootDir, defaultRootDir];
    for (const r of roots) {
      for (const candidate of [
        path.join(r, 'src', rel),
        path.join(r, 'src', `${rel}.ts`),
        path.join(r, 'src', `${rel}.astro`),
        path.join(r, 'src', rel, 'index.ts'),
      ]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate;
        }
      }
    }
    return null;
  }
  if (spec.startsWith('.')) {
    baseCandidate = path.resolve(path.dirname(currentFile), spec);
    for (const candidate of [baseCandidate, `${baseCandidate}.ts`, `${baseCandidate}.astro`, path.join(baseCandidate, 'index.ts')]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
  }
  return null;
}

function unwrapTypeNode(node) {
  if (!node) return null;
  if (ts.isTypeOperatorNode(node) && node.operator === ts.SyntaxKind.ReadonlyKeyword) {
    return unwrapTypeNode(node.type);
  }
  if (ts.isParenthesizedTypeNode(node)) {
    return unwrapTypeNode(node.type);
  }
  if (ts.isUnionTypeNode(node)) {
    const nonNull = node.types.filter(
      (t) => t.kind !== ts.SyntaxKind.NullKeyword && t.kind !== ts.SyntaxKind.UndefinedKeyword
    );
    if (nonNull.length === 1) return unwrapTypeNode(nonNull[0]);
  }
  return node;
}

function extractArrayElementTypeNode(typeNode) {
  const unwrapped = unwrapTypeNode(typeNode);
  if (!unwrapped) return null;
  if (ts.isArrayTypeNode(unwrapped)) {
    return unwrapTypeNode(unwrapped.elementType);
  }
  if (
    ts.isTypeReferenceNode(unwrapped) &&
    ['Array', 'ReadonlyArray'].includes(unwrapped.typeName.getText()) &&
    unwrapped.typeArguments?.length === 1
  ) {
    return unwrapTypeNode(unwrapped.typeArguments[0]);
  }
  return null;
}

function resolveTypeSymbol(typeName, mod, getMod, rootDir, depth = 0) {
  if (depth > 6 || !mod) return null;
  if (mod.interfaces.has(typeName)) {
    return { kind: 'interface', decl: mod.interfaces.get(typeName).node, mod };
  }
  if (mod.typeAliases.has(typeName)) {
    const alias = mod.typeAliases.get(typeName).node;
    return { kind: 'alias', decl: alias, mod };
  }
  if (mod.imports.has(typeName)) {
    const imp = mod.imports.get(typeName);
    const targetFile = resolveImportedFile(imp.spec, mod.filePath, rootDir);
    if (!targetFile) return null;
    return resolveTypeSymbol(imp.importedName, getMod(targetFile), getMod, rootDir, depth + 1);
  }
  return null;
}

const IMAGE_FIELD_NAMES = new Set(['image', 'avatar', 'parallaxImage', 'bottomImage', 'src']);

function classifyFieldNode(propName, typeNode, mod, getMod, rootDir, depth = 0) {
  const unwrapped = unwrapTypeNode(typeNode);
  if (!unwrapped) return { kind: 'string' };
  const rawType = unwrapped.getText(mod.sf).replace(/\s+/g, ' ').trim();

  if (IMAGE_FIELD_NAMES.has(propName) || /\b(?:ContentImage|ImageMetadata)\b/.test(rawType)) {
    return { kind: 'string', isImage: true };
  }
  if (propName === 'icon' || propName.endsWith('Icon')) {
    return { kind: 'string', isIcon: true };
  }
  if (unwrapped.kind === ts.SyntaxKind.BooleanKeyword) {
    return { kind: 'boolean' };
  }
  if (unwrapped.kind === ts.SyntaxKind.NumberKeyword) {
    return { kind: 'number' };
  }
  if (unwrapped.kind === ts.SyntaxKind.StringKeyword) {
    return { kind: 'string' };
  }
  if (ts.isUnionTypeNode(unwrapped)) {
    const literals = unwrapped.types
      .filter((t) => ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal))
      .map((t) => t.literal.text);
    if (literals.length > 0 && literals.length === unwrapped.types.length) {
      return { kind: 'enum', options: literals };
    }
    if (/\b(?:Date|string)\b/.test(rawType) && !rawType.includes('number') && !rawType.includes('boolean')) {
      return { kind: 'string' };
    }
  }

  const elemNode = extractArrayElementTypeNode(unwrapped);
  if (elemNode) {
    if (elemNode.kind === ts.SyntaxKind.StringKeyword) {
      return { kind: 'string[]' };
    }
    return { kind: 'json' };
  }

  if (depth < 2 && ts.isTypeReferenceNode(unwrapped)) {
    const symName = unwrapped.typeName.getText(mod.sf);
    const resolved = resolveTypeSymbol(symName, mod, getMod, rootDir, 0);
    if (resolved?.kind === 'interface') {
      const subFields = buildFieldsFromInterface(resolved.decl, resolved.mod, getMod, rootDir, depth + 1);
      return { kind: 'object', fields: subFields };
    }
    if (resolved?.kind === 'alias') {
      return classifyFieldNode(propName, resolved.decl.type, resolved.mod, getMod, rootDir, depth + 1);
    }
  }

  if (depth < 2 && ts.isTypeLiteralNode(unwrapped)) {
    const subFields = buildFieldsFromInterface(unwrapped, mod, getMod, rootDir, depth + 1);
    return { kind: 'object', fields: subFields };
  }

  return { kind: 'string' };
}

function buildFieldsFromInterface(node, mod, getMod, rootDir, depth = 0) {
  const fields = [];
  for (const member of node.members || []) {
    if (!ts.isPropertySignature(member) || !member.name) continue;
    const name = member.name.getText(mod.sf);
    const optional = Boolean(member.questionToken);
    const meta = classifyFieldNode(name, member.type, mod, getMod, rootDir, depth);
    fields.push({ name, optional, ...meta });
  }
  return fields;
}

export function extractSectionArraySchemas(rootDir = defaultRootDir) {
  const modCache = new Map();
  const getMod = (filePath) => {
    if (!modCache.has(filePath)) {
      modCache.set(filePath, parseModuleAst(filePath));
    }
    return modCache.get(filePath);
  };

  const schemas = {};
  for (const blockName of ALL_SECTION_BLOCK_NAMES) {
    const localComp = path.join(rootDir, 'src', 'components', `${blockName}.astro`);
    const fallbackComp = path.join(defaultRootDir, 'src', 'components', `${blockName}.astro`);
    const compPath = fs.existsSync(localComp) ? localComp : fs.existsSync(fallbackComp) ? fallbackComp : null;
    if (!compPath) continue;

    const mod = getMod(compPath);
    const propsEntry = mod.interfaces.get('Props');
    if (!propsEntry) continue;

    const blockSchemas = {};
    for (const member of propsEntry.node.members) {
      if (!ts.isPropertySignature(member) || !member.name || !member.type) continue;
      const propName = member.name.getText(mod.sf);
      let elemNode = extractArrayElementTypeNode(member.type);
      if (!elemNode) continue;

      let curMod = mod;
      for (let hop = 0; hop < 4 && elemNode && ts.isTypeReferenceNode(elemNode); hop++) {
        const refName = elemNode.typeName.getText(curMod.sf);
        const resolved = resolveTypeSymbol(refName, curMod, getMod, rootDir, 0);
        if (!resolved) break;
        if (resolved.kind === 'interface') {
          blockSchemas[propName] = {
            kind: 'object[]',
            fields: buildFieldsFromInterface(resolved.decl, resolved.mod, getMod, rootDir, 0),
          };
          elemNode = null;
          break;
        }
        curMod = resolved.mod;
        elemNode = unwrapTypeNode(resolved.decl.type);
      }

      if (!blockSchemas[propName] && elemNode) {
        if (elemNode.kind === ts.SyntaxKind.StringKeyword) {
          blockSchemas[propName] = { kind: 'string[]' };
        } else if (ts.isTypeLiteralNode(elemNode)) {
          blockSchemas[propName] = {
            kind: 'object[]',
            fields: buildFieldsFromInterface(elemNode, curMod, getMod, rootDir, 0),
          };
        }
      }
    }

    if (Object.keys(blockSchemas).length > 0) {
      schemas[blockName] = blockSchemas;
    }
  }

  return schemas;
}
