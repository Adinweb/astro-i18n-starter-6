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
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './frontmatter.mjs';

export function resolveSlug(locale, group, sourceLocale, defaultLocale, slugsByLocale = {}) {
  const explicit = slugsByLocale?.[locale];
  if (explicit) return explicit;
  if (locale === sourceLocale || locale === defaultLocale) return group;
  return `${group}-${locale}`;
}

/**
 * Whether a slug is still the `<group>-<locale>` placeholder of `resolveSlug`.
 *
 * The placeholder keeps the build valid — an empty slug cannot be routed — but
 * it is not a URL anybody wants to ship: `/fa/services-fa/` reads like a bug,
 * ranks for nothing and looks borrowed from another language.
 */
export function isPlaceholderSlug(group, locale, slug) {
  return typeof slug === 'string' && slug === `${group}-${locale}`;
}

/**
 * Reads the placeholder slugs of one scaffolded group back from its files.
 *
 * Scanning the entries instead of recomputing from the CLI arguments means the
 * report is true for creation, `--update` and hand-edited files alike.
 *
 * @param {string} groupDir Directory of the content group.
 * @param {string} group Group slug (folder name).
 * @param {string[]} locales Locales to inspect.
 * @returns {{ locale: string, slug: string }[]}
 */
export function findPlaceholderSlugs(groupDir, group, locales) {
  const found = [];
  for (const locale of locales) {
    const file = ['mdx', 'md']
      .map((ext) => path.join(groupDir, `${locale}.${ext}`))
      .find((candidate) => fs.existsSync(candidate));
    if (!file) continue;
    try {
      const { data } = parseFrontmatter(fs.readFileSync(file, 'utf-8'));
      if (isPlaceholderSlug(group, locale, data.slug)) {
        found.push({ locale, slug: data.slug });
      }
    } catch {
      // An unreadable entry is reported by doctor/audit, not here.
    }
  }
  return found;
}

/**
 * The warning lines for placeholder slugs, ready to print.
 *
 * Returned instead of logged so the CLIs keep one print order and tests can
 * assert the message without capturing stdout.
 *
 * @param {string} command CLI that owns the group (`new:page` / `new:post`).
 * @param {string} group Group slug.
 * @param {{ locale: string, slug: string }[]} placeholders Result of `findPlaceholderSlugs`.
 * @returns {string[]}
 */
export function placeholderSlugNotice(command, group, placeholders) {
  if (placeholders.length === 0) return [];
  const list = placeholders.map((entry) => `${entry.locale} → "${entry.slug}"`).join(', ');
  return [
    `⚠️ Placeholder slug(s): ${list}.`,
    '   They route and build, but they are not native URLs ("services-fa" instead of «خدمات»).',
    `   Give each language its own slug before publishing: pnpm run ${command} ${group} --update --slug:${placeholders[0].locale}="<native-slug>"`,
  ];
}
