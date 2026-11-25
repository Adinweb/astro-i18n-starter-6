/**
 * ChronoTrig v6.2.0 client integration & lifecycle coordinator.
 *
 * Ensures ChronoTrig scans, measures, and observes elements across initial page
 * loads, Astro View Transitions (`astro:page-load`), and dynamic DOM updates
 * while preserving harmonic stagger modes (`linear` | `wave` | `center` | `reverse`),
 * pinned sections, timelines, zero-cost reveal fast paths, opt-in `:root` scroll vars,
 * and `data-trig-once="true"`.
 */

import { CLIENT_MOTION_CONFIG } from '@/libs/config/client';

type ChronoTrigEase = 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut';

type ChronoTrigMobileBehavior = 'disable' | 'lightweight' | 'full';

interface ChronoTrigFrameMetrics {
  lastUpdateMs: number;
  layoutReads: number;
  styleWrites: number;
  revealCount: number;
  activeScrubbers: number;
  activePins: number;
  activeScrubStaggers: number;
  activeTimelines: number;
}

interface ChronoTrigTimelineStep {
  at: number;
  x?: number;
  xUnit?: 'px' | '%' | 'vw';
  y?: number;
  yUnit?: 'px' | '%' | 'vh';
  z?: number;
  scale?: number;
  rotate?: number;
  rotateX?: number;
  rotateY?: number;
  opacity?: number;
  blur?: number;
  ease?: ChronoTrigEase;
}

interface ChronoTrigScrollState {
  scrollY: number;
  direction: 'up' | 'down';
  progress: number;
  isMobile: boolean;
}

interface ChronoTrigOptions {
  lerp?: number;
  globalPrefix?: string;
  autoInit?: boolean;
  debugMarkers?: boolean;
  mobileBreakpoint?: number;
  mobileBehavior?: ChronoTrigMobileBehavior;
  disableBlurOnMobile?: boolean;
  disable3DOnMobile?: boolean;
  respectReducedMotion?: boolean;
  root?: HTMLElement | null;
  rootMargin?: string;
  threshold?: number | number[];
  externalScroll?: boolean;
  measureOnScroll?: boolean;
  rootScrollVars?: boolean;
  precision?: number;
  autoScan?: boolean;
}

interface ChronoTrigInstance {
  readonly version?: string;
  init: () => void;
  scan: () => void;
  sync: (scrollY?: number) => void;
  refresh: () => void;
  resetStagger?: (grid: HTMLElement) => void;
  setExternalScroll?: (external: boolean) => void;
  isExternalScroll?: () => boolean;
  setRoot: (root: HTMLElement | null) => void;
  subscribe: (cb: (state: ChronoTrigScrollState) => void) => () => void;
  setLerp: (val: number) => void;
  getLerp: () => number;
  setMobileBehavior: (mode: ChronoTrigMobileBehavior) => void;
  getMobileBehavior: () => ChronoTrigMobileBehavior;
  setSimulatedMobile: (val: boolean | null) => void;
  isMobile: () => boolean;
  isDisabled: () => boolean;
  setDebugMarkers: (enabled: boolean) => void;
  isDebugMarkers: () => boolean;
  getLastUpdateMs: () => number;
  getFrameMetrics: () => ChronoTrigFrameMetrics;
  applyTimelineInterpolation: (
    el: HTMLElement,
    steps: ChronoTrigTimelineStep[],
    progressPercent: number,
    directOverride?: boolean
  ) => void;
  trigInit: () => void;
  trigScroll: (sync?: boolean) => void;
  trigWindowHeight: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    ChronoTrig?: new (options?: ChronoTrigOptions) => ChronoTrigInstance;
    chronoTrig?: ChronoTrigInstance;
    trig?: ChronoTrigInstance;
    trigInit?: () => void;
    trigScroll?: (sync?: boolean) => void;
    trigWindowHeight?: () => void;
  }
}

let lifecycleBound = false;
const pendingGridReplays = new WeakMap<HTMLElement, number>();
const STAGGER_REVEAL_CLASSES = [
  'trig',
  'trig-up',
  'trig-down',
  'trig-ready',
  'trig-stagger-active',
  'trig-stagger-settled',
] as const;

