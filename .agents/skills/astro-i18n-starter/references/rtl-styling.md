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
| `bg-linear-to-r` | `bg-linear-to-r rtl:bg-linear-to-l` | Mirrors a horizontal gradient so its start colour sits at the reading start |
| `data-trig-direction="left"`, `="right"` | `data-trig-direction="start"`, `="end"` | Mirrors horizontal viewport entrance in RTL (`chronotrig.css`) |

---

## 2. Bidirectional Typography & Font Stacks

Fonts are self-hosted variable Latin/Arabic packages (`@fontsource-variable/plus-jakarta-sans`, `@fontsource-variable/manrope`, `@fontsource-variable/outfit`, `@fontsource-variable/dm-sans`, `@fontsource-variable/fraunces`, `@fontsource-variable/vazirmatn`, `@fontsource-variable/noto-sans-arabic`) plus commercial Persian `@font-face` scaffolding in `client/styles.css`, configurable through `brand.fontPreset` (`system`, `jakarta`, `manrope`, `outfit`, `editorial`) and `brand.rtlFontPreset` (`vazirmatn`, `noto-arabic`, `iransans`, `yekan-bakh`, `peyda`) in `client/config.json` / `app.config.json` (`src/libs/config/theme.ts` + `theme-presets.json`):
* **Latin (`en`, `de`, `fr`)**: Configurable display/sans stacks (`--font-sans`, `--font-display`), defaulting to `system`.
* **Persian (`fa`)**: `Vazirmatn Variable`, `Noto Sans Arabic Variable`, or commercial self-hosted `IRANSansX`, `Yekan Bakh`, `Peyda` stacks (`--font-fa`), defaulting to `vazirmatn`.
* **Arabic (`ar`)**: `Noto Sans Arabic Variable` (`--font-ar`).

### CSS `:lang()` Rules
In `src/styles/global.css`, font stacks are bound by language pseudo-class:
```css
:lang(en), :lang(de), :lang(fr) { font-family: var(--font-sans); }
:lang(fa) { font-family: var(--font-fa); }
:lang(ar) { font-family: var(--font-ar); }
```
This guarantees bidirectional purity: Latin snippets inside a Persian article (`<span lang="en">`) keep Latin typography, while Persian quotes inside an English post keep Vazirmatn.

### Cursive RTL Letter-Spacing Protection
Positive or negative `letter-spacing` (`tracking-*`) disconnects joined Persian and Arabic glyphs. `src/styles/global.css` automatically zeroes `letter-spacing` inside `:lang(fa)` and `:lang(ar)` while preserving explicit Latin islands (`[dir='ltr']`, `:lang(en)`).

---

## 3. LTR Code Block & Form Input Isolation

In `src/styles/prose.css`, code elements and equations are strictly isolated to `ltr` regardless of document direction:
```css
pre, code, .math {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate;
}
```

For LTR-valued form fields (`type="email"`, `type="tel"`, `type="datetime-local"`), apply `dir="ltr"` with `text-start rtl:text-end` so characters keep LTR bidi order while aligning flush to the inline-start (right) edge in RTL forms. Wrap inline ASCII codes (`ID-1024`) inside `<bdi dir="ltr">`.

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
| `--color-hero-base` / `--color-hero-fg` | Mode-independent dark hero base & foreground text over hero artwork |
| `--color-scrim` | Translucent dark backdrop/media scrim |
| `--color-glass`, `--color-glass-border`, `--shadow-glass` | Translucent frosted-glass system |

### Shared Layout & Semantic Component Classes (`@layer components` in `global.css`)
Never re-declare container widths, buttons, chips, kickers, or raw `text-white`/`bg-black` utilities in components. Compose:
- `.layout-container` — standard desktop width (`max-w-7xl` / `1280px`) with responsive logical inline gutters (`px-4 sm:px-6 lg:px-8`), used across header, footer, blog, and `<PageSection>`
- `.prose-wide` — full container-width `.prose` variant (`max-w: none`) for `container: 'contained'` pages (declared in `src/styles/prose.css`, not `global.css`)
- `.glass-surface`, `.glass-control`, `.ghost-control`
- `.cta`, `.btn-secondary`, `.btn-hero-secondary` — consumed through `Button.astro`, never re-applied by hand to an `<a>` or `<button>`
- `.chip` (automatically styled when `[aria-selected='true']`, `[aria-current='true']`, or `[aria-current='page']`)
- `.hero-badge`, `.section-kicker`
- Reusable page shells: `PageSection.astro` (full-bleed surface bands + `.layout-container`), `PageHeader.astro` (`hero: 'minimal'`), and `PageHero.astro` (`hero: 'default'` & blog)

