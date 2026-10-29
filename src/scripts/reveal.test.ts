import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initLenis, destroyLenis, getLenis } from './lenis';
import { initReveals, cleanupReveals, replayReveals } from './reveal';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

interface MockCard {
  hidden: boolean;
  dataset: Record<string, string>;
  offsetWidth: number;
  classList: {
    add: (...tokens: string[]) => void;
    remove: (...tokens: string[]) => void;
    contains: (token: string) => boolean;
  };
  style: {
    setProperty: (name: string, value: string) => void;
    removeProperty: (name: string) => void;
    getPropertyValue: (name: string) => string;
  };
  hasAttribute: (name: string) => boolean;
  closest: (selector: string) => unknown;
  matches: (selector: string) => boolean;
  getBoundingClientRect: () => { top: number; bottom: number; width: number; height: number };
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  removeEventListener: (type: string, listener: (event: Event) => void) => void;
  querySelectorAll: (selector: string) => MockCard[];
}

function createMockElement(initialClasses: string[] = ['reveal'], inViewport = true): MockCard {
  const classes = new Set(initialClasses);
  const styles = new Map<string, string>();
  const listeners = new Map<string, Set<(event: Event) => void>>();

  const el: MockCard = {
    hidden: false,
    dataset: {},
    offsetWidth: 320,
    classList: {
      add: (...tokens) => tokens.forEach((t) => classes.add(t)),
      remove: (...tokens) => tokens.forEach((t) => classes.delete(t)),
      contains: (token) => classes.has(token),
    },
    style: {
      setProperty: (name, value) => styles.set(name, value),
      removeProperty: (name) => styles.delete(name),
      getPropertyValue: (name) => styles.get(name) ?? '',
    },
    hasAttribute: (name) => (name === 'hidden' ? el.hidden : false),
    closest: (selector) => (selector === '[hidden]' && el.hidden ? el : null),
    matches: (selector) => selector === '.reveal' && classes.has('reveal'),
    getBoundingClientRect: () =>
      el.hidden
        ? { top: 0, bottom: 0, width: 0, height: 0 }
        : inViewport
          ? { top: 120, bottom: 360, width: 320, height: 240 }
          : { top: 1400, bottom: 1640, width: 320, height: 240 },
    addEventListener: (type, listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    },
    removeEventListener: (type, listener) => {
      listeners.get(type)?.delete(listener);
    },
    querySelectorAll: () => [],
  };

  return el;
}

