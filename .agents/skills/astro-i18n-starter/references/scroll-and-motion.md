# Smooth Scroll (Lenis) & ChronoTrig v5.2.0 Scroll Engine Reference

This reference documents how to animate elements across Astro views, reusable components, and `.mdx` content pages using **ChronoTrig v5.2.0** and **Lenis** smooth scrolling, while preserving 100% RTL/LTR symmetry, progressive enhancement, zero Cumulative Layout Shift (CLS), and Astro `<ClientRouter />` compatibility.

---

## 1. Architecture & SSOT Files

| File | Responsibility |
| :--- | :--- |
| `public/chronotrig.min.js` / `public/chronotrig.esm.js` | Zero-dependency **ChronoTrig v5.2.0** FastDOM CSS scroll engine (2-pass measure/mutate, IntersectionObserver gating, WeakMap caching, `autoInit: true`). Drives `[data-trig]`, `[data-trig-pin]`, `[data-trig-stagger]`, `[data-trig-timeline]`, continuous variables (`--trig`, `--trig-px`, `--trig-deg`), body milestone classes, and live OS `prefers-reduced-motion` listeners. |
| `src/layouts/BaseLayout.astro` | Loads `<script is:inline src="/chronotrig.min.js"></script>`, executes `resolveMotion()` in `<head>` (checks `localStorage.motion`, falls back to OS `prefers-reduced-motion: reduce`, sets `html[data-motion]`), and imports `src/scripts/lenis` and `src/scripts/chronotrig`. |
| `src/styles/chronotrig.css` | Scopes all entrance states strictly under `.js [data-trig]`, provides v5.2.0 presets (`.fadeInUpSm`, `.blurIn`, `.clipUp`, `.clipStart`, etc.) and utility modifiers (`.trig-delay-*`, `.trig-duration-*`, `.trig-ease-*`, `.trig-reactive-*`), handles logical RTL directions and harmonic stagger items, and flattens reveals/pins/timelines for `html[data-motion="reduced"]`, `body.chronotrig-mobile-disabled`, and `@media print`. |
| `src/scripts/chronotrig.ts` | Full v5.2.0 TypeScript declarations and client lifecycle coordinator. Auto-tags `.prose` headings, propagates `data-trig` + `data-trig-once` to stagger children without clobbering `wave`/`center`/`reverse` delays, calls `window.chronoTrig.refresh()` on initial load and `astro:page-load`, and exports `refreshChronoTrig()`. |
| `src/scripts/lenis.ts` | Manages the singleton `Lenis` instance (`lerp: 0.085`), syncs Lenis scroll ticks with `window.chronoTrig.trigScroll?.()`, intercepts same-page `#hash` links in the capture phase (`-96px` header offset), isolates nested scroll containers, and honors `data-motion="reduced"`. |
| `src/styles/global.css` | Sets `html { scroll-behavior: auto; }` (preventing Lenis conflict) and `body { overflow-x: clip; }` (crucial so `position: sticky` inside `[data-trig-pin]` is never broken). |

---

## 2. Progressive Enhancement & The `.js` Reveal Contract

**Never use `hidden` / `display: none` or unscoped `opacity-0` for scroll entrance.**

Hiding elements with `display: none` collapses their bounding box to `0×0`, breaking `IntersectionObserver` detection, causing layout shifts (CLS), and breaking anchor offsets. Instead, ChronoTrig keeps elements in natural layout flow and animates GPU compositor properties (`opacity`, `transform`, `clip-path`):

```text
1. <head> Script       : Adds <html class="js"> synchronously before first paint (100% visible if JS disabled).
2. .js [data-trig]     : Initial state in chronotrig.css: opacity: 0; transform: translate3d(0, 56px, 0);
3. ChronoTrig Observer : Adds .trig (+ trig-up / trig-down) when entering viewport (rootMargin 10% 0px).
4. .js [data-trig].trig: Runs `trig-reveal-up` for 1.2s on cubic-bezier(0.22, 1, 0.36, 1) to opacity: 1; transform: none;
                         after a deliberate --trig-reveal-delay (180ms) hold.
5. Reveal-Once         : Add `data-trig-once="true"` to trigger once, release `will-change: auto`, and unobserve
                         automatically (0% scroll overhead on long pages).
6. Failsafe            : If /chronotrig.min.js never loads, setupChronoTrig() removes `.js` so content never stays hidden.
```

