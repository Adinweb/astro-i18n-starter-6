# Smooth Scroll (Lenis) & Progressive Scroll Reveal Reference

This reference documents how to animate elements across Astro views, reusable components, and `.mdx` content pages using the **Progressive Scroll Reveal** system and **Lenis** smooth scrolling, while preserving 100% RTL/LTR symmetry, progressive enhancement, and Astro `<ClientRouter />` compatibility.

---

## 1. Architecture & SSOT Files

| File | Responsibility |
| :--- | :--- |
| `src/layouts/BaseLayout.astro` | Synchronous `<head>` inline script adds `.js` onto `<html>` before first paint (and re-applies on `astro:after-swap`); imports `reveal.css`, `src/scripts/lenis.ts`, and `src/scripts/reveal.ts`. |
| `src/styles/reveal.css` | Scopes initial hidden transforms strictly under `.js .reveal`, locks the `cubic-bezier(0.16, 1, 0.3, 1)` entrance via `:not(.reveal-complete)`, supports `[data-reveal-replay="fast"]` and `.is-resetting`, mirrors `start`/`end` in RTL, and flattens for `@media print` and `html[data-motion="reduced"]`. |
| `src/scripts/reveal.ts` | Exports `initReveals()`, `replayReveals(container, { fast })`, and `cleanupReveals()`; indexes visible `.reveal-stagger > .reveal` children (`:not([hidden])`, capped at `8`), observes viewport entry, manages `.is-visible` -> `.reveal-complete`, and rebinds on `astro:page-load`. |
| `src/components/Reveal.astro` | Type-safe polymorphic Astro wrapper (`as`, `direction`, `delay`, `class`, `...rest`) around `.reveal` + `data-reveal` + `data-delay`. |
| `src/scripts/lenis.ts` | Manages the singleton `Lenis` instance (`lerp: 0.085`), intercepts same-page `#hash` links in the capture phase with sticky-header offset (`-96px`), isolates nested scroll containers, and destroys/re-initializes across View Transitions. |

---

## 2. Progressive Enhancement & the 4-Stage `.js` + `.reveal` Lifecycle

**Never use `hidden` / `display: none` or unscoped `opacity-0` to hide elements for scroll entrance.**

Hiding elements with `display: none` collapses their bounding box to `0×0`, breaking `IntersectionObserver` viewport detection, causing severe Cumulative Layout Shift (CLS), breaking `#anchor` scroll offsets, and preventing CSS transitions from running cleanly. Instead, the system keeps elements in their exact layout flow and animates GPU compositor properties (`opacity` and `transform: translate3d(...)`) across four deterministic stages:

```text
Stage 1 (<head> sync)  : <html class="js"> added before first paint (zero FOUC; 100% visible if JS off)
         │
         ▼
Stage 2 (.reveal)      : opacity: 0 + directional translate3d(...) on GPU; layout box stays intact (CLS = 0)
         │               `:not(.reveal-complete)` locks 0.8s entrance with `!important`
         ▼
Stage 3 (.is-visible)  : Added when top enters upper 90% of viewport; transitions to opacity: 1, transform: 0
         │               Element is immediately unobserved by IntersectionObserver
         ▼
Stage 4 (.reveal-complete): Added on `opacity` transitionend (or 1500ms fallback); releases `!important`
                            transition & delay lock so interactive card `hover:` utilities run at native speed
```

### Safe Combination with Interactive Card Hover Classes
Because `.js .reveal:not(.reveal-complete)` enforces the entrance curve during reveal and `.reveal-complete` releases it afterward, you **can and should** put Tailwind hover classes directly on the same `<Reveal>` / `.reveal` element without wrapper bloat:

```astro
<Reveal
  as="article"
  direction="up"
  class="rounded-2xl border border-border bg-surface p-6 transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
>
  <h3 class="text-lg font-bold text-fg">{title}</h3>
</Reveal>
```

---

## 3. Making Single Elements Animate on Scroll

You have two equivalent ways to add scroll reveal animations to any page, component, or view:
- **Option A (Recommended in `.astro` & `.mdx`)**: Use `<Reveal />` (`@/components/Reveal.astro`) for compile-time prop checking.
- **Option B (Zero-wrapper HTML attributes)**: Add `class="reveal"` with `data-reveal="..."` and optional `data-delay="..."` directly onto existing markup (ideal inside reusable components such as `PostCard.astro` or client-created DOM nodes).

### Option A: `<Reveal />` Component (`src/components/Reveal.astro`)

```astro
---
import Reveal from '@/components/Reveal.astro';
---

<Reveal as="section" direction="up" class="py-16">
  <h2 class="text-3xl font-bold text-fg">{title}</h2>
</Reveal>

<Reveal as="article" direction="start" delay={150} class="glass-surface rounded-2xl p-6">
  <p class="text-muted">{description}</p>
</Reveal>
```