function resetStaggerDom(grid: HTMLElement): void {
  grid.classList.remove(...STAGGER_REVEAL_CLASSES);
  grid.removeAttribute('data-trig-settled');
  grid.style.removeProperty('--trig-stagger-progress');
  grid.style.removeProperty('--trig-stagger-t');

  const children = grid.querySelectorAll<HTMLElement>('[data-trig-stagger-item], :scope > *');
  children.forEach((child) => {
    child.classList.remove(...STAGGER_REVEAL_CLASSES);
    child.removeAttribute('data-trig-settled');
    child.style.willChange = 'auto';
    child.style.removeProperty('--stagger-index');
    child.style.removeProperty('--stagger-delay');
    child.style.removeProperty('--stagger-total');
    child.style.removeProperty('--child-progress');
    child.style.removeProperty('--child-percent');
  });
}

/**
 * Restarts the ChronoTrig stagger cascade across ALL currently visible items
 * inside `grid` (e.g. after filter or search updates), cancelling any in-flight
 * animations or queued replay frames so pre-existing items animate alongside
 * newly revealed ones.
 */
export function replayStaggerGrid(grid: HTMLElement | null): void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !grid) return;

  // Never strip reveal classes without an active engine to re-trigger them,
  // otherwise cards would remain stuck in the hidden entrance state.
  if (!window.chronoTrig) {
    document.documentElement?.classList?.remove('js');
    return;
  }

  const pendingRaf = pendingGridReplays.get(grid);
  if (pendingRaf !== undefined && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(pendingRaf);
    pendingGridReplays.delete(grid);
  }

  const reducedOrDisabled =
    document.documentElement?.dataset?.motion === 'reduced' ||
    Boolean(window.chronoTrig.isDisabled?.());

  if (typeof window.chronoTrig.resetStagger === 'function') {
    window.chronoTrig.resetStagger(grid);
  }
  resetStaggerDom(grid);

  if (reducedOrDisabled || typeof requestAnimationFrame !== 'function') {
    refreshChronoTrig();
    return;
  }

  // Flush the reset entrance state (`opacity: 0; animation: none`) synchronously,
  // then yield across two animation frames so the browser commits at least one
  // clean frame and drains any queued `animationcancel` events before ChronoTrig
  // re-observes and restarts every visible card together in a single stagger pass.
  void grid.offsetHeight;

  const raf1 = requestAnimationFrame(() => {
    if (!grid.isConnected) {
      pendingGridReplays.delete(grid);
      return;
    }
    const raf2 = requestAnimationFrame(() => {
      pendingGridReplays.delete(grid);
      if (!grid.isConnected) return;
      refreshChronoTrig();
    });
    pendingGridReplays.set(grid, raf2);
  });
  pendingGridReplays.set(grid, raf1);
}

/**
 * Automatically attributes prose titles, subtitles, and section headers for zero-cost
 * one-shot reveal (`data-trig-once="true"`), ensures stagger children participate cleanly
 * in IntersectionObserver without overwriting ChronoTrig stagger modes, and refreshes
 * cached engine geometry.
 */
