```markdown
# Production-Ready Guide: Astro v7 + Lenis + Progressive Fade-In Animations

A complete, production-ready setup for **Astro v7** that includes:

- **Lenis** smooth scrolling (latest version)
- **Fade-in / reveal animations** using Intersection Observer
- Full **progressive enhancement** (content remains fully visible and usable with JavaScript disabled)
- Proper **View Transitions** support
- Mobile & tablet compatibility
- Stagger support (manual + automatic)

---

## 1. Installation

```bash
npm install lenis
# or
pnpm add lenis
# or
yarn add lenis
```

---

## 2. Recommended Folder Structure

```
src/
├── components/
│   └── Reveal.astro
├── layouts/
│   └── Layout.astro
├── scripts/
│   ├── lenis.ts
│   └── reveal.ts
├── styles/
│   ├── global.css
│   └── reveal.css
└── pages/
    └── index.astro
```

---

## 3. Progressive Enhancement Foundation

**Never hide content with CSS that depends on JavaScript.**  
Only apply the “hidden” state *after* JavaScript has confirmed it is running.

### `src/layouts/Layout.astro`

```astro
---
import { ClientRouter } from "astro:transitions";
import "../styles/global.css";
import "../styles/reveal.css";
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your Site</title>
    <ClientRouter />
  </head>
  <body>
    <slot />

    <!-- Critical: add .js as early as possible -->
    <script is:inline>
      document.documentElement.classList.add("js");
    </script>

    <script>
      import "../scripts/lenis";
      import "../scripts/reveal";
    </script>
  </body>
</html>
```

---

## 4. Global Styles + Lenis CSS

### `src/styles/global.css`

```css
@import "lenis/dist/lenis.css";

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: auto; /* Prevent conflict with Lenis */
}

body {
  margin: 0;
}
```

---

## 5. Reveal System (CSS)

### `src/styles/reveal.css`

```css
/* =========================================
   Progressive Reveal System
   Only active when .js is present on <html>
   ========================================= */

.js .reveal {
  opacity: 0;
  transform: translateY(1.5rem);
  transition:
    opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

/* Direction variants */
.js .reveal[data-reveal="up"] {
  transform: translateY(1.5rem);
}
.js .reveal[data-reveal="down"] {
  transform: translateY(-1.5rem);
}
.js .reveal[data-reveal="left"] {
  transform: translateX(1.5rem);
}
.js .reveal[data-reveal="right"] {
  transform: translateX(-1.5rem);
}
.js .reveal[data-reveal="scale"] {
  transform: scale(0.96);
}

/* Visible state */
.js .reveal.is-visible {
  opacity: 1;
  transform: none;
}

/* Manual delays */
.js .reveal[data-delay="50"]  { transition-delay: 0.05s; }
.js .reveal[data-delay="100"] { transition-delay: 0.1s; }
.js .reveal[data-delay="150"] { transition-delay: 0.15s; }
.js .reveal[data-delay="200"] { transition-delay: 0.2s; }
.js .reveal[data-delay="250"] { transition-delay: 0.25s; }
.js .reveal[data-delay="300"] { transition-delay: 0.3s; }
.js .reveal[data-delay="400"] { transition-delay: 0.4s; }
.js .reveal[data-delay="500"] { transition-delay: 0.5s; }

/* Automatic stagger for children */
.js .reveal-stagger > .reveal {
  transition-delay: calc(var(--stagger-index, 0) * 0.08s);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .js .reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
```

---

## 6. Reveal Script (Intersection Observer + Stagger)

### `src/scripts/reveal.ts`

```ts
const REVEAL_SELECTOR = ".reveal";
const VISIBLE_CLASS = "is-visible";

function initReveals() {
  // Respect reduced motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
      el.classList.add(VISIBLE_CLASS);
    });
    return;
  }

  // Automatic stagger: assign --stagger-index to direct children
  document.querySelectorAll(".reveal-stagger").forEach((group) => {
    const children = group.querySelectorAll(":scope > .reveal");
    children.forEach((child, index) => {
      (child as HTMLElement).style.setProperty("--stagger-index", String(index));
    });
  });

  const elements = document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);

  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(VISIBLE_CLASS);
          obs.unobserve(entry.target); // one-shot reveal
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -6% 0px",
    }
  );

  elements.forEach((el) => observer.observe(el));
}

// Run on initial load and after every View Transition
document.addEventListener("astro:page-load", initReveals);
initReveals();
```

---

## 7. Lenis Setup with View Transitions Support

### `src/scripts/lenis.ts`

```ts
import Lenis from "lenis";

let lenis: Lenis | null = null;

function initLenis() {
  // Destroy previous instance (critical for View Transitions)
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }

  // Skip on reduced motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.09,
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: "vertical",
    gestureOrientation: "vertical",
    smoothWheel: true,
    syncTouch: false,           // Keep native feel on touch devices
    touchMultiplier: 1.4,
    anchors: true,
    allowNestedScroll: true,
    stopInertiaOnNavigate: true,
    autoToggle: true,
    respectReducedMotion: true,
  });

  // Optional: expose for debugging
  (window as any).lenis = lenis;
}

