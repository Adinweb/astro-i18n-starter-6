/**
 * Persian & Arabic search normalization and query-variant expansion utilities.
 *
 * Bridges the gap between user keyboard input (Arabic `ي`/`ك`, regular spaces
 * instead of ZWNJ `نیم‌فاصله`, ASCII vs. Persian digits, and hamza/yeh spelling
 * variations) and Pagefind's non-stemmed Persian index as well as the static
 * JSON fallback search index.
 */

const PERSIAN_SCRIPT_RE = /[\u0600-\u06FF]/;
const ASCII_DIGIT_RE = /[0-9]/g;
const PERSIAN_DIGIT_RE = /[\u06F0-\u06F9]/g;
const EASTERN_ARABIC_DIGIT_RE = /[\u0660-\u0669]/g;
const OPTIONAL_DIACRITICS_RE = /[\u0640\u064B-\u0652\u0656-\u065F\u0670\u200A]/g;
const PERSO_ARABIC_PUNCTUATION_RE = /[«»،؛؟٪٬]+/g;

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

const PRODUCTIVE_ZWNJ_SUFFIX_RE =
  /([\u0600-\u06FF\u200C]{2,})\s+(هایی|هایم|هایت|هایش|هایمان|هایتان|هایشان|های|ها|ترین|تر|سازی|بندی|گذاری|نگاری|رسانی|پذیری|پذیر|ناپذیر|کنندگان|کننده|دهنده|گیرنده|پردازی|پرداز|افزار|اسکریپت|اند|نامه|گرایی|گرا|محور|مدار|سنجی|شناسی|زدایی|آمیز|انگیز|آور|شونده|شده|شدن|ام|ای|است|ایم|اید)(?=\s|$)/g;

const PRODUCTIVE_ZWNJ_PREFIX_RE =
  /(^|\s)(ن?می|بی|هم|پیش|پس|درون|برون|فرا|فرو|زیر|نیمه|ضد|غیر|تمام|چند|تک|تایپ|فرانت|بک|فول|نرم|سخت|میان)\s+(?=[\u0600-\u06FF]{2,})/g;

const BE_ADVERBIAL_ZWNJ_RE =
  /(^|\s)به\s+(روزرسانی|روز|صورت|طور|ویژه|زودی|سادگی|خوبی|درستی|تازگی|مرور|تدریج|شدت|کلی|علاوه|همراه|عنوان|واسطه|جای)(?=\s|$|\u200C|ها|های)/g;

const DIRECTIONAL_PHRASE_RE = /(^|\s)(راست|چپ)\s+به\s+(چپ|راست)(?=\s|$)/g;
const INTERNATIONAL_PHRASE_RE = /(^|\s)بین\s+(المللی|الملل)(?=\s|$)/g;
const TWO_PERSIAN_WORDS_RE = /^([\u0600-\u06FF]{2,})\s+([\u0600-\u06FF]{2,})$/;

function toPersianDigits(value: string): string {
  return value
    .replace(EASTERN_ARABIC_DIGIT_RE, (ch) => PERSIAN_DIGITS[ch.charCodeAt(0) - 0x0660] ?? ch)
    .replace(ASCII_DIGIT_RE, (ch) => PERSIAN_DIGITS[ch.charCodeAt(0) - 0x30] ?? ch);
}

function toAsciiDigits(value: string): string {
  return value
    .replace(PERSIAN_DIGIT_RE, (ch) => String(ch.charCodeAt(0) - 0x06f0))
    .replace(EASTERN_ARABIC_DIGIT_RE, (ch) => String(ch.charCodeAt(0) - 0x0660));
}

/**
 * Normalizes Arabic/Persian character codepoints, digits, ZWNJ runs, and
 * punctuation in a user search query while keeping word boundaries intact.
 */
