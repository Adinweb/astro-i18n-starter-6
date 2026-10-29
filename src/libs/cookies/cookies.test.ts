import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COOKIE_CATEGORIES,
  COOKIE_REGISTRY,
  OPTIONAL_COOKIE_CATEGORIES,
  buildConsentCookieHeader,
  buildDeleteCookieHeader,
  createConsentRecord,
  deriveCookieDomains,
  deriveCookiePaths,
  generateConsentId,
  getAllAcceptedCategories,
  getDefaultCategories,
  getUnconsentedOptionalCategories,
  isCookieCategory,
  isOptionalCookieCategory,
  listCookieNames,
  normalizeCategories,
  parseConsentRecord,
  readCookieValue,
  shouldPurgeCookie,
} from './model';
import {
  CONSENT_CHANGE_EVENT,
  acceptAllCookies,
  applyConsentDataset,
  applyEmbedGatekeeper,
  applyScriptGatekeeper,
  bindCrossTabConsentSync,
  hasCategoryConsent,
  persistConsent,
  purgeOptionalStorage,
  readStoredConsent,
  rejectOptionalCookies,
  saveCookiePreferences,
  syncConsentOnPageLoad,
  withdrawCookieConsent,
  type ConsentChangeDetail,
} from './manager';
import type { CookieConfig } from '@/libs/config/app';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

const TEST_CONFIG: CookieConfig = {
  enabled: true,
  consentVersion: 1,
  storageKey: 'cookie_consent',
  expirationDays: 180,
};

interface MockScriptParent {
  inserted: MockScriptElement[];
  insertBefore: (node: MockScriptElement, ref: unknown) => void;
  removeChild: (node: MockScriptElement) => void;
}

interface MockScriptElement {
  id: string;
  type: string;
  src: string;
  async: boolean;
  defer: boolean;
  textContent: string;
  dataset: Record<string, string>;
  attributes: Record<string, string>;
  hasAttribute: (attr: string) => boolean;
  getAttribute: (attr: string) => string | null;
  setAttribute: (attr: string, val: string) => void;
  parentNode: MockScriptParent | null;
  nextSibling: null;
}

function createMockParent(): MockScriptParent {
  return {
    inserted: [],
    insertBefore(node: MockScriptElement) {
      node.parentNode = this;
      this.inserted.push(node);
    },
    removeChild(node: MockScriptElement) {
      const idx = this.inserted.indexOf(node);
      if (idx !== -1) {
        this.inserted.splice(idx, 1);
      }
      node.parentNode = null;
    },
  };
}