describe('Lenis + Progressive Reveal Architecture', () => {
  afterEach(() => {
    destroyLenis();
    cleanupReveals();
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
  });

  it('safely no-ops in non-browser SSR/Node environments', () => {
    expect(() => initLenis()).not.toThrow();
    expect(getLenis()).toBeNull();
    expect(() => initReveals()).not.toThrow();
    expect(() => replayReveals(null)).not.toThrow();
  });

  it('scopes all reveal hiding rules strictly under .js for progressive enhancement', () => {
    const revealCss = fs.readFileSync(path.join(rootDir, 'src/styles/reveal.css'), 'utf-8');

    // Strip block comments before inspecting selectors
    const uncommented = revealCss.replace(/\/\*[\s\S]*?\*\//g, '');

    // Must never contain an unscoped `.reveal { opacity: 0 }` rule
    expect(uncommented).not.toMatch(/(?:^|\}|\n)\s*\.reveal\s*\{/);
    expect(uncommented).toContain('.js .reveal');
    expect(uncommented).toContain('.js .reveal.is-visible');
    expect(uncommented).toContain('.js .reveal.is-resetting');
    expect(uncommented).toContain(".js [data-reveal-replay='fast']");
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

  it('indexes only non-hidden stagger children with capped delay and replays filtered cards cleanly', () => {
    const rafQueue: FrameRequestCallback[] = [];
    const cards = Array.from({ length: 11 }, () => createMockElement(['reveal']));
    // Simulate first two server-rendered cards hidden by a category filter
    cards[0].hidden = true;
    cards[1].hidden = true;

    const grid = createMockElement(['reveal-stagger']);
    grid.querySelectorAll = (selector: string) => {
      if (selector === ':scope > .reveal' || selector === '.reveal') return cards;
      return [];
    };

    const docElement = {
      dataset: {} as Record<string, string>,
      clientHeight: 900,
      offsetWidth: 1280,
    };

    (globalThis as Record<string, unknown>).window = {
      innerHeight: 900,
      requestAnimationFrame: (cb: FrameRequestCallback) => {
        rafQueue.push(cb);
        return rafQueue.length;
      },
      cancelAnimationFrame: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      setTimeout: (fn: () => void) => {
        // Keep manual control in test; return a non-zero timer handle
        void fn;
        return 1;
      },
      clearTimeout: () => {},
    };

    (globalThis as Record<string, unknown>).document = {
      documentElement: docElement,
      querySelectorAll: (selector: string) => {
        if (selector === '.reveal-stagger') return [grid];
        if (selector === '.reveal') return cards;
        return [];
      },
    };

    const flushRaf = () => {
      while (rafQueue.length > 0) {
        const next = rafQueue.shift();
        next?.(0);
      }
    };

    initReveals();

    // Hidden cards must not consume stagger slots
    expect(cards[0].style.getPropertyValue('--stagger-index')).toBe('');
    expect(cards[1].style.getPropertyValue('--stagger-index')).toBe('');
    // Visible cards start cleanly at 0 and cap at 8
    expect(cards[2].style.getPropertyValue('--stagger-index')).toBe('0');
    expect(cards[3].style.getPropertyValue('--stagger-index')).toBe('1');
    expect(cards[10].style.getPropertyValue('--stagger-index')).toBe('8');

    flushRaf();
    expect(cards[2].classList.contains('is-visible')).toBe(true);
    expect(cards[0].classList.contains('is-visible')).toBe(false);

    // Simulate user changing filter: card 0 becomes visible, card 2 stays visible (already complete)
    cards[0].hidden = false;
    cards[2].classList.add('reveal-complete');

    replayReveals(grid as unknown as ParentNode, { fast: true });

    // Immediately after replayReveals (before RAF): fast replay attribute is set,
    // visible cards are reset cleanly without residual .is-resetting/.is-visible/.reveal-complete
    expect(grid.dataset.revealReplay).toBe('fast');
    expect(cards[0].style.getPropertyValue('--stagger-index')).toBe('0');
    expect(cards[2].style.getPropertyValue('--stagger-index')).toBe('1');
    expect(cards[2].classList.contains('is-resetting')).toBe(false);
    expect(cards[2].classList.contains('is-visible')).toBe(false);
    expect(cards[2].classList.contains('reveal-complete')).toBe(false);

    // After RAF ticks, replayed cards animate into `.is-visible`
    flushRaf();
    expect(cards[0].classList.contains('is-visible')).toBe(true);
    expect(cards[2].classList.contains('is-visible')).toBe(true);

    // Explicit reduced-motion opt-out bypasses reset hiding immediately
    docElement.dataset.motion = 'reduced';
    cards[0].classList.remove('is-visible', 'reveal-complete');
    replayReveals(grid as unknown as ParentNode, { fast: true });
    expect(cards[0].classList.contains('is-visible')).toBe(true);
    expect(cards[0].classList.contains('reveal-complete')).toBe(true);
  });

  it('wires BlogIndexView.astro to replay card animations on filter changes and popstate', () => {
    const blogView = fs.readFileSync(path.join(rootDir, 'src/views/BlogIndexView.astro'), 'utf-8');
    expect(blogView).toContain('replayReveals');
    expect(blogView).toContain('areBlogFiltersEqual');
    expect(blogView).toContain('replayReveals(grid, { fast: true })');
    expect(blogView).toContain('void render({ updateUrl: false, animate: false })');
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
