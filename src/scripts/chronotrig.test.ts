import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { setupChronoTrig, refreshChronoTrig } from './chronotrig';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('ChronoTrig v6.1.0 Integration & Lifecycle', () => {
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

  it('auto-tags prose headings and [data-prose-reveal] with data-trig and data-trig-once, invoking v6.1.0 refresh()', () => {
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
        hasAttribute: vi.fn((attr: string) => attr === 'data-trig' || attr === 'data-trig-once'),
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
    expect(mockElements[0].setAttribute).toHaveBeenCalledWith('data-trig-once', 'true');
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

  it('configures chronotrig.css, global.css, and BaseLayout.astro for v6.1.0 performance & accessibility', () => {
    const css = fs.readFileSync(path.join(rootDir, 'src/styles/chronotrig.css'), 'utf-8');
    const globalCss = fs.readFileSync(path.join(rootDir, 'src/styles/global.css'), 'utf-8');
    const layout = fs.readFileSync(path.join(rootDir, 'src/layouts/BaseLayout.astro'), 'utf-8');
    const homeHero = fs.readFileSync(path.join(rootDir, 'src/components/HomeHero.astro'), 'utf-8');

    const doc = fs.readFileSync(path.join(rootDir, 'src/components/ComponentDoc.astro'), 'utf-8');
    const pageHero = fs.readFileSync(path.join(rootDir, 'src/components/PageHero.astro'), 'utf-8');
    const minJs = fs.readFileSync(path.join(rootDir, 'public/chronotrig.min.js'), 'utf-8');

    // Bottom entrance state: 56px reveal travel, 1.2s duration, and dynamic engine will-change management
    expect(css).toContain('translate3d(0, 56px, 0)');
    expect(css).toContain('opacity: 0');
    expect(css).toContain('--trig-duration: 1.2s');
    expect(css).toContain('--trig-ease: cubic-bezier(0.16, 1, 0.3, 1)');
    expect(css).not.toContain('will-change: transform, opacity;');

    // Zero artificial pre-reveal pause; immediate visual response when intersecting
    expect(css).toContain('--trig-reveal-delay: 0ms');
    expect(css).toContain('animation-delay: var(--trig-reveal-delay, 0ms)');

    // Revealed & settled states release transforms and transition-delay so card hover remains snappy
    expect(css).toContain('.js [data-trig].trig');
    expect(css).toContain('transform: none');
    expect(css).toContain('.trig-stagger-settled');
    expect(css).toContain('transition-delay: 0s');

    // Presets, utility modifiers, stagger items, and timeline/pin flattening
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
    expect(globalCss).not.toMatch(/body\s*\{[^}]*optimizeLegibility/);
    expect(globalCss).toContain("@import './chronotrig.css';");
    expect(globalCss).toContain('html:not([data-motion="reduced"]) [data-cookie-banner]:not([hidden])');
    expect(globalCss).toContain('.hero-glow-primary');
    expect(globalCss).toContain('.hero-glow-accent');
    expect(globalCss).toContain('backdrop-blur-md');

    // Long showcase docs skip off-screen table/code layout & paint, and compact heroes lazy-load
    expect(doc).toContain('[content-visibility:auto]');
    expect(pageHero).toContain("loading={compact ? 'lazy' : 'eager'}");

    // ChronoTrig v6.1.0 bundle: version 6.1.0, WeakMap listener cleanup on animationcancel,
    // isExternalScroll(), and opt-in :root --scroll-progress / --scroll-y mutations
    expect(minJs).toContain('version="6.1.0"');
    expect(minJs).toContain('rootScrollVars:!1');
    expect(minJs).toContain('data-trig-root-vars');
    expect(minJs).toContain('isExternalScroll()');
    expect(minJs).toContain('animationcancel');

    // Hero and Bento decorative glows use radial gradients instead of costly blur-2xl/blur-3xl compositing layers
    const bentoGrid = fs.readFileSync(path.join(rootDir, 'src/components/BentoGrid.astro'), 'utf-8');
    expect(homeHero).toContain('hero-glow-primary');
    expect(homeHero).not.toContain('blur-3xl');
    expect(bentoGrid).toContain('hero-glow-primary');
    expect(bentoGrid).not.toContain('blur-2xl');

    expect(layout).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(layout).toContain("window.localStorage.getItem('motion')");
    expect(layout).toContain('doc.documentElement.dataset.motion = motion');
  });

  it('replays grid reveals on filter changes without transition conflicts or hidden-card stagger gaps', () => {
    const view = fs.readFileSync(path.join(rootDir, 'src/views/BlogIndexView.astro'), 'utf-8');
    const collectionView = fs.readFileSync(
      path.join(rootDir, 'src/views/CollectionIndexView.astro'),
      'utf-8'
    );
    const postCard = fs.readFileSync(path.join(rootDir, 'src/components/PostCard.astro'), 'utf-8');
    const globalCss = fs.readFileSync(path.join(rootDir, 'src/styles/global.css'), 'utf-8');

    expect(view).toContain('const replayGridReveals = () =>');
    expect(view).toContain('const syncVisibleStaggerDelays = () =>');
    expect(view).toContain("typeof window.chronoTrig === 'undefined'");
    expect(view).toContain('trig-stagger-settled');
    expect(view).toContain('if (replay) replayGridReveals();');
    expect(view).toContain('render({ updateUrl: false, replay: false })');
    expect(view).toContain('syncVisibleStaggerDelays()');

    // Hover transitions must live on the inner card surface so ChronoTrig's
    // transitionend/transitioncancel listener on [data-trig] never settles cards prematurely.
    const postCardRoot = postCard.match(/<article\b[^>]*>/)?.[0] ?? '';
    expect(postCardRoot).toContain('data-trig');
    expect(postCardRoot).not.toMatch(/\btransition\b/);
    expect(view).toContain("article.className = 'flex h-full'");
    expect(postCard).toContain('UiBadge');

    // Collection index shares chip filter sizing/active state, UiBadge stack pills, and visible-only stagger sync.
    expect(globalCss).toContain(".chip[aria-pressed='true']");
    expect(view).not.toContain('text-muted/70');
    expect(collectionView).toContain('UiBadge');
    expect(collectionView).toContain('class="chip cursor-pointer px-3 py-1.5 text-xs"');
    expect(collectionView).toContain('const activeStacks = new Set<string>()');
    expect(collectionView).toContain('activeStacks.delete(val)');
    expect(collectionView).toContain('visibleChildren.forEach');
    expect(collectionView).toContain("el.style.willChange = 'auto'");
  });

  it('wires BaseLayout.astro with /chronotrig.min.js inline script and module coordinator', () => {
    const layout = fs.readFileSync(path.join(rootDir, 'src/layouts/BaseLayout.astro'), 'utf-8');

    expect(layout).toContain('<script is:inline src="/chronotrig.min.js"></script>');
    expect(layout).toContain("import '@/scripts/chronotrig';");
  });

  it('syncs Lenis scroll callback synchronously with ChronoTrig v6.1.0 sync() and dispatches lenis:scroll', () => {
    const lenisSrc = fs.readFileSync(path.join(rootDir, 'src/scripts/lenis.ts'), 'utf-8');
    expect(lenisSrc).toContain('lerp: 0.125');
    expect(lenisSrc).toContain('window.chronoTrig.sync(instance.scroll)');
    expect(lenisSrc).toContain('window.chronoTrig.trigScroll?.(true)');
    expect(lenisSrc).toContain("new Event('lenis:scroll')");
    expect(lenisSrc).toContain('window.dispatchEvent(lenisScrollEvent)');
    expect(lenisSrc).not.toContain('window.chronoTrig.onScroll');
  });

  it('integrates UiProgress bar, circular ring, and steps variants with pure IntersectionObserver + compositor animations', () => {
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
    expect(progress).toContain('IntersectionObserver');
    expect(progress).toContain('--ui-progress-target');
    // Must not poll computed styles up ancestor chains or bind synchronous scroll listeners
    expect(progress).not.toContain('getComputedStyle');
    expect(progress).not.toContain("window.addEventListener('scroll'");
    expect(progress).not.toContain('window.chronoTrig?.subscribe');

    expect(css).toContain('@property --ui-progress-value');
    expect(css).toContain('.js [data-ui-progress-bar][data-progress-active="true"] [data-ui-progress-fill]');
    expect(css).toContain('.js [data-ui-progress-steps][data-progress-active="true"] [data-ui-progress-step-fill]');
    expect(css).toContain('.js [data-ui-progress-ring]:not([data-progress-active="true"]) [data-ui-progress-ring-track]');
    expect(css).toContain('html[data-motion="reduced"] .js [data-ui-progress-ring-track]');

    // ComponentDoc previews skip heavy outer [data-trig] promotion by default
    expect(doc).toContain('animatePreview = false');
    expect(enMdx).toContain('id="doc-progress"');
    expect(faMdx).toContain('id="doc-progress"');
  });

  it('integrates ParallaxSection with viewport-gated --parallax-y scrubbing and reduced-motion flattening', () => {
    const css = fs.readFileSync(path.join(rootDir, 'src/styles/chronotrig.css'), 'utf-8');
    const parallax = fs.readFileSync(path.join(rootDir, 'src/components/ParallaxSection.astro'), 'utf-8');
    const enMdx = fs.readFileSync(path.join(rootDir, 'src/content/pages/components/en.mdx'), 'utf-8');
    const faMdx = fs.readFileSync(path.join(rootDir, 'src/content/pages/components/fa.mdx'), 'utf-8');

    expect(parallax).toContain('data-parallax-stage');
    expect(parallax).toContain('data-parallax-media');
    expect(parallax).toContain('data-parallax-speed');
    expect(parallax).toContain('IntersectionObserver');
    expect(parallax).toContain('parallaxActive');
    expect(parallax).not.toContain('data-trig-pixels="true"');
    expect(parallax).toContain('window.chronoTrig?.subscribe');
    expect(parallax).toContain("window.addEventListener('lenis:scroll'");
    expect(parallax).toContain('isMotionReduced');
    expect(parallax).toContain('astro:page-load');
    expect(parallax).toContain('astro:before-swap');
    expect(parallax).toContain('--parallax-y');

    expect(css).toContain('[data-parallax-stage] [data-parallax-media]');
    expect(css).toContain('[data-parallax-stage][data-parallax-active="true"] [data-parallax-media]');
    expect(css).toContain('inset-block: -38%');
    expect(css).toContain('var(--parallax-y');
    expect(css).toContain('var(--trig-px, 0px)');
    expect(css).toContain('html[data-motion="reduced"] [data-parallax-stage] [data-parallax-media]');
    expect(css).toContain('html:not([data-motion="full"]) body.chronotrig-mobile-disabled [data-parallax-stage] [data-parallax-media]');

    expect(enMdx).toContain('id="doc-parallax-section"');
    expect(faMdx).toContain('id="doc-parallax-section"');

    // Behavioral check: simulate off-screen pre-clamping -> viewport gating -> smooth Lenis/native scrubbing -> reduced-motion reset
    const scriptMatch = parallax.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).toBeTruthy();
    const rawScript = ts.transpileModule(scriptMatch![1], {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText;

    const setProps: Record<string, string> = {};
    let simulatedTop = 14500;
    let fakeTime = 1000;
    let rectCalls = 0;
    const subscribeCallbacks: Array<() => void> = [];
    const scrollListeners: Array<() => void> = [];
    const lenisListeners: Array<() => void> = [];
    const ioCallbacks: Array<(entries: Array<{ target: unknown; isIntersecting: boolean }>) => void> = [];

    const mockMedia = {
      style: {
        setProperty: (k: string, v: string) => {
          setProps[k] = v;
        },
      },
    };
    const mockStage = {
      dataset: { parallaxSpeed: 'deep', parallaxActive: 'false' },
      querySelector: () => mockMedia,
      getBoundingClientRect: () => {
        rectCalls += 1;
        return { top: simulatedTop, bottom: simulatedTop + 460, height: 460 };
      },
    };

    const docElement = {
      clientHeight: 900,
      dataset: { motion: 'full' },
    };

    const fakeDoc = {
      documentElement: docElement,
      body: { classList: { contains: () => true } },
      querySelectorAll: (sel: string) => (sel === '[data-parallax-stage]' ? [mockStage] : []),
      addEventListener: vi.fn(),
    };
    const fakeWin = {
      innerHeight: 900,
      chronoTrig: {
        isDisabled: () => true,
        getMobileBehavior: () => 'lightweight',
        isMobile: () => false,
        subscribe: (cb: () => void) => {
          subscribeCallbacks.push(cb);
          return () => {};
        },
      },
      addEventListener: (ev: string, cb: () => void) => {
        if (ev === 'scroll') scrollListeners.push(cb);
        if (ev === 'lenis:scroll') lenisListeners.push(cb);
      },
      removeEventListener: vi.fn(),
    };

    const rafQueue: Array<(frameTime: number) => void> = [];
    const runParallax = new Function(
      'document',
      'window',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'MutationObserver',
      'IntersectionObserver',
      'performance',
      rawScript
    );
    class FakeObserver {
      observe() {}
      disconnect() {}
    }
    class FakeIntersectionObserver {
      constructor(cb: (entries: Array<{ target: unknown; isIntersecting: boolean }>) => void) {
        ioCallbacks.push(cb);
      }
      observe() {}
      disconnect() {}
    }
    const fakePerformance = {
      now: () => fakeTime,
    };

    runParallax(
      fakeDoc,
      fakeWin,
      (cb: (frameTime: number) => void) => {
        rafQueue.push(cb);
        return rafQueue.length;
      },
      vi.fn(),
      FakeObserver,
      FakeIntersectionObserver,
      fakePerformance
    );

    // Drain initial snap RAF alignment
    while (rafQueue.length > 0) {
      fakeTime += 16.67;
      rafQueue.shift()?.(fakeTime);
    }

    // Even when far below the viewport (~14,500px down), --parallax-y is cleanly pre-clamped (never unset)
    const initialOffscreen = Number.parseFloat(setProps['--parallax-y']);
    expect(initialOffscreen).toBeLessThan(-50);
    expect(mockStage.dataset.parallaxActive).toBe('false');

    // Off-screen scroll ticks must NOT trigger getBoundingClientRect() or RAFs
    const callsBeforeOffscreenScroll = rectCalls;
    simulatedTop = 12000;
    fakeTime += 16.67;
    lenisListeners[0]?.();
    expect(rectCalls).toBe(callsBeforeOffscreenScroll);
    expect(rafQueue.length).toBe(0);

    // Stage enters viewport -> IO activates stage and snaps alignment
    simulatedTop = 850;
    fakeTime += 16.67;
    ioCallbacks[0]?.([{ target: mockStage, isIntersecting: true }]);
    expect(mockStage.dataset.parallaxActive).toBe('true');

    while (rafQueue.length > 0) {
      fakeTime += 16.67;
      rafQueue.shift()?.(fakeTime);
    }
    const bottomOffset = Number.parseFloat(setProps['--parallax-y']);
    expect(bottomOffset).toBeLessThan(-50);

    // Scroll card past top of viewport -> damps smoothly on frame 1 then converges past +50px
    simulatedTop = -250;
    fakeTime += 16.67;
    scrollListeners[0]?.();
    const firstFrameOffset = Number.parseFloat(setProps['--parallax-y']);
    expect(firstFrameOffset).toBeGreaterThan(bottomOffset);
    expect(firstFrameOffset).toBeLessThan(150);

    while (rafQueue.length > 0) {
      fakeTime += 16.67;
      rafQueue.shift()?.(fakeTime);
    }
    const topOffset = Number.parseFloat(setProps['--parallax-y']);
    expect(topOffset).toBeGreaterThan(50);
    expect(topOffset - bottomOffset).toBeGreaterThan(180);

    // Reduced motion zeroes --parallax-y cleanly and drops parallaxActive
    docElement.dataset.motion = 'reduced';
    fakeTime += 16.67;
    subscribeCallbacks[0]?.();
    while (rafQueue.length > 0) {
      fakeTime += 16.67;
      rafQueue.shift()?.(fakeTime);
    }
    expect(setProps['--parallax-y']).toBe('0px');
    expect(mockStage.dataset.parallaxActive).toBe('false');
  });

  it('syncs BentoGrid internal visual animations with ChronoTrig reveals, RTL mirroring, and reduced-motion/print flattening', () => {
    const css = fs.readFileSync(path.join(rootDir, 'src/styles/chronotrig.css'), 'utf-8');
    const bentoGrid = fs.readFileSync(path.join(rootDir, 'src/components/BentoGrid.astro'), 'utf-8');

    // Card hook & internal animated visual targets
    expect(bentoGrid).toContain('data-bento-card');
    expect(bentoGrid).toContain('data-bento-orbit');
    expect(bentoGrid).toContain('data-bento-radar');
    expect(bentoGrid).toContain('data-bento-bar');
    expect(bentoGrid).toContain('data-bento-window');
    expect(bentoGrid).toContain('data-bento-row');
    expect(bentoGrid).toContain('data-bento-pill');
    expect(bentoGrid).toContain('--bento-delay:');

    // New layout & surface variants remain semantic-only without raw SVG or hex tokens
    const bentoMarkup = bentoGrid.split(/^---$/m).slice(2).join('---');
    expect(bentoGrid).toContain('showcase');
    expect(bentoGrid).toContain('elevated');
    expect(bentoGrid).toContain('tinted');
    expect(bentoMarkup).not.toMatch(/<svg[\s>]/i);
    expect(bentoMarkup).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);

    // Compositor-only bar growth (scaleY) & RTL-mirrored workflow slide-in keyframes
    expect(css).toContain('bento-bar-rise');
    expect(css).toContain('transform: scaleY(0)');
    expect(css).toContain('bento-row-slide-rtl');
    expect(css).toContain('calc(var(--stagger-delay, 0s) + var(--bento-delay');
    expect(css).toContain('html[data-motion="reduced"] .js [data-bento-card] [data-bento-bar]');
    expect(css).toContain('body.chronotrig-mobile-disabled .js [data-bento-card] [data-bento-row]');
  });
});
