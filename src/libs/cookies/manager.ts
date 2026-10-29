/**
 * Browser runtime controller & TDDDG § 25 Gatekeeper for scripts, embeds,
 * cross-tab synchronization, and multi-domain/path storage cleanup.
 *
 * SSR-safe: every browser access is guarded, allowing safe imports in Node/Vitest.
 * Works seamlessly across Astro `<ClientRouter />` transitions.
 */

import { COOKIE_CONFIG, type CookieConfig } from '@/libs/config/app';
import {
  COOKIE_REGISTRY,
  OPTIONAL_COOKIE_CATEGORIES,
  buildConsentCookieHeader,
  buildDeleteCookieHeader,
  createConsentRecord,
  deriveCookieDomains,
  deriveCookiePaths,
  getAllAcceptedCategories,
  getDefaultCategories,
  getUnconsentedOptionalCategories,
  isCookieCategory,
  listCookieNames,
  normalizeCategories,
  parseConsentRecord,
  readCookieValue,
  shouldPurgeCookie,
  type ConsentDecisionMethod,
  type ConsentRecord,
  type CookieCategoriesState,
  type CookieCategory,
  type OptionalCookieCategory,
} from './model';

export const CONSENT_CHANGE_EVENT = 'cookie-consent:change';

export interface ConsentChangeDetail {
  record: ConsentRecord | null;
  previous: ConsentRecord | null;
}

const INTERNAL_SCRIPT_DATASET_KEYS = new Set([
  'cookieCategory',
  'cookieSrc',
  'cookieType',
  'cookieAsync',
  'cookieDefer',
  'cookieActivated',
  'cookieId',
]);

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isHttpsContext(): boolean {
  return isBrowser() && window.location?.protocol === 'https:';
}

function safeLocalGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing or quota limits: HTTP cookie fallback still persists consent.
  }
}

function safeLocalRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage removal errors in restricted environments.
  }
}

function safeLocalKeys(): string[] {
  try {
    const store = window.localStorage;
    if (typeof store.length !== 'number' || typeof store.key !== 'function') {
      return [];
    }
    const keys: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i);
      if (k) keys.push(k);
    }
    return keys;
  } catch {
    return [];
  }
}

function clearConsentStorage(storageKey: string): void {
  if (!isBrowser()) return;
  safeLocalRemove(storageKey);
  const secure = isHttpsContext();
  for (const domain of deriveCookieDomains(window.location?.hostname)) {
    document.cookie = buildDeleteCookieHeader(storageKey, '/', secure, domain);
  }
}

/**
 * Purges optional cookies across candidate paths/domains and removes unconsented
 * `localStorage` keys (Art. 7 Abs. 3 DSGVO).
 */
export function purgeOptionalStorage(
  unconsentedCategories: readonly OptionalCookieCategory[],
  storageKey: string = COOKIE_CONFIG.storageKey
): void {
  if (!isBrowser() || unconsentedCategories.length === 0) return;

  const secure = isHttpsContext();
  const paths = deriveCookiePaths(window.location?.pathname);
  const domains = deriveCookieDomains(window.location?.hostname);
  const currentNames = listCookieNames(document.cookie);

  for (const name of currentNames) {
    if (shouldPurgeCookie(name, unconsentedCategories, storageKey)) {
      for (const path of paths) {
        for (const domain of domains) {
          document.cookie = buildDeleteCookieHeader(name, path, secure, domain);
        }
      }
    }
  }

  for (const item of COOKIE_REGISTRY) {
    if (
      item.storageType === 'localStorage' &&
      item.purgePrefix &&
      unconsentedCategories.includes(item.category as OptionalCookieCategory)
    ) {
      safeLocalRemove(item.purgePrefix);
    }
  }

  for (const existingKey of safeLocalKeys()) {
    if (shouldPurgeCookie(existingKey, unconsentedCategories, storageKey)) {
      safeLocalRemove(existingKey);
    }
  }
}

/**
 * Syncs `<html>` dataset attributes so CSS and external scripts can inspect
 * active consent state declaratively without layout thrashing.
 */
export function applyConsentDataset(
  doc: Document,
  record: ConsentRecord | null
): void {
  const root = doc.documentElement;
  if (!root) return;

  const categories = record ? record.categories : getDefaultCategories();
  root.dataset.consentState = record ? 'decided' : 'undecided';
  root.dataset.consentPreferences = String(categories.preferences);
  root.dataset.consentAnalytics = String(categories.analytics);
  root.dataset.consentMarketing = String(categories.marketing);
}

/**
 * TDDDG § 25 Script Gatekeeper:
 * - Activates inert `<script type="text/plain" data-cookie-category="...">` tags
 *   ONLY when explicit consent exists for their declared category, preserving SRI
 *   (`integrity`), `crossorigin`, `referrerpolicy`, `nonce`, and custom `data-*` attributes.
 * - Detaches previously injected scripts if their category is later revoked.
 */
