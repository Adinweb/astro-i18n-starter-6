/**
 * The slug of a scaffolded content entry.
 *
 * A slug is unique per locale, not per group: the same string may be used in
 * two languages, because the locale prefix is what separates the URLs
 * (`/my-post/` and `/de/my-post/`).
 *
 * The source locale and the default locale own the canonical slug of the
 * group, so the article is reachable under its plain name. Every other locale
 * gets a placeholder (`my-post-de`) until a native slug is set with
 * `--slug:<locale>=…`, because a translated slug cannot be invented from a
 * `[TODO: …]` title.
 */
export function resolveSlug(locale, group, sourceLocale, defaultLocale, slugsByLocale = {}) {
  const explicit = slugsByLocale?.[locale];
  if (explicit) return explicit;
  if (locale === sourceLocale || locale === defaultLocale) return group;
  return `${group}-${locale}`;
}
