/**
 * Placeholder body copy for scaffolded content.
 *
 * `new:page` (both creation and fallback updates) and `add-language` create
 * entries before real copy exists; sharing the strings keeps every generated
 * file consistent and keeps the translations out of the command implementations.
 */

const STUBS = {
  fa: 'محتوا به زودی افزوده خواهد شد...',
  ar: 'سيتم إضافة المحتوى قريبًا...',
  de: 'Inhalt folgt in Kürze...',
  fr: 'Contenu à venir...',
};

export function contentStub(locale) {
  return STUBS[locale] ?? 'Content coming soon...';
}
