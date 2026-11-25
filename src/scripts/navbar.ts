/**
 * Site navbar offset, banner-height adaptation, and scroll-to-sticky controller.
 *
 * Keeps `<header data-site-header>` clear of `[data-site-top-banner-region]` at
 * the top of the page, transitions into fixed sticky mode after the configured
 * scroll threshold (`stickyScrollThreshold`), and syncs CSS custom properties
 * for Lenis anchor offsets and main-content clearance.
 */

export interface NavbarStateInput {
  scrollY: number;
  stickyEnabled: boolean;
  initialTopOffset: number;
  stickyScrollThreshold: number;
  stickyTopOffset: number;
  autoBannerOffset: boolean;
  manualBannerOffset: number;
  measuredBannerHeight: number;
}

export interface NavbarStateOutput {
  effectiveBannerHeight: number;
  bannerClearScroll: number;
  effectiveThreshold: number;
  isStuck: boolean;
  shouldAnimateStick: boolean;
  initialCssTopPx: number;
  stickyCssTopPx: number;
}

function parsePx(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function computeNavbarState(input: NavbarStateInput): NavbarStateOutput {
  const initialTopOffset = Math.max(0, input.initialTopOffset);
  const stickyScrollThreshold = Math.max(0, input.stickyScrollThreshold);
  const stickyTopOffset = Math.max(0, input.stickyTopOffset);
  const manualBannerOffset = Math.max(0, input.manualBannerOffset);
  const measuredBannerHeight = Math.max(0, input.measuredBannerHeight);
  const scrollY = Math.max(0, input.scrollY);

  const effectiveBannerHeight = input.autoBannerOffset
    ? measuredBannerHeight
    : manualBannerOffset;
  const bannerClearScroll = Math.max(
    0,
    effectiveBannerHeight + initialTopOffset - stickyTopOffset
  );
  const effectiveThreshold = Math.max(stickyScrollThreshold, bannerClearScroll);

  let isStuck = false;
  let shouldAnimateStick = false;

  if (input.stickyEnabled) {
    if (effectiveThreshold === 0) {
      isStuck = scrollY > 0;
    } else {
      isStuck = scrollY >= effectiveThreshold;
      shouldAnimateStick = stickyScrollThreshold > bannerClearScroll + 8;
    }
  }

  return {
    effectiveBannerHeight,
    bannerClearScroll,
    effectiveThreshold,
    isStuck,
    shouldAnimateStick,
    initialCssTopPx: input.autoBannerOffset
      ? initialTopOffset
      : manualBannerOffset + initialTopOffset,
    stickyCssTopPx: stickyTopOffset,
  };
}

let activeCleanup: (() => void) | null = null;
let lifecycleBound = false;

export function destroySiteNavbar(): void {
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }
}

export function setupSiteNavbar(): void {
  destroySiteNavbar();

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const header = document.querySelector<HTMLElement>('header[data-site-header]');
  if (!header) return;

  const bannerRegion = document.querySelector<HTMLElement>('[data-site-top-banner-region]');
  const root = document.documentElement;

  const stickyEnabled = header.dataset.stickyEnabled !== 'false';
  const initialTopOffset = parsePx(header.dataset.initialTop, 16);
  const stickyScrollThreshold = parsePx(header.dataset.stickyThreshold, 0);
  const stickyTopOffset = parsePx(header.dataset.stickyTop, 12);
  const autoBannerOffset = header.dataset.autoBannerOffset !== 'false';
  const manualBannerOffset = parsePx(header.dataset.manualBannerOffset, 0);

  let measuredBannerHeight = 0;
  let wasStuck = header.dataset.headerStuck === 'true';
  let rafId = 0;

  const measureSizes = () => {
    measuredBannerHeight = bannerRegion
      ? Math.max(0, Math.round(bannerRegion.getBoundingClientRect().height))
      : 0;
    const navbarHeight = Math.max(0, Math.round(header.getBoundingClientRect().height)) || 64;

    root.style.setProperty('--navbar-initial-top', `${initialTopOffset}px`);
    root.style.setProperty('--navbar-sticky-top', `${stickyTopOffset}px`);
    root.style.setProperty(
      '--navbar-manual-banner-offset',
      `${autoBannerOffset ? 0 : manualBannerOffset}px`
    );
    root.style.setProperty('--actual-banner-height', `${measuredBannerHeight}px`);
    root.style.setProperty(
      '--top-banner-height',
      `${autoBannerOffset ? measuredBannerHeight : manualBannerOffset}px`
    );
    root.style.setProperty('--navbar-height', `${navbarHeight}px`);
  };

  const applyScrollState = () => {
    const scrollY = window.scrollY ?? window.pageYOffset ?? 0;
    const state = computeNavbarState({
      scrollY,
      stickyEnabled,
      initialTopOffset,
      stickyScrollThreshold,
      stickyTopOffset,
      autoBannerOffset,
      manualBannerOffset,
      measuredBannerHeight,
    });

    if (state.isStuck !== wasStuck) {
      if (state.isStuck && state.shouldAnimateStick) {
        header.dataset.headerAnimate = 'true';
      } else {
        delete header.dataset.headerAnimate;
      }
      header.dataset.headerStuck = state.isStuck ? 'true' : 'false';
      wasStuck = state.isStuck;
    }
  };

  const scheduleUpdate = () => {
    if (rafId !== 0) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      applyScrollState();
    });
  };

  const handleMeasureAndUpdate = () => {
    measureSizes();
    applyScrollState();
  };

  const abortController = new AbortController();
  const { signal } = abortController;

  const handleAnimationEnd = () => {
    delete header.dataset.headerAnimate;
  };
  header.addEventListener('animationend', handleAnimationEnd, { signal });

  window.addEventListener('scroll', scheduleUpdate, { passive: true, signal });
  window.addEventListener('lenis:scroll', applyScrollState, { signal });
  window.addEventListener('resize', handleMeasureAndUpdate, { passive: true, signal });
  document.addEventListener('app:top-banner-change', handleMeasureAndUpdate, { signal });

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => {
      handleMeasureAndUpdate();
    });
    if (bannerRegion) resizeObserver.observe(bannerRegion);
    resizeObserver.observe(header);
  }

  activeCleanup = () => {
    abortController.abort();
    if (rafId !== 0) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    resizeObserver?.disconnect();
  };

  handleMeasureAndUpdate();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!lifecycleBound) {
    lifecycleBound = true;
    document.addEventListener('astro:before-swap', destroySiteNavbar);
    document.addEventListener('astro:page-load', setupSiteNavbar);
  }
  setupSiteNavbar();
}