#### `<Reveal />` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `as` | `keyof HTMLElementTagNameMap` | `'div'` | Semantic HTML tag to render (`'section'`, `'article'`, `'li'`, `'header'`, `'h2'`, etc.). |
| `direction` | `'up' \| 'down' \| 'start' \| 'end' \| 'scale'` | `'up'` | Logical entrance vector. `'start'` and `'end'` mirror automatically in RTL (`fa`, `ar`). |
| `delay` | `50 \| 100 \| 150 \| 200 \| 250 \| 300 \| 400 \| 500` | `undefined` | Optional manual entrance delay in milliseconds (use for standalone pairings; prefer `.reveal-stagger` for grids/lists). |
| `class` | `string` | `''` | Additional Tailwind / semantic classes merged with `reveal`. |
| `...rest` | `Record<string, unknown>` | — | Forwards any `id`, `aria-*`, or `data-*` attributes to the rendered tag. |

### Option B: HTML Classes & Data Attributes

```astro
<div class="reveal" data-reveal="up">
  <h2>Section Heading</h2>
</div>

<aside class="reveal glass-surface p-6" data-reveal="end" data-delay="200">
  <p>Supporting callout card</p>
</aside>
```

---

## 4. Direction Variants & RTL-Native Discipline

In a multilingual site (`en`, `de`, `fr` in LTR; `fa`, `ar` in RTL), horizontal entrance vectors **must** mirror with the reading direction:

| `direction` / `data-reveal` | LTR (`en`, `de`, `fr`) | RTL (`fa`, `ar`) | Recommended Usage |
| :--- | :--- | :--- | :--- |
| `'up'` *(default)* | Rises from `+2.25rem` below | Rises from `+2.25rem` below | Standard headings, paragraphs, cards, sections |
| `'down'` | Drops from `-2.25rem` above | Drops from `-2.25rem` above | Top badges, banners, announcements |
| `'start'` ✅ | Slides in from inline-start (`-2.25rem` left) | Slides in from inline-start (`+2.25rem` right) | **Leading column** in split 2-column layouts |
| `'end'` ✅ | Slides in from inline-end (`+2.25rem` right) | Slides in from inline-end (`-2.25rem` left) | **Trailing column / visual** in split 2-column layouts |
| `'scale'` | Rises `+1.25rem` + scales `0.95 -> 1` | Rises `+1.25rem` + scales `0.95 -> 1` | Hero media cards, featured callouts, CTA banners |

> Physical `left` and `right` variants are intentionally omitted from `Reveal.astro` and `reveal.css`, and RTL selectors use zero-specificity `:where([dir='rtl'])` + `:not(.is-visible)` so `.is-visible` always resets transforms cleanly to `0`.

### Split Two-Column Pattern (RTL-Safe)

```astro
<div class="grid gap-10 lg:grid-cols-2 lg:items-center">
  <Reveal direction="start" class="space-y-4">
    <h2 class="text-3xl font-bold">{heading}</h2>
    <p class="text-muted">{copy}</p>
  </Reveal>

  <Reveal direction="end" delay={150} class="glass-surface rounded-3xl p-8">
    <slot name="visual" />
  </Reveal>
</div>
```

---

## 5. Implementing Staggered Grids & Lists (`.reveal-stagger`)

Never hardcode sequential `delay={50}`, `delay={100}`, `delay={150}` across dynamic arrays or card grids. Instead, put `reveal-stagger` on the **parent container** and put `.reveal` / `<Reveal>` on each **direct child**.

### How `.reveal-stagger` Works Under the Hood
1. **Direct-Child Selector (`:scope > .reveal`)**: `assignStaggerIndices()` in `src/scripts/reveal.ts` queries `:scope > .reveal` on each `.reveal-stagger` container, matching `.js .reveal-stagger > .reveal:not(.reveal-complete)` in `src/styles/reveal.css`.
2. **Visible-Only Counting (`:not([hidden])`)**: Any direct child with `hidden` (or inside a `[hidden]` ancestor) has its `--stagger-index` removed and is **skipped** during counting. Thus, if cards #0 and #1 are hidden by a filter, card #2 receives `--stagger-index: 0` (`0ms` dead delay).
3. **Automatic Delay Cap (`MAX_STAGGER_INDEX = 8`)**: Visible items receive `0, 1, 2, ..., 8` (clamped at `8`), preventing long lists of 20+ items from accumulating multi-second delays.
4. **Configurable Rhythm**:
   - **Initial scroll load (default)**: `--reveal-duration: 0.8s`, `--stagger-step: 0.09s` (`90ms` between cards).
   - **Interactive fast replay (`data-reveal-replay="fast"`)**: `--reveal-duration: 0.6s`, `--stagger-step: 0.045s` (`45ms` between cards).