export function applyScriptGatekeeper(
  categories: CookieCategoriesState,
  root: ParentNode = document
): number {
  if (!isBrowser()) return 0;

  // Tear down previously injected scripts whose category was revoked
  const managedScripts = root.querySelectorAll<HTMLScriptElement>(
    'script[data-cookie-managed-category]'
  );
  managedScripts.forEach((live) => {
    const cat = live.dataset.cookieManagedCategory ?? '';
    if (isCookieCategory(cat) && !categories[cat]) {
      live.parentNode?.removeChild(live);
    }
  });

  let activatedCount = 0;
  const blockedScripts = root.querySelectorAll<HTMLScriptElement>(
    'script[type="text/plain"][data-cookie-category]'
  );

  blockedScripts.forEach((placeholder) => {
    const rawCategory = placeholder.dataset.cookieCategory ?? '';
    if (!isCookieCategory(rawCategory)) return;

    if (!categories[rawCategory]) {
      if (placeholder.dataset.cookieActivated === 'true') {
        delete placeholder.dataset.cookieActivated;
      }
      return;
    }

    if (placeholder.dataset.cookieActivated === 'true') return;

    const liveScript = document.createElement('script');
    liveScript.type = placeholder.dataset.cookieType || 'text/javascript';

    const src = placeholder.dataset.cookieSrc;
    if (src) {
      liveScript.src = src;
    }
    if (placeholder.dataset.cookieId) {
      liveScript.id = placeholder.dataset.cookieId;
    }
    if (placeholder.hasAttribute('async') || placeholder.dataset.cookieAsync === 'true') {
      liveScript.async = true;
    }
    if (placeholder.hasAttribute('defer') || placeholder.dataset.cookieDefer === 'true') {
      liveScript.defer = true;
    }

    for (const attrName of ['integrity', 'crossorigin', 'referrerpolicy', 'nonce']) {
      const val = placeholder.getAttribute?.(attrName);
      if (val) {
        liveScript.setAttribute(attrName, val);
      }
    }

    for (const [dataKey, dataVal] of Object.entries(placeholder.dataset)) {
      if (!INTERNAL_SCRIPT_DATASET_KEYS.has(dataKey) && dataVal !== undefined) {
        liveScript.dataset[dataKey] = dataVal;
      }
    }

    if (!src && placeholder.textContent) {
      liveScript.textContent = placeholder.textContent;
    }

    liveScript.dataset.cookieManagedCategory = rawCategory;
    placeholder.dataset.cookieActivated = 'true';
    placeholder.parentNode?.insertBefore(liveScript, placeholder.nextSibling);
    activatedCount += 1;
  });

  return activatedCount;
}

/**
 * TDDDG § 25 External Media / Embed Gatekeeper:
 * Mounts `<template data-cookie-embed-template>` inside `[data-cookie-embed]`
 * containers when consented, and tears down mounted embeds immediately when
 * consent is withdrawn so third-party connections cease.
 */
export function applyEmbedGatekeeper(
  categories: CookieCategoriesState,
  root: ParentNode = document
): void {
  if (!isBrowser()) return;

  const containers = root.querySelectorAll<HTMLElement>('[data-cookie-embed]');
  containers.forEach((container) => {
    const rawCategory = container.dataset.cookieEmbed || 'marketing';
    if (!isCookieCategory(rawCategory)) return;

    const allowed = categories[rawCategory];
    const placeholder = container.querySelector<HTMLElement>('[data-cookie-embed-placeholder]');
    const mountTarget = container.querySelector<HTMLElement>('[data-cookie-embed-mount]');
    const tpl = container.querySelector<HTMLTemplateElement>('template[data-cookie-embed-template]');

    if (allowed) {
      if (placeholder) placeholder.hidden = true;
      if (mountTarget && tpl && mountTarget.dataset.mounted !== 'true') {
        mountTarget.replaceChildren(tpl.content.cloneNode(true));
        mountTarget.dataset.mounted = 'true';
        mountTarget.hidden = false;
      }
    } else {
      if (mountTarget && mountTarget.dataset.mounted === 'true') {
        mountTarget.replaceChildren();
        mountTarget.dataset.mounted = 'false';
        mountTarget.hidden = true;
      }
      if (placeholder) placeholder.hidden = false;
    }
  });
}

/**
 * Reads and validates the stored consent record from `localStorage` or first-party
 * HTTP cookie fallback. Automatically clears expired or outdated-version records.
 */
