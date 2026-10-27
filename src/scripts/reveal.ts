const REVEAL_SELECTOR = '.reveal';
const VISIBLE_CLASS = 'is-visible';
const COMPLETE_CLASS = 'reveal-complete';

let activeObserver: IntersectionObserver | null = null;
let detachScrollWatcher: (() => void) | null = null;
let rafTicket = 0;
let lifecycleBound = false;

export function cleanupReveals(): void {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
  if (detachScrollWatcher) {
    detachScrollWatcher();
    detachScrollWatcher = null;
  }
  if (rafTicket && typeof window !== 'undefined') {
    window.cancelAnimationFrame(rafTicket);
    rafTicket = 0;
  }
}

function markVisible(el: HTMLElement): void {
  if (el.classList.contains(VISIBLE_CLASS)) return;
  el.classList.add(VISIBLE_CLASS);

  const finalize = () => {
    el.classList.add(COMPLETE_CLASS);
  };

  const onTransitionEnd = (event: Event) => {
    if ((event as TransitionEvent).propertyName === 'opacity') {
      el.removeEventListener('transitionend', onTransitionEnd);
      finalize();
    }
  };

  el.addEventListener('transitionend', onTransitionEnd);
  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      el.removeEventListener('transitionend', onTransitionEnd);
      finalize();
    }, 1500);
  }
}

function isWithinRevealZone(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight || 800;
  if (rect.height === 0 && rect.width === 0) return false;
  // Trigger once the element's top edge enters the upper 90% of the viewport
  // and its bottom edge has not scrolled completely above the top.
  return rect.top <= vh * 0.9 && rect.bottom >= 24;
}

export function initReveals(): void {
  cleanupReveals();

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Only bypass animations if explicitly opted out via <html data-motion="reduced">.
  if (document.documentElement.dataset.motion === 'reduced') {
    document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
      el.classList.add(VISIBLE_CLASS, COMPLETE_CLASS);
    });
    return;
  }

  // Automatic stagger: assign --stagger-index to direct children
  document.querySelectorAll('.reveal-stagger').forEach((group) => {
    const children = group.querySelectorAll<HTMLElement>(':scope > .reveal');
    children.forEach((child, index) => {
      child.style.setProperty('--stagger-index', String(index));
    });
  });

  const pending = new Set<HTMLElement>(
    [...document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)].filter(
      (el) => !el.classList.contains(VISIBLE_CLASS)
    )
  );

  if (pending.size === 0) return;

  const revealElement = (el: HTMLElement) => {
    if (!pending.has(el)) return;
    pending.delete(el);
    activeObserver?.unobserve(el);
    markVisible(el);
    if (pending.size === 0) {
      cleanupReveals();
    }
  };

  const evaluateViewport = () => {
    rafTicket = 0;
    for (const el of [...pending]) {
      if (isWithinRevealZone(el)) {
        revealElement(el);
      }
    }
  };

  const scheduleEvaluation = () => {
    if (rafTicket !== 0 || pending.size === 0) return;
    rafTicket = window.requestAnimationFrame(evaluateViewport);
  };

  // In cross-origin preview iframes, browsers ignore IntersectionObserver's
  // negative `rootMargin` for security. Combining IntersectionObserver with a
  // lightweight RAF-throttled viewport check ensures accurate 90% viewport
  // triggers both standalone and inside iframes, then auto-disconnects once done.
  if (typeof IntersectionObserver !== 'undefined') {
    activeObserver = new IntersectionObserver(
      (entries) => {
        let needsCheck = false;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            if (isWithinRevealZone(target)) {
              revealElement(target);
            } else {
              needsCheck = true;
            }
          }
        }
        if (needsCheck) scheduleEvaluation();
      },
      {
        threshold: [0, 0.12],
        rootMargin: '0px 0px -8% 0px',
      }
    );

    for (const el of pending) {
      activeObserver.observe(el);
    }
  }

  window.addEventListener('scroll', scheduleEvaluation, { passive: true });
  window.addEventListener('resize', scheduleEvaluation, { passive: true });
  detachScrollWatcher = () => {
    window.removeEventListener('scroll', scheduleEvaluation);
    window.removeEventListener('resize', scheduleEvaluation);
  };

  // Wait one paint frame before revealing above-the-fold elements so the
  // browser commits the initial `opacity: 0; transform: translate3d(...)`
  // state and plays the entrance transition visibly on initial page load.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      evaluateViewport();
    });
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!lifecycleBound) {
    lifecycleBound = true;
    document.addEventListener('astro:before-swap', cleanupReveals);
    document.addEventListener('astro:page-load', initReveals);
  }

  initReveals();
}
