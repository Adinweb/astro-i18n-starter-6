/**
 * ChronoTrig v5.2.0 client integration & lifecycle coordinator.
 *
 * Ensures ChronoTrig scans, measures, and observes elements across initial page
 * loads, Astro View Transitions (`astro:page-load`), and dynamic DOM updates
 * while preserving harmonic stagger modes (`linear` | `wave` | `center` | `reverse`),
 * pinned sections, timelines, and `data-trig-once="true"` reveals.
 */

type ChronoTrigEase = 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut';

type ChronoTrigMobileBehavior = 'disable' | 'lightweight' | 'full';

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
}

interface ChronoTrigInstance {
  init: () => void;
  scan: () => void;
  refresh: () => void;
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
  applyTimelineInterpolation: (
    el: HTMLElement,
    steps: ChronoTrigTimelineStep[],
    progressPercent: number,
    directOverride?: boolean
  ) => void;
  trigInit: () => void;
  trigScroll: () => void;
  trigWindowHeight: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    ChronoTrig?: new (options?: ChronoTrigOptions) => ChronoTrigInstance;
    chronoTrig?: ChronoTrigInstance;
    trig?: ChronoTrigInstance;
    trigInit?: () => void;
    trigScroll?: () => void;
    trigWindowHeight?: () => void;
  }
}

let lifecycleBound = false;

/**
 * Automatically attributes prose titles, subtitles, and section headers for smooth
 * bottom reveal, ensures stagger children participate cleanly in IntersectionObserver
 * without overwriting ChronoTrig v5.2.0 stagger modes (`wave`, `center`, `reverse`),
 * and refreshes engine measurements.
 */
export function setupChronoTrig(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Failsafe: if the engine asset failed to load, drop the `.js` class so the
  // entrance styles never leave content stuck at opacity 0.
  if (!window.chronoTrig) {
    document.documentElement?.classList?.remove('js');
    return;
  }

  // Auto-tag prose headings, subtitles, and kickers for smooth bottom reveal
  const headings = document.querySelectorAll<HTMLElement>(
    '.prose h2, .prose h3, .prose h4, .prose .section-kicker, [data-prose-reveal]'
  );
  if (headings && typeof headings.forEach === 'function') {
    headings.forEach((el) => {
      if (typeof el.hasAttribute === 'function' && !el.hasAttribute('data-trig')) {
        el.setAttribute('data-trig', '');
      }
    });
  }

  // Ensure stagger children participate in IntersectionObserver reveals while
  // delegating `--stagger-index`, `--stagger-delay` (`linear` | `wave` | `center` | `reverse`),
  // `--stagger-total`, and mobile lightweight clamping to ChronoTrig v5.2.0.
  try {
    const staggers = document.querySelectorAll<HTMLElement>('[data-trig-stagger]');
    if (staggers && typeof staggers.forEach === 'function') {
      staggers.forEach((container) => {
        if (typeof container.getAttribute !== 'function' || typeof container.querySelectorAll !== 'function') return;
        const inheritOnce = container.getAttribute('data-trig-once') === 'true';
        const children = container.querySelectorAll<HTMLElement>('[data-trig-stagger-item], :scope > *');
        if (children && typeof children.forEach === 'function') {
          children.forEach((child) => {
            if (typeof child.hasAttribute === 'function' && !child.hasAttribute('data-trig')) {
              child.setAttribute('data-trig', '');
              if (inheritOnce && !child.hasAttribute('data-trig-once')) {
                child.setAttribute('data-trig-once', 'true');
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
    window.chronoTrig.trigScroll?.();
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