export function setupChronoTrig(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Failsafe: if the engine asset failed to load, drop the `.js` class so the
  // entrance styles never leave content stuck at opacity 0.
  if (!window.chronoTrig) {
    document.documentElement?.classList?.remove('js');
    return;
  }

  // Auto-tag prose headings, subtitles, and kickers for crisp one-shot reveal
  const headings = document.querySelectorAll<HTMLElement>(
    '.prose h2, .prose h3, .prose h4, .prose .section-kicker, [data-prose-reveal]'
  );
  if (headings && typeof headings.forEach === 'function') {
    headings.forEach((el) => {
      if (typeof el.hasAttribute === 'function' && !el.hasAttribute('data-trig')) {
        el.setAttribute('data-trig', '');
        if (!el.hasAttribute('data-trig-once')) {
          el.setAttribute('data-trig-once', 'true');
        }
      }
    });
  }

  // Sync configured mobile behavior when ChronoTrig exposes setMobileBehavior
  try {
    if (
      typeof window.chronoTrig.setMobileBehavior === 'function' &&
      typeof window.chronoTrig.getMobileBehavior === 'function' &&
      window.chronoTrig.getMobileBehavior() !== CLIENT_MOTION_CONFIG.mobileBehavior
    ) {
      window.chronoTrig.setMobileBehavior(CLIENT_MOTION_CONFIG.mobileBehavior);
    }
  } catch (_) {}

  // Apply configured rootMargin fallback when customized from the engine default
  if (CLIENT_MOTION_CONFIG.rootMargin && CLIENT_MOTION_CONFIG.rootMargin !== '0px 0px -8% 0px') {
    try {
      const triggers = document.querySelectorAll<HTMLElement>('[data-trig], [data-trig-stagger]');
      if (triggers && typeof triggers.forEach === 'function') {
        triggers.forEach((el) => {
          if (typeof el.hasAttribute === 'function' && !el.hasAttribute('data-trig-root-margin')) {
            el.setAttribute('data-trig-root-margin', CLIENT_MOTION_CONFIG.rootMargin);
          }
        });
      }
    } catch (_) {}
  }

  // Ensure stagger children participate in IntersectionObserver reveals while
  // delegating `--stagger-index`, `--stagger-delay` (`linear` | `wave` | `center` | `reverse`),
  // `--stagger-total`, hidden-child exclusion, and mobile clamping to ChronoTrig v6.2.0.
  try {
    const staggers = document.querySelectorAll<HTMLElement>('[data-trig-stagger]');
    if (staggers && typeof staggers.forEach === 'function') {
      const defaultStepSec =
        CLIENT_MOTION_CONFIG.staggerStepMs <= 0
          ? '0.0001'
          : (CLIENT_MOTION_CONFIG.staggerStepMs / 1000).toFixed(3);
      staggers.forEach((container) => {
        if (typeof container.getAttribute !== 'function' || typeof container.querySelectorAll !== 'function') return;
        if (
          CLIENT_MOTION_CONFIG.staggerStepMs !== 80 &&
          typeof container.hasAttribute === 'function' &&
          !container.hasAttribute('data-trig-stagger-delay')
        ) {
          container.setAttribute('data-trig-stagger-delay', defaultStepSec);
        }
        const inheritOnce = container.getAttribute('data-trig-once') === 'true';
        const containerRootMargin = container.getAttribute('data-trig-root-margin');
        const fallbackRootMargin =
          CLIENT_MOTION_CONFIG.rootMargin && CLIENT_MOTION_CONFIG.rootMargin !== '0px 0px -8% 0px'
            ? CLIENT_MOTION_CONFIG.rootMargin
            : '';
        const inheritedRootMargin = containerRootMargin || fallbackRootMargin;
        const children = container.querySelectorAll<HTMLElement>('[data-trig-stagger-item], :scope > *');
        if (children && typeof children.forEach === 'function') {
          children.forEach((child) => {
            if (typeof child.hasAttribute === 'function') {
              if (!child.hasAttribute('data-trig')) {
                child.setAttribute('data-trig', '');
              }
              if (inheritOnce && !child.hasAttribute('data-trig-once')) {
                child.setAttribute('data-trig-once', 'true');
              }
              if (inheritedRootMargin && !child.hasAttribute('data-trig-root-margin')) {
                child.setAttribute('data-trig-root-margin', inheritedRootMargin);
              }
            }
          });
        }
      });
    }
  } catch (_) {}

  // Hero copy and top elements: activate in the next frame so the initial hidden state is registered
  try {
    const topVisible = document.querySelectorAll<HTMLElement>(
      '.max-w-3xl[data-trig]:not(.trig), .max-w-4xl[data-trig]:not(.trig)'
    );
    if (topVisible && typeof topVisible.forEach === 'function') {
      topVisible.forEach((el) => {
        if (typeof el.getBoundingClientRect === 'function') {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top < (window.innerHeight || 800) * 0.9) {
            requestAnimationFrame(() => {
              el.classList.add('trig');
            });
          }
        }
      });
    }
  } catch (_) {}

  if (typeof window.chronoTrig.refresh === 'function') {
    window.chronoTrig.refresh();
  } else {
    window.chronoTrig.scan();
    window.chronoTrig.trigScroll?.(true);
  }
}

/**
 * Re-scans and re-measures the DOM when dynamic content (e.g. filtered blog cards,
 * tab panels, or gallery filters) is appended, shown, or resized.
 */
export function refreshChronoTrig(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  setupChronoTrig();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!lifecycleBound) {
    lifecycleBound = true;
    document.addEventListener('astro:page-load', setupChronoTrig);
  }

  // Initial trigger for standard page execution
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupChronoTrig, { once: true });
  } else {
    setupChronoTrig();
  }
}