### Pattern A: Semantic `<ul>` / `<ol>` List (`<Reveal as="li">`)

```astro
<!-- ✅ DO: Make <Reveal as="li"> the direct child of .reveal-stagger -->
<ul class="reveal-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <Reveal
      as="li"
      direction="up"
      class="glass-surface rounded-2xl p-6 transition duration-200 hover:-translate-y-1"
    >
      <h3 class="font-semibold text-fg">{item.title}</h3>
      <p class="mt-2 text-sm text-muted">{item.summary}</p>
    </Reveal>
  ))}
</ul>

<!-- ❌ DON'T: Nest <Reveal> inside an un-annotated <li> (breaks :scope > .reveal!) -->
<ul class="reveal-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <li>
      <Reveal direction="up">{item.title}</Reveal>
    </li>
  ))}
</ul>
```

### Pattern B: Reusable Card Components Inside a Grid (e.g. `PostCard.astro`)

When rendering child components inside `<div class="reveal-stagger grid ...">`, place `class="reveal" data-reveal="up"` on the **outermost root element** inside that child component (`<article class="reveal ...">`):

```astro
<!-- Parent View (e.g. BlogIndexView.astro) -->
<div class="reveal-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-blog-grid>
  {posts.map((post, index) => (
    <PostCard post={post} locale={locale} href={...} priority={index === 0} />
  ))}
</div>

<!-- Child Component root element (e.g. PostCard.astro) -->
<article class="reveal group flex flex-col rounded-2xl border border-border bg-surface ..." data-reveal="up">
  ...
</article>
```

---

## 6. Client-Side Filtering, Tabs & Dynamic DOM (`initReveals` vs `replayReveals`)

Because `.reveal` is a **one-shot** entrance by default (once an element has `.is-visible` and `.reveal-complete`, `initReveals()` skips it), choose the right API in client `<script>` blocks depending on what changed in the DOM:

| Scenario | Function to Call | Why |
| :--- | :--- | :--- |
| Appending **brand-new** `.reveal` elements (e.g. "Load more") while keeping existing cards untouched | `initReveals()` | Skips already-visible cards idempotently and observes only the newly appended `.reveal` nodes. |
| **Filtering or switching tabs** by toggling `el.hidden = !matches` or replacing grid cards on user click / `popstate` | `replayReveals(grid, { fast: true })` | Suppresses reverse transitions (`.is-resetting`), strips `.is-visible`/`.reveal-complete` on visible cards, flushes layout synchronously, re-indexes `:not([hidden])` from `0`, and replays with a crisp `45ms` stagger. |

### Reference Pattern for Interactive Filterable Grids

```ts
import { initReveals, replayReveals } from '@/scripts/reveal';

function setupFeatureFilter() {
  const root = document.querySelector<HTMLElement>('[data-feature-filter]');
  if (!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';

  const grid = document.querySelector<HTMLElement>('[data-feature-grid]');
  const cards = [...document.querySelectorAll<HTMLElement>('[data-feature-card]')];
  let activeCategory = 'all';

  const render = (animate = false) => {
    for (const card of cards) {
      const matches = activeCategory === 'all' || card.dataset.category === activeCategory;
      card.hidden = !matches; // Enforce `[data-feature-card][hidden] { display: none !important; }` if flex/grid
    }

    // Only replay on interactive state changes — NEVER on initial setup (`animate = false`),
    // because initial page load is already handled by global `initReveals()`.
    if (animate && grid) {
      replayReveals(grid, { fast: true });
    }
  };

  root.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-category]');
    if (!btn) return;
    const nextCategory = btn.dataset.category ?? 'all';
    const changed = nextCategory !== activeCategory;
    activeCategory = nextCategory;
    render(changed); // Skip replay if clicking the already-active filter
  });

  render(false);
}

setupFeatureFilter();
document.addEventListener('astro:page-load', setupFeatureFilter);
```

> **Flex/Grid `[hidden]` Caveat**: Tailwind display utilities like `flex` or `grid` on a card override the browser's user-agent `[hidden] { display: none }`. Whenever you filter cards via `card.hidden = true`, add a scoped rule `[data-your-card][hidden] { display: none !important; }`.

---

## 7. Using Scroll Reveal & Stagger Inside `.mdx` Content Pages

Static pages (`src/content/pages/<group>/<locale>.mdx`) and blog articles (`src/content/blog/<group>/<locale>.mdx`) support both raw HTML attributes and imported `<Reveal />` components:

