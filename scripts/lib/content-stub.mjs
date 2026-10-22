/**
 * Placeholder body copy for scaffolded content.
 *
 * `new:page` and `new:post` (both creation and fallback updates) and
 * `add-language` create entries before real copy exists; sharing the strings
 * keeps every generated file consistent and keeps the translations out of the
 * command implementations.
 */

const PAGE_STUBS = {
  fa: 'محتوا به زودی افزوده خواهد شد...',
  ar: 'سيتم إضافة المحتوى قريبًا...',
  de: 'Inhalt folgt in Kürze...',
  fr: 'Contenu à venir...',
};

const POST_STUBS = {
  fa: 'متن این مقاله در حال نگارش است...',
  ar: 'نص هذا المقال قيد الكتابة...',
  de: 'Dieser Artikel wird gerade geschrieben...',
  fr: 'Cet article est en cours de rédaction...',
};

export function contentStub(locale) {
  return PAGE_STUBS[locale] ?? 'Content coming soon...';
}

export function postStub(locale) {
  return POST_STUBS[locale] ?? 'Article content goes here...';
}
