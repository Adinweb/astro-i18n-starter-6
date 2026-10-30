/**
 * ChronoTrig client integration & lifecycle coordinator.
 *
 * Ensures ChronoTrig scans and observes elements across initial page loads,
 * Astro View Transitions (`astro:page-load`), and dynamic DOM insertions.
 */

export interface ChronoTrigInstance {
  scan: () => void;
  onScroll: () => void;
  onResize: () => void;
  destroy: () => void;
  refresh: () => void;
  isMobile: () => boolean;
  options: {
    lerp?: number;
    mobileBehavior?: 'disable' | 'lightweight' | 'full';
    mobileBreakpoint?: number;
    disableBlurOnMobile?: boolean;
    disable3DOnMobile?: boolean;
  };
}

declare global {
  interface Window {
    chronoTrig?: ChronoTrigInstance;
    trig?: ChronoTrigInstance;
  }
}

let lifecycleBound = false;

/**
 * Automatically attributes prose titles and section headers for smooth bottom reveal,
 * then tells ChronoTrig to scan and calculate measurements.
 */
export function setupChronoTrig(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Auto-tag prose headings and kickers for smooth bottom reveal
  document.querySelectorAll<HTMLElement>('.prose > h2, .prose > h3, [data-prose-reveal]').forEach((el) => {
    if (!el.hasAttribute('data-trig')) {
      el.setAttribute('data-trig', '');
    }
  });

  if (window.chronoTrig) {
    window.chronoTrig.scan();
    window.chronoTrig.onScroll();
  }
}

/**
 * Re-scans the DOM when dynamic content (e.g. filtered blog cards or search results)
 * is appended or swapped.
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
