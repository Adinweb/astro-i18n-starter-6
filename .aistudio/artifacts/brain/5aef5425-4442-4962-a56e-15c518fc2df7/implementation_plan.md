# ChronoTrig Scroll Animation Restoration & Architectural Fix

A robust, production-grade fix for the ChronoTrig scroll animation system in this Astro v7 SSG starter. This plan addresses the root causes preventing animations from firing on hero titles, subtitles, section headings, and content cards, while honoring the user's explicit preference for cascading staggers on desktop and instant visibility on mobile devices.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions have been confirmed through Phase 1 clarification:

- **Confirmed Decision 1 (Scope)**: All page heroes, section titles, subtitles, and grid cards participate in scroll reveals.
- **Confirmed Decision 2 (Entrance Style)**: Smooth bottom reveal with harmonic cascading staggers (`data-trig-stagger`) and RTL-native logical property mirroring (`start`/`end`).
- **Confirmed Decision 3 (Mobile Experience)**: Instant visibility without scroll animations on mobile and touch devices, avoiding scrolljacking, touch conflicts, or un-revealed element states.

---

## 1. Overview & Root Cause Analysis

### The Problem
When trying to implement scroll animations with `public/chronotrig.min.js`, no animations were applied to elements, titles, subtitles, or cards. Investigation of the codebase revealed five intersecting failure points:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FAILURE CHAIN IN CHRONOTRIG                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Flawed Mobile Detection in chronotrig.min.js                        │
│    `navigator.maxTouchPoints > 0` triggered mobile mode on modern      │
│    laptops & monitors, bypassing or stalling observer loops.           │
│                                                                        │
│ 2. Heading Selector Hierarchy Disconnect in chronotrig.ts              │
│    `.prose > h2, .prose > h3` failed because Astro/MDX wraps sections  │
│    inside `<section id="...">` (grandchildren of `.prose`).            │
│                                                                        │
│ 3. Tailwind v4 Utility Conflict                                        │
│    `transition duration-200` on card classes stomped on                │
│    ChronoTrig's `transition` timing and `--stagger-delay`.             │
│                                                                        │
│ 4. Double-Trigger Stagger Race Condition                               │
│    Child cards had both `data-trig` and parent `data-trig-stagger`,     │
│    causing individual observers to fire before stagger calculation.    │
│                                                                        │
│ 5. Mobile & View Transition Desynchronization                          │
│    Elements scoped under `.js [data-trig]` were hidden (`opacity: 0`)  │
│    but not transitioned when mobile mode disabled ticks.               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Architecture & Repair Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                         RESTORED ARCHITECTURE                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  BaseLayout.astro                                                      │
│    ├── Synchronous `.js` tag on <html> (No-JS / CLS fallback)         │
│    ├── Inline <script src="/chronotrig.min.js"> in <head>              │
│    └── Module scripts: lenis.ts & chronotrig.ts                        │
│          ├── Lenis: Smooth wheel inertia (desktop only)                │
│          └── chronotrig.ts: Auto-tagging & View Transition lifecycle    │
│                                                                        │
│  src/styles/chronotrig.css                                             │
│    ├── Desktop (@media min-width: 1024px):                             │
│    │     .js [data-trig] -> bottom entrance (0, 24px, 0) -> .trig      │
│    │     .js [data-trig-stagger] > * -> cascading delay -> .trig-active│
│    │     RTL support via logical properties (start/end mirroring)      │
│    └── Mobile (@media max-width: 1023px) & Reduced Motion:             │
│          Instant visibility (opacity: 1, transform: none, no delays)   │
│                                                                        │
│  Views & Content Collections                                           │
│    ├── PageHero / HeroCopy: [data-trig] on hero copy & kicker          │
│    ├── MDX Content: Deep heading auto-tagging (.prose h2, h3, kickers) │
│    ├── Blog Index & PostCard: Harmonic [data-trig-stagger] grids       │
│    └── Features & Pricing: Harmonic [data-trig-stagger] grids          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Product & Technical Decisions

### Decision 1: Mobile Detection & Responsive Execution
- **Chosen Approach**: Decouple mobile behavior from fragile `navigator.maxTouchPoints`. Use pure CSS media queries (`@media (max-width: 1023px)`) for the mobile instant-visibility contract and clean viewport width thresholds (`window.innerWidth < 1024`) in JavaScript.
- **Why**: Modern desktop touch displays and laptops must not be falsely treated as phones. On phones and tablets ($< 1024\text{px}$), elements render immediately without waiting for scroll events, satisfying the user's explicit preference.

### Decision 2: Deep Heading & Subtitle Auto-Tagging
- **Chosen Approach**: Update `setupChronoTrig()` in `src/scripts/chronotrig.ts` to use `.prose h2, .prose h3, .prose .section-kicker, [data-prose-reveal]` (descendant selectors instead of direct child `>`).
- **Why**: MDX pages structure content in semantic `<section>` and `<div>` tags. Descendant selection ensures every heading and section subtitle receives smooth bottom reveal instrumentation automatically.

### Decision 3: Resolving CSS Specificity & Tailwind Transitions
- **Chosen Approach**: Ensure `.js [data-trig]` and `.js [data-trig-stagger] > *` transition definitions use appropriate specificity or explicit transition properties that override Tailwind's default 200ms utility classes on card components without breaking hover feedback.
- **Why**: Cards need smooth 650–750ms entrance transitions with cascading delays, while preserving snappy hover lift effects once revealed.

### Decision 4: Coordinating with Lenis & Astro ClientRouter
- **Chosen Approach**: Re-scan elements on `astro:page-load`, recalculate on `refreshChronoTrig()`, and synchronize the scroll tick with Lenis scroll events and window scroll.
- **Why**: Guarantees zero stale state or frozen hidden cards when navigating between pages or switching languages statically.

---

## 4. Verification Plan

1. **Automated Verification**:
   - `npm test`: Verify all 17 test suites (format, ICU, navigation, ChronoTrig, Lenis) pass without regressions.
   - `npm run check`: Verify TypeScript and Astro types.
   - `npm run build`: Verify clean production build and Pagefind search indexing.
2. **Browser & Runtime Verification**:
   - Verify desktop viewports ($\ge 1024\text{px}$) execute smooth bottom reveal animations on hero titles, section headings, subtitles, and grid cards.
   - Verify staggered grid cards cascade smoothly with natural delay.
   - Verify mobile screens ($< 1024\text{px}$) display all elements immediately with `opacity: 1` and zero layout shifts.
   - Verify RTL locales (`fa` and `ar`) mirror directional entrances seamlessly.
   - Verify page navigation via `<ClientRouter />` preserves animations on every transition.