export function normalizePersianQuery(input: string): string {
  return input
    .replace(OPTIONAL_DIACRITICS_RE, '')
    .replace(/[\u064A\u0649]/g, '\u06CC') // ي / ى → ی
    .replace(/\u0643/g, '\u06A9') // ك → ک
    .replace(/\u06C0/g, '\u0647\u0654') // ۀ → هٔ
    .replace(EASTERN_ARABIC_DIGIT_RE, (ch) => PERSIAN_DIGITS[ch.charCodeAt(0) - 0x0660] ?? ch)
    .replace(PERSO_ARABIC_PUNCTUATION_RE, ' ')
    .replace(/\u200C{2,}/g, '\u200C')
    .replace(/\s*\u200C\s*/g, '\u200C')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts space-separated Persian affixes and compound stems into canonical
 * ZWNJ (`\u200C`) compounds without merging unrelated adjacent words.
 */
export function applyPersianZwnjCompounds(query: string): string {
  let result = query
    .replace(DIRECTIONAL_PHRASE_RE, '$1$2\u200Cبه\u200C$3')
    .replace(INTERNATIONAL_PHRASE_RE, '$1بین\u200C$2')
    .replace(BE_ADVERBIAL_ZWNJ_RE, '$1به\u200C$2')
    .replace(PRODUCTIVE_ZWNJ_PREFIX_RE, '$1$2\u200C');

  // Run suffix joining twice so chained affixes (`فاصله گذاری ها` → `فاصله‌گذاری‌ها`) join cleanly.
  result = result.replace(PRODUCTIVE_ZWNJ_SUFFIX_RE, '$1\u200C$2');
  result = result.replace(PRODUCTIVE_ZWNJ_SUFFIX_RE, '$1\u200C$2');

  return result;
}

function buildHamzaVariant(query: string): string {
  if (query.includes('ئ')) {
    return query.replace(/مسئله/g, 'مساله').replace(/ئ/g, 'ی');
  }
  return query
    .replace(/\bمس[اأ]له/g, 'مسئله')
    .replace(/([اآ])ی(?=[\u0600-\u06FF])/g, '$1ئ');
}

/**
 * Builds up to 4 prioritized, deduplicated query candidates for Pagefind so
 * Persian orthography, ZWNJ/space variations, hamza/yeh spellings, and
 * Persian/ASCII numerals all resolve cleanly.
 */
export function buildSearchQueryVariants(rawQuery: string, activeLocale: string): string[] {
  const base = normalizePersianQuery(rawQuery);
  if (!base) return [];

  const isPersianContext = activeLocale === 'fa' || PERSIAN_SCRIPT_RE.test(base);
  if (!isPersianContext) {
    return [base];
  }

  const candidates: string[] = [];
  const pushUnique = (candidate: string) => {
    const cleaned = candidate.trim();
    if (cleaned && !candidates.includes(cleaned)) {
      candidates.push(cleaned);
    }
  };

  const compoundForm = applyPersianZwnjCompounds(base);
  const preferredBase = activeLocale === 'fa' ? toPersianDigits(compoundForm) : compoundForm;

  // 1. Canonical ZWNJ + locale-native numeral form (highest precision on Persian pages).
  pushUnique(preferredBase);

  // 2. Normalized literal form as typed (covers authors who used regular spaces).
  pushUnique(activeLocale === 'fa' ? toPersianDigits(base) : base);

  // 3. Space-split or 2-word ZWNJ counterpart for arbitrary compounds (`پس زمینه` ↔ `پس‌زمینه`).
  if (base.includes('\u200C')) {
    pushUnique(base.replace(/\u200C+/g, ' '));
  } else {
    const twoWordsMatch = base.match(TWO_PERSIAN_WORDS_RE);
    if (twoWordsMatch) {
      pushUnique(`${twoWordsMatch[1]}\u200C${twoWordsMatch[2]}`);
    }
  }

  // 4. Orthographic hamza/yeh (`ارایه` ↔ `ارائه`) and alternate numeral script (`1405` ↔ `۱۴۰۵`).
  pushUnique(buildHamzaVariant(preferredBase));
  pushUnique(toAsciiDigits(preferredBase));
  pushUnique(toPersianDigits(base));

  return candidates.slice(0, 4);
}

/**
 * Folds Persian/Arabic letters, diacritics, ZWNJ, and numerals into a single
 * canonical form for ZWNJ-insensitive matching in the JSON fallback index.
 */
export function normalizeForFallbackMatch(input: string): string {
  return toAsciiDigits(normalizePersianQuery(input))
    .toLowerCase()
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ی')
    .replace(/ة/g, 'ه')
    .replace(/[\u0653-\u0655\u200C\u200D]/g, '');
}

/**
 * Checks whether a fallback search item (`title` + `description`) matches a
 * user query across all Persian orthographic, ZWNJ, and numeral variants.
 */
export function matchesFallbackSearch(
  title: string,
  description: string,
  rawQuery: string
): boolean {
  const normalizedQuery = normalizeForFallbackMatch(rawQuery);
  if (!normalizedQuery) return false;

  const haystack = `${normalizeForFallbackMatch(title)} ${normalizeForFallbackMatch(description)}`;
  if (haystack.includes(normalizedQuery)) return true;

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1 && queryTokens.every((token) => haystack.includes(token))) {
    return true;
  }

  // Also match joined queries (`صفحهبندی`) against space-separated text (`صفحه بندی`).
  const compactQuery = normalizedQuery.replace(/\s+/g, '');
  if (compactQuery.length >= 2) {
    const compactHaystack = `${normalizeForFallbackMatch(title).replace(/\s+/g, '')} ${normalizeForFallbackMatch(description).replace(/\s+/g, '')}`;
    if (compactHaystack.includes(compactQuery)) return true;
  }

  return false;
}