export function readStoredConsent(config: CookieConfig = COOKIE_CONFIG): ConsentRecord | null {
  if (!isBrowser()) return null;

  const localRaw = safeLocalGet(config.storageKey);
  if (localRaw !== null) {
    const parsedLocal = parseConsentRecord(localRaw, config.consentVersion);
    if (parsedLocal) return parsedLocal;
  }

  const cookieRaw = readCookieValue(document.cookie, config.storageKey);
  if (cookieRaw !== null) {
    const parsedCookie = parseConsentRecord(cookieRaw, config.consentVersion);
    if (parsedCookie) {
      safeLocalSet(config.storageKey, JSON.stringify(parsedCookie));
      return parsedCookie;
    }
  }

  if (localRaw !== null || cookieRaw !== null) {
    clearConsentStorage(config.storageKey);
    purgeOptionalStorage(OPTIONAL_COOKIE_CATEGORIES, config.storageKey);
  }

  return null;
}

export function hasCategoryConsent(
  category: CookieCategory,
  config: CookieConfig = COOKIE_CONFIG
): boolean {
  if (category === 'necessary') return true;
  const record = readStoredConsent(config);
  return record ? record.categories[category] : false;
}

function dispatchConsentChange(
  record: ConsentRecord | null,
  previous: ConsentRecord | null
): void {
  if (!isBrowser()) return;
  document.dispatchEvent(
    new CustomEvent<ConsentChangeDetail>(CONSENT_CHANGE_EVENT, {
      detail: { record, previous },
    })
  );
}

export function persistConsent(
  categories: Partial<Record<CookieCategory, boolean>>,
  method: ConsentDecisionMethod,
  config: CookieConfig = COOKIE_CONFIG
): ConsentRecord {
  const previous = readStoredConsent(config);
  const record = createConsentRecord({
    categories: normalizeCategories(categories),
    method,
    version: config.consentVersion,
    expirationDays: config.expirationDays,
    existingId: previous?.consentId,
  });

  if (isBrowser()) {
    safeLocalSet(config.storageKey, JSON.stringify(record));
    document.cookie = buildConsentCookieHeader(
      config.storageKey,
      record,
      config.expirationDays,
      isHttpsContext()
    );

    const unconsented = getUnconsentedOptionalCategories(record.categories);
    purgeOptionalStorage(unconsented, config.storageKey);
    applyConsentDataset(document, record);
    applyScriptGatekeeper(record.categories);
    applyEmbedGatekeeper(record.categories);
    dispatchConsentChange(record, previous);
  }

  return record;
}

export function acceptAllCookies(config: CookieConfig = COOKIE_CONFIG): ConsentRecord {
  return persistConsent(getAllAcceptedCategories(), 'accept_all', config);
}

export function rejectOptionalCookies(config: CookieConfig = COOKIE_CONFIG): ConsentRecord {
  return persistConsent(getDefaultCategories(), 'reject_optional', config);
}

export function saveCookiePreferences(
  categories: Partial<Record<CookieCategory, boolean>>,
  config: CookieConfig = COOKIE_CONFIG
): ConsentRecord {
  return persistConsent(categories, 'custom', config);
}

/**
 * Completely withdraws and deletes stored consent (Art. 7 Abs. 3 DSGVO),
 * purges all optional cookies/storage, tears down scripts/embeds, and re-prompts cleanly.
 */
export function withdrawCookieConsent(config: CookieConfig = COOKIE_CONFIG): void {
  if (!isBrowser()) return;
  const previous = readStoredConsent(config);
  clearConsentStorage(config.storageKey);
  purgeOptionalStorage(OPTIONAL_COOKIE_CATEGORIES, config.storageKey);
  const defaults = getDefaultCategories();
  applyConsentDataset(document, null);
  applyScriptGatekeeper(defaults);
  applyEmbedGatekeeper(defaults);
  dispatchConsentChange(null, previous);
}

/**
 * Synchronizes DOM attributes, blocked scripts, and embeds on initial load
 * and after every Astro View Transition (`astro:page-load`).
 */
export function syncConsentOnPageLoad(
  config: CookieConfig = COOKIE_CONFIG
): ConsentRecord | null {
  if (!isBrowser()) return null;
  const record = readStoredConsent(config);
  const effectiveCategories = record ? record.categories : getDefaultCategories();
  applyConsentDataset(document, record);
  applyScriptGatekeeper(effectiveCategories);
  applyEmbedGatekeeper(effectiveCategories);
  return record;
}

/**
 * Binds cross-tab synchronization via the `storage` event so consent updates or
 * withdrawals in one tab immediately propagate to all open tabs.
 */
export function bindCrossTabConsentSync(config: CookieConfig = COOKIE_CONFIG): void {
  if (!isBrowser() || typeof window.addEventListener !== 'function') return;
  const root = document.documentElement;
  if (!root || root.dataset.cookieStorageSyncBound === 'true') return;
  root.dataset.cookieStorageSyncBound = 'true';

  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== null && event.key !== config.storageKey) return;
    const updated = syncConsentOnPageLoad(config);
    const previous = event.oldValue
      ? parseConsentRecord(event.oldValue, config.consentVersion)
      : null;
    dispatchConsentChange(updated, previous);
  });
}
