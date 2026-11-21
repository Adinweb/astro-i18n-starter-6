import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupChronoTrig, refreshChronoTrig } from './chronotrig';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('ChronoTrig v5.2.0 Integration & Lifecycle', () => {
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

  it('auto-tags prose headings and [data-prose-reveal] with data-trig, invoking v5.2.0 refresh()', () => {
    const refreshSpy = vi.fn();
    const scanSpy = vi.fn();
    const trigScrollSpy = vi.fn();

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
      querySelectorAll: vi.fn((selector: string) => {
        if (selector.includes('.prose')) return mockElements;
        return [];
      }),
      addEventListener: vi.fn(),
      readyState: 'complete',
    };

    const mockWindow = {
      chronoTrig: {
        refresh: refreshSpy,
        scan: scanSpy,
        trigScroll: trigScrollSpy,
        isMobile: vi.fn().mockReturnValue(false),
      },
    };

    (globalThis as Record<string, unknown>).document = mockDocument;
    (globalThis as Record<string, unknown>).window = mockWindow;

    setupChronoTrig();

    expect(mockElements[0].setAttribute).toHaveBeenCalledWith('data-trig', '');
    expect(mockElements[1].setAttribute).not.toHaveBeenCalled();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(scanSpy).not.toHaveBeenCalled();
  });

  it('propagates data-trig and data-trig-once to stagger children without overwriting engine stagger modes', () => {
    const refreshSpy = vi.fn();
    const setPropertySpy = vi.fn();

    const staggerChild = {
      hasAttribute: vi.fn((attr: string) => attr === 'data-trig-stagger-item'),
      setAttribute: vi.fn(),
      style: { setProperty: setPropertySpy },
    };

    const staggerContainer = {
      getAttribute: vi.fn((attr: string) => (attr === 'data-trig-once' ? 'true' : 'wave')),
      querySelectorAll: vi.fn().mockReturnValue([staggerChild]),
    };

    const mockDocument = {
      querySelectorAll: vi.fn((selector: string) => {
        if (selector === '[data-trig-stagger]') return [staggerContainer];
        return [];
      }),
      addEventListener: vi.fn(),
      readyState: 'complete',
    };

    (globalThis as Record<string, unknown>).document = mockDocument;
    (globalThis as Record<string, unknown>).window = {
      chronoTrig: { refresh: refreshSpy },
    };

    setupChronoTrig();

    expect(staggerContainer.querySelectorAll).toHaveBeenCalledWith('[data-trig-stagger-item], :scope > *');
    expect(staggerChild.setAttribute).toHaveBeenCalledWith('data-trig', '');
    expect(staggerChild.setAttribute).toHaveBeenCalledWith('data-trig-once', 'true');
    // Must not overwrite engine-computed wave/center/reverse delays
    expect(setPropertySpy).not.toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('configures chronotrig.css, global.css, and BaseLayout.astro for v5.2.0 features & accessibility', () => {
    const css = fs.readFileSync(path.join(rootDir, 'src/styles/chronotrig.css'), 'utf-8');
    const globalCss = fs.readFileSync(path.join(rootDir, 'src/styles/global.css'), 'utf-8');
    const layout = fs.readFileSync(path.join(rootDir, 'src/layouts/BaseLayout.astro'), 'utf-8');

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

    // v5.2.0 modern presets, utility modifiers, stagger items, and timeline/pin flattening
    expect(css).toContain('.fadeInUpSm');
    expect(css).toContain('.blurIn');
    expect(css).toContain('.clipUp');
    expect(css).toContain('.trig-delay-100');
    expect(css).toContain('[data-trig-stagger-item]');
    expect(css).toContain('[data-trig-timeline]');
    expect(css).toContain('body.chronotrig-mobile-disabled');

    // RTL logical direction support
    expect(css).toContain('[data-trig-direction="start"]');
    expect(css).toContain('[data-trig-direction="end"]');
    expect(css).toContain('[dir="rtl"]');

    // CSS defers OS reduced-motion resolution to <head> `resolveMotion()` -> html[data-motion="reduced"]
    expect(css).not.toContain('@media (max-width: 639px)');
    expect(css).toContain('html[data-motion="reduced"]');
    expect(css).toContain('@media print');

    // Sticky [data-trig-pin] sections require overflow-x: clip rather than overflow-x: hidden on body
    expect(globalCss).toMatch(/body\s*\{[^}]*overflow-x:\s*clip/);
    expect(globalCss).not.toMatch(/body\s*\{[^}]*overflow-x:\s*hidden/);
    expect(globalCss).toContain("@import './chronotrig.css';");
    expect(globalCss).toContain('html:not([data-motion="reduced"]) [data-cookie-banner]:not([hidden])');

    expect(layout).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(layout).toContain("window.localStorage.getItem('motion')");
    expect(layout).toContain('doc.documentElement.dataset.motion = motion');
  });

  it('replays grid reveals on filter changes but never on the initial render', () => {
    const view = fs.readFileSync(path.join(rootDir, 'src/views/BlogIndexView.astro'), 'utf-8');

    expect(view).toContain('const replayGridReveals = () =>');
    expect(view).toContain("typeof window.chronoTrig === 'undefined'");
    expect(view).toContain('if (replay) replayGridReveals();');
    expect(view).toContain('render({ updateUrl: false, replay: false })');
  });

  it('wires BaseLayout.astro with /chronotrig.min.js inline script and module coordinator', () => {
    const layout = fs.readFileSync(path.join(rootDir, 'src/layouts/BaseLayout.astro'), 'utf-8');

    expect(layout).toContain('<script is:inline src="/chronotrig.min.js"></script>');
    expect(layout).toContain("import '@/scripts/chronotrig';");
  });

  it('syncs Lenis scroll callback with ChronoTrig v5.2.0 trigScroll() instead of missing onScroll()', () => {
    const lenisSrc = fs.readFileSync(path.join(rootDir, 'src/scripts/lenis.ts'), 'utf-8');
    expect(lenisSrc).toContain('window.chronoTrig.trigScroll?.()');
    expect(lenisSrc).not.toContain('window.chronoTrig.onScroll');
  });

  it('integrates UiProgress bar, circular ring, and steps variants with ChronoTrig animations', () => {
    const css = fs.readFileSync(path.join(rootDir, 'src/styles/chronotrig.css'), 'utf-8');
    const progress = fs.readFileSync(path.join(rootDir, 'src/components/UiProgress.astro'), 'utf-8');
    const doc = fs.readFileSync(path.join(rootDir, 'src/components/ComponentDoc.astro'), 'utf-8');
    const enMdx = fs.readFileSync(path.join(rootDir, 'src/content/pages/components/en.mdx'), 'utf-8');
    const faMdx = fs.readFileSync(path.join(rootDir, 'src/content/pages/components/fa.mdx'), 'utf-8');

    expect(progress).toContain('data-ui-progress-bar');
    expect(progress).toContain('data-ui-progress-fill');
    expect(progress).toContain('data-ui-progress-ring');
    expect(progress).toContain('data-ui-progress-ring-track');
    expect(progress).toContain('data-ui-progress-steps');
    expect(progress).toContain('data-ui-progress-step-fill');
    expect(progress).toContain('data-ui-progress-value');
    expect(progress).toContain('data-progress-target');
    expect(progress).toContain('data-progress-active');
    expect(progress).toContain('getEffectiveOpacity');
    expect(progress).toContain('IntersectionObserver');
    expect(progress).toContain('window.chronoTrig?.subscribe');
    expect(progress).toContain('isInComfortZone');
    expect(progress).toContain('isCompletelyOffscreen');
    expect(progress).toContain('--ui-progress-target');

    expect(css).toContain('@property --ui-progress-value');
    expect(css).toContain('.js [data-ui-progress-bar][data-progress-active="true"] [data-ui-progress-fill]');
    expect(css).toContain('.js [data-ui-progress-steps][data-progress-active="true"] [data-ui-progress-step-fill]');
    expect(css).toContain('.js [data-ui-progress-ring]:not([data-progress-active="true"]) [data-ui-progress-ring-track]');
    expect(css).toContain('html[data-motion="reduced"] .js [data-ui-progress-ring-track]');

    // Scroll-triggered demos must not be wrapped in an outer opacity-0 ComponentDoc container
    expect(doc).toContain('animatePreview = true');
    expect(enMdx).toContain('id="doc-progress"');
    expect(enMdx).toContain('animatePreview={false}');
    expect(faMdx).toContain('id="doc-progress"');
    expect(faMdx).toContain('animatePreview={false}');
  });

  it('integrates ParallaxSection with ChronoTrig --parallax-y scrubbing and reduced-motion flattening', () => {
    const css = fs.readFileSync(path.join(rootDir, 'src/styles/chronotrig.css'), 'utf-8');
    const parallax = fs.readFileSync(path.join(rootDir, 'src/components/ParallaxSection.astro'), 'utf-8');
    const enMdx = fs.readFileSync(path.join(rootDir, 'src/content/pages/components/en.mdx'), 'utf-8');
    const faMdx = fs.readFileSync(path.join(rootDir, 'src/content/pages/components/fa.mdx'), 'utf-8');

    expect(parallax).toContain('data-parallax-stage');
    expect(parallax).toContain('data-parallax-media');
    expect(parallax).toContain('data-parallax-speed');
    expect(parallax).toContain('window.chronoTrig?.subscribe');
    expect(parallax).toContain('isMotionReduced');
    expect(parallax).toContain('astro:page-load');
    expect(parallax).toContain('astro:before-swap');
    expect(parallax).toContain('--parallax-y');

    expect(css).toContain('[data-parallax-stage] [data-parallax-media]');
    expect(css).toContain('inset-block: -38%');
    expect(css).toContain('var(--parallax-y');
    expect(css).toContain('var(--trig-px, 0px)');
    expect(css).toContain('html[data-motion="reduced"] [data-parallax-stage] [data-parallax-media]');

    expect(enMdx).toContain('id="doc-parallax-section"');
    expect(faMdx).toContain('id="doc-parallax-section"');

    // Behavioral check: simulate viewport scroll from bottom edge -> center -> top edge
    const scriptMatch = parallax.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).toBeTruthy();
    const rawScript = scriptMatch![1]
      .replace(/const SPEED_AMPLITUDE_PX:\s*Record<string,\s*number>\s*=/, 'const SPEED_AMPLITUDE_PX =')
      .replace(/let cleanupParallax:\s*\(\(\)\s*=>\s*void\)\s*\|\s*null\s*=/, 'let cleanupParallax =')
      .replace(/\):\s*boolean\b/g, ')')
      .replace(/\((min|max|value):\s*number\)/g, '($1)')
      .replace(/\((min:\s*number,\s*max:\s*number,\s*value:\s*number)\):\s*number/g, '(min, max, value)')
      .replace(/\):\s*void\b/g, ')')
      .replace(/\.querySelectorAll<HTMLElement>/g, '.querySelectorAll')
      .replace(/\.querySelector<HTMLElement>/g, '.querySelector')
      .replace(/\.filter\(\(item\):[^=]+=>\s*item\s*!==\s*null\)/g, '.filter((item) => item !== null)');

    const setProps: Record<string, string> = {};
    let simulatedTop = 850;
    const subscribeCallbacks: Array<() => void> = [];
    const scrollListeners: Array<() => void> = [];

    const mockMedia = {
      style: {
        setProperty: (k: string, v: string) => {
          setProps[k] = v;
        },
      },
    };
    const mockStage = {
      dataset: { parallaxSpeed: 'deep' },
      querySelector: () => mockMedia,
      getBoundingClientRect: () => ({ top: simulatedTop, bottom: simulatedTop + 460, height: 460 }),
    };

    const docElement = {
      clientHeight: 900,
      dataset: { motion: 'full' },
    };

    const fakeDoc = {
      documentElement: docElement,
      body: { classList: { contains: () => false } },
      querySelectorAll: (sel: string) => (sel === '[data-parallax-stage]' ? [mockStage] : []),
      addEventListener: vi.fn(),
    };
    const fakeWin = {
      innerHeight: 900,
      chronoTrig: {
        isDisabled: () => false,
        subscribe: (cb: () => void) => {
          subscribeCallbacks.push(cb);
          return () => {};
        },
      },
      addEventListener: (ev: string, cb: () => void) => {
        if (ev === 'scroll') scrollListeners.push(cb);
      },
      removeEventListener: vi.fn(),
    };

    const rafQueue: Array<() => void> = [];
    const runParallax = new Function(
      'document',
      'window',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'MutationObserver',
      rawScript
    );
    class FakeObserver {
      observe() {}
      disconnect() {}
    }

    runParallax(
      fakeDoc,
      fakeWin,
      (cb: () => void) => {
        rafQueue.push(cb);
        return rafQueue.length;
      },
      vi.fn(),
      FakeObserver
    );

    // At bottom of viewport -> negative --parallax-y
    const bottomOffset = Number.parseFloat(setProps['--parallax-y']);
    expect(bottomOffset).toBeLessThan(-50);

    // Scroll card past top of viewport -> positive --parallax-y
    simulatedTop = -250;
    scrollListeners[0]?.();
    rafQueue.shift()?.();
    const topOffset = Number.parseFloat(setProps['--parallax-y']);
    expect(topOffset).toBeGreaterThan(50);
    expect(topOffset - bottomOffset).toBeGreaterThan(180);

    // Reduced motion zeroes --parallax-y cleanly
    docElement.dataset.motion = 'reduced';
    subscribeCallbacks[0]?.();
    rafQueue.shift()?.();
    expect(setProps['--parallax-y']).toBe('0px');
  });
});
