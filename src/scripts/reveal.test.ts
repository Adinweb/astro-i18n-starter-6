import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initLenis, destroyLenis, getLenis } from './lenis';
import { initReveals, cleanupReveals } from './reveal';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('Lenis + Progressive Reveal Architecture', () => {
  afterEach(() => {
    destroyLenis();
    cleanupReveals();
  });

  it('safely no-ops in non-browser SSR/Node environments', () => {
    expect(() => initLenis()).not.toThrow();
    expect(getLenis()).toBeNull();
    expect(() => initReveals()).not.toThrow();
  });

  it('scopes all reveal hiding rules strictly under .js for progressive enhancement', () => {
    const revealCss = fs.readFileSync(path.join(rootDir, 'src/styles/reveal.css'), 'utf-8');

    // Strip block comments before inspecting selectors
    const uncommented = revealCss.replace(/\/\*[\s\S]*?\*\//g, '');

    // Must never contain an unscoped `.reveal { opacity: 0 }` rule
    expect(uncommented).not.toMatch(/(?:^|\}|\n)\s*\.reveal\s*\{/);
    expect(uncommented).toContain('.js .reveal');
    expect(uncommented).toContain('.js .reveal.is-visible');
    expect(uncommented).toContain('.js .reveal-stagger > .reveal');
    expect(uncommented).toContain("html[data-motion='reduced'].js .reveal");
    expect(uncommented).toContain('@media print');

    // Strictly logical direction variants (physical left/right forbidden by RTL discipline)
    for (const dir of ['up', 'down', 'start', 'end', 'scale']) {
      expect(uncommented).toContain(`data-reveal='${dir}'`);
    }
    expect(uncommented).not.toContain("data-reveal='left'");
    expect(uncommented).not.toContain("data-reveal='right'");

    // RTL direction variants must use zero-specificity :where([dir='rtl']) and :not(.is-visible)
    // so they never outrank .js .reveal.is-visible and leave cards displaced in RTL
    expect(uncommented).toContain(":where([dir='rtl'])");
    expect(uncommented).toContain(":not(.is-visible)");
    expect(uncommented).not.toContain(":root[dir='rtl']");
    expect(uncommented).not.toContain("html[dir='rtl']");

    // Manual delay steps
    for (const delay of [50, 100, 150, 200, 250, 300, 400, 500]) {
      expect(uncommented).toContain(`data-delay='${delay}'`);
    }
  });

  it('configures global.css with Lenis styles and scroll-behavior: auto', () => {
    const globalCss = fs.readFileSync(path.join(rootDir, 'src/styles/global.css'), 'utf-8');
    expect(globalCss).toContain("@import 'lenis/dist/lenis.css';");
    expect(globalCss).toMatch(/html\s*\{[^}]*scroll-behavior:\s*auto/);
  });

  it('wires BaseLayout.astro with early .js class, scrollend mitigation, and modal scroll isolation', () => {
    const layout = fs.readFileSync(path.join(rootDir, 'src/layouts/BaseLayout.astro'), 'utf-8');

    // No conflicting Tailwind scroll-smooth on <html>
    const htmlTag = layout.match(/<html\b[\s\S]*?>/)?.[0] ?? '';
    expect(htmlTag).not.toContain('scroll-smooth');

    // Early .js progressive enhancement class + View Transition swap preservation
    expect(layout).toContain("classList.add('js')");
    expect(layout).toContain('onscrollend');

    // Stylesheet & script imports
    expect(layout).toContain("import '@/styles/reveal.css';");
    expect(layout).toContain("import '@/scripts/lenis';");
    expect(layout).toContain("import '@/scripts/reveal';");

    // Nested scroll prevention on mobile drawer
    expect(layout).toContain('data-lenis-prevent');
  });
});