---

## 3. Standard Reveals, `data-trig-once` & Ready-Made Presets

### Declarative Single Elements
```astro
<!-- Replayable entrance (default: replays when re-entering viewport) -->
<div class="max-w-3xl" data-trig>
  <h1 class="text-4xl font-extrabold text-fg">Main Title</h1>
</div>

<!-- One-shot entrance: triggers once, releases will-change, unobserves -->
<section class="fadeInUpSm rounded-2xl border border-border bg-surface p-6" data-trig data-trig-once="true">
  <h2>Appears cleanly once</h2>
</section>
```

### Automatic Heading Reveals in `.mdx`
In `src/scripts/chronotrig.ts`, `.prose h2`, `.prose h3`, `.prose h4`, `.prose .section-kicker`, and `[data-prose-reveal]` elements are automatically tagged with `data-trig` during `setupChronoTrig()`.

### v5.2.0 Presets & Utility Modifiers (`src/styles/chronotrig.css`)
All presets remain strictly scoped under `.js [data-trig]` for Zero-CLS and Print/No-JS safety:
* **Modern Reveals**:
  * `.fadeInUpSm` — Subtle `18px` upward entrance (ideal for SaaS copy and UI cards)
  * `.blurIn` — Blur-to-sharp entrance (automatically degrades to crisp `.fadeInUpSm` under `body.chronotrig-mobile-lightweight`)
  * `.clipUp` — Bottom-to-top `clip-path` wipe
  * `.clipStart` — Logical inline-start clip-path wipe (`left -> right` in LTR, `right -> left` in RTL)
* **Classic Presets**: `.fadeIn`, `.fadeInUp`, `.fadeInDown`, `.zoomIn`, `.zoomOut`, `.trig-directional` (uses `body.trig-scroll-up` vs `trig-scroll-down`)
* **Delay Modifiers**: `.trig-delay-100`, `.trig-delay-200`, `.trig-delay-300`, `.trig-delay-400`, `.trig-delay-500`, `.trig-delay-600`, `.trig-delay-800`, `.trig-delay-1000` (updates `--trig-reveal-delay`)
* **Duration Modifiers**: `.trig-duration-300`, `.trig-duration-500`, `.trig-duration-700`, `.trig-duration-1000`, `.trig-duration-1500`, `.trig-duration-2000`
* **Easing Modifiers**: `.trig-ease-smooth`, `.trig-ease-spring`, `.trig-ease-bounce`, `.trig-ease-in-out`
* **Reactive Shortcuts**: `.trig-reactive-x`, `.trig-reactive-x-reverse`, `.trig-reactive-y`, `.trig-reactive-rotate`, `.trig-reactive-px`

---

## 4. Directional Entrances & RTL-Native Discipline

When elements slide horizontally, **never use physical `left` or `right`**. Always use logical directions `start` and `end` (or `.clipStart` for clip wipes):

```astro
<!-- Enters from reading start (left in LTR, right in RTL) -->
<aside data-trig data-trig-direction="start" class="p-6">
  <h3>Sidebar Note</h3>
</aside>

<!-- Enters from reading end (right in LTR, left in RTL) with 100ms delay -->
<aside data-trig data-trig-direction="end" class="trig-delay-100 p-6">
  <p>Callout box</p>
</aside>
```

---

## 5. Harmonic Stagger Cascades (`[data-trig-stagger]`)

Wrap cards, list items, or spans in `[data-trig-stagger]`. ChronoTrig v5.2.0 targets `[data-trig-stagger-item], :scope > *`, writes `--stagger-index`, `--stagger-delay`, `--stagger-total`, `--child-progress`, `--child-percent`, and toggles `.trig-stagger-active` on children.

