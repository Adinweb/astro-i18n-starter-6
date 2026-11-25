import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeNavbarState, setupSiteNavbar, destroySiteNavbar } from './navbar';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

describe('Site Navbar Sticky & Top Banner Adaptation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    destroySiteNavbar();
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
    delete (globalThis as Record<string, unknown>).ResizeObserver;
  });

  it('safely no-ops in non-browser SSR/Node environments', () => {
    expect(() => setupSiteNavbar()).not.toThrow();
    expect(() => destroySiteNavbar()).not.toThrow();
  });

  it('computes initial and sticky transitions cleanly without a banner', () => {
    const base = {
      stickyEnabled: true,
      initialTopOffset: 16,
      stickyScrollThreshold: 0,
      stickyTopOffset: 12,
      autoBannerOffset: true,
      manualBannerOffset: 0,
      measuredBannerHeight: 0,
    };

    const atTop = computeNavbarState({ ...base, scrollY: 0 });
    expect(atTop.effectiveBannerHeight).toBe(0);
    expect(atTop.bannerClearScroll).toBe(4);
    expect(atTop.effectiveThreshold).toBe(4);
    expect(atTop.isStuck).toBe(false);
    expect(atTop.initialCssTopPx).toBe(16);
    expect(atTop.stickyCssTopPx).toBe(12);

    const pastClear = computeNavbarState({ ...base, scrollY: 4 });
    expect(pastClear.isStuck).toBe(true);
    expect(pastClear.shouldAnimateStick).toBe(false);
  });

  it('automatically clears measured top banner height before sticking when threshold is 0', () => {
    const base = {
      stickyEnabled: true,
      initialTopOffset: 16,
      stickyScrollThreshold: 0,
      stickyTopOffset: 12,
      autoBannerOffset: true,
      manualBannerOffset: 0,
      measuredBannerHeight: 44,
    };

    // 44 + 16 - 12 = 48px scroll needed for navbar to glide up to stickyTopOffset (12px)
    const beforeClear = computeNavbarState({ ...base, scrollY: 30 });
    expect(beforeClear.effectiveBannerHeight).toBe(44);
    expect(beforeClear.effectiveThreshold).toBe(48);
    expect(beforeClear.isStuck).toBe(false);

    const atClear = computeNavbarState({ ...base, scrollY: 48 });
    expect(atClear.isStuck).toBe(true);
    expect(atClear.shouldAnimateStick).toBe(false);
  });

  it('waits until configured stickyScrollThreshold and animates entrance when threshold exceeds banner clearance', () => {
    const base = {
      stickyEnabled: true,
      initialTopOffset: 24,
      stickyScrollThreshold: 180,
      stickyTopOffset: 10,
      autoBannerOffset: true,
      manualBannerOffset: 0,
      measuredBannerHeight: 40,
    };

    // bannerClearScroll = 40 + 24 - 10 = 54, threshold = 180 -> animate stick entrance
    const at100 = computeNavbarState({ ...base, scrollY: 100 });
    expect(at100.effectiveThreshold).toBe(180);
    expect(at100.isStuck).toBe(false);

    const at180 = computeNavbarState({ ...base, scrollY: 180 });
    expect(at180.isStuck).toBe(true);
    expect(at180.shouldAnimateStick).toBe(true);
  });

  it('prevents early sticky overlap when banner height exceeds configured stickyScrollThreshold', () => {
    const state = computeNavbarState({
      scrollY: 30,
      stickyEnabled: true,
      initialTopOffset: 16,
      stickyScrollThreshold: 20,
      stickyTopOffset: 12,
      autoBannerOffset: true,
      manualBannerOffset: 0,
      measuredBannerHeight: 100,
    });

    // bannerClearScroll = 100 + 16 - 12 = 104 > 20, so navbar stays non-stuck at y=30
    expect(state.effectiveThreshold).toBe(104);
    expect(state.isStuck).toBe(false);
  });

  it('respects manualBannerOffset when autoBannerOffset is false and never sticks when stickyEnabled is false', () => {
    const manual = computeNavbarState({
      scrollY: 50,
      stickyEnabled: true,
      initialTopOffset: 16,
      stickyScrollThreshold: 0,
      stickyTopOffset: 12,
      autoBannerOffset: false,
      manualBannerOffset: 52,
      measuredBannerHeight: 90,
    });

    expect(manual.effectiveBannerHeight).toBe(52);
    expect(manual.initialCssTopPx).toBe(68);
    expect(manual.effectiveThreshold).toBe(56);
    expect(manual.isStuck).toBe(false);

    const disabled = computeNavbarState({
      scrollY: 500,
      stickyEnabled: false,
      initialTopOffset: 20,
      stickyScrollThreshold: 0,
      stickyTopOffset: 12,
      autoBannerOffset: true,
      manualBannerOffset: 0,
      measuredBannerHeight: 40,
    });
    expect(disabled.isStuck).toBe(false);
  });

  it('syncs CSS custom properties and reacts to ResizeObserver banner height changes', () => {
    let currentBannerHeight = 44;
    let currentScrollY = 0;
    const props = new Map<string, string>();
    const resizeCallbacks: Array<() => void> = [];
    const scrollListeners: Array<() => void> = [];

    const headerEl = {
      dataset: {
        stickyEnabled: 'true',
        initialTop: '20',
        stickyThreshold: '0',
        stickyTop: '12',
        autoBannerOffset: 'true',
        manualBannerOffset: '0',
        headerStuck: 'false',
      } as Record<string, string>,
      getBoundingClientRect: () => ({ height: 64 }),
      addEventListener: vi.fn(),
    };

    const bannerEl = {
      getBoundingClientRect: () => ({ height: currentBannerHeight }),
    };

    class MockResizeObserver {
      constructor(cb: () => void) {
        resizeCallbacks.push(cb);
      }
      observe() {}
      disconnect() {}
    }

    (globalThis as Record<string, unknown>).ResizeObserver = MockResizeObserver;
    (globalThis as Record<string, unknown>).document = {
      documentElement: {
        style: {
          setProperty: (k: string, v: string) => props.set(k, v),
        },
      },
      querySelector: (sel: string) => {
        if (sel === 'header[data-site-header]') return headerEl;
        if (sel === '[data-site-top-banner-region]') return bannerEl;
        return null;
      },
      addEventListener: vi.fn(),
    };
    (globalThis as Record<string, unknown>).window = {
      get scrollY() {
        return currentScrollY;
      },
      addEventListener: (ev: string, cb: () => void) => {
        if (ev === 'lenis:scroll') scrollListeners.push(cb);
      },
      requestAnimationFrame: (cb: () => void) => {
        cb();
        return 1;
      },
      cancelAnimationFrame: vi.fn(),
    };

    setupSiteNavbar();

    expect(props.get('--top-banner-height')).toBe('44px');
    expect(props.get('--navbar-initial-top')).toBe('20px');
    expect(props.get('--navbar-sticky-top')).toBe('12px');
    expect(headerEl.dataset.headerStuck).toBe('false');

    // Scroll to 30px (banner still partially visible -> not stuck yet)
    currentScrollY = 30;
    scrollListeners[0]?.();
    expect(headerEl.dataset.headerStuck).toBe('false');

    // Scroll to 52px (44 + 20 - 12 = 52 -> now stuck)
    currentScrollY = 52;
    scrollListeners[0]?.();
    expect(headerEl.dataset.headerStuck).toBe('true');

    // Banner dismissed while scrolled back to 20px -> ResizeObserver drops height to 0
    currentBannerHeight = 0;
    currentScrollY = 20;
    resizeCallbacks[0]?.();
    expect(props.get('--top-banner-height')).toBe('0px');
    expect(headerEl.dataset.headerStuck).toBe('true');
  });

  it('enforces RTL logical discipline and semantic tokens in SiteTopBanner.astro', () => {
    const src = fs.readFileSync(
      path.join(rootDir, 'src/components/SiteTopBanner.astro'),
      'utf-8'
    );
    const forbiddenPhysical =
      /\b(?:ml-|mr-|pl-|pr-|left-|right-|text-left|text-right|border-l-|border-r-|rounded-l-|rounded-r-)/;
    expect(src).not.toMatch(forbiddenPhysical);
    expect(src).not.toMatch(/<svg[\s>]/i);
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(/<h1[\s>]/i);
    expect(src).toContain('resolveComponentLocale');
    expect(src).toContain('<IconButton');
    expect(src).toContain('app:top-banner-change');
    expect(src).toContain('--site-banner-height:');
    expect(src).toContain('site_top_banner_notice_message');
    expect(src).toContain("banner.dismissible ? 'true' : undefined");
  });
});
