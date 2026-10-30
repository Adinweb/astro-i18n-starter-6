# Smooth Scroll (Lenis) & ChronoTrig Scroll Engine Reference

This reference documents how to animate elements across Astro views, reusable components, and `.mdx` content pages using the **ChronoTrig CSS Scroll Engine** and **Lenis** smooth scrolling, while preserving 100% RTL/LTR symmetry, progressive enhancement, zero Cumulative Layout Shift (CLS), and Astro `<ClientRouter />` compatibility.

---

## 1. Architecture & SSOT Files

| File | Responsibility |
| :--- | :--- |
| `public/chronotrig.min.js` | Zero-dependency FastDOM CSS scroll engine (~4.2 KB). Observes `[data-trig]`, `[data-trig-pin]`, `[data-trig-stagger]`, and `[data-trig-timeline]`. |
| `src/layouts/BaseLayout.astro` | Includes `<script is:inline src="/chronotrig.min.js"></script>` in `<head>` and imports `src/scripts/lenis` and `src/scripts/chronotrig`. |
| `src/styles/chronotrig.css` | Scopes initial hidden entrance states strictly under `.js [data-trig]`. Employs CSS logical directions (`start`/`end`), handles stagger cascades, and flattens for `@media print` and reduced motion. |
| `src/scripts/chronotrig.ts` | Type-safe client coordinator. Automatically tags prose headings (`.prose > h2, h3`), coordinates View Transitions (`astro:page-load`), and exports `refreshChronoTrig()`. |
| `src/scripts/lenis.ts` | Manages the singleton `Lenis` instance (`lerp: 0.085`), intercepts same-page `#hash` links in the capture phase with sticky-header offset (`-96px`), isolates nested scroll containers, and re-initializes across View Transitions. |

---

## 2. Progressive Enhancement & The `.js` Reveal Contract

**Never use `hidden` / `display: none` or unscoped `opacity-0` for scroll entrance.**

Hiding elements with `display: none` collapses their bounding box to `0×0`, breaking `IntersectionObserver` viewport detection, causing severe layout shifts (CLS), and breaking anchor scroll offsets. Instead, ChronoTrig keeps elements in their natural layout geometry and transitions hardware-accelerated compositor properties (`opacity` and `transform: translate3d(...)`):

```text
1. <head> Script       : Adds <html class="js"> synchronously before first paint (100% visible if JS disabled).
2. .js [data-trig]     : Initial state in chronotrig.css: opacity: 0; transform: translate3d(0, 24px, 0);
3. ChronoTrig Observer : Adds .trig when top of element enters upper 90% of viewport.
4. .js [data-trig].trig: Smoothly transitions to opacity: 1; transform: none; (releasing hover transforms).
```

---

## 3. Making Elements and Titles Reveal from Bottom

### Option A: Declarative Attribute (`data-trig`)
Add `data-trig` to any element or title to give it a smooth, natural entrance from the bottom:

```astro
<!-- Hero section title & copy -->
<div class="max-w-3xl" data-trig>
  <h1 class="text-4xl font-extrabold text-fg">Main Title</h1>
  <p class="mt-4 text-muted">Subtitle copy</p>
</div>

<!-- Standalone Card or Section -->
<section class="rounded-2xl border border-border bg-surface p-6" data-trig>
  <h2>Section Heading</h2>
</section>
```

### Option B: Automatic Heading Reveals in Content Collections (`.mdx`)
In `src/scripts/chronotrig.ts`, headings inside articles and pages (`.prose > h2, .prose > h3`) are automatically tagged with `data-trig` during the `setupChronoTrig()` lifecycle pass. Authors can write standard markdown headings (`## Heading`) and they will automatically reveal smoothly from the bottom as readers scroll down.

---

## 4. Directional Entrances & RTL-Native Discipline

When elements animate horizontally (e.g. split columns, callout sidebars), **never use physical `left` or `right`**. Always use logical directions `start` and `end`:

