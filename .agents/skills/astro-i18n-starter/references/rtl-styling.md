# RTL Discipline & Styling Guidelines Reference

This reference documents the bidirectional design system, CSS logical property rules, font stacks, prose isolation, semantic OKLCH tokens, and SVG icon catalog.

---

## 1. CSS Logical Properties (Mandatory)

Never use physical directional utilities. Always use logical properties:

| Physical Utility (FORBIDDEN ❌) | Logical Utility (REQUIRED ✅) | CSS Equivalent |
| :--- | :--- | :--- |
| `ml-*`, `mr-*` | `ms-*`, `me-*` | `margin-inline-start`, `margin-inline-end` |
| `pl-*`, `pr-*` | `ps-*`, `pe-*` | `padding-inline-start`, `padding-inline-end` |
| `left-*`, `right-*` | `start-*`, `end-*` | `inset-inline-start`, `inset-inline-end` |
| `text-left`, `text-right` | `text-start`, `text-end` | `text-align: start`, `text-align: end` |
| `border-l-*`, `border-r-*` | `border-s-*`, `border-e-*` | `border-inline-start`, `border-inline-end` |
| `rounded-l-*`, `rounded-r-*` | `rounded-s-*`, `rounded-e-*` | `border-start-*-radius`, `border-end-*-radius` |
| Directional arrows | `rtl:rotate-180` / `rotate-180 rtl:rotate-0` | Mirrors icon based on `dir="rtl"` |

---

## 2. Bidirectional Typography & Font Stacks

Fonts are variable and self-hosted via `@fontsource-variable/*` packages:
* **Latin (`en`, `de`, `fr`)**: System sans stack (`var(--font-sans)`).
* **Persian (`fa`)**: `Vazirmatn Variable` (`var(--font-fa)`).
* **Arabic (`ar`)**: `Noto Sans Arabic Variable` (`var(--font-ar)`).

### CSS `:lang()` Rules
In `src/styles/global.css`, font stacks are bound by language pseudo-class:
```css
:lang(en), :lang(de), :lang(fr) { font-family: var(--font-sans); }
:lang(fa) { font-family: var(--font-fa); }
:lang(ar) { font-family: var(--font-ar); }
```
This guarantees bidirectional purity: Latin snippets inside a Persian article (`<span lang="en">`) keep Latin typography, while Persian quotes inside an English post keep Vazirmatn.

---

## 3. LTR Code Block Isolation

In `src/styles/prose.css`, code elements and equations are strictly isolated to `ltr` regardless of document direction:
```css
pre, code, .math {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate;
}
```

---

## 4. Semantic OKLCH Palette Tokens

All colors are defined once in `src/styles/global.css` using OKLCH and exposed via Tailwind v4 `@theme static inline`:

| Token | Semantic Role |
| :--- | :--- |
| `--color-bg` | Main page background |
| `--color-surface` | Card and panel surface |
| `--color-surface-hover` | Raised / hovered surface |
| `--color-fg` | Primary body text |
| `--color-muted` | Secondary / caption text |
| `--color-border` | Subtle dividing hairline |
| `--color-primary` / `--color-primary-fg` | Main brand role & contrasting text (CTA, active links) |
| `--color-secondary` / `--color-secondary-fg` | Complementary brand accent (purple) |
| `--color-accent` / `--color-accent-fg` | Decorative highlight (cyan) |
| `--color-neutral` / `--color-neutral-fg` | Dark neutral surface (badges, dark pill tags) |
| `--color-info`, `--color-success`, `--color-warning`, `--color-error` | Status roles with corresponding `-fg` text partners |
| `--color-hero-base` | Dark mode-independent base behind hero artwork |
| `--color-glass`, `--color-glass-border`, `--shadow-glass` | Translucent frosted-glass system |

### Two-Mode Contrast
Every role clears **WCAG AA (4.5:1)** contrast against its respective `-fg` counterpart in both light and dark mode.

---

## 5. SVG Sprite Catalog (`src/pages/icons.svg.ts`)

Never embed raw `<svg><path ...></svg>` in templates. Use `<Icon name="..." />` or `<IconButton icon="..." label="..." />`.

### Available Icon Names:
1. `search` — magnifying glass for search triggers and inputs
2. `globe` — internationalization language switcher icon
3. `close` — dismiss / exit modal and drawer icon
4. `check` — confirmation checkmark for copied state and active locale
5. `menu` — hamburger toggle for mobile drawer navigation
6. `chevron-left` — back / previous navigation arrow (flipped in RTL)
7. `chevron-right` — forward / sub-dropdown arrow (flipped in RTL with `rtl:rotate-180`)
8. `chevron-down` — dropdown accordion expand indicator
9. `sun` — light theme indicator
10. `moon` — dark theme indicator
11. `copy` — clipboard copy action icon for code blocks
12. `external-link` — outbound link indicator for docs and external URLs