* **Harmonic Modes (`data-trig-stagger-mode`)**:
  * `linear` *(default)*: `0 -> 1 -> 2 -> ...`
  * `wave`: Sine curve across items
  * `center`: Radiates outward from the center item
  * `reverse`: Last item triggers first
* **One-Shot Staggers**: Add `data-trig-once="true"` on the `[data-trig-stagger]` container to animate once and unobserve after completion (`setupChronoTrig()` automatically propagates `data-trig-once="true"` when auto-tagging children).
* **Mobile Clamp**: In `lightweight` mode on mobile/tablet, ChronoTrig automatically clamps stagger step delays to `<= 0.04s`.

```astro
<div
  class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
  data-trig-stagger
  data-trig-stagger-mode="center"
  data-trig-stagger-delay="0.08"
  data-trig-once="true"
>
  <div data-trig class="card">Card 1</div>
  <div data-trig class="card">Card 2</div>
  <div data-trig class="card">Card 3</div>
</div>
```

### Dynamic Filtering & Pagination:
When dynamically appending cards in client scripts, call `refreshChronoTrig()` (which executes `setupChronoTrig()` -> `window.chronoTrig.refresh()`):

```typescript
import { refreshChronoTrig } from '@/scripts/chronotrig';

grid.append(...newCards);
refreshChronoTrig();
```

When a client-side filter only toggles `card.hidden`, reset the grid's reveal classes first, then call `refreshChronoTrig()` (`replayGridReveals()` in `src/views/BlogIndexView.astro`, and collection filter handlers in `src/views/CollectionIndexView.astro`):

```typescript
// User-triggered filter/tab change only — never on the initial render.
if (typeof window.chronoTrig !== 'undefined') {
  grid.classList.remove('trig-stagger-active');
  for (const child of Array.from(grid.children)) {
    child.classList.remove('trig', 'trig-up', 'trig-down', 'trig-stagger-active');
  }
  void grid.offsetHeight;
}
refreshChronoTrig();
```

---

## 6. Pinned / Sticky Sections & Horizontal Tracks (`[data-trig-pin]`)

ChronoTrig v5.2.0 keeps sticky stages fixed across a scroll track and maps progress into `--trig-pin-progress` (`0%`–`100%`), `--trig-pin-t` (`0.0000`–`1.0000`), `--trig-pin-deg`, `--trig-pin-px`, and `data-pin-phase="before|pinned|after"`:

* **Critical CSS Rule**: Never put `overflow-x: hidden` on `body` or ancestor containers around `[data-trig-pin]`, as it breaks `position: sticky`. `src/styles/global.css` sets `body { overflow-x: clip; }`.
* **Automatic Height & Responsive Media Rules**:
  * `data-trig-pin-distance="300vh"` sets desktop track height and automatically resets to `height: auto` when disabled on mobile.
  * `data-trig-pin-media="(min-width: 1024px)"` or `data-trig-disable-mobile="true"` disables pinning safely on phones/tablets.
  * `data-trig-pin-horizontal="true"` translates `[data-trig-pin-track]` horizontally (`--trig-horizontal-x`). Note: wrap horizontal tracks in LTR/RTL-aware layout rules if mirroring track direction.

```html
<section data-trig-pin data-trig-pin-distance="280vh" data-trig-pin-media="(min-width: 1024px)">
  <div class="sticky top-0 grid h-screen place-items-center overflow-hidden">
    <div style="transform: scale(calc(0.85 + var(--trig-pin-t, 0) * 0.25));">
      Pinned Subject
    </div>
  </div>
</section>
```

---

## 7. Multi-Step Keyframe Timelines (`[data-trig-timeline]`)

