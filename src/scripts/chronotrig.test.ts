import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupChronoTrig, refreshChronoTrig } from './chronotrig';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('ChronoTrig Integration & Lifecycle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
  });

  it('safely no-ops in non-browser SSR/Node environments', () => {
    expect(() => setupChronoTrig()).not.toThrow();
    expect(() => refreshChronoTrig()).not.toThrow();
  });

  it('drops the .js class so content stays visible when the engine failed to load', () => {
    const remove = vi.fn();
    const mockDocument = {
      querySelectorAll: vi.fn().mockReturnValue([]),
      addEventListener: vi.fn(),
      readyState: 'complete',
      documentElement: { classList: { remove } },
    };
    (globalThis as Record<string, unknown>).document = mockDocument;
    (globalThis as Record<string, unknown>).window = {};

    setupChronoTrig();

    expect(remove).toHaveBeenCalledWith('js');
  });

  it('auto-tags prose headings and [data-prose-reveal] with data-trig, invoking scan & onScroll', () => {
    const scanSpy = vi.fn();
    const onScrollSpy = vi.fn();

    const mockElements: Array<{
      tagName: string;
      className: string;
      hasAttribute: (attr: string) => boolean;
      setAttribute: (attr: string, val: string) => void;
    }> = [
      {
        tagName: 'H2',
        className: 'text-2xl',
        hasAttribute: vi.fn().mockReturnValue(false),
        setAttribute: vi.fn(),
      },
      {
        tagName: 'H3',
        className: 'text-xl',
        hasAttribute: vi.fn().mockReturnValue(true), // already has data-trig
        setAttribute: vi.fn(),
      },
    ];

    const mockDocument = {
      querySelectorAll: vi.fn().mockReturnValue(mockElements),
      addEventListener: vi.fn(),
      readyState: 'complete',
    };

    const mockWindow = {
      chronoTrig: {
        scan: scanSpy,
        onScroll: onScrollSpy,
        onResize: vi.fn(),
        destroy: vi.fn(),
        refresh: vi.fn(),
        isMobile: vi.fn().mockReturnValue(false),
        options: {},
      },
    };

    (globalThis as Record<string, unknown>).document = mockDocument;
    (globalThis as Record<string, unknown>).window = mockWindow;

    setupChronoTrig();

    // The first element did not have data-trig, so setAttribute should be called
    expect(mockElements[0].setAttribute).toHaveBeenCalledWith('data-trig', '');
    // The second element already had data-trig, so setAttribute should not be called again
    expect(mockElements[1].setAttribute).not.toHaveBeenCalled();

    // ChronoTrig scan and onScroll should be dispatched
    expect(scanSpy).toHaveBeenCalledTimes(1);
    expect(onScrollSpy).toHaveBeenCalledTimes(1);
  });

  it('configures chronotrig.css with smooth bottom reveals that are not gated by OS motion preferences', () => {
    const css = fs.readFileSync(path.join(rootDir, 'src/styles/chronotrig.css'), 'utf-8');

    // Bottom entrance state: starts well below the resting position and transparent
    expect(css).toContain('translate3d(0, 56px, 0)');
    expect(css).toContain('opacity: 0');
    expect(css).toContain('1.2s cubic-bezier(0.22, 1, 0.36, 1)');

    // Scroll reveals pause briefly before starting so they are noticeable
    expect(css).toContain('--trig-reveal-delay: 180ms');
    expect(css).toContain('animation-delay: var(--trig-reveal-delay, 0s)');

    // Revealed state: transform: none to preserve Tailwind hover transforms on interactive cards
    expect(css).toContain('.js [data-trig].trig');
    expect(css).toContain('transform: none');

    // RTL logical direction support
    expect(css).toContain('[data-trig-direction="start"]');
    expect(css).toContain('[data-trig-direction="end"]');
    expect(css).toContain('[dir="rtl"]');

    // Reveals play for every visitor: no OS-level or mobile-viewport blackout
    expect(css).not.toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).not.toContain('@media (max-width: 639px)');

    // Explicit opt-out and print flattening stay intact
    expect(css).toContain('html[data-motion="reduced"]');
    expect(css).toContain('@media print');
  });

  it('replays grid reveals on filter changes but never on the initial render', () => {
    const view = fs.readFileSync(path.join(rootDir, 'src/views/BlogIndexView.astro'), 'utf-8');

    // Guarded helper: never strip reveal classes without an engine to re-trigger them
    expect(view).toContain('const replayGridReveals = () =>');
    expect(view).toContain("typeof window.chronoTrig === 'undefined'");

    // Applied in both render paths, but skipped for the first paint
    expect(view).toContain('if (replay) replayGridReveals();');
    expect(view).toContain('render({ updateUrl: false, replay: false })');
  });

  it('wires BaseLayout.astro with /chronotrig.min.js inline script and module coordinator', () => {
    const layout = fs.readFileSync(path.join(rootDir, 'src/layouts/BaseLayout.astro'), 'utf-8');

    expect(layout).toContain('<script is:inline src="/chronotrig.min.js"></script>');
    expect(layout).toContain("import '@/scripts/chronotrig';");
  });

  it('ensures global.css imports chronotrig.css', () => {
    const globalCss = fs.readFileSync(path.join(rootDir, 'src/styles/global.css'), 'utf-8');
    expect(globalCss).toContain("@import './chronotrig.css';");
  });
});