function setupMockBrowser(
  options: { throwOnLocalStorage?: boolean; protocol?: string; hostname?: string } = {}
) {
  const localStore = new Map<string, string>();
  const cookieJar = new Map<string, string>();
  const deletedCookies: string[] = [];
  const docListeners = new Map<string, Set<(event: CustomEvent<ConsentChangeDetail>) => void>>();
  const winListeners = new Map<string, Set<(event: StorageEvent) => void>>();
  const docElement = {
    dataset: {} as Record<string, string>,
  };

  let blockedScripts: MockScriptElement[] = [];
  let embedContainers: Array<{
    dataset: Record<string, string>;
    placeholder: { hidden: boolean };
    mount: {
      hidden: boolean;
      dataset: Record<string, string>;
      childrenCount: number;
      replaceChildren: (...nodes: unknown[]) => void;
    };
    tpl: { content: { cloneNode: () => { cloned: boolean } } };
    querySelector: (selector: string) => unknown;
  }> = [];

  (globalThis as Record<string, unknown>).CustomEvent = class MockCustomEvent<T> {
    type: string;
    detail: T;
    constructor(type: string, init?: { detail?: T }) {
      this.type = type;
      this.detail = init?.detail as T;
    }
  };

  const mockDocument = {
    documentElement: docElement,
    get cookie(): string {
      return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(header: string) {
      const [firstPair, ...attrs] = header.split(';').map((s) => s.trim());
      if (!firstPair) return;
      const eqIdx = firstPair.indexOf('=');
      if (eqIdx <= 0) return;
      const name = firstPair.slice(0, eqIdx);
      const val = firstPair.slice(eqIdx + 1);
      const isDelete = attrs.some((a) => a.toLowerCase() === 'max-age=0');
      if (isDelete) {
        cookieJar.delete(name);
        deletedCookies.push(header);
      } else {
        cookieJar.set(name, val);
      }
    },
    createElement: (tag: string): MockScriptElement => {
      const attrs: Record<string, string> = {};
      return {
        id: '',
        type: tag === 'script' ? '' : tag,
        src: '',
        async: false,
        defer: false,
        textContent: '',
        dataset: {},
        attributes: attrs,
        hasAttribute: (attr: string) => attr in attrs,
        getAttribute: (attr: string) => (attr in attrs ? attrs[attr]! : null),
        setAttribute: (attr: string, val: string) => {
          attrs[attr] = val;
        },
        parentNode: null,
        nextSibling: null,
      };
    },
    querySelectorAll: (selector: string) => {
      if (selector === 'script[type="text/plain"][data-cookie-category]') {
        return blockedScripts;
      }
      if (selector === 'script[data-cookie-managed-category]') {
        const managed: MockScriptElement[] = [];
        for (const s of blockedScripts) {
          if (s.parentNode) {
            for (const child of s.parentNode.inserted) {
              if (child.dataset.cookieManagedCategory && !managed.includes(child)) {
                managed.push(child);
              }
            }
          }
        }
        return managed;
      }
      if (selector === '[data-cookie-embed]') {
        return embedContainers;
      }
      return [];
    },
    addEventListener: (type: string, cb: (event: CustomEvent<ConsentChangeDetail>) => void) => {
      if (!docListeners.has(type)) docListeners.set(type, new Set());
      docListeners.get(type)?.add(cb);
    },
    dispatchEvent: (event: CustomEvent<ConsentChangeDetail>) => {
      docListeners.get(event.type)?.forEach((cb) => cb(event));
      return true;
    },
  };

  const mockWindow = {
    location: {
      protocol: options.protocol ?? 'https:',
      hostname: options.hostname ?? 'app.example.de',
      pathname: '/de/ueber-uns/',
    },
    localStorage: {
      get length(): number {
        if (options.throwOnLocalStorage) throw new Error('SecurityError');
        return localStore.size;
      },
      key: (index: number): string | null => {
        if (options.throwOnLocalStorage) throw new Error('SecurityError');
        return [...localStore.keys()][index] ?? null;
      },
      getItem: (key: string) => {
        if (options.throwOnLocalStorage) throw new Error('SecurityError');
        return localStore.has(key) ? localStore.get(key)! : null;
      },
      setItem: (key: string, val: string) => {
        if (options.throwOnLocalStorage) throw new Error('SecurityError');
        localStore.set(key, val);
      },
      removeItem: (key: string) => {
        if (options.throwOnLocalStorage) throw new Error('SecurityError');
        localStore.delete(key);
      },
    },
    addEventListener: (type: string, cb: (event: StorageEvent) => void) => {
      if (!winListeners.has(type)) winListeners.set(type, new Set());
      winListeners.get(type)?.add(cb);
    },
    dispatchStorageEvent: (init: { key: string | null; oldValue?: string | null; newValue?: string | null }) => {
      const evt = {
        key: init.key,
        oldValue: init.oldValue ?? null,
        newValue: init.newValue ?? null,
      } as StorageEvent;
      winListeners.get('storage')?.forEach((cb) => cb(evt));
    },
  };

  (globalThis as Record<string, unknown>).window = mockWindow;
  (globalThis as Record<string, unknown>).document = mockDocument;

  return {
    localStore,
    cookieJar,
    deletedCookies,
    docElement,
    mockDocument,
    mockWindow,
    setBlockedScripts: (items: MockScriptElement[]) => {
      blockedScripts = items;
    },
    setEmbedContainers: (items: typeof embedContainers) => {
      embedContainers = items;
    },
  };
}

describe('TDDDG § 25 & DSGVO Cookie Consent System', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
    delete (globalThis as Record<string, unknown>).CustomEvent;
  });

  describe('Pure Domain Model (src/libs/cookies/model.ts)', () => {
    it('enforces Planet49 default opt-in invariant (all optional categories false)', () => {
      const defaults = getDefaultCategories();
      expect(defaults).toEqual({
        necessary: true,
        preferences: false,
        analytics: false,
        marketing: false,
      });

      const all = getAllAcceptedCategories();
      expect(all).toEqual({
        necessary: true,
        preferences: true,
        analytics: true,
        marketing: true,
      });

      // Even if someone passes necessary: false, normalizeCategories locks necessary to true
      expect(
        normalizeCategories({ necessary: false as unknown as true, analytics: true })
      ).toEqual({
        necessary: true,
        preferences: false,
        analytics: true,
        marketing: false,
      });
    });

    it('validates category guards and registry completeness', () => {
      expect(COOKIE_CATEGORIES).toEqual(['necessary', 'preferences', 'analytics', 'marketing']);
      expect(OPTIONAL_COOKIE_CATEGORIES).toEqual(['preferences', 'analytics', 'marketing']);
      expect(isCookieCategory('necessary')).toBe(true);
      expect(isCookieCategory('analytics')).toBe(true);
      expect(isCookieCategory('unknown')).toBe(false);
      expect(isOptionalCookieCategory('necessary')).toBe(false);
      expect(isOptionalCookieCategory('marketing')).toBe(true);

      // Every category has at least one documented registry entry for Art. 13 DSGVO transparency
      for (const cat of COOKIE_CATEGORIES) {
        expect(COOKIE_REGISTRY.some((item) => item.category === cat)).toBe(true);
      }
    });

    it('creates valid ConsentRecord and rejects expired, outdated, or tampered payloads', () => {
      const now = new Date('2026-10-29T12:00:00.000Z');
      const id = generateConsentId();
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);

      const record = createConsentRecord({
        categories: { analytics: true },
        method: 'custom',
        version: 2,
        expirationDays: 180,
        now,
      });

      expect(record.version).toBe(2);
      expect(record.method).toBe('custom');
      expect(record.categories.necessary).toBe(true);
      expect(record.categories.analytics).toBe(true);
      expect(record.categories.marketing).toBe(false);

      const serialized = JSON.stringify(record);

      // Valid at current time & matching version
      expect(parseConsentRecord(serialized, 2, now)).toEqual(record);

      // Version bump invalidates older consent
      expect(parseConsentRecord(serialized, 3, now)).toBeNull();

      // Expired after 181 days returns null
      const future = new Date(now.getTime() + 181 * 86_400_000);
      expect(parseConsentRecord(serialized, 2, future)).toBeNull();

      // Malformed or tampered payloads return null
      expect(parseConsentRecord(null, 2, now)).toBeNull();
      expect(parseConsentRecord('{bad json', 2, now)).toBeNull();
      expect(
        parseConsentRecord(
          JSON.stringify({ ...record, categories: { ...record.categories, necessary: false } }),
          2,
          now
        )
      ).toBeNull();
      expect(
        parseConsentRecord(JSON.stringify({ ...record, method: 'forced' }), 2, now)
      ).toBeNull();
    });

    it('serializes and parses first-party HTTP cookies and revocation purge rules', () => {
      const now = new Date('2026-10-29T12:00:00.000Z');
      const record = createConsentRecord({
        categories: getAllAcceptedCategories(),
        method: 'accept_all',
        version: 1,
        expirationDays: 180,
        now,
      });

      const headerSecure = buildConsentCookieHeader('cookie_consent', record, 180, true);
      expect(headerSecure).toContain('Path=/');
      expect(headerSecure).toContain('SameSite=Lax');
      expect(headerSecure).toContain('Secure');
      expect(headerSecure).toContain(`Max-Age=${180 * 86400}`);

      const extracted = readCookieValue(
        `other=1; ${headerSecure.split(';')[0]}; theme=dark`,
        'cookie_consent'
      );
      expect(parseConsentRecord(extracted, 1, now)).toEqual(record);
      expect(listCookieNames('a=1; cookie_consent=xyz; _analytics_id=42')).toEqual([
        'a',
        'cookie_consent',
        '_analytics_id',
      ]);

      const delHeader = buildDeleteCookieHeader('_analytics_id', '/', true, '.example.de');
      expect(delHeader).toContain('Max-Age=0');
      expect(delHeader).toContain('Domain=.example.de');
      expect(delHeader).toContain('Secure');

      expect(deriveCookiePaths('/de/ueber-uns/')).toEqual([
        '/',
        '/de',
        '/de/',
        '/de/ueber-uns',
        '/de/ueber-uns/',
      ]);
      expect(deriveCookieDomains('app.example.de')).toEqual([
        undefined,
        'app.example.de',
        '.app.example.de',
        'example.de',
        '.example.de',
      ]);
      expect(deriveCookieDomains('localhost')).toEqual([undefined]);
      expect(deriveCookieDomains('127.0.0.1')).toEqual([undefined]);
      expect(deriveCookieDomains('[::1]')).toEqual([undefined]);

      const unconsented = getUnconsentedOptionalCategories({
        necessary: true,
        preferences: true,
        analytics: false,
        marketing: false,
      });
      expect(unconsented).toEqual(['analytics', 'marketing']);

      expect(shouldPurgeCookie('_analytics_session', unconsented, 'cookie_consent')).toBe(true);
      expect(shouldPurgeCookie('_ga_1234', unconsented, 'cookie_consent')).toBe(true);
      expect(shouldPurgeCookie('_marketing_pixel', unconsented, 'cookie_consent')).toBe(true);
      expect(shouldPurgeCookie('ui_preferences', unconsented, 'cookie_consent')).toBe(false);
      expect(shouldPurgeCookie('cookie_consent', OPTIONAL_COOKIE_CATEGORIES, 'cookie_consent')).toBe(
        false
      );
      expect(shouldPurgeCookie('theme', OPTIONAL_COOKIE_CATEGORIES, 'cookie_consent')).toBe(false);
    });
  });

  describe('Browser Runtime & TDDDG § 25 Gatekeeper (src/libs/cookies/manager.ts)', () => {
    it('safely no-ops in SSR / Node environments without window or document', () => {
      expect(readStoredConsent(TEST_CONFIG)).toBeNull();
      expect(hasCategoryConsent('necessary', TEST_CONFIG)).toBe(true);
      expect(hasCategoryConsent('analytics', TEST_CONFIG)).toBe(false);
      expect(syncConsentOnPageLoad(TEST_CONFIG)).toBeNull();
      expect(() => bindCrossTabConsentSync(TEST_CONFIG)).not.toThrow();
      expect(() => withdrawCookieConsent(TEST_CONFIG)).not.toThrow();
      expect(() => purgeOptionalStorage(['analytics'], 'cookie_consent')).not.toThrow();
    });

    it('persists accept/reject/custom decisions, emits events, and purges multi-domain cookies & prefixed localStorage', () => {
      const env = setupMockBrowser({ hostname: 'shop.example.de' });
      env.cookieJar.set('_analytics_uid', 'abc');
      env.cookieJar.set('_marketing_ad', 'xyz');
      env.localStore.set('theme', 'dark');
      env.localStore.set('ui_preferences', '{"compact":true}');
      env.localStore.set('_ga_client_state', 'v1.2.3');

      const events: ConsentChangeDetail[] = [];
      document.addEventListener(CONSENT_CHANGE_EVENT, ((e: CustomEvent<ConsentChangeDetail>) => {
        events.push(e.detail);
      }) as EventListener);

      // Initial sync with no stored consent
      expect(syncConsentOnPageLoad(TEST_CONFIG)).toBeNull();
      expect(env.docElement.dataset.consentState).toBe('undecided');
      expect(env.docElement.dataset.consentAnalytics).toBe('false');

      // Accept all
      const accepted = acceptAllCookies(TEST_CONFIG);
      expect(accepted.method).toBe('accept_all');
      expect(hasCategoryConsent('analytics', TEST_CONFIG)).toBe(true);
      expect(env.docElement.dataset.consentState).toBe('decided');
      expect(env.docElement.dataset.consentAnalytics).toBe('true');
      expect(events).toHaveLength(1);
      expect(events[0]?.previous).toBeNull();

      // Custom save: keep preferences, revoke analytics & marketing -> purges cookies & prefixed localStorage!
      const customized = saveCookiePreferences(
        { preferences: true, analytics: false, marketing: false },
        TEST_CONFIG
      );
      expect(customized.consentId).toBe(accepted.consentId);
      expect(env.cookieJar.has('_analytics_uid')).toBe(false);
      expect(env.cookieJar.has('_marketing_ad')).toBe(false);
      expect(env.localStore.has('_ga_client_state')).toBe(false);
      expect(env.localStore.has('ui_preferences')).toBe(true);
      expect(env.localStore.get('theme')).toBe('dark');
      // Verifies multi-domain expiration headers were issued for registrable parent domain
      expect(env.deletedCookies.some((h) => h.includes('Domain=.example.de'))).toBe(true);

      // Reject optional -> purges ui_preferences too while keeping theme!
      rejectOptionalCookies(TEST_CONFIG);
      expect(env.localStore.has('ui_preferences')).toBe(false);
      expect(env.localStore.get('theme')).toBe('dark');
      expect(hasCategoryConsent('preferences', TEST_CONFIG)).toBe(false);

      // Withdraw consent -> deletes consent record and resets state to undecided
      withdrawCookieConsent(TEST_CONFIG);
      expect(readStoredConsent(TEST_CONFIG)).toBeNull();
      expect(env.docElement.dataset.consentState).toBe('undecided');
      expect(events.at(-1)?.record).toBeNull();
    });

    it('falls back seamlessly to first-party HTTP cookie when localStorage throws', () => {
      setupMockBrowser({ throwOnLocalStorage: true });
      const saved = persistConsent({ analytics: true }, 'custom', TEST_CONFIG);
      const restored = readStoredConsent(TEST_CONFIG);
      expect(restored).toEqual(saved);
      expect(hasCategoryConsent('analytics', TEST_CONFIG)).toBe(true);
    });

    it('synchronizes consent state across browser tabs via window storage events', () => {
      const env = setupMockBrowser();
      bindCrossTabConsentSync(TEST_CONFIG);

      const events: ConsentChangeDetail[] = [];
      document.addEventListener(CONSENT_CHANGE_EVENT, ((e: CustomEvent<ConsentChangeDetail>) => {
        events.push(e.detail);
      }) as EventListener);

      const remoteRecord = createConsentRecord({
        categories: { analytics: true, preferences: true, marketing: false },
        method: 'custom',
        version: TEST_CONFIG.consentVersion,
        expirationDays: TEST_CONFIG.expirationDays,
      });
      const serialized = JSON.stringify(remoteRecord);
      env.localStore.set(TEST_CONFIG.storageKey, serialized);

      env.mockWindow.dispatchStorageEvent({
        key: TEST_CONFIG.storageKey,
        oldValue: null,
        newValue: serialized,
      });

      expect(env.docElement.dataset.consentState).toBe('decided');
      expect(env.docElement.dataset.consentAnalytics).toBe('true');
      expect(events).toHaveLength(1);
      expect(events[0]?.record?.consentId).toBe(remoteRecord.consentId);

      // Simulate withdrawal in another tab
      env.localStore.delete(TEST_CONFIG.storageKey);
      env.cookieJar.delete(TEST_CONFIG.storageKey);
      env.mockWindow.dispatchStorageEvent({
        key: TEST_CONFIG.storageKey,
        oldValue: serialized,
        newValue: null,
      });

      expect(env.docElement.dataset.consentState).toBe('undecided');
      expect(events.at(-1)?.record).toBeNull();
      expect(events.at(-1)?.previous?.consentId).toBe(remoteRecord.consentId);
    });

    it('activates blocked scripts with SRI/custom attributes and tears down scripts & embeds on revocation', () => {
      const env = setupMockBrowser();

      const analyticsParent = createMockParent();
      const marketingParent = createMockParent();

      const analyticsAttrs: Record<string, string> = {
        integrity: 'sha384-xyz123',
        crossorigin: 'anonymous',
      };
      const analyticsScript: MockScriptElement = {
        id: '',
        type: 'text/plain',
        src: '',
        async: false,
        defer: false,
        textContent: '',
        dataset: {
          cookieCategory: 'analytics',
          cookieSrc: 'https://stats.example.com/script.js',
          cookieAsync: 'true',
          cookieId: 'plausible-sdk',
          domain: 'example.de',
        },
        attributes: analyticsAttrs,
        hasAttribute: (attr) => attr in analyticsAttrs,
        getAttribute: (attr) => (attr in analyticsAttrs ? analyticsAttrs[attr]! : null),
        setAttribute: (attr, val) => {
          analyticsAttrs[attr] = val;
        },
        parentNode: analyticsParent,
        nextSibling: null,
      };

      const marketingScript: MockScriptElement = {
        id: '',
        type: 'text/plain',
        src: '',
        async: false,
        defer: false,
        textContent: 'window.__mkt = 1;',
        dataset: {
          cookieCategory: 'marketing',
        },
        attributes: {},
        hasAttribute: () => false,
        getAttribute: () => null,
        setAttribute: () => {},
        parentNode: marketingParent,
        nextSibling: null,
      };

      env.setBlockedScripts([analyticsScript, marketingScript]);

      const embedMount = {
        hidden: true,
        dataset: {} as Record<string, string>,
        childrenCount: 0,
        replaceChildren(...nodes: unknown[]) {
          this.childrenCount = nodes.length;
        },
      };
      const embedPlaceholder = { hidden: false };
      env.setEmbedContainers([
        {
          dataset: { cookieEmbed: 'marketing' },
          placeholder: embedPlaceholder,
          mount: embedMount,
          tpl: { content: { cloneNode: () => ({ cloned: true }) } },
          querySelector(sel: string) {
            if (sel === '[data-cookie-embed-placeholder]') return embedPlaceholder;
            if (sel === '[data-cookie-embed-mount]') return embedMount;
            if (sel === 'template[data-cookie-embed-template]') return this.tpl;
            return null;
          },
        },
      ]);

      // Before consent: nothing activates
      expect(applyScriptGatekeeper(getDefaultCategories(), document)).toBe(0);
      applyEmbedGatekeeper(getDefaultCategories(), document);
      expect(embedMount.childrenCount).toBe(0);
      expect(analyticsParent.inserted).toHaveLength(0);
      expect(marketingParent.inserted).toHaveLength(0);

      // Grant analytics only: analytics script activates once with SRI & data-domain preserved
      saveCookiePreferences({ analytics: true, marketing: false }, TEST_CONFIG);
      expect(analyticsParent.inserted).toHaveLength(1);
      const injectedAnalytics = analyticsParent.inserted[0]!;
      expect(injectedAnalytics.src).toBe('https://stats.example.com/script.js');
      expect(injectedAnalytics.async).toBe(true);
      expect(injectedAnalytics.id).toBe('plausible-sdk');
      expect(injectedAnalytics.getAttribute('integrity')).toBe('sha384-xyz123');
      expect(injectedAnalytics.getAttribute('crossorigin')).toBe('anonymous');
      expect(injectedAnalytics.dataset.domain).toBe('example.de');
      expect(injectedAnalytics.dataset.cookieSrc).toBeUndefined();
      expect(marketingParent.inserted).toHaveLength(0);
      expect(embedMount.childrenCount).toBe(0);

      // Calling gatekeeper again is idempotent (does not duplicate already-activated script)
      expect(
        applyScriptGatekeeper(
          { necessary: true, preferences: false, analytics: true, marketing: false },
          document
        )
      ).toBe(0);

      // Grant marketing: marketing script & external embed mount
      acceptAllCookies(TEST_CONFIG);
      expect(marketingParent.inserted).toHaveLength(1);
      expect(embedMount.childrenCount).toBe(1);
      expect(embedPlaceholder.hidden).toBe(true);

      // Revoke optional categories: injected scripts detach & external embed unmounts immediately
      rejectOptionalCookies(TEST_CONFIG);
      expect(analyticsParent.inserted).toHaveLength(0);
      expect(marketingParent.inserted).toHaveLength(0);
      expect(embedMount.childrenCount).toBe(0);
      expect(embedPlaceholder.hidden).toBe(false);

      // Re-grant analytics: placeholder can cleanly re-activate after prior revocation
      saveCookiePreferences({ analytics: true, marketing: false }, TEST_CONFIG);
      expect(analyticsParent.inserted).toHaveLength(1);

      // Helper applyConsentDataset works directly on arbitrary Document objects
      applyConsentDataset(document, null);
      expect(env.docElement.dataset.consentState).toBe('undecided');
    });
  });

  describe('Architectural & RTL Discipline Assertions', () => {
    it('enforces RTL logical properties, Lenis isolation, print hiding, focus management, and inline head fallback', () => {
      const componentSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/CookieConsent.astro'),
        'utf-8'
      );
      const layoutSrc = fs.readFileSync(
        path.join(rootDir, 'src/layouts/BaseLayout.astro'),
        'utf-8'
      );
      const globalCss = fs.readFileSync(
        path.join(rootDir, 'src/styles/global.css'),
        'utf-8'
      );

      // Zero physical directional utilities in CookieConsent.astro
      const forbiddenPhysical = /\b(?:ml-|mr-|pl-|pr-|left-|right-|text-left|text-right|border-l-|border-r-|rounded-l-|rounded-r-)/;
      expect(componentSrc).not.toMatch(forbiddenPhysical);

      // Never uses <h1> inside cookie banner/modal (smoke test requires single <h1> per page)
      expect(componentSrc).not.toMatch(/<h1[\s>]/i);

      // Uses IconButton for close icon control, logical corner placement, floating elevation shadow, Lenis scroll isolation, focus restoration, and idempotent guards
      expect(componentSrc).toContain('<IconButton');
      expect(componentSrc).toContain('sm:end-6');
      expect(componentSrc).toContain('shadow-floating');
      expect(componentSrc).not.toContain('max-w-5xl');
      expect(componentSrc).toContain('data-lenis-prevent');
      expect(componentSrc).toContain('dataset.bound');
      expect(componentSrc).toContain('restoreAccessibleFocus');

      // BaseLayout integrates CookieConsent, revisit triggers, and HTTP cookie fallback in inline head script
      expect(layoutSrc).toContain('<CookieConsent');
      expect(layoutSrc).toContain('data-open-cookie-settings');
      expect(layoutSrc).toContain('document.cookie');

      // Global stylesheet defines floating elevation shadow and hides cookie overlays in print
      expect(globalCss).toContain('--theme-shadow-floating');
      expect(globalCss).toContain('[data-cookie-banner]');
      expect(globalCss).toContain('[data-cookie-modal]');
    });
  });
});
