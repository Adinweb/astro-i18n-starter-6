/**
 * Pure domain model for German-law-compliant Cookie & Device Storage Consent
 * (TDDDG § 25 Abs. 1 & 2 + DSGVO Art. 6, Art. 7, Art. 13).
 *
 * Strictly side-effect-free so both server templates, unit tests, and client
 * runtime controllers share one source of truth for categories, storage
 * metadata, validation, expiry, and HTTP cookie headers.
 */

export const COOKIE_CATEGORIES = [
  'necessary',
  'preferences',
  'analytics',
  'marketing',
] as const;

export type CookieCategory = (typeof COOKIE_CATEGORIES)[number];

export const OPTIONAL_COOKIE_CATEGORIES = [
  'preferences',
  'analytics',
  'marketing',
] as const;

export type OptionalCookieCategory = (typeof OPTIONAL_COOKIE_CATEGORIES)[number];

export type ConsentDecisionMethod = 'accept_all' | 'reject_optional' | 'custom';

export interface CookieCategoriesState {
  readonly necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentRecord {
  version: number;
  consentId: string;
  method: ConsentDecisionMethod;
  categories: CookieCategoriesState;
  consentedAt: string;
  expiresAt: string;
}

export type CookieItemId = 'consent' | 'theme' | 'prefs' | 'analytics' | 'marketing';

export interface CookieRegistryItem {
  id: CookieItemId;
  category: CookieCategory;
  /** Exact key or wildcard pattern displayed in transparency tables. */
  namePattern: string;
  storageType: 'cookie' | 'localStorage';
  /** Retention in days, or `null` for persistent local UI preference. */
  durationDays: number | null;
  /** Prefix or exact key matched when purging revoked optional categories. */
  purgePrefix?: string;
}

/**
 * Declarative inventory of device storage & cookies documented in Layer 2
 * (Art. 13 DSGVO & TDDDG § 25 transparency obligation) and enforced on revocation.
 */
export const COOKIE_REGISTRY: readonly CookieRegistryItem[] = [
  {
    id: 'consent',
    category: 'necessary',
    namePattern: 'cookie_consent',
    storageType: 'cookie',
    durationDays: 180,
  },
  {
    id: 'theme',
    category: 'necessary',
    namePattern: 'theme',
    storageType: 'localStorage',
    durationDays: null,
  },
  {
    id: 'prefs',
    category: 'preferences',
    namePattern: 'ui_preferences',
    storageType: 'localStorage',
    durationDays: 180,
    purgePrefix: 'ui_preferences',
  },
  {
    id: 'analytics',
    category: 'analytics',
    namePattern: '_analytics_*',
    storageType: 'cookie',
    durationDays: 90,
    purgePrefix: '_analytics_',
  },
  {
    id: 'marketing',
    category: 'marketing',
    namePattern: '_marketing_*',
    storageType: 'cookie',
    durationDays: 90,
    purgePrefix: '_marketing_',
  },
] as const;

export function isCookieCategory(value: string): value is CookieCategory {
  return (COOKIE_CATEGORIES as readonly string[]).includes(value);
}

export function isOptionalCookieCategory(value: string): value is OptionalCookieCategory {
  return (OPTIONAL_COOKIE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Planet49 / TDDDG § 25 Abs. 1 invariant:
 * Optional categories are strictly `false` by default and never pre-selected.
 */
export function getDefaultCategories(): CookieCategoriesState {
  return {
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
  };
}

export function getAllAcceptedCategories(): CookieCategoriesState {
  return {
    necessary: true,
    preferences: true,
    analytics: true,
    marketing: true,
  };
}

export function normalizeCategories(
  input?: Partial<Record<CookieCategory, boolean>> | null
): CookieCategoriesState {
  return {
    necessary: true,
    preferences: Boolean(input?.preferences),
    analytics: Boolean(input?.analytics),
    marketing: Boolean(input?.marketing),
  };
}

/**
 * Generates an Art. 7 (1) DSGVO audit identifier without external dependencies.
 */
export function generateConsentId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface CreateConsentRecordOptions {
  categories: Partial<Record<CookieCategory, boolean>>;
  method: ConsentDecisionMethod;
  version: number;
  expirationDays: number;
  now?: Date;
  existingId?: string;
}

export function createConsentRecord(options: CreateConsentRecordOptions): ConsentRecord {
  const now = options.now ?? new Date();
  const expiresMs = now.getTime() + options.expirationDays * 86_400_000;
  return {
    version: options.version,
    consentId: options.existingId?.trim() || generateConsentId(),
    method: options.method,
    categories: normalizeCategories(options.categories),
    consentedAt: now.toISOString(),
    expiresAt: new Date(expiresMs).toISOString(),
  };
}

const VALID_METHODS = new Set<ConsentDecisionMethod>([
  'accept_all',
  'reject_optional',
  'custom',
]);

/**
 * Parses and validates a serialized `ConsentRecord`.
 * Returns `null` if missing, malformed, tampered, expired, or matching an older `consentVersion`.
 */
export function parseConsentRecord(
  raw: string | null | undefined,
  expectedVersion: number,
  now: Date = new Date()
): ConsentRecord | null {
  if (!raw || typeof raw !== 'string') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as Record<string, unknown>;

  if (typeof candidate.version !== 'number' || candidate.version !== expectedVersion) {
    return null;
  }
  if (typeof candidate.consentId !== 'string' || candidate.consentId.trim().length < 8) {
    return null;
  }
  if (
    typeof candidate.method !== 'string' ||
    !VALID_METHODS.has(candidate.method as ConsentDecisionMethod)
  ) {
    return null;
  }
  if (typeof candidate.consentedAt !== 'string' || typeof candidate.expiresAt !== 'string') {
    return null;
  }

  const consentedMs = Date.parse(candidate.consentedAt);
  const expiresMs = Date.parse(candidate.expiresAt);
  if (Number.isNaN(consentedMs) || Number.isNaN(expiresMs)) {
    return null;
  }
  if (expiresMs <= now.getTime()) {
    return null;
  }

  if (!candidate.categories || typeof candidate.categories !== 'object') {
    return null;
  }
  const rawCats = candidate.categories as Record<string, unknown>;
  if (rawCats.necessary !== true) {
    return null;
  }
  if (
    typeof rawCats.preferences !== 'boolean' ||
    typeof rawCats.analytics !== 'boolean' ||
    typeof rawCats.marketing !== 'boolean'
  ) {
    return null;
  }

  return {
    version: candidate.version,
    consentId: candidate.consentId.trim(),
    method: candidate.method as ConsentDecisionMethod,
    categories: {
      necessary: true,
      preferences: rawCats.preferences,
      analytics: rawCats.analytics,
      marketing: rawCats.marketing,
    },
    consentedAt: new Date(consentedMs).toISOString(),
    expiresAt: new Date(expiresMs).toISOString(),
  };
}

/**
 * Builds a first-party HTTP cookie string (`SameSite=Lax; Path=/`) so both
 * browser scripts and separated backend services can inspect the consent state.
 */
export function buildConsentCookieHeader(
  key: string,
  record: ConsentRecord,
  expirationDays: number,
  isSecure = false
): string {
  const maxAge = Math.max(1, Math.floor(expirationDays * 86_400));
  const encoded = encodeURIComponent(JSON.stringify(record));
  const parts = [`${key}=${encoded}`, 'Path=/', `Max-Age=${maxAge}`, 'SameSite=Lax'];
  if (isSecure) parts.push('Secure');
  return parts.join('; ');
}

export function buildDeleteCookieHeader(
  name: string,
  path = '/',
  isSecure = false,
  domain?: string
): string {
  const parts = [
    `${name}=`,
    `Path=${path}`,
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'SameSite=Lax',
  ];
  if (domain) parts.push(`Domain=${domain}`);
  if (isSecure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Computes candidate `Path` values (from `/` down to current pathname) so
 * path-scoped optional cookies are reliably expired upon revocation.
 */
export function deriveCookiePaths(pathname: string | undefined): string[] {
  const paths = new Set<string>(['/']);
  if (!pathname || pathname === '/') return [...paths];

  const segments = pathname.split('/').filter(Boolean);
  let acc = '';
  for (const segment of segments) {
    acc += `/${segment}`;
    paths.add(acc);
    paths.add(`${acc}/`);
  }
  return [...paths];
}

/**
 * Computes candidate `Domain` values (host-only, exact hostname, dot-prefixed,
 * and registrable parent domain) while skipping `localhost` and IP literals.
 */
export function deriveCookieDomains(hostname: string | undefined): Array<string | undefined> {
  const domains: Array<string | undefined> = [undefined];
  if (!hostname) return domains;

  const clean = hostname.trim().toLowerCase();
  if (
    !clean ||
    clean === 'localhost' ||
    clean.endsWith('.localhost') ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(clean) ||
    clean.includes(':')
  ) {
    return domains;
  }

  const seen = new Set<string>();
  const add = (d: string) => {
    if (!seen.has(d)) {
      seen.add(d);
      domains.push(d);
    }
  };

  add(clean);
  add(`.${clean}`);

  const parts = clean.split('.').filter(Boolean);
  if (parts.length > 2) {
    const parent = parts.slice(-2).join('.');
    add(parent);
    add(`.${parent}`);
  }

  return domains;
}

export function readCookieValue(cookieHeader: string, key: string): string | null {
  if (!cookieHeader || !key) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex <= 0) continue;
    const rawName = pair.slice(0, eqIndex).trim();
    if (rawName !== key) continue;
    const rawVal = pair.slice(eqIndex + 1).trim();
    try {
      return decodeURIComponent(rawVal);
    } catch {
      return rawVal;
    }
  }
  return null;
}

export function listCookieNames(cookieHeader: string): string[] {
  if (!cookieHeader) return [];
  const names: string[] = [];
  for (const pair of cookieHeader.split(';')) {
    const eqIndex = pair.indexOf('=');
    const name = (eqIndex === -1 ? pair : pair.slice(0, eqIndex)).trim();
    if (name) names.push(name);
  }
  return names;
}

/**
 * Returns every optional category that is currently unconsented (`false`),
 * ensuring any leftover optional cookies or storage keys are purged.
 */
export function getUnconsentedOptionalCategories(
  categories: CookieCategoriesState
): OptionalCookieCategory[] {
  return OPTIONAL_COOKIE_CATEGORIES.filter((cat) => !categories[cat]);
}

const KNOWN_CATEGORY_PREFIXES: Record<OptionalCookieCategory, readonly string[]> = {
  preferences: ['ui_preferences', '_pref_'],
  analytics: ['_analytics_', '_ga', '_gid', '_gat', '_pk_'],
  marketing: ['_marketing_', '_fbp', '_gcl_'],
};

/**
 * Determines whether a first-party cookie or storage key should be deleted when
 * optional categories are rejected or withdrawn, never touching strictly necessary keys.
 */
export function shouldPurgeCookie(
  cookieName: string,
  unconsentedCategories: readonly OptionalCookieCategory[],
  consentStorageKey: string
): boolean {
  if (!cookieName || cookieName === consentStorageKey || cookieName === 'theme') {
    return false;
  }
  for (const category of unconsentedCategories) {
    const prefixes = KNOWN_CATEGORY_PREFIXES[category];
    if (prefixes.some((prefix) => cookieName === prefix || cookieName.startsWith(prefix))) {
      return true;
    }
  }
  return false;
}
