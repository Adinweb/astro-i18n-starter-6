# Smooth Scroll (Lenis) & Progressive Scroll Reveal Reference

This reference documents how to animate elements across Astro views, reusable components, and `.mdx` content pages using the **Progressive Scroll Reveal** system and **Lenis** smooth scrolling, while preserving 100% RTL/LTR symmetry, progressive enhancement, and Astro `<ClientRouter />` compatibility.

---

## 1. Architecture & SSOT Files

| File | Responsibility |
| :--- | :--- |
| `src/layouts/BaseLayout.astro` | Synchronous `<head>` inline script adds `.js` onto `<html>` before first paint; imports `reveal.css`, `src/scripts/lenis.ts`, and `src/scripts/reveal.ts`. |
| `src/styles/reveal.css` | Scopes initial hidden transforms strictly under `.js .reveal`, locks the `0.8s cubic-bezier(0.16, 1, 0.3, 1)` entrance via `:not(.reveal-complete)`, mirrors `start`/`end` in RTL, and flattens for `@media print` and `html[data-motion="reduced"]`. |
| `src/scripts/reveal.ts` | Assigns `--stagger-index` on `.reveal-stagger > .reveal`, observes elements (hybrid `IntersectionObserver` + RAF 90%-viewport trigger safe inside cross-origin iframes), adds `.is-visible` -> `.reveal-complete`, and rebinds on `astro:page-load`. |
| `src/components/Reveal.astro` | Type-safe polymorphic Astro wrapper (`as`, `direction`, `delay`, `class`, `...rest`) around `.reveal` + `data-reveal` + `data-delay`. |
| `src/scripts/lenis.ts` | Manages the singleton `Lenis` instance (`lerp: 0.085`), intercepts same-page `#hash` links in the capture phase with sticky-header offset (`-96px`), isolates nested scroll containers, and destroys/re-initializes across View Transitions. |

---

## 2. Progressive Enhancement Rule (Mandatory)

**Never write raw `opacity: 0` or hidden transforms outside `.js` in component styles.**

1. `BaseLayout.astro` executes `document.documentElement.classList.add('js')` synchronously in `<head>`.
2. If JavaScript is disabled, blocked, or printed (`@media print`), `.js` is absent (or overridden) and every `.reveal` element renders immediately at `opacity: 1; transform: none`.
3. While animating, `.js .reveal:not(.reveal-complete)` enforces the `0.8s` entrance curve with `!important` so Tailwind utilities like `transition-all duration-200` on interactive cards cannot prematurely shorten the entrance animation. Once the one-shot reveal finishes, `reveal.ts` adds `.reveal-complete`, releasing the lock so hover transitions run at native speed.

---

## 3. Making Elements Animate on Scroll

You have two equivalent ways to add scroll reveal animations to any page or view:
- **Option A (Recommended in `.astro` & `.mdx`)**: Use `<Reveal />` (`@/components/Reveal.astro`) for compile-time prop checking.
- **Option B (Zero-wrapper HTML attributes)**: Add `class="reveal"` with `data-reveal="..."` and optional `data-delay="..."` directly onto existing markup.

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
| `delay` | `50 \| 100 \| 150 \| 200 \| 250 \| 300 \| 400 \| 500` | `undefined` | Optional manual entrance delay in milliseconds. |
| `class` | `string` | `''` | Additional Tailwind / semantic classes merged with `reveal`. |
| `...rest` | `Record<string, unknown>` | — | Forwards any `id`, `aria-*`, or `data-*` attributes to the rendered tag. |

### Option B: HTML Classes & Data Attributes

Use directly on native elements or inside components when an extra wrapper tag is undesirable:

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

> Physical `left` and `right` variants are intentionally omitted from `Reveal.astro` and `reveal.css` to enforce 100% RTL-native logical symmetry by construction.

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

## 5. Automatic Group Staggering (`.reveal-stagger`)

Instead of hardcoding `delay={50}`, `delay={100}`, `delay={150}` on dynamic lists or grids, place `reveal-stagger` on the parent container. `initReveals()` automatically queries `:scope > .reveal` and assigns `--stagger-index: 0, 1, 2, ...` (`0.09s` step per item).

```astro
<ul class="reveal-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <Reveal as="li" direction="up" class="glass-surface rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-1">
      <h3 class="font-semibold text-fg">{item.title}</h3>
      <p class="mt-2 text-sm text-muted">{item.summary}</p>
    </Reveal>
  ))}
</ul>
```

> **Important Constraint (`:scope > .reveal`)**: Each staggered item **must** be a **direct child** of the `.reveal-stagger` element. If you wrap an `<li>` around a nested `<Reveal>`, put `reveal` on the `<li>` itself (`<Reveal as="li">`) so `:scope > .reveal` matches.

---

## 6. Using Scroll Reveal Inside `.mdx` Content Pages

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

## 7. Lenis Smooth Scroll Integration Rules

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
   - Both `lenis.ts` and `reveal.ts` check `document.documentElement.dataset.motion === 'reduced'` (supported in CSS via `html[data-motion='reduced'].js .reveal`). Setting `document.documentElement.dataset.motion = 'reduced'` immediately disables smooth wheel inertia and renders all `.reveal` elements instantaneously.
6. **Dynamic DOM Injection**:
   - If a client script dynamically appends new `.reveal` nodes after `astro:page-load`, call `initReveals()` from `@/scripts/reveal` to observe the newly added elements (already-visible elements are skipped idempotently).

---

## 8. Anti-Patterns Checklist

| ❌ Anti-Pattern | ✅ Required Pattern |
| :--- | :--- |
| `opacity-0` in Tailwind classes for scroll entrance | Use `<Reveal>` or `class="reveal"` (scoped under `.js` in `reveal.css`) |
| `direction="left"` / `direction="right"` on symmetrical columns | Use `direction="start"` / `direction="end"` so RTL locales mirror cleanly |
| Wrapping `.reveal` two levels deep inside `.reveal-stagger` | Make `.reveal` a direct child (`:scope > .reveal`), e.g. `<Reveal as="li">` |
| Putting long `data-delay="500"` on the primary above-the-fold `<h1>` | Keep hero `<h1>` at `delay={undefined}` or `delay={50}` to protect LCP |
| Scrollable modal/dropdown missing `data-lenis-prevent` | Add `data-lenis-prevent` on any `overflow-y-auto` overlay or panel |
| Adding `scroll-behavior: smooth` to `html` | Keep `html { scroll-behavior: auto; }` so Lenis inertia does not stutter |