Interpolate across percentage checkpoints (`at`: `0`–`100`):
* **Supported Keys**: `at`, `x`, `xUnit` (`'px' | '%' | 'vw'`), `y`, `yUnit` (`'px' | '%' | 'vh'`), `z`, `scale`, `rotate`, `rotateX`, `rotateY`, `opacity`, `blur`, `ease` (`'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut'`).
* Set `data-trig-direct="false"` to emit CSS variables (`--trig-x`, `--trig-y`, `--trig-scale`, `--trig-rotate`, `--trig-opacity`) instead of mutating inline `style.transform`.
* **Smart Nesting**: Inside `[data-trig-pin]`, timelines sync automatically to `--trig-pin-t`; when a parent pin disables on mobile, they automatically fall back to standard viewport progress.
* Mobile lightweight mode strips 3D (`z`, `rotateX`, `rotateY`) and `blur` automatically.

```html
<div
  data-trig-timeline='[
    { "at": 0, "opacity": 0, "y": 48, "scale": 0.9 },
    { "at": 50, "opacity": 1, "y": 0, "scale": 1.04, "ease": "easeOut" },
    { "at": 100, "opacity": 1, "y": -24, "scale": 1 }
  ]'
>
  Keyframe Animated Element
</div>
```

---

## 8. Continuous Scroll Variables, Global `:root` Scope & Body Milestones

* **Element Variables**: Add `data-trig-var="true"`, `data-trig-pixels="true"`, or `data-trig-degrees="true"` (optionally without `data-trig` so non-fading scrub layers never start at `opacity: 0`) to populate `--trig`, `--trig-reverse`, `--trig-progress`, `--trig-px`, `--trig-deg`, and 10-step attribute selectors (`[data-trig-var="20"]`, `...`). Modifiers: `data-trig-offset`, `data-trig-negativeOffset`, `data-trig-min`, `data-trig-max`, `data-trig-height`.
* **Global Scope**: Add `data-trig-global="true"` + `id="heroSection"` to write `--trig-heroSection`, `--trig-heroSection-px`, `--trig-heroSection-deg` directly on `:root`.
* **Document Body Classes & `:root` Progress**: `trig-scroll-down` / `trig-scroll-up`, `trig-scroll-top` / `trig-scroll-bottom`, `trig-scroll-25` / `50` / `75`, plus `--scroll-progress` (`0.0%`–`100.0%`) and `--scroll-y` (`px`).

---

## 9. Engine API, Lenis & Reduced Motion Synchronization

* **Engine Instance (`window.chronoTrig`)**: Configured out of the box with `{ lerp: 0, mobileBehavior: 'lightweight', mobileBreakpoint: 1024, disableBlurOnMobile: true, disable3DOnMobile: true, respectReducedMotion: true }`.
  * Key methods: `refresh()`, `scan()`, `subscribe(cb)`, `setLerp(val)` / `getLerp()`, `setMobileBehavior(mode)` / `getMobileBehavior()`, `setDebugMarkers(bool)`, `isMobile()`, `isDisabled()`, `getLastUpdateMs()`, `trigScroll()`, `destroy()`.
  * **Important**: v5.2.0 does not expose `onScroll()` or `onResize()`; use `refresh()` after DOM/layout changes and `trigScroll?.()` in scroll callbacks.
* **Lenis (`src/scripts/lenis.ts`)**: Initializes with `lerp: 0.085`, `smoothWheel: true`, `-96px` header anchor offset, and calls `window.chronoTrig.trigScroll?.()` inside `lenis.on('scroll', ...)`. Always add `data-lenis-prevent` on nested `overflow-y-auto` panels/modals.
* **Unified Reduced Motion (`resolveMotion()`)**: `<head>` sets `html[data-motion="reduced" | "full"]` from `localStorage.motion` or OS `prefers-reduced-motion: reduce`. ChronoTrig's `respectReducedMotion` also watches `prefers-reduced-motion` live (`chronotrig-mobile-disabled`). Together with `chronotrig.css`, `lenis.ts`, `global.css`, and `@media print`, all reveals, timelines, horizontal tracks, and pinned heights flatten cleanly with zero stuck elements.
