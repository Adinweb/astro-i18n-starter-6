# ChronoTrig v5.2.0 — Complete English Guide & Practical Examples

> **Zero-Dependency CSS Scroll Engine & Modern Keyframe Timeline Orchestrator**  
> Built on the lightweight, CSS-first foundation of Trig.js v4.2.1 — engineered for everyday website animations (`data-trig-once`, reveal presets, sticky navbars, parallax) and modern scrollytelling (**Pinned Sections**, **Horizontal Tracks**, **Harmonic Staggers**, and **Multi-Step Keyframe Timelines**).

🌐 **Language / زبان**: **English (`GUIDE.md`)** · [فارسی (`GUIDE.fa.md`)](./GUIDE.fa.md)

---

## Table of Contents
1. [Core Philosophy & Performance Architecture](#1-core-philosophy--performance-architecture)
2. [Installation & Setup (HTML, ESM, TypeScript, React)](#2-installation--setup-html-esm-typescript-react)
3. [Everyday Animations & `data-trig-once`](#3-everyday-animations--data-trig-once)
4. [Ready-Made CSS Presets (`trig-animations.css`)](#4-ready-made-css-presets-trig-animationscss)
5. [Default Trig.js Features (Variables, 10-Step Selectors, Body Classes)](#5-default-trigjs-features-variables-10-step-selectors-body-classes)
6. [Pinned / Sticky Sections & Horizontal Tracks](#6-pinned--sticky-sections--horizontal-tracks)
7. [Harmonic Stagger Cascades (`data-trig-stagger`)](#7-harmonic-stagger-cascades-data-trig-stagger)
8. [Multi-Step Keyframe Timelines (`data-trig-timeline`)](#8-multi-step-keyframe-timelines-data-trig-timeline)
9. [Mobile, Tablet & Accessibility (`prefers-reduced-motion`)](#9-mobile-tablet--accessibility-prefers-reduced-motion)
10. [Complete API Reference (Options, Attributes, CSS Vars, Methods)](#10-complete-api-reference)
11. [9 Production-Ready Practical Recipes](#11-9-production-ready-practical-recipes)
12. [Troubleshooting & Best Practices](#12-troubleshooting--best-practices)

---

## 1. Core Philosophy & Performance Architecture

Traditional scroll libraries mutate inline styles synchronously or run heavy JavaScript timelines on every pixel scrolled, which often triggers layout reflows and mobile battery drain. **ChronoTrig** acts as an ultra-lean FastDOM bridge to the browser's CSS GPU compositor:

1. **FastDOM 2-Pass Loop**:
   * **Pass 1 (Measure)**: Reads all `getBoundingClientRect()` geometry in one contiguous batch without touching styles.
   * **Pass 2 (Mutate)**: Writes CSS variables and GPU transforms in one batch — **zero layout thrashing**.
2. **IntersectionObserver Gating**: Off-screen elements consume **0% CPU** during scroll.
3. **WeakMap Caching & Dirty Checking**: Parsed JSON timelines, stagger children, and attribute configs are cached once in `WeakMap`. Unchanged integer/rounded values never touch the DOM.
4. **Reveal-Once Unobserve (`data-trig-once="true"`)**: Standard entrance reveals trigger once, clean up `will-change`, and automatically unobserve so scrolling remains silky smooth on long pages.
5. **100% Drop-In Trig.js v4.2.1 Parity**: Every classic attribute, CSS variable, body milestone class, and legacy helper (`trigInit()`, `trigScroll()`, `trigWindowHeight()`) works out of the box.

---

## 2. Installation & Setup (HTML, ESM, TypeScript, React)

| File | Size | Purpose |
| :--- | :--- | :--- |
| `chronotrig.min.js` | **16.7 KB min (5.6 KB gzip)** | Standalone zero-dependency browser bundle (sets `window.chronoTrig`, `window.trig`, `window.ChronoTrig`). |
| `chronotrig.esm.js` | **16.8 KB min (5.6 KB gzip)** | Modern ES Module for Vite, Next.js, Rollup, or Webpack. |
| `trig-animations.css` | **11.6 KB** | Optional ready-made classic + modern reveal animations, staggers, delays, and reduced-motion fallbacks. |
| `chronotrig.d.ts` | **2.1 KB** | Full TypeScript definitions. |

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

### Option B: ES Module with Custom Configuration
```javascript
import { ChronoTrig } from './chronotrig.esm.js';

const engine = new ChronoTrig({
  lerp: 0.08,                     // 0 = direct 1:1 tracking, 0.08 = silky desktop inertia
  mobileBehavior: 'lightweight',  // 'disable' | 'lightweight' | 'full'
  mobileBreakpoint: 1024,         // Adaptive threshold in px
  disableBlurOnMobile: true,      // Strip expensive blur filters on phones/tablets
  disable3DOnMobile: true,        // Flatten rotateX/Y/z on phones/tablets
  respectReducedMotion: true,     // Honor OS reduced-motion preference live
  debugMarkers: false,            // Floating HUD for development
});
```

### Option C: React / Next.js Hooks (`useTrig.ts`)
```tsx
import { useScrollProgress, useTrigPin, useTrigTimeline, useTrigScan } from './lib/useTrig';

function ProductSection({ items }: { items: string[] }) {
  // Automatically re-scan DOM when dynamic React lists render/change
  useTrigScan([items.length]);

  const { progress, direction, isMobile } = useScrollProgress();
  const { containerRef, pinProgress, phase } = useTrigPin();

  return (
    <div ref={containerRef} data-trig-pin data-trig-pin-distance="250vh">
      ...
    </div>
  );
}
```

---

## 3. Everyday Animations & `data-trig-once`

On standard websites (landing pages, SaaS sites, portfolios, blogs), most sections should animate **once** when the user scrolls to them—without resetting or re-running every time the user scrolls up and down.

Add `data-trig` + `data-trig-once="true"`:
```html
<section class="fadeInUpSm" data-trig data-trig-once="true">
  <h2>Appears once cleanly, then unobserves for 0% scroll overhead</h2>
</section>
```

* Without `data-trig-once="true"`, ChronoTrig behaves like classic Trig.js: `.trig` is added on enter and removed on exit so the animation replays when re-entering.
* `data-trig-once="true"` also works on **`[data-trig-stagger]`** containers!

---

## 4. Ready-Made CSS Presets (`trig-animations.css`)

Include `trig-animations.css` and combine **1 Animation Class** + optional **Delay / Duration / Easing** utilities:

### Modern Everyday Reveals
* `.fadeInUpSm` — Subtle 18px upward fade (ideal for SaaS copy & cards)
* `.blurIn` — Modern blur-to-sharp glass entrance (automatically falls back to crisp `.fadeInUpSm` on mobile lightweight mode!)
* `.clipUp` — Editorial bottom-to-top clip-path mask wipe
* `.clipLeft` — Editorial left-to-right clip-path reveal
* `.trig-stagger-item` — Built-in child reveal class for `[data-trig-stagger]` containers

### Classic Trig.js Presets
* **Fades**: `.fadeIn`, `.fadeInUp`, `.fadeInDown`, `.fadeInLeft`, `.fadeInRight`
* **Zooms**: `.zoomIn`, `.zoomInUp`, `.zoomInDown`, `.zoomOut`
* **3D Flips & Rotates**: `.flipInX`, `.flipInY`, `.rotateIn`, `.rotateInDownLeft`, `.rotateInDownRight`
* **Bounces & Slides**: `.bounceIn`, `.bounceInUp`, `.bounceInDown`, `.slideInUp`, `.slideInDown`, `.slideInLeft`, `.slideInRight`
* **Direction-Aware**: `.trig-directional` (plays `fadeInUp` when scrolling down, `fadeInDown` when scrolling up)

### Utility Modifiers & Reactive Shortcuts
* **Delays**: `.trig-delay-100`, `.trig-delay-200`, `.trig-delay-300`, `.trig-delay-400`, `.trig-delay-500`, `.trig-delay-600`, `.trig-delay-800`, `.trig-delay-1000`
* **Durations**: `.trig-duration-300`, `.trig-duration-500`, `.trig-duration-700`, `.trig-duration-1000`, `.trig-duration-1500`, `.trig-duration-2000`
* **Easings**: `.trig-ease-smooth`, `.trig-ease-spring`, `.trig-ease-bounce`, `.trig-ease-in-out`
* **Continuous Reactive Helpers**: `.trig-reactive-x`, `.trig-reactive-x-reverse`, `.trig-reactive-y`, `.trig-reactive-rotate`, `.trig-reactive-px`

```html
<div class="blurIn trig-delay-200 trig-duration-700" data-trig data-trig-once="true">Hero Subtitle</div>
<div class="zoomIn trig-ease-spring" data-trig data-trig-once="true">Spring CTA Card</div>
<div class="clipUp trig-delay-300" data-trig data-trig-once="true">Editorial Headline</div>
```

---

## 5. Default Trig.js Features (Variables, 10-Step Selectors, Body Classes)

ChronoTrig retains 100% compatibility with Trig.js v4.2.1:

### A. Continuous Real-Time CSS Variables
Enable with `data-trig-var="true"`, `data-trig-pixels="true"`, or `data-trig-degrees="true"`:
* `--trig`, `--trig-reverse`, `--trig-progress` (`-100%` to `100%`, and `0.000` to `1.000`)
* `--trig-px`, `--trig-px-reverse` (pixel offset from center)
* `--trig-deg`, `--trig-deg-reverse` (`0deg` to `360deg`)

```html
<div class="orb" data-trig data-trig-degrees="true" data-trig-pixels="true"></div>
```
```css
.orb {
  transform: translate3d(0, calc(var(--trig-px, 0px) * -0.4), 0) rotate(var(--trig-deg, 0deg));
}
```

### B. 10-Step Attribute Selectors
ChronoTrig rounds `data-trig-val`, `data-trig-var`, `data-trig-pixels`, and `data-trig-degrees` in increments of `10`, allowing pure CSS state checkpoints:
```css
.badge[data-trig-var="20"]  { opacity: 0.4; transform: scale(0.95); }
.badge[data-trig-var="60"]  { opacity: 1;   transform: scale(1.08); }
.badge[data-trig-var="100"] { opacity: 1;   transform: scale(1); }
```

### C. Global `:root` Scope & Calculation Modifiers
```html
<section
  id="heroSection"
  data-trig
  data-trig-var="true"
  data-trig-pixels="true"
  data-trig-global="true"
  data-trig-offset="100"
  data-trig-negativeOffset="0"
  data-trig-min="-50"
  data-trig-max="100"
  data-trig-height="200"
></section>
```
When `data-trig-global="true"` is used with `id="heroSection"`, ChronoTrig writes `--trig-heroSection`, `--trig-heroSection-px`, `--trig-heroSection-deg` directly onto `:root`, so any distant element (e.g., a fixed header or background glow) can react to it.

### D. Document Body Milestone Classes & `:root` Progress
* `trig-scroll-down` / `trig-scroll-up`
* `trig-scroll-top` (`scrollY <= 10px`) / `trig-scroll-bottom` (`>= 98%`)
* `trig-scroll-25`, `trig-scroll-50`, `trig-scroll-75`
* `:root` variables: `--scroll-progress` (`0.0%`–`100.0%`), `--scroll-y` (`px`)

### E. Legacy Global Functions
`window.trig`, `window.trigInit()`, `window.trigScroll()`, `window.trigWindowHeight()`.

---

## 6. Pinned / Sticky Sections & Horizontal Tracks

A **Pinned Section** keeps a child sticky stage fixed inside the viewport across a tall scroll track while mapping progress into `--trig-pin-progress` (`0%`–`100%`), `--trig-pin-t` (`0.0000`–`1.0000`), `--trig-pin-deg`, `--trig-pin-px`, and `data-pin-phase="before|pinned|after"`.

> **Critical CSS Rule**: Never put `overflow-x: hidden` on `body` or parent containers around `[data-trig-pin]`, as it breaks `position: sticky`. Always use `overflow-x: clip;` instead.

### Automatic Distance & Responsive Media Rules
* Setting `data-trig-pin-distance="300vh"` applies `height: 300vh` on desktop and automatically resets it to `height: auto` when pinning is disabled on mobile.
* Use `data-trig-disable-mobile="true"` or `data-trig-pin-media="(min-width: 1024px)"`.

```html
<section data-trig-pin data-trig-pin-distance="300vh" data-trig-pin-media="(min-width: 1024px)">
  <div style="position: sticky; top: 0; height: 100vh; display: grid; place-items: center; overflow: hidden;">
    <div style="transform: scale(calc(0.85 + var(--trig-pin-t, 0) * 0.35)) rotate(var(--trig-pin-deg, 0deg));">
      Pinned 3D Subject
    </div>
  </div>
</section>
```

### Horizontal Pinned Track (`data-trig-pin-horizontal="true"`)
```html
<section
  data-trig-pin
  data-trig-pin-distance="350vh"
  data-trig-pin-horizontal="true"
  data-trig-disable-mobile="true"
>
  <div style="position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; align-items: center;">
    <div data-trig-pin-track style="display: flex; gap: 32px; width: max-content; padding: 0 48px; will-change: transform;">
      <article class="card">Chapter 1</article>
      <article class="card">Chapter 2</article>
      <article class="card">Chapter 3</article>
      <article class="card">Chapter 4</article>
    </div>
  </div>
</section>
```

---

## 7. Harmonic Stagger Cascades (`data-trig-stagger`)

Wrap cards, list items, or words in `[data-trig-stagger]`. ChronoTrig writes `--stagger-index`, `--stagger-delay`, `--stagger-total`, `--child-progress`, `--child-percent`, and toggles `.trig-stagger-active`.

* **Modes (`data-trig-stagger-mode`)**:
  * `linear`: `0 -> 1 -> 2 -> ...`
  * `wave`: Sine curve across the group
  * `center`: Radiates outward from the middle item
  * `reverse`: Last item triggers first

```html
<div data-trig-stagger data-trig-stagger-mode="wave" data-trig-stagger-delay="0.08" data-trig-once="true">
  <div class="trig-stagger-item">Feature 1</div>
  <div class="trig-stagger-item">Feature 2</div>
  <div class="trig-stagger-item">Feature 3</div>
  <div class="trig-stagger-item">Feature 4</div>
</div>
```

> By default ChronoTrig targets `[data-trig-stagger-item], :scope > *`. Add `.trig-stagger-item` (from `trig-animations.css`) for instant zero-CSS cascades, or write custom transitions using `transition-delay: var(--stagger-delay)`.

---

## 8. Multi-Step Keyframe Timelines (`data-trig-timeline`)

Animate across multiple checkpoints (`at`: `0`–`100`) with smooth easing interpolation:
* **Supported Step Keys**: `at`, `x`, `xUnit` (`'px'|'%'|'vw'`), `y`, `yUnit` (`'px'|'%'|'vh'`), `z`, `scale`, `rotate`, `rotateX`, `rotateY`, `opacity`, `blur`, `ease` (`'linear'|'ease'|'easeIn'|'easeOut'|'easeInOut'`).
* Set `data-trig-direct="false"` if you only want CSS vars (`--trig-x`, `--trig-y`, `--trig-scale`, `--trig-rotate`, `--trig-opacity`) updated without mutating inline `style.transform`.
* **Smart Nesting**: If placed inside `[data-trig-pin]`, it syncs automatically to `--trig-pin-t`. If the parent pin disables on mobile, it seamlessly falls back to standard viewport scroll progress so content never remains stuck at `opacity: 0`.

```html
<div
  data-trig-timeline='[
    { "at": 0,   "opacity": 0, "y": 80,  "scale": 0.75, "blur": 6 },
    { "at": 35,  "opacity": 1, "y": 0,   "scale": 1.1,  "blur": 0, "ease": "easeOut" },
    { "at": 70,  "opacity": 1, "y": -10, "scale": 1.0,  "rotate": 12, "ease": "easeInOut" },
    { "at": 100, "opacity": 0, "y": -80, "scale": 0.6,  "ease": "easeIn" }
  ]'
>
  Keyframe Animated Element
</div>
```

---

## 9. Mobile, Tablet & Accessibility (`prefers-reduced-motion`)

ChronoTrig detects small viewports (`window.innerWidth < mobileBreakpoint`, default `1024px`) and touch tablets (`pointer: coarse` with width `<= 1280px`)—while **not** falsely flagging wide desktop touch laptops!

| Option | Effect on Mobile / Tablet |
| :--- | :--- |
| **`'lightweight'`** *(Default)* | 2D GPU transforms only (`translate3d`, `scale`, `rotate`), strips `blur` & 3D `rotateX/Y`, disables inertia lag (`lerp: 0`), unpins scrolljacks, clamps stagger delays `<= 0.04s`. |
| **`'disable'`** | **0% CPU** — stops scroll/RAF processing, collapses pins to `height: auto`, reveals all animated elements cleanly in natural resting state. |
| **`'full'`** | Keeps full 3D & pinned behavior across all devices. |

Additionally, `prefers-reduced-motion: reduce` is listened to **live** via `MediaQueryList` when `respectReducedMotion: true` (default), immediately disabling motion cleanly for users who prefer reduced motion.

---

## 10. Complete API Reference

### Constructor Options (`ChronoTrigOptions`)
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `lerp` | `number` | `0` | Scroll smoothing (`0` = instant, `0.04`–`0.1` = silky inertia). |
| `mobileBehavior` | `'disable' \| 'lightweight' \| 'full'` | `'lightweight'` | Mobile optimization strategy. |
| `mobileBreakpoint` | `number` | `1024` | Viewport width breakpoint in `px`. |
| `disableBlurOnMobile` | `boolean` | `true` | Removes `filter: blur()` on mobile/tablet. |
| `disable3DOnMobile` | `boolean` | `true` | Flattens `z`, `rotateX`, `rotateY` to 2D on mobile/tablet. |
| `respectReducedMotion` | `boolean` | `true` | Respects OS `prefers-reduced-motion: reduce`. |
| `debugMarkers` | `boolean` | `false` | Renders floating telemetry overlay HUD. |
| `autoInit` | `boolean` | `false` | Calls `init()` automatically on construction. |

### Public Methods
* `engine.init()` — Initializes IntersectionObserver, scroll/resize listeners, and scans DOM.
* `engine.scan()` — Re-indexes dynamically inserted elements (e.g. after AJAX or SPA route change).
* `engine.refresh()` — Re-measures viewport dimensions, horizontal tracks, scans DOM, and updates immediately.
* `engine.subscribe(cb)` — Subscribe `{ scrollY, direction, progress, isMobile }` updates inside unified RAF loop; returns `unsubscribe()`.
* `engine.setLerp(val)` / `engine.getLerp()`
* `engine.setMobileBehavior(mode)` / `engine.getMobileBehavior()`
* `engine.setSimulatedMobile(bool | null)` / `engine.isMobile()` / `engine.isDisabled()`
* `engine.setDebugMarkers(bool)` / `engine.isDebugMarkers()`
* `engine.getLastUpdateMs()` — Returns execution time (in ms) of the last FastDOM frame update.
* `engine.applyTimelineInterpolation(el, steps, progressPercent, directOverride?)`
* `engine.destroy()` — Detaches listeners, cancels RAF, removes HUD & observer cleanly.

---

## 11. 9 Production-Ready Practical Recipes

### Recipe 1: Auto-Hiding Smart Navbar & Global Reading Progress Bar
```html
<div class="progress-bar"></div>
<header class="navbar">Brand · Links · CTA</header>
```
```css
.progress-bar {
  position: fixed; top: 0; left: 0; height: 3px; z-index: 60;
  width: var(--scroll-progress, 0%);
  background: linear-gradient(90deg, #38bdf8, #818cf8);
}
.navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}
body.trig-scroll-down .navbar { transform: translateY(-100%); }
body.trig-scroll-up .navbar   { transform: translateY(0); }
```

### Recipe 2: Multi-Plane Depth Parallax + Rotating Badge
```html
<section class="parallax-stage" data-trig data-trig-pixels="true" data-trig-degrees="true">
  <div class="layer bg-layer"></div>
  <div class="layer mid-layer"></div>
  <div class="layer badge">360° Badge</div>
</section>
```
```css
.bg-layer  { transform: translate3d(0, calc(var(--trig-px, 0px) * -0.25), 0); }
.mid-layer { transform: translate3d(0, calc(var(--trig-px, 0px) * -0.65), 0); }
.badge     { transform: rotate(var(--trig-deg, 0deg)); }
```

### Recipe 3: Everyday Landing Page Reveal-Once Cards
```html
<section class="features">
  <h2 class="blurIn" data-trig data-trig-once="true">Built for Real Websites</h2>
  <p class="fadeInUpSm trig-delay-100" data-trig data-trig-once="true">Zero lag, clean reveals.</p>
  <div class="hero-image clipUp trig-delay-200" data-trig data-trig-once="true">
    <img src="product.jpg" alt="Product Preview" />
  </div>
</section>
```

### Recipe 4: Pinned Split-Screen Scrollytelling (Mobile-Safe)
```html
<section
  class="split-layout"
  data-trig-pin
  data-trig-pin-distance="280vh"
  data-trig-pin-media="(min-width: 1024px)"
>
  <div class="story-column">
    <article class="fadeInUpSm" data-trig data-trig-once="true">Step 1: Collect</article>
    <article class="fadeInUpSm" data-trig data-trig-once="true">Step 2: Transform</article>
    <article class="fadeInUpSm" data-trig data-trig-once="true">Step 3: Deploy</article>
  </div>
  <div class="sticky-stage">
    <div data-trig-timeline='[{"at":0,"scale":0.85,"opacity":0.4},{"at":50,"scale":1.08,"opacity":1},{"at":100,"scale":0.95,"rotate":8}]'>
      Interactive Diagram
    </div>
  </div>
</section>
```
```css
@media (min-width: 1024px) {
  .split-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
  .sticky-stage { position: sticky; top: 0; height: 100vh; display: flex; align-items: center; }
}
```

### Recipe 5: Horizontal Desktop Track + Native Mobile Touch Carousel
```html
<section data-trig-pin data-trig-pin-distance="350vh" data-trig-pin-horizontal="true" data-trig-disable-mobile="true">
  <div class="track-viewport">
    <div data-trig-pin-track class="track-row">
      <div class="slide">01 · Design</div>
      <div class="slide">02 · Engineer</div>
      <div class="slide">03 · Ship</div>
    </div>
  </div>
</section>
```
```css
@media (min-width: 1024px) {
  .track-viewport { position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; align-items: center; }
  .track-row { display: flex; gap: 32px; width: max-content; padding: 0 48px; }
  .slide { width: 420px; flex-shrink: 0; }
}
@media (max-width: 1023px) {
  .track-row { display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 16px; }
  .slide { width: 82vw; flex-shrink: 0; scroll-snap-align: center; }
}
```

### Recipe 6: Harmonic Stagger Grid + Word-by-Word Heading
```html
<h2 data-trig-stagger data-trig-stagger-mode="linear" data-trig-stagger-delay="0.06" data-trig-once="true">
  <span class="trig-stagger-item">Fast.</span>
  <span class="trig-stagger-item">Predictable.</span>
  <span class="trig-stagger-item">Lightweight.</span>
</h2>

<div class="grid" data-trig-stagger data-trig-stagger-mode="center" data-trig-stagger-delay="0.07" data-trig-once="true">
  <div class="trig-stagger-item">Item 1</div>
  <div class="trig-stagger-item">Item 2</div>
  <div class="trig-stagger-item">Item 3</div>
  <div class="trig-stagger-item">Item 4</div>
</div>
```

### Recipe 7: 10-Step Pure CSS Milestone Card
```html
<div class="milestone-card" data-trig data-trig-var="true">Step Milestone</div>
```
```css
.milestone-card { transition: all 0.25s ease-out; }
.milestone-card[data-trig-var="30"] { border-color: #64748b; transform: scale(0.98); }
.milestone-card[data-trig-var="60"] { border-color: #38bdf8; transform: scale(1.05); }
.milestone-card[data-trig-var="90"] { border-color: #34d399; transform: scale(1); }
```

### Recipe 8: Floating Back-to-Top Button via Body Classes
```html
<button class="back-to-top" onclick="window.scrollTo({ top: 0, behavior: 'smooth' })">↑ Top</button>
```
```css
.back-to-top {
  position: fixed; bottom: 24px; right: 24px;
  opacity: 0; pointer-events: none; transform: translateY(16px);
  transition: all 0.25s ease;
}
body.trig-scroll-25 .back-to-top {
  opacity: 1; pointer-events: auto; transform: translateY(0);
}
```

### Recipe 9: Dynamic SPA Filter Grid in React
```tsx
function PortfolioGrid({ category }: { category: string }) {
  const filtered = useMemo(() => PROJECTS.filter((p) => p.cat === category), [category]);
  useTrigScan([category]); // Re-observes newly rendered cards automatically

  return (
    <div key={category} data-trig-stagger data-trig-stagger-mode="wave" data-trig-once="true" className="grid grid-cols-3 gap-4">
      {filtered.map((item) => (
        <article key={item.id} className="trig-stagger-item">{item.title}</article>
      ))}
    </div>
  );
}
```

---

## 12. Troubleshooting & Best Practices

1. **`position: sticky` isn't sticking inside `[data-trig-pin]`**: Check every parent element up to `<body>` and ensure none use `overflow: hidden` or `overflow-x: hidden`. Switch them to `overflow-x: clip`.
2. **Dynamically loaded API/CMS content isn't animating**: Call `chronoTrig.scan()` (or `chronoTrig.refresh()` if image dimensions changed) right after mounting new DOM nodes.
3. **Avoid animating layout properties**: Inside CSS keyed to `--trig` variables, only animate compositor properties (`transform`, `opacity`, `clip-path`) — avoid animating `width`, `height`, `top`, or `margin`.

---

## License
MIT License.
