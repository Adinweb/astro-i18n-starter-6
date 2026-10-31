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
 * Automatically attributes prose titles, subtitles, and section headers for smooth bottom reveal,
 * seeds stagger indexes on grids, then tells ChronoTrig to scan and calculate measurements.
 */
export function setupChronoTrig(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Failsafe: if the engine asset failed to load, drop the `.js` class so the
  // entrance styles never leave content stuck at opacity 0.
  if (!window.chronoTrig) {
    document.documentElement?.classList?.remove('js');
    return;
  }

  // Auto-tag prose headings, subtitles, and kickers for smooth bottom reveal (including nested section headings)
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

  // Pre-seed stagger index and delay on all stagger grids so child cards cascade with harmonic timing
  try {
    const staggers = document.querySelectorAll<HTMLElement>('[data-trig-stagger]');
    if (staggers && typeof staggers.forEach === 'function') {
      staggers.forEach((container) => {
        if (typeof container.getAttribute !== 'function' || typeof container.querySelectorAll !== 'function') return;
        const step = parseFloat(container.getAttribute('data-trig-stagger-delay') || '0.08');
        const children = container.querySelectorAll<HTMLElement>(':scope > *');
        if (children && typeof children.forEach === 'function') {
          children.forEach((child, idx) => {
            if (typeof child.hasAttribute === 'function' && !child.hasAttribute('data-trig')) {
              child.setAttribute('data-trig', '');
            }
            if (child.style && typeof child.style.setProperty === 'function') {
              child.style.setProperty('--stagger-index', String(idx));
              child.style.setProperty('--stagger-delay', `${(idx * step).toFixed(3)}s`);
            }
          });
        }
      });
    }
  } catch (_) {}

  // Hero copy and top elements: activate in the next frame so the initial hidden state is registered
  try {
    const topVisible = document.querySelectorAll<HTMLElement>('.max-w-3xl[data-trig]:not(.trig)');
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
