# Plan: Clean Removal of Custom Scroll Reveal Animation (Preparation for trig.js)

Carefully remove the custom scroll-based reveal animation implementation across scripts, styles, layouts, views, and content components without breaking smooth scrolling, typography, RTL layouts, or build verification, leaving the codebase pristine and ready for `trig.js` integration.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following architectural decision:
> - **Animation Engine Pivot**: The custom IntersectionObserver-based reveal implementation (`src/scripts/reveal.ts`, `src/styles/reveal.css`, and custom classes) will be removed in favor of `trig.js`.
> - **Two-Step Execution**: In this first step, we will cleanly dismantle the custom scroll animation system so no elements are left hidden (`opacity: 0`) or stuck, while preserving all existing component layouts, semantic tags, and Lenis smooth scrolling. `trig.js` will be installed and configured in the subsequent step upon user instruction.

- **Confirmed Decision 1**: Completely remove custom scroll reveal classes and scripts (`src/scripts/reveal.ts`, `src/styles/reveal.css`, and references in layout/views).
- **Confirmed Decision 2**: Ensure `<Reveal as="tag">` and all `.reveal` markup in components gracefully render as standard semantic elements with 100% immediate visibility (zero CLS, no lingering hidden transforms).
- **Confirmed Decision 3**: Keep Lenis smooth scrolling (`src/scripts/lenis.ts`) fully functional and decoupled from the removed reveal observer.
- **Confirmed Decision 4**: Update unit tests and smoke tests so the test suite passes with zero regressions.

---

## 1. Overview & Clean Removal Strategy

The goal of this phase is to eliminate all legacy custom scroll-reveal logic while ensuring the application remains 100% operational, fully visible, and free of console errors or lingering `opacity: 0` states:

1. **Styles (`src/styles/reveal.css` & `src/styles/global.css`)**:
   - Neutralize `src/styles/reveal.css` so `.reveal` elements have `opacity: 1`, `transform: none`, and zero delayed visibility rules.
   - Remove the `@import '@/styles/reveal.css'` from `src/layouts/BaseLayout.astro`.
2. **Scripts (`src/scripts/reveal.ts`)**:
   - Safely remove or replace `src/scripts/reveal.ts` with no-op safe exports (`initReveals`, `replayReveals`, `cleanupReveals`) or remove all call sites across `BaseLayout.astro` and `BlogIndexView.astro`.
   - Remove reveal import and event bindings from `src/layouts/BaseLayout.astro`.
3. **Component Wrappers (`src/components/Reveal.astro`)**:
   - Update `<Reveal />` so it renders the target semantic tag (`<Tag class={className} {...rest}><slot /></Tag>`) cleanly without injecting legacy `.reveal` or `data-reveal` attributes.
4. **Views & MDX Pages**:
   - Clean up `src/views/PageView.astro` so `<Content />` renders cleanly inside standard `<article class="prose">`.
   - In `src/views/BlogIndexView.astro`, remove calls to `replayReveals` and `initReveals` in client filter scripts while maintaining dynamic filtering and pagination functionality.
5. **Lenis Decoupling (`src/scripts/lenis.ts`)**:
   - Ensure Lenis continues to handle smooth scrolling independently without any legacy dependencies on reveal scripts.
6. **Tests & Automation (`src/scripts/reveal.test.ts`, `smoke.mjs`)**:
   - Update or retire `src/scripts/reveal.test.ts` to reflect the removal of the custom observer, keeping all other 15 test suites and smoke assertions passing.

---

## 2. Technical Scope & Affected Areas

### Areas Being Cleaned

| File | Scope of Changes |
| :--- | :--- |
| `src/layouts/BaseLayout.astro` | Remove `import '@/styles/reveal.css'` and `import '@/scripts/reveal'`. Remove reveal initialization on `astro:page-load`. |
| `src/styles/reveal.css` | Remove custom `.js .reveal`, `:not(.reveal-complete)`, and directional translation styles. |
| `src/scripts/reveal.ts` | Remove custom IntersectionObserver, RAF loops, and viewport calculation functions. |
| `src/components/Reveal.astro` | Simplify to a lightweight semantic polymorphic tag wrapper (`as`, `class`, `...rest`) without `reveal` classes. |
| `src/views/PageView.astro` | Remove outer `<Reveal as="article">` wrapper; render plain `<article class="prose"><Content /></article>`. |
| `src/views/BlogIndexView.astro` | Remove `initReveals` and `replayReveals` imports and invocations from client filter handler. |
| `src/scripts/reveal.test.ts` | Update or replace tests to verify clean element visibility and smooth scroll isolation without custom reveal observer. |

---

## 3. Architecture & Transition Pipeline

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Current State (Custom)                           │
│  - reveal.css (.js .reveal { opacity: 0; transform: translateY... })        │
│  - reveal.ts (Complex IntersectionObserver + RAF viewport logic)             │
│  - Fragile iframe / reduced-motion gating                                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (Phase 1: This Plan)
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Clean Decoupled State                            │
│  - All elements 100% visible immediately (no opacity: 0 traps)               │
│  - Clean semantic HTML structure across pages and MDX                        │
│  - Lenis smooth scrolling preserved and independent                         │
│  - Zero console errors or stale listeners across Astro View Transitions      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (Phase 2: Next Step)
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Ready for trig.js Integration                          │
│  - Install trig.js                                                          │
│  - Add declarative trig.js scroll triggers to sections and bento grids       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Execution Steps

1. **Step 1: Simplify `<Reveal />` Component**:
   - In `src/components/Reveal.astro`, strip out `class="reveal"` and `data-reveal`. Forward all other props and classes so existing templates render standard tags.

2. **Step 2: Clean Up Layout & Views**:
   - Remove `import '@/styles/reveal.css'` and `import '@/scripts/reveal'` from `src/layouts/BaseLayout.astro`.
   - In `src/views/PageView.astro`, render `<article class="prose"><Content /></article>`.
   - In `src/views/BlogIndexView.astro`, remove reveal imports and `replayReveals` calls.

3. **Step 3: Remove Custom Reveal Scripts & Styles**:
   - Remove or neutralize `src/styles/reveal.css` and `src/scripts/reveal.ts`.

4. **Step 4: Update Tests & Verify**:
   - Update `src/scripts/reveal.test.ts` or replace it with a test verifying that `.reveal` elements and semantic pages render immediately visible without layout shifts.
   - Run `npm test` across all suites.
   - Run `npm run lint` and `npm run audit:i18n`.
   - Verify page rendering in browser/CDP to confirm all elements are visible and Lenis functions cleanly.