```mdx
---
title: "Capabilities"
description: "Platform overview"
slug: "features"
publishedAt: 2026-01-15
draft: false
---
import Reveal from '@/components/Reveal.astro';

<Reveal direction="up">

## Built for Global Teams

Every paragraph or markdown block inside `<Reveal>` fades in smoothly as the reader scrolls.

</Reveal>

<div class="reveal-stagger not-prose my-8 grid gap-4 sm:grid-cols-2">
  <Reveal direction="start" class="glass-surface rounded-2xl p-5">
    <strong>Native RTL</strong> — Logical inline directions mirror automatically.
  </Reveal>
  <Reveal direction="end" class="glass-surface rounded-2xl p-5">
    <strong>Zero JS Fallback</strong> — Readable even with scripts disabled.
  </Reveal>
</div>
```

> Leave a blank line after `<Reveal ...>` and before `</Reveal>` when wrapping Markdown syntax (`##`, lists, bold text) inside `.mdx` files so the MDX parser processes the inner Markdown rather than treating it as raw HTML text.

---

## 8. Lenis Smooth Scroll Integration Rules

Lenis is initialized globally by `BaseLayout.astro` via `src/scripts/lenis.ts`. Follow these rules when building interactive UI:

1. **Nested Scrollable Containers (`data-lenis-prevent`)**:
   - Any modal, drawer, dropdown menu, or scrollable code/table container with `overflow-y: auto` **must** carry `data-lenis-prevent` so wheel events scroll the inner container instead of the page behind it (`[data-search-modal]` and `[data-mobile-panel]` are already whitelisted).
   ```astro
   <div class="max-h-80 overflow-y-auto" data-lenis-prevent>
     <!-- Independent scrollable content -->
   </div>
   ```
2. **Same-Page `#anchor` Links**:
   - Standard `<a href="#section-id">` links work automatically. `src/scripts/lenis.ts` intercepts same-page hashes in the **capture phase** (before Astro's `<ClientRouter />` bubble listener can trigger an instant jump) and smoothly scrolls with a `-96px` offset for `header.fixed`.
3. **Programmatic Scrolling (`getLenis()`)**:
   - Never rely on CSS `scroll-behavior: smooth` (keep `scroll-behavior: auto` in `global.css`). For custom scroll-to actions in client scripts, call `getLenis()`:
   ```ts
   import { getLenis } from '@/scripts/lenis';

   const lenis = getLenis();
   if (lenis) {
     lenis.scrollTo('#features', { offset: -96, duration: 1.15 });
   } else {
     document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
   }
   ```
4. **Do Not Pass Global `duration` to `new Lenis()`**:
   - In `lenis` v1.3+, passing `duration` alongside `lerp` causes `Animate.advance()` to shadow `lerp` damping. Keep global wheel inertia driven purely by `lerp: 0.085`, and pass `duration` only to `anchors` or `lenis.scrollTo(...)` calls.
5. **Explicit Reduced-Motion Opt-Out (`data-motion="reduced"`)**:
   - Both `lenis.ts` and `reveal.ts` (`initReveals` and `replayReveals`) check `document.documentElement.dataset.motion === 'reduced'` (supported in CSS via `html[data-motion='reduced'].js .reveal`). Setting `document.documentElement.dataset.motion = 'reduced'` immediately disables smooth wheel inertia and renders all `.reveal` elements instantaneously.

---

## 9. Anti-Patterns Checklist

| ❌ Anti-Pattern | ✅ Required Pattern |
| :--- | :--- |
| Using `hidden` / `display: none` or Tailwind `opacity-0` for scroll entrance | Use `<Reveal>` or `class="reveal"` (scoped under `.js` in `reveal.css`) |
| `direction="left"` / `direction="right"` on symmetrical columns | Use `direction="start"` / `direction="end"` so RTL locales mirror cleanly |
| Wrapping `.reveal` inside an un-annotated `<li>` or `<div>` under `.reveal-stagger` | Make `.reveal` a **direct child** (`:scope > .reveal`), e.g. `<Reveal as="li">` |
| Hardcoding sequential `delay={50}`, `delay={100}`, `delay={150}` on dynamic lists | Put `class="reveal-stagger"` on the parent container |
| Manually removing `.is-visible` without transition suppression on filtered grids | Call `replayReveals(container, { fast: true })` from `@/scripts/reveal` |
| Calling `replayReveals()` unconditionally on initial page setup | Pass `animate = false` on initial setup; call `replayReveals()` only when filter/tab state changes |
| Putting long `data-delay="500"` on the primary above-the-fold `<h1>` | Keep hero `<h1>` at `delay={undefined}` or `delay={50}` to protect LCP |
| Scrollable modal/dropdown missing `data-lenis-prevent` | Add `data-lenis-prevent` on any `overflow-y-auto` overlay or panel |
| Adding `scroll-behavior: smooth` to `html` | Keep `html { scroll-behavior: auto; }` so Lenis inertia does not stutter |