// Clean up before Astro swaps the page
document.addEventListener("astro:before-swap", () => {
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
});

// Re-initialize after the new page is ready
document.addEventListener("astro:page-load", initLenis);

// Initial run
initLenis();
```

> **Note:** There has been an intermittent issue with Astro’s scroll restoration and the `scrollend` event when using Lenis. If you experience excessive history entries or navigation warnings (especially in Firefox), add this temporary mitigation early in the layout:
>
> ```html
> <script is:inline>
>   if (typeof window !== "undefined") {
>     // @ts-ignore
>     delete window.onscrollend;
>   }
> </script>
> ```

---

## 8. How to Use Reveal Classes

### Basic Usage

```astro
<section>
  <h1 class="reveal" data-reveal="up">Beautiful headline</h1>
  <p class="reveal" data-reveal="up" data-delay="150">
    Supporting text that fades in slightly later.
  </p>
</section>
```

### Available Options

| Attribute / Class              | Effect                          |
|--------------------------------|---------------------------------|
| `class="reveal"`               | Base reveal (default up)        |
| `data-reveal="up"`             | From below                      |
| `data-reveal="down"`           | From above                      |
| `data-reveal="left"`           | From right                      |
| `data-reveal="right"`          | From left                       |
| `data-reveal="scale"`          | Subtle scale-up                 |
| `data-delay="50"` … `"500"`    | Manual delay                    |
| `class="reveal-stagger"`       | Automatic stagger on children   |

### Automatic Stagger Example

```astro
<div class="reveal-stagger">
  <div class="reveal" data-reveal="up">Item 1</div>
  <div class="reveal" data-reveal="up">Item 2</div>
  <div class="reveal" data-reveal="up">Item 3</div>
  <div class="reveal" data-reveal="up">Item 4</div>
</div>
```

### Optional Reusable Component

#### `src/components/Reveal.astro`

```astro
---
interface Props {
  as?: keyof HTMLElementTagNameMap;
  direction?: "up" | "down" | "left" | "right" | "scale";
  delay?: 50 | 100 | 150 | 200 | 250 | 300 | 400 | 500;
  class?: string;
}

const {
  as: Tag = "div",
  direction = "up",
  delay,
  class: className = "",
  ...rest
} = Astro.props;
---

<Tag
  class:list={["reveal", className]}
  data-reveal={direction}
  data-delay={delay}
  {...rest}
>
  <slot />
</Tag>
```

**Usage:**

```astro
<Reveal direction="up" delay={200}>
  <h2>Staggered content</h2>
</Reveal>
```

---

## 9. Mobile & Tablet Compatibility

| Topic                        | Recommendation                                      |
|-----------------------------|-----------------------------------------------------|
| Touch devices               | Keep `syncTouch: false` (native momentum is better) |
| Nested scroll (modals etc.) | Use `data-lenis-prevent` or `allowNestedScroll`     |
| iOS Safari                  | Avoid heavy transforms + filters on same elements   |
| Performance                 | Prefer fewer simultaneous reveals on mobile         |
| Viewport units              | Prefer `dvh` / `svh` over `100vh`                   |
| Reduced motion              | Already handled in both CSS + JS                    |

Optional: disable Lenis entirely on coarse pointers (touch-primary devices):

```ts
const isTouchPrimary = window.matchMedia("(pointer: coarse)").matches;

if (!isTouchPrimary) {
  // init Lenis
}
```

Most projects keep Lenis enabled on tablets but rely on native scrolling behavior on phones.

---

## 10. Best Practices & Common Pitfalls

### Do
- Always scope hiding styles under `.js`
- Destroy Lenis on `astro:before-swap` and re-init on `astro:page-load`
- Use `unobserve` after a one-shot reveal
- Honor `prefers-reduced-motion` in both CSS and JS
- Keep `lerp` between `0.07–0.12`
- Use `data-lenis-prevent` on modals and nested scroll areas when needed

### Don’t
- Hide content with `opacity: 0` in global CSS
- Create a new Lenis instance without destroying the previous one
- Animate too many elements at once on mobile
- Rely on `scroll-behavior: smooth` while Lenis is active
- Forget to re-run reveal observation after View Transitions

### Accessibility
- Reduced-motion users get instant visibility
- Content is always in the DOM and readable by screen readers
- Focus management remains native

---

## 11. Quick Checklist

1. `npm install lenis`
2. Import Lenis CSS in global styles
3. Add the early `document.documentElement.classList.add("js")` script
4. Create `lenis.ts` and `reveal.ts` with the lifecycle handlers
5. Import both scripts in the layout
6. Add `.reveal` + optional `data-reveal` / `data-delay` to elements
7. Use `.reveal-stagger` for automatic group staggering
8. Test with JavaScript disabled (everything must remain visible)
9. Test with View Transitions enabled and with reduced-motion preference on

---

This setup is production-ready, maintains strong Core Web Vitals, and degrades gracefully.
```