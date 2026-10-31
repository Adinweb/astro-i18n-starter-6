# Spikes & Validation Results

## Spike 1: Paraglide ICU Plural & Selectordinal Verification
- **Engine**: `@inlang/paraglide-js` v2.26.0 with `@inlang/plugin-message-format` v4.4.0.
- **Verification**: Verified that Paraglide compiles complex message declarations (`input count`, `local countPlural = count: plural` and `local posOrdinal = pos: plural type=ordinal`) into strongly-typed JavaScript functions in `src/paraglide/messages/items_count.js` and `src/paraglide/messages/position_ordinal.js`.
- **Pluralization**: Under the hood, Paraglide wires `Intl.PluralRules(locale).select(count)` to match rules (`one`, `other`). Tested in English (`item`/`items`), German (`Element`/`Elemente`), and Persian (`مورد`).
- **Ordinal Selection**: Uses `Intl.PluralRules(locale, { type: 'ordinal' })`. Tested with English (`1st`, `2nd`, `3rd`, `4th`), German (`1.`, `2.`), and Persian (`۱م`, `۲م`).
- **Result**: PASSED. Clean, zero-runtime overhead, tree-shakeable ES modules generated.

## Spike 2: Pagefind Indexing Compatibility with Persian (RTL) Text
- **Engine**: `pagefind` v1.5.2 (Extended).
- **Verification**: Tested indexing an HTML file marked with `<html lang="fa" dir="rtl">` containing Persian content (`وبلاگ فارسی`, `اولین پست وبلاگ`).
- **Language Detection**: Pagefind correctly discovered `fa` language, tokenized 14 words, and generated multi-language search chunks in `dist/pagefind/`.
- **Note**: Stemming is not enabled for `fa` in Pagefind, and empirical testing against real Persian prose surfaced five edge cases:
  1. Space-separated Persian compound queries (`صفحه بندی`, `راست به چپ`) missed ZWNJ-joined words (`صفحه‌بندی`, `راست‌به‌چپ`) because Pagefind splits spaces into separate prefix terms while NFKD only aliases `صفحه‌بندی` → `صفحهبندی`.
  2. Arabic keyboard characters (`ي`/`ى`, `ك`) missed Persian (`ی`, `ک`).
  3. Perso-Arabic punctuation (`«منبع`, `بومی‌سازی،`) glued onto adjacent tokens in Pagefind's non-stemmed tokenizer.
  4. `ارایه` missed `ارائه` because NFKD decomposes `ئ` (`\u0626`) to Arabic `\u064A` rather than Persian `\u06CC`.
  5. ASCII digits (`1405`, `01`) missed Persian numerals (`۱۴۰۵`, `۰۱`).
- **Enhancement (`scripts/index-pagefind.mjs` + `src/libs/search/persian.ts`)**:
  - Build-time Node API indexer normalizes `ي`/`ى` → `ی` and `ك` → `ک` in memory and isolates `[«»،؛؟٪٬]` with `\u200A` hair spaces outside `<script>/<style>/<pre>/<code>/<svg>` without mutating `dist/*.html` on disk.
  - Client search (`buildSearchQueryVariants` & `matchesFallbackSearch`) expands space/ZWNJ compounds, hamza/yeh pairs, and Persian/ASCII numeral variants across both Pagefind WASM and `/api/search-dev/<locale>.json` fallback mode.
- **Result**: PASSED (verified end-to-end against compiled WASM index and Vitest suite).

---
*Date*: 2026-10-31  
*Environment*: Node.js 22, Astro 7
