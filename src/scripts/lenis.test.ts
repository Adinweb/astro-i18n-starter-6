import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initLenis, destroyLenis, getLenis } from './lenis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('Lenis Smooth Scroll Architecture', () => {
  afterEach(() => {
    destroyLenis();
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
  });

  it('safely no-ops in non-browser SSR/Node environments', () => {
    expect(() => initLenis()).not.toThrow();
    expect(getLenis()).toBeNull();
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

    // Lenis script import
    expect(layout).toContain("import '@/scripts/lenis';");

    // Nested scroll prevention on mobile drawer
    expect(layout).toContain('data-lenis-prevent');
  });
});
