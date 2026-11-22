# ChronoTrig v6.1.0 — Complete English Guide & Practical Examples

> **Zero-Dependency CSS Scroll Engine & Synchronous Keyframe Timeline Orchestrator**  
> Built on the lightweight, CSS-first foundation of Trig.js v4.2.1 — re-engineered in **v6.1.0** for **zero layout reads per scroll frame**, **zero global `:root` style recalculations**, **zero-cost reveal fast paths**, **synchronous Lenis integration**, **RTL horizontal tracks**, **sub-pixel precision**, and **custom scroll roots**.

🌐 **Language / زبان**: **English (`GUIDE.md`)** · [فارسی (`GUIDE.fa.md`)](./GUIDE.fa.md)

---

## Table of Contents
1. [v6.1 Architecture: Zero-Cost Reveals & Cached Geometry Math](#1-v61-architecture-zero-cost-reveals--cached-geometry-math)
2. [Installation & Setup (HTML, ESM, Lenis Sync, TypeScript, React)](#2-installation--setup-html-esm-lenis-sync-typescript-react)
3. [Everyday Animations, Tight Trigger Margins & `data-trig-once`](#3-everyday-animations-tight-trigger-margins--data-trig-once)
4. [Ready-Made CSS Presets (`trig-animations.css`)](#4-ready-made-css-presets-trig-animationscss)
5. [Trig.js Parity (Sub-Pixel CSS Variables, 10-Step Selectors, Body Classes)](#5-trigjs-parity-sub-pixel-css-variables-10-step-selectors-body-classes)
6. [Pinned / Sticky Sections, Horizontal Tracks & RTL Mirroring](#6-pinned--sticky-sections-horizontal-tracks--rtl-mirroring)
7. [Harmonic Staggers (`data-trig-stagger` & Scrub Opt-In)](#7-harmonic-staggers-data-trig-stagger--scrub-opt-in)
8. [Multi-Step Keyframe Timelines (`data-trig-timeline`)](#8-multi-step-keyframe-timelines-data-trig-timeline)
9. [Custom Scroll Containers (`root`) & Automatic DOM Scanning (`autoScan`)](#9-custom-scroll-containers-root--automatic-dom-scanning-autoscan)
10. [Mobile, Tablet & Accessibility (`prefers-reduced-motion`)](#10-mobile-tablet--accessibility-prefers-reduced-motion)
11. [Complete API Reference (Options, Attributes, CSS Vars, Methods)](#11-complete-api-reference)
12. [10 Production-Ready Practical Recipes](#12-10-production-ready-practical-recipes)
13. [Troubleshooting & Best Practices](#13-troubleshooting--best-practices)

---

## 1. v6.1 Architecture: Zero-Cost Reveals & Cached Geometry Math

Traditional scroll libraries mutate inline styles synchronously or measure `getBoundingClientRect()` on every element every frame, causing layout thrashing and battery drain. **ChronoTrig v6.1** runs on a three-tier zero-waste pipeline:

1. **Zero-Cost Reveal Fast Path**:
   Plain `[data-trig]` reveal elements and default entrance staggers **never enter the scroll loop**. They are managed exclusively by pooled `IntersectionObserver`s (`rootMargin: "0px 0px -8% 0px"`), consuming **0% rAF CPU** and **0 layout reads** while scrolling.
2. **Cached Geometry & Arithmetic Scroll Math (`0 reads / frame`)**:
   Document/root-relative coordinates (`absTop`, `height`, track `maxTranslate`) are bulk-measured on `scan()`, `refresh()`, window `load`, and `ResizeObserver` ticks. Steady-state scroll frames compute `absTop - scrollY` via pure arithmetic — **0 `getBoundingClientRect()` calls per frame**. Elements whose size or height changes dynamically on scroll can opt in via `data-trig-dynamic="true"` (or `measureOnScroll: true`).
3. **Synchronous External Scroller Sync (`sync(scrollY?)`)**:
   Set `externalScroll: true` and invoke `engine.sync(scroll)` inside Lenis or GSAP tickers to lock CSS variable emission to the exact same frame with zero extra `rAF` scheduling.
4. **Selective Sub-Pixel Emission & GPU Hygiene**:
   ChronoTrig writes only the CSS variables each element opted into (`--trig`, `--trig-px`, `--trig-deg`), formatted to configurable sub-pixel float precision (`precision: 2`) alongside 10-step integer attributes (`data-trig-val`). Dynamic `will-change` resets to `auto` on `animationend`/`transitionend`.
5. **100% Drop-In Trig.js v4.2.1 & ChronoTrig v5 Parity**:
   Every classic attribute, CSS variable, body milestone class, and legacy helper (`trigInit()`, `trigScroll()`, `trigWindowHeight()`) works cleanly out of the box.

---

## 2. Installation & Setup (HTML, ESM, Lenis Sync, TypeScript, React)

| File | Size | Purpose |
| :--- | :--- | :--- |
| `chronotrig.min.js` | **24.0 KB min (7.8 KB gzip)** | Standalone zero-dependency browser bundle loaded globally by `BaseLayout.astro` (sets `window.chronoTrig`, `window.trig`, `window.ChronoTrig`). |
| `src/styles/chronotrig.css` | Starter Stylesheet | Calibrated `1.2s` / `56px` preset suite (`0.55s` in upstream standalone), hover-safe `.trig-stagger-item`, and reduced-motion/print fallbacks. |

### Option A: Vanilla HTML `<script>` Drop-In
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Website</title>
  <link rel="stylesheet" href="./trig-animations.css" />
</head>
<body>
  <h1 class="blurIn" data-trig data-trig-once="true">Fast & Modern Scroll Motion</h1>

  <script src="./chronotrig.min.js"></script>
</body>
</html>
```

### Option B: ES Module with Synchronous Lenis Driving
> **Starter Note:** In this Astro starter, `BaseLayout.astro` loads `/chronotrig.min.js` globally as `window.chronoTrig`, and `src/scripts/lenis.ts` drives `window.chronoTrig.setExternalScroll(true)` + `window.chronoTrig.sync(instance.scroll)` automatically (no separate `chronotrig.esm.js` is shipped in `public/`). The standalone ESM example below applies when bundling `chronotrig.esm.js` directly in external projects:
```javascript
import Lenis from 'lenis';
import { ChronoTrig } from './chronotrig.esm.js';

const engine = new ChronoTrig({
  autoInit: true,
  externalScroll: true,            // Let Lenis drive sync() synchronously
  precision: 2,                    // Sub-pixel CSS variable precision
  rootMargin: '0px 0px -8% 0px',   // Trigger cleanly inside viewport
  mobileBehavior: 'lightweight',   // 'disable' | 'lightweight' | 'full'
  respectReducedMotion: true,
});

const lenis = new Lenis();
lenis.on('scroll', ({ scroll }) => engine.sync(scroll));

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
```
> **Why Lenis instead of transform-based smooth scrollers?** Lenis drives native `window.scrollY`, so CSS `position: sticky` inside `[data-trig-pin]` works natively with zero wrapper hacks (`~3–5 KB gzip`, MIT). Transform-hijacking smoothers (such as `ScrollSmoother`) break native `position: sticky` inside fixed wrappers.

### Option C: React / Next.js Hooks (`useTrig.ts`)
```tsx
import { useScrollProgress, useTrigSubscribe, useTrigPin, useTrigTimeline, useTrigScan } from './lib/useTrig';

function ProductSection({ items }: { items: string[] }) {
  // Automatically re-scan DOM when dynamic React lists render/change
  useTrigScan([items.length]);

  // Zero-re-render 120fps callback hook for refs/canvas/Lenis
  useTrigSubscribe(({ scrollY, direction }) => {
    // Update imperative DOM/WebGL uniforms without React re-renders
  });

  const { progress, isMobile } = useScrollProgress();
  const { containerRef, pinProgress, phase } = useTrigPin();

  return (
    <div ref={containerRef} data-trig-pin data-trig-pin-distance="250vh">
      ...
    </div>
  );
}
```

---

## 3. Everyday Animations, Tight Trigger Margins & `data-trig-once`

ChronoTrig v6.1 uses a tightened default viewport margin (`"0px 0px -8% 0px"`) so below-the-fold elements reveal only once they actually cross cleanly into view rather than pre-firing prematurely off-screen. You can override margins per element (`data-trig-root-margin="0px 0px -20% 0px"` and `data-trig-threshold="0.25"`)—observers are pooled automatically.

Add `data-trig` + `data-trig-once="true"` for standard reveals:
```html
<section class="fadeInUpSm" data-trig data-trig-once="true">
  <h2>Appears once cleanly, cleans up will-change, then unobserves</h2>
</section>
```

---

## 4. Ready-Made CSS Presets (`trig-animations.css`)

Customize timing globally via CSS custom properties on `:root` (`src/styles/chronotrig.css` configures `1.2s` by default in this starter):
```css
:root {
  --trig-duration: 1.2s;
  --trig-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --trig-reveal-delay: 0ms;
}
```

* **Modern Reveals**: `.fadeInUpSm`, `.blurIn` (falls back to `.fadeInUpSm` on mobile lightweight mode), `.clipUp`, `.clipStart` (RTL-native) / `.clipLeft`, `.trig-stagger-item` (automatically receives `.trig-stagger-settled` after reveal so Tailwind hover transitions stay instant).
* **Progressive Native CSS View Timeline**: `.trig-view-reveal` uses `@supports (animation-timeline: view())` for compositor-native reveals without JS.
* **Classic Presets**: `.fadeIn`, `.fadeInUp`, `.fadeInDown`, `.fadeInLeft`, `.fadeInRight`, `.zoomIn`, `.zoomInUp`, `.zoomInDown`, `.zoomOut`, `.flipInX`, `.flipInY`, `.rotateIn`, `.rotateInDownLeft`, `.rotateInDownRight`, `.bounceIn`, `.bounceInUp`, `.bounceInDown`, `.slideInUp`, `.slideInDown`, `.slideInLeft`, `.slideInRight`, `.trig-directional`.
* **Utilities**: `.trig-delay-100`..`1000`, `.trig-duration-300`..`2000`, `.trig-ease-smooth|spring|bounce|in-out`, `.trig-reactive-x|x-reverse|y|rotate|px`.

---

## 5. Trig.js Parity (Sub-Pixel CSS Variables, 10-Step Selectors, Body Classes)

* **Selective Sub-Pixel Variables**: Enable only what you animate (`data-trig-var="true"`, `data-trig-pixels="true"`, or `data-trig-degrees="true"`). v6.1 formats continuous values to `precision` decimals (default `2`, e.g., `12.45px`) for jitter-free parallax.
* **10-Step Attribute Selectors**: `data-trig-val`, `data-trig-var`, `data-trig-pixels`, and `data-trig-degrees` continue to update in crisp integer increments of `10` (`0, 10, 20... 100`).
* **Global Scope**: `data-trig-global="true"` writes `--trig-[id]` onto `:root`.
* **Body Milestones**: `trig-scroll-down`, `trig-scroll-up`, `trig-scroll-top`, `trig-scroll-25`, `trig-scroll-50`, `trig-scroll-75`, `trig-scroll-bottom`.
* **Opt-In `:root` Scroll Variables**: `--scroll-progress` and `--scroll-y` on `:root` (`document.documentElement`) are **off by default** (`rootScrollVars: false`) because mutating inherited CSS variables on `:root` forces full-DOM style recalculations on large pages. Opt in only if needed via `<html data-trig-root-vars>` or `new ChronoTrig({ rootScrollVars: true })`, or drive progress bars with `engine.subscribe(({ progress }) => ...)` + `transform: scaleX(...)` for zero `:root` recalcs.

---

## 6. Pinned / Sticky Sections, Horizontal Tracks & RTL Mirroring

> **Critical CSS Rule**: Never put `overflow-x: hidden` on `body` or parent containers around `[data-trig-pin]`, as it breaks `position: sticky`. Always use `overflow-x: clip;` instead.

### Vertical Pinned Track
```html
<section data-trig-pin data-trig-pin-distance="300vh" data-trig-pin-media="(min-width: 1024px)">
  <div style="position: sticky; top: 0; height: 100vh; display: grid; place-items: center; overflow: hidden;">
    <div style="transform: scale(calc(0.85 + var(--trig-pin-t, 0) * 0.35)) rotate(var(--trig-pin-deg, 0deg));">
      Pinned 3D Subject
    </div>
  </div>
</section>
```

### Horizontal Pinned Track with Automatic RTL Support
When `dir="rtl"` is active on `<html>`, an ancestor container, or the pinned section itself, ChronoTrig v6.1 automatically mirrors horizontal track motion smoothly to `+maxTranslate` (positive X) instead of `-maxTranslate`. Override per track with `data-trig-pin-rtl="true" | "false" | "auto"`.

```html
<section
  dir="rtl"
  data-trig-pin
  data-trig-pin-distance="350vh"
  data-trig-pin-horizontal="true"
  data-trig-pin-rtl="auto"
  data-trig-disable-mobile="true"
>
  <div style="position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; align-items: center;">
    <div data-trig-pin-track style="display: flex; gap: 32px; width: max-content; padding: 0 48px; will-change: transform;">
      <article class="card">فصل ۱</article>
      <article class="card">فصل ۲</article>
      <article class="card">فصل ۳</article>
    </div>
  </div>
</section>
```

---

## 7. Harmonic Staggers (`data-trig-stagger` & Scrub Opt-In)

* **Default (Entrance Mode)**: Triggers immediately upon viewport intersection with `0` scroll-loop overhead (works reliably even near the bottom of the page!). Once each child finishes its CSS transition/animation, `.trig-stagger-settled` is added so `transition-delay` resets to `0s` and hover effects remain instant.
* **Opt-In Scrubbed Mode (`data-trig-stagger-scrub="true"`)**: Continuously computes `--child-progress` (`0`..`1`) and `--child-percent` across scroll progress when you want scroll-tied progressive child reveals.

```html
<div data-trig-stagger data-trig-stagger-mode="wave" data-trig-stagger-delay="0.08" data-trig-once="true">
  <div class="trig-stagger-item">Feature 1</div>
  <div class="trig-stagger-item">Feature 2</div>
  <div class="trig-stagger-item">Feature 3</div>
</div>
```

---

## 8. Multi-Step Keyframe Timelines (`data-trig-timeline`)

Define arbitrary percentage waypoints (`at`: `0`–`100`) with `x`, `xUnit` (`px|%|vw`), `y`, `yUnit` (`px|%|vh`), `z`, `scale`, `rotate`, `rotateX`, `rotateY`, `opacity`, `blur`, and `ease`. Inside `[data-trig-pin]`, timelines sync automatically to `--trig-pin-t` and fall back gracefully on mobile if the pin disables.

---

## 9. Custom Scroll Containers (`root`) & Automatic DOM Scanning (`autoScan`)

Scrollable dashboards, modals, or split panes can use a dedicated container instead of `window`:
```javascript
const scrollerEl = document.getElementById('dashboard-scroll-pane');
const engine = new ChronoTrig({
  autoInit: true,
  root: scrollerEl,
  autoScan: true, // Debounced MutationObserver auto-scans added/removed nodes
});

// Or switch roots later:
engine.setRoot(anotherScrollPane);
```

---

## 10. Mobile, Tablet & Accessibility (`prefers-reduced-motion`)

| Option | Effect on Mobile / Tablet |
| :--- | :--- |
| **`'lightweight'`** *(Default)* | 2D GPU transforms only (`translate3d`, `scale`, `rotate`), strips `blur` & 3D `rotateX/Y`, disables inertia lag (`lerp: 0`), unpins scrolljacks, clamps stagger delays `<= 0.04s`. |
| **`'disable'`** | **0% CPU** — stops scroll/RAF processing, collapses pins to `height: auto`, reveals all animated elements cleanly in natural resting state. |
| **`'full'`** | Keeps full 3D & pinned behavior across all devices. |

---

## 11. Complete API Reference

### Constructor Options (`ChronoTrigOptions`)
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `lerp` | `number` | `0` | Scroll smoothing (`0` = instant, `0.04`–`0.1` = inertia). |
| `root` | `HTMLElement \| null` | `null` | Custom scroll container (`null` = `window`). |
| `rootMargin` | `string` | `'0px 0px -8% 0px'` | Default `IntersectionObserver` margin. |
| `threshold` | `number \| number[]` | `[0, 0.1, 0.5, 1]` | Default `IntersectionObserver` threshold(s). |
| `externalScroll` | `boolean` | `false` | Disables internal scroll listener & forces `lerp: 0` when driven by `sync()`. |
| `measureOnScroll` | `boolean` | `false` | Opt-in legacy per-frame `getBoundingClientRect()` globally. |
| `rootScrollVars` | `boolean` | `false` | Opt-in `:root` `--scroll-progress` & `--scroll-y` writes (or `<html data-trig-root-vars>`). |
| `precision` | `number` | `2` | Decimal places for continuous CSS variables (`0`–`4`). |
| `autoScan` | `boolean` | `false` | Enables debounced `MutationObserver` DOM scanning. |
| `mobileBehavior` | `'disable' \| 'lightweight' \| 'full'` | `'lightweight'` | Mobile optimization strategy. |
| `mobileBreakpoint` | `number` | `1024` | Viewport width breakpoint in `px`. |
| `disableBlurOnMobile` | `boolean` | `true` | Removes `filter: blur()` on mobile/tablet. |
| `disable3DOnMobile` | `boolean` | `true` | Flattens `z`, `rotateX`, `rotateY` to 2D on mobile/tablet. |
| `respectReducedMotion` | `boolean` | `true` | Respects OS `prefers-reduced-motion: reduce`. |
| `debugMarkers` | `boolean` | `false` | Renders floating telemetry overlay HUD. |
| `autoInit` | `boolean` | `false` | Calls `init()` automatically on construction. |

### Public Methods
* `engine.init()` — Initializes pooled `IntersectionObserver`s, `ResizeObserver`, optional `MutationObserver`, and scans DOM.
* `engine.scan()` — Re-indexes DOM elements and bulk-measures cached geometry.
* `engine.sync(scrollY?)` — Runs an immediate frame-locked update synchronously (ideal for Lenis).
* `engine.setExternalScroll(enabled)` / `engine.isExternalScroll()` — Toggles external scroller mode (`Lenis`) vs. native scroll listener at runtime.
* `engine.refresh()` — Re-measures viewport dimensions, horizontal tracks, scans DOM, and syncs immediately.
* `engine.setRoot(root)` — Switches custom scroll container dynamically.
* `engine.getFrameMetrics()` — Returns `{ lastUpdateMs, layoutReads, styleWrites, revealCount, activeScrubbers, activePins, activeScrubStaggers, activeTimelines }`.
* `engine.subscribe(cb)` — Subscribe `{ scrollY, direction, progress, isMobile }` updates; returns `unsubscribe()`.
* `engine.setLerp(val)` / `engine.getLerp()`
* `engine.setMobileBehavior(mode)` / `engine.getMobileBehavior()`
* `engine.setSimulatedMobile(bool | null)` / `engine.isMobile()` / `engine.isDisabled()`
* `engine.setDebugMarkers(bool)` / `engine.isDebugMarkers()`
* `engine.getLastUpdateMs()` — Returns execution time (in ms) of last update.
* `engine.applyTimelineInterpolation(el, steps, progressPercent, directOverride?)`
* `engine.destroy()` — Detaches listeners, cancels RAF/timers, disconnects all observers cleanly.

---

## 12. 10 Production-Ready Practical Recipes

### Recipe 1: Auto-Hiding Smart Navbar & Global Reading Progress Bar
```css
/* Zero :root style recalc: drive .progress-bar transform: scaleX via chronoTrig.subscribe(),
   OR add data-trig-root-vars to <html> to publish --scroll-progress onto :root */
.progress-bar { position: fixed; top: 0; left: 0; width: 100%; height: 3px; z-index: 60; transform-origin: left; transform: scaleX(0); }
body.trig-scroll-down .navbar { transform: translateY(-100%); }
body.trig-scroll-up .navbar   { transform: translateY(0); }
```

### Recipe 2: Multi-Plane Sub-Pixel Parallax + Rotating Badge
```html
<section class="parallax-stage" data-trig data-trig-pixels="true" data-trig-degrees="true">
  <div class="layer bg-layer"></div>
  <div class="layer badge">360° Badge</div>
</section>
```
```css
.bg-layer { transform: translate3d(0, calc(var(--trig-px, 0px) * -0.25), 0); }
.badge    { transform: rotate(var(--trig-deg, 0deg)); }
```

### Recipe 3: Zero-Cost Reveal-Once Landing Cards
```html
<h2 class="blurIn" data-trig data-trig-once="true">Zero Idle CPU</h2>
<p class="fadeInUpSm trig-delay-100" data-trig data-trig-once="true">Observer-only reveal.</p>
```

### Recipe 4: Synchronous Lenis Driving
```javascript
const engine = new ChronoTrig({ autoInit: true, externalScroll: true });
const lenis = new Lenis();
lenis.on('scroll', ({ scroll }) => engine.sync(scroll));
```

### Recipe 5: Pinned Split-Screen Scrollytelling (Mobile-Safe)
```html
<section data-trig-pin data-trig-pin-distance="280vh" data-trig-pin-media="(min-width: 1024px)">
  <div class="story-column">...</div>
  <div class="sticky-stage">
    <div data-trig-timeline='[{"at":0,"scale":0.85,"opacity":0.4},{"at":50,"scale":1.08,"opacity":1},{"at":100,"scale":0.95,"rotate":8}]'>
      Interactive Diagram
    </div>
  </div>
</section>
```

### Recipe 6: Horizontal RTL-Aware Track + Mobile Touch Carousel
```html
<section dir="rtl" data-trig-pin data-trig-pin-distance="350vh" data-trig-pin-horizontal="true" data-trig-disable-mobile="true">
  <div class="track-viewport"><div data-trig-pin-track class="track-row">...</div></div>
</section>
```

### Recipe 7: Hover-Safe Stagger Grid
```html
<div class="grid" data-trig-stagger data-trig-stagger-mode="wave" data-trig-once="true">
  <div class="trig-stagger-item hover:-translate-y-1 transition-transform">Item 1</div>
  <div class="trig-stagger-item hover:-translate-y-1 transition-transform">Item 2</div>
</div>
```

### Recipe 8: 10-Step Pure CSS Milestone Card
```css
.milestone-card[data-trig-var="30"] { border-color: #64748b; transform: scale(0.98); }
.milestone-card[data-trig-var="60"] { border-color: #38bdf8; transform: scale(1.05); }
.milestone-card[data-trig-var="90"] { border-color: #34d399; transform: scale(1); }
```

### Recipe 9: Custom Scroll Container (`root`) with `autoScan`
```javascript
const paneEngine = new ChronoTrig({
  autoInit: true,
  root: document.querySelector('#modal-scroller'),
  autoScan: true,
});
```

### Recipe 10: Dynamic Element Opt-In (`data-trig-dynamic="true"`)
```html
<!-- Accordion/dynamic layout whose height changes mid-scroll -->
<div class="accordion-panel" data-trig data-trig-var="true" data-trig-dynamic="true">...</div>
```

---

## 13. Troubleshooting & Best Practices

1. **`position: sticky` isn't sticking inside `[data-trig-pin]`**: Ensure no ancestor up to `<body>` uses `overflow: hidden` or `overflow-x: hidden`. Use `overflow-x: clip`.
2. **Dynamic layout shifts below an expanding accordion**: Add `data-trig-dynamic="true"` on scrubbers below the accordion or call `chronoTrig.refresh()` after toggling.
3. **Large documentation / component showcase pages (5,000+ DOM nodes)**: Keep `rootScrollVars: false` (default) so ChronoTrig never triggers full-DOM `:root` style recalculations on scroll, and add `content-visibility: auto; contain-intrinsic-size: auto 600px;` to heavy off-screen sections/tables/code blocks to skip off-screen layout & paint.
4. **Inspect runtime performance**: Call `chronoTrig.getFrameMetrics()` in DevTools to verify `layoutReads === 0` and confirm reveal elements stay out of `activeScrubbers`.

---

## License
MIT License.
