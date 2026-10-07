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
- **Note**: Stemming is not enabled for `fa` in Pagefind, but exact sub-word and token matching works as expected out of the box.
- **Result**: PASSED.

---
*Date*: 2026-10-07  
*Environment*: Node.js 22, Astro 7
