import Lenis from 'lenis';

declare global {
  interface Window {
    __lenisInstance?: Lenis | null;
  }
}

let lenis: Lenis | null = null;
let lifecycleBound = false;

function getHeaderOffset(): number {
  if (typeof document === 'undefined') return 0;
  return document.querySelector('header.fixed') ? -96 : 0;
}

function prefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return false;
  const explicit = document.documentElement.dataset.motion;
  if (explicit === 'reduced') return true;
  if (explicit === 'full') return false;
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function getLenis(): Lenis | null {
  return lenis;
}

export function destroyLenis(): void {
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
  if (typeof window !== 'undefined') {
    window.__lenisInstance = null;
  }
}

/**
 * Intercepts same-page `#hash` links in the capture phase BEFORE Astro's
 * `<ClientRouter />` bubble listener can hijack them with an instant `navigate()`.
 */
function handleSamePageAnchorClick(event: MouseEvent): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) return;

  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;

  let parsed: URL;
  try {
    parsed = new URL(anchor.href, window.location.href);
  } catch {
    return;
  }

  if (
    parsed.origin !== window.location.origin ||
    parsed.pathname !== window.location.pathname ||
    parsed.search !== window.location.search ||
    !parsed.hash ||
    parsed.hash === '#'
  ) {
    return;
  }

  const rawId = decodeURIComponent(parsed.hash.slice(1));
  const destination =
    document.getElementById(rawId) ?? document.querySelector<HTMLElement>(parsed.hash);
  if (!destination) return;

  event.preventDefault();
  event.stopPropagation();

  if (window.location.hash !== parsed.hash) {
    window.history.pushState(null, '', parsed.hash);
  }

  if (lenis) {
    lenis.scrollTo(destination, {
      offset: getHeaderOffset(),
      duration: 1.15,
    });
  } else {
    destination.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }
}

export function initLenis(): void {
  // Destroy previous instance (critical for View Transitions)
  destroyLenis();

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Abort Lenis only if explicitly configured for reduced motion via data-motion="reduced"
  if (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduced') {
    return;
  }

  const anchorOffset = getHeaderOffset();

  // Note: In Lenis v1.3+, passing `duration` + `easing` shadows `lerp` inside
  // `Animate.advance()`. Omitting `duration` here lets `lerp: 0.085` drive
  // silky-smooth wheel inertia, while programmatic `scrollTo` uses `duration`.
  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.085,
    wheelMultiplier: 1,
    touchMultiplier: 1.3,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    syncTouch: false,
    anchors: anchorOffset !== 0 ? { offset: anchorOffset, duration: 1.15 } : { duration: 1.15 },
    allowNestedScroll: true,
    stopInertiaOnNavigate: true,
    respectReducedMotion: false,
    prevent: (node: HTMLElement) =>
      node.closest(
        '[data-lenis-prevent], [data-search-modal], [data-mobile-panel], [data-mobile-menu].is-open'
      ) !== null,
  });

  window.__lenisInstance = lenis;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!lifecycleBound) {
    lifecycleBound = true;
    document.addEventListener('click', handleSamePageAnchorClick, { capture: true });
    document.addEventListener('astro:before-swap', destroyLenis);
    document.addEventListener('astro:page-load', initLenis);
  }

  initLenis();
}
