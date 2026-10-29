const REVEAL_SELECTOR = '.reveal';
const VISIBLE_CLASS = 'is-visible';
const COMPLETE_CLASS = 'reveal-complete';
const RESETTING_CLASS = 'is-resetting';
const MAX_STAGGER_INDEX = 8;

export interface ReplayRevealsOptions {
  /** Uses a tighter duration and 45ms stagger step suited for interactive UI filtering. */
  fast?: boolean;
}

let activeObserver: IntersectionObserver | null = null;
let detachScrollWatcher: (() => void) | null = null;
let rafTicket = 0;
let lifecycleBound = false;
const elementCleanups = new WeakMap<HTMLElement, () => void>();

function clearElementFinalize(el: HTMLElement): void {
  const cancel = elementCleanups.get(el);
  if (cancel) {
    cancel();
    elementCleanups.delete(el);
  }
}

function isElementHidden(el: HTMLElement): boolean {
  if (el.hidden || el.hasAttribute('hidden')) return true;
  return typeof el.closest === 'function' && el.closest('[hidden]') !== null;
}

function isHtmlElement(node: unknown): node is HTMLElement {
  return (
    typeof node === 'object' &&
    node !== null &&
    'classList' in node &&
    'dataset' in node
  );
}

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
  clearElementFinalize(el);
  el.classList.add(VISIBLE_CLASS);

  let timerId = 0;

  const finalize = () => {
    clearElementFinalize(el);
    el.classList.add(COMPLETE_CLASS);
  };

  const onTransitionEnd = (event: Event) => {
    if ((event as TransitionEvent).propertyName === 'opacity') {
      finalize();
    }
  };

  el.addEventListener('transitionend', onTransitionEnd);
  if (typeof window !== 'undefined') {
    timerId = window.setTimeout(finalize, 1500);
  }

  elementCleanups.set(el, () => {
    el.removeEventListener('transitionend', onTransitionEnd);
    if (timerId && typeof window !== 'undefined') {
      window.clearTimeout(timerId);
    }
  });
}

function isWithinRevealZone(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight || 800;
  if (rect.height === 0 && rect.width === 0) return false;
  // Trigger once the element's top edge enters the upper 90% of the viewport
  // and its bottom edge has not scrolled completely above the top.
  return rect.top <= vh * 0.9 && rect.bottom >= 24;
}

function assignStaggerIndices(): void {
  document.querySelectorAll('.reveal-stagger').forEach((group) => {
    const children = group.querySelectorAll<HTMLElement>(':scope > .reveal');
    let visibleIndex = 0;
    children.forEach((child) => {
      if (isElementHidden(child)) {
        child.style.removeProperty('--stagger-index');
        return;
      }
      child.style.setProperty(
        '--stagger-index',
        String(Math.min(visibleIndex, MAX_STAGGER_INDEX))
      );
      visibleIndex += 1;
    });
  });
}

export function initReveals(): void {
  cleanupReveals();

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Only bypass animations if explicitly opted out via <html data-motion="reduced">.
  if (document.documentElement.dataset.motion === 'reduced') {
    document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
      clearElementFinalize(el);
      el.classList.remove(RESETTING_CLASS);
      el.classList.add(VISIBLE_CLASS, COMPLETE_CLASS);
    });
    return;
  }

  // Automatic stagger: assign --stagger-index strictly to visible direct children
  assignStaggerIndices();

  const pending = new Set<HTMLElement>(
    [...document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)].filter(
      (el) => !isElementHidden(el) && !el.classList.contains(VISIBLE_CLASS)
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

/**
 * Replays the scroll-reveal entrance animation for visible `.reveal` elements
 * inside `container` without reverse-transition flicker when filtering or
 * switching tabs on the client.
 */
export function replayReveals(
  container: ParentNode | null | undefined,
  options: ReplayRevealsOptions = {}
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !container) {
    return;
  }

  const fast = options.fast ?? true;
  if (isHtmlElement(container)) {
    if (fast) {
      container.dataset.revealReplay = 'fast';
    } else {
      delete container.dataset.revealReplay;
    }
  }

  const candidates = [...container.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)];
  if (isHtmlElement(container) && container.matches(REVEAL_SELECTOR)) {
    candidates.unshift(container);
  }
  const visibleTargets = candidates.filter((el) => !isElementHidden(el));

  if (document.documentElement.dataset.motion === 'reduced') {
    for (const el of visibleTargets) {
      clearElementFinalize(el);
      el.classList.remove(RESETTING_CLASS);
      el.classList.add(VISIBLE_CLASS, COMPLETE_CLASS);
    }
    return;
  }

  if (visibleTargets.length === 0) {
    initReveals();
    return;
  }

  for (const el of visibleTargets) {
    clearElementFinalize(el);
    el.classList.add(RESETTING_CLASS);
    el.classList.remove(VISIBLE_CLASS, COMPLETE_CLASS);
  }

  // Commit the initial hidden pose synchronously while transitions are suppressed
  // so previously visible cards do not animate backward and newly unhidden cards
  // transition cleanly from their starting transform.
  if (isHtmlElement(container)) {
    void container.offsetWidth;
  } else {
    void document.documentElement.offsetWidth;
  }

  for (const el of visibleTargets) {
    el.classList.remove(RESETTING_CLASS);
  }

  initReveals();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!lifecycleBound) {
    lifecycleBound = true;
    document.addEventListener('astro:before-swap', cleanupReveals);
    document.addEventListener('astro:page-load', initReveals);
  }

  initReveals();
}