### Brand Palette Presets, Hex Overrides & DEV Theme Studio (`src/libs/config/theme.ts` + `client/styles.css`)
`client/config.json` (merged onto `app.config.json`) → `brand.preset` supports 6 curated OKLCH-safe palettes (`indigo`, `cobalt`, `emerald`, `amber`, `slate`, `rose` defined in `theme-presets.json`) plus optional `brand.primaryColor` / `brand.accentColor` hex overrides and Light/Dark `brand.logo` overrides. `BaseLayout.astro` computes light and dark `--theme-*` overrides at build time (verified to meet WCAG AA contrast) and binds `--font-sans`, `--font-display`, and `--font-fa`. In `npm run dev`, `DevThemePreview.astro` (`import.meta.env.DEV`-only, 0 bytes in `dist/`) lets developers preview palettes, custom hex values, and Latin/RTL font presets and copy the `client/config.json` snippet. Client-specific CSS overrides and commercial Persian `@font-face` rules live in `client/styles.css`, imported at the end of `src/styles/global.css`.

### Two-Mode Contrast
Every role clears **WCAG AA (4.5:1)** contrast against its respective `-fg` counterpart in both light and dark mode.

---

## 5. Icon Catalog (`@tabler/icons-astro` + `client/icons.ts`)

Never embed raw `<svg><path ...></svg>` in templates or write SVG paths in client code. Every glyph comes from the Tabler set through `<Icon name="..." />` or `<IconButton icon="..." label="..." />`; core semantic names (66 icons) live in `src/libs/ui/icons.ts` (`SITE_ICONS`), and client-added names register in `client/icons.ts` (`CLIENT_ICONS`, `CLIENT_DIRECTIONAL_ICONS`) with components mapped in `client/ClientIcons.astro`.

**Always import the per-icon module** (`@tabler/icons-astro/dist/esm/icons/<name>.mjs`), never the package barrel: the barrel re-exports all 6,258 icons, so the bundler reads the whole set before tree-shaking it away (measured ≈ +2–7 s per build here, for identical HTML). Types for those deep modules are declared in `src/types/tabler-icons-astro.d.ts`.

Icons render inline — no sprite request and no empty `<use>` tiles. Anything that appears after load is cloned from a server-rendered `<template data-icon-template="…">` (blog pager, empty state), and a two-state control renders both glyphs for CSS to choose (`theme-icon-sun`/`theme-icon-moon`, `code-copy-copy`/`code-copy-check`).

Every text button is `<Button>`: colour from `variant` (`primary`/`secondary`/`hero`/`ghost`/`glass`), scale from `size` (`sm`/`md`/`lg`/`auto`), plus `icon` and the label. It renders an `<a>` when given `href` and a `<button>` otherwise, and `arrow-right` / `chevron-left` / `chevron-right` mirror in RTL and nudge forward on hover. The class recipe lives in `src/libs/ui/button.ts`, so client-side renderers (the blog pager) produce the same control.

### Available Icon Names:
1. `search` — search triggers and inputs (Tabler `search`)
2. `globe` — language switcher and RTL notes (`world`)
3. `close` — dismiss / exit modal and drawer (`x`)
4. `check` — confirmation for the copied state and the active locale (`check`)
5. `menu` — hamburger toggle for the mobile drawer (`menu-2`)
6. `chevron-left` — back / previous arrow (mirrored in RTL)
7. `chevron-right` — forward / sub-dropdown arrow (mirrored in RTL)
8. `chevron-down` — dropdown and accordion indicator
9. `sun` — shown while the page is dark
10. `moon` — shown while the page is light
11. `copy` — code-block copy action
12. `external-link` — outbound links
13. `arrow-right` — call-to-action arrow (`Button` rotates it in RTL by itself)
14. `shield` — privacy and cookie consent (`shield-check`)
15. `mail` — contact and inquiry notice
16. `layers` — architecture and Resources markers (`stack-2`)
17. `home`, `info`, `sparkles`, `tag`, `newspaper`, `folder`, `compass`, `palette`, `book-open`, `star`, `star-filled`, `quote`, `users`, `building`, `alert-circle`, `alert-triangle`, `circle-check`, `bell`, `bolt`, `clock`, `map-pin`, `map`, `phone`, `rocket`, `code`, `award`, `layout-grid`, `calendar`, `photo`, `minus`, `eye`, `eye-off`, `shopping-bag`, `heart`, `share`, `filter`, `refresh`, `wand`, `chevron-up`, `dots-vertical`, `lock`, `user`, `adjustments-horizontal`, `brand-github`, `brand-x`, `brand-linkedin`, `brand-instagram`, `brand-telegram`, `brand-whatsapp`, `file` — navigation, status, filter, business quick-action, UI block, commerce/social, and partner emblem icons (66 core total, plus any names added in `client/icons.ts`); an unknown name resolves to `file`.

### Navigation Icons:
The mobile drawer renders one icon tile per row, so every navigation entry carries an `icon` from this catalog (`NavItem.icon` in `client/navigation.ts` / `src/libs/config/navigation.ts`; a row without one falls back to `file`):

| Key | Icon |
| :--- | :--- |
| `home` | `home` |
| `about` | `info` |
| `features` | `sparkles` |
| `pricing` | `tag` |
| `blog` (content type) | `newspaper` |
| `projects` (content type) | `folder` |
| `resources` | `layers` |
| `overview` | `book-open` |
| `explore` | `compass` |
| `rtl_support` | `globe` |
| `design_system` | `palette` |
| fallback | `file` |

`getContentTypeIcon(key)` resolves a content type's row icon (`layers` for a newly registered type), so a registry-driven menu never renders an empty tile.