```astro
<!-- Enters from reading start (left in LTR, right in RTL) -->
<aside data-trig data-trig-direction="start" class="p-6">
  <h3>Sidebar Note</h3>
</aside>

<!-- Enters from reading end (right in LTR, left in RTL) -->
<aside data-trig data-trig-direction="end" class="p-6">
  <p>Callout box</p>
</aside>
```

`src/styles/chronotrig.css` handles the directional translation with CSS logical property selectors:
```css
/* LTR defaults */
.js [data-trig][data-trig-direction="start"]:not(.trig) { transform: translate3d(-28px, 0, 0); }
.js [data-trig][data-trig-direction="end"]:not(.trig)   { transform: translate3d(28px, 0, 0); }

/* RTL automatic mirroring */
:where([dir="rtl"]) .js [data-trig][data-trig-direction="start"]:not(.trig) { transform: translate3d(28px, 0, 0); }
:where([dir="rtl"]) .js [data-trig][data-trig-direction="end"]:not(.trig)   { transform: translate3d(-28px, 0, 0); }
```

---

## 5. Harmonic Stagger Grid Cascades (`[data-trig-stagger]`)

Wrap grids or lists with `data-trig-stagger` to automatically stagger the entrance of each child card:

```astro
<div 
  class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" 
  data-trig-stagger 
  data-trig-stagger-delay="0.08"
>
  <div data-trig class="card">Card 1</div>
  <div data-trig class="card">Card 2</div>
  <div data-trig class="card">Card 3</div>
</div>
```

ChronoTrig calculates `--stagger-index`, `--stagger-delay`, and toggles `.trig-stagger-active` automatically on each child as the grid enters the viewport.

### Dynamic Filtering & Pagination:
When dynamically appending or filtering cards in client-side scripts (e.g. in `src/views/BlogIndexView.astro`), import and call `refreshChronoTrig()`:

```typescript
import { refreshChronoTrig } from '@/scripts/chronotrig';

// After appending dynamic cards or changing visibility:
grid.append(...newCards);
refreshChronoTrig();
```

---

## 6. Pinned Sections & Multi-Step Keyframe Timelines

ChronoTrig supports sticky stage scrollytelling and multi-step keyframes:

### Pinned Sticky Container
```html
<div data-trig-pin data-trig-disable-mobile="true" style="height: 300vh;">
  <div style="position: sticky; top: 0; height: 100vh; display: flex; align-items: center; justify-content: center;">
    <div style="transform: scale(calc(1 + var(--trig-pin-t) * 0.5));">
      Scaled Content
    </div>
  </div>
</div>
```

### Multi-Step Keyframe Waypoints
```html
<div
  data-trig-timeline='[
    { "at": 0, "opacity": 0, "y": 80, "scale": 0.8 },
    { "at": 40, "opacity": 1, "y": 0, "scale": 1.1, "ease": "easeInOut" },
    { "at": 100, "opacity": 0, "y": -80, "scale": 0.6 }
  ]'
>
  <h3>Keyframe Object</h3>
</div>
```

---

## 7. Lenis Smooth Scroll Integration

Lenis handles smooth mouse-wheel momentum scrolling, while ChronoTrig synchronizes animations on requestAnimationFrame:
1. **Lenis Singleton (`src/scripts/lenis.ts`)**: Initializes with `lerp: 0.085`, `smoothWheel: true`, and sticky-header offset (`-96px`).
2. **Nested Overlays**: Any modal, drawer, or scrollable panel (`overflow-y-auto`) must carry `data-lenis-prevent` so inner scrolling does not bleed into the outer page.
3. **Reduced Motion**: Setting `document.documentElement.dataset.motion = 'reduced'` or enabling OS `prefers-reduced-motion` immediately disables smooth wheel inertia and renders all `data-trig` elements instantaneously with `transform: none` and `opacity: 1`.
