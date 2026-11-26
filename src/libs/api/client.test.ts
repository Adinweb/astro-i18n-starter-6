import { describe, it, expect, vi } from 'vitest';
import {
  dispatchFormConversion,
  getInvalidContactFields,
  resolveApiEndpoint,
  resolvePostSubmitRedirect,
  submitContactInquiry,
  submitNewsletterSubscription,
  validateContactPayload,
  validateNewsletterPayload,
  type ContactInquiryPayload,
  type ContactSubmissionResult,
  type NewsletterSubscriptionPayload,
  type SubmitContactOptions,
} from './client';

const validPayload: ContactInquiryPayload = {
  name: 'Sara Rad',
  email: 'sara@example.com',
  topic: 'architecture',
  message: 'We need bidirectional RTL localization across five markets.',
  locale: 'fa',
};

describe('src/libs/api/client.ts', () => {
  describe('resolveApiEndpoint', () => {
    it('returns null when neither an absolute endpoint nor a valid baseUrl is configured', () => {
      expect(resolveApiEndpoint('/contact', '')).toBeNull();
      expect(resolveApiEndpoint('/contact', '   ')).toBeNull();
      expect(resolveApiEndpoint('/contact', '/relative-base')).toBeNull();
    });

    it('prefers an explicit absolute endpoint URL over baseUrl', () => {
      expect(
        resolveApiEndpoint('https://forms.example.io/v1/inquiries', 'https://api.other.io')
      ).toBe('https://forms.example.io/v1/inquiries');
    });

    it('joins baseUrl and relative endpoint without duplicate slashes', () => {
      expect(resolveApiEndpoint('/contact', 'https://api.example.com/')).toBe(
        'https://api.example.com/contact'
      );
      expect(resolveApiEndpoint('v1/contact', 'https://api.example.com/api')).toBe(
        'https://api.example.com/api/v1/contact'
      );
    });
  });

  describe('validateContactPayload & getInvalidContactFields', () => {
    it('accepts valid payloads and rejects incomplete or malformed fields', () => {
      expect(validateContactPayload(validPayload)).toBe(true);
      expect(getInvalidContactFields(validPayload)).toEqual([]);
      expect(validateContactPayload({ ...validPayload, name: 'A' })).toBe(false);
      expect(validateContactPayload({ ...validPayload, email: 'not-an-email' })).toBe(false);
      expect(validateContactPayload({ ...validPayload, topic: '   ' })).toBe(false);
      expect(validateContactPayload({ ...validPayload, message: 'Too short' })).toBe(false);
    });

    it('reports exact invalid field names in deterministic form order', () => {
      expect(
        getInvalidContactFields({
          name: ' ',
          email: 'bad',
          topic: '',
          message: 'short',
          locale: 'en',
        })
      ).toEqual(['name', 'email', 'topic', 'message']);
    });
  });

  describe('submitContactInquiry', () => {
    it('silently resolves ok without calling fetch when honeypot is populated', async () => {
      const fetchSpy = vi.fn();
      const result = await submitContactInquiry(
        { ...validPayload, honeypot: 'https://spam.example.org' },
        { baseUrl: 'https://api.example.com', fetchImpl: fetchSpy as unknown as typeof fetch }
      );
      expect(result).toEqual({ ok: true, status: 200 });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns validation error before touching the network', async () => {
      const fetchSpy = vi.fn();
      const result: ContactSubmissionResult = await submitContactInquiry(
        { ...validPayload, email: 'invalid' },
        { baseUrl: 'https://api.example.com', fetchImpl: fetchSpy as unknown as typeof fetch }
      );
      expect(result).toEqual({ ok: false, errorCode: 'validation' });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns unconfigured error when no external endpoint URL is configured', async () => {
      const options: SubmitContactOptions = { baseUrl: '', endpoint: '/contact' };
      const result = await submitContactInquiry(validPayload, options);
      expect(result).toEqual({ ok: false, errorCode: 'unconfigured' });
    });

    it('posts trimmed JSON with X-Client-Locale header and resolves ok on 2xx', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 201 });
      const result = await submitContactInquiry(
        { ...validPayload, name: '  Sara Rad  ' },
        {
          baseUrl: 'https://api.example.com/',
          endpoint: '/contact',
          timeoutMs: 5000,
          fetchImpl: fetchSpy as unknown as typeof fetch,
        }
      );

      expect(result).toEqual({ ok: true, status: 201 });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchSpy.mock.calls[0]!;
      expect(calledUrl).toBe('https://api.example.com/contact');
      expect(init.method).toBe('POST');
      expect(init.headers['X-Client-Locale']).toBe('fa');
      expect(JSON.parse(init.body)).toEqual({
        ...validPayload,
        name: 'Sara Rad',
      });
    });

    it('maps non-2xx HTTP responses, AbortError timeouts, and network errors accurately', async () => {
      const httpFail = vi.fn().mockResolvedValue({ ok: false, status: 503 });
      expect(
        await submitContactInquiry(validPayload, {
          endpoint: 'https://api.example.com/contact',
          fetchImpl: httpFail as unknown as typeof fetch,
        })
      ).toEqual({ ok: false, errorCode: 'http', status: 503 });

      const abortErr = Object.assign(new Error('Aborted'), { name: 'AbortError' });
      const timeoutFetch = vi.fn().mockRejectedValue(abortErr);
      expect(
        await submitContactInquiry(validPayload, {
          endpoint: 'https://api.example.com/contact',
          fetchImpl: timeoutFetch as unknown as typeof fetch,
        })
      ).toEqual({ ok: false, errorCode: 'timeout' });

      const netFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      expect(
        await submitContactInquiry(validPayload, {
          endpoint: 'https://api.example.com/contact',
          fetchImpl: netFetch as unknown as typeof fetch,
        })
      ).toEqual({ ok: false, errorCode: 'network' });
    });
  });

  describe('newsletter adapter', () => {
    const validNewsletter: NewsletterSubscriptionPayload = {
      email: 'team@example.com',
      locale: 'en',
      source: 'landing',
    };

    it('validates newsletter email addresses strictly', () => {
      expect(validateNewsletterPayload(validNewsletter)).toBe(true);
      expect(validateNewsletterPayload({ email: 'bad-email', locale: 'en' })).toBe(false);
    });

    it('silently ignores honeypot submissions and checks configuration', async () => {
      const fetchSpy = vi.fn();
      expect(
        await submitNewsletterSubscription(
          { ...validNewsletter, honeypot: 'https://bot.example.com' },
          { endpoint: 'https://api.example.com/newsletter', fetchImpl: fetchSpy as unknown as typeof fetch }
        )
      ).toEqual({ ok: true, status: 200 });
      expect(fetchSpy).not.toHaveBeenCalled();

      expect(
        await submitNewsletterSubscription(validNewsletter, { baseUrl: 'https://api.example.com', endpoint: '' })
      ).toEqual({ ok: false, errorCode: 'unconfigured' });
    });

    it('posts trimmed email with locale header on valid newsletter subscription', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      const result = await submitNewsletterSubscription(
        { ...validNewsletter, email: '  team@example.com  ' },
        {
          baseUrl: 'https://api.example.com',
          endpoint: '/newsletter',
          fetchImpl: fetchSpy as unknown as typeof fetch,
        }
      );

      expect(result).toEqual({ ok: true, status: 200 });
      const [calledUrl, init] = fetchSpy.mock.calls[0]!;
      expect(calledUrl).toBe('https://api.example.com/newsletter');
      expect(JSON.parse(init.body)).toEqual({
        email: 'team@example.com',
        locale: 'en',
        source: 'landing',
      });
    });
  });

  describe('serverless form providers & Turnstile guard', () => {
    it('formats Web3Forms submissions with access_key and resolves endpoint automatically', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      const result = await submitContactInquiry(validPayload, {
        provider: 'web3forms',
        accessKey: 'w3f-test-key',
        fetchImpl: fetchSpy as unknown as typeof fetch,
      });

      expect(result).toEqual({ ok: true, status: 200 });
      const [calledUrl, init] = fetchSpy.mock.calls[0]!;
      expect(calledUrl).toBe('https://api.web3forms.com/submit');
      const sent = JSON.parse(init.body);
      expect(sent.access_key).toBe('w3f-test-key');
      expect(sent.name).toBe('Sara Rad');
      expect(sent.subject).toContain('architecture');
    });

    it('returns unconfigured for web3forms without an accessKey', async () => {
      const result = await submitContactInquiry(validPayload, {
        provider: 'web3forms',
        accessKey: '',
      });
      expect(result).toEqual({ ok: false, errorCode: 'unconfigured' });
    });

    it('sends standard JSON payloads for Formspree, Basin, and webhook providers', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      await submitContactInquiry(validPayload, {
        provider: 'formspree',
        endpoint: 'https://formspree.io/f/xyz123',
        fetchImpl: fetchSpy as unknown as typeof fetch,
      });
      const [, init] = fetchSpy.mock.calls[0]!;
      const body = JSON.parse(init.body);
      expect(body._subject).toContain('architecture');
      expect(body.email).toBe('sara@example.com');
    });

    it('enforces Turnstile token when requireTurnstile is enabled', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      const missingToken = await submitContactInquiry(validPayload, {
        endpoint: 'https://api.example.com/contact',
        requireTurnstile: true,
        fetchImpl: fetchSpy as unknown as typeof fetch,
      });
      expect(missingToken).toEqual({ ok: false, errorCode: 'turnstile' });
      expect(fetchSpy).not.toHaveBeenCalled();

      const withToken = await submitContactInquiry(
        { ...validPayload, turnstileToken: 'cf-token-123' },
        {
          endpoint: 'https://api.example.com/contact',
          requireTurnstile: true,
          fetchImpl: fetchSpy as unknown as typeof fetch,
        }
      );
      expect(withToken).toEqual({ ok: true, status: 200 });
      expect(JSON.parse(fetchSpy.mock.calls[0]![1].body).cfTurnstileToken).toBe(
        'cf-token-123'
      );
    });
  });

  describe('post-submit redirect & conversion dispatcher', () => {
    it('allows root-relative paths and explicit http(s) URLs while rejecting unsafe targets', () => {
      expect(resolvePostSubmitRedirect('/thank-you/')).toBe('/thank-you/');
      expect(resolvePostSubmitRedirect('https://cal.example.com/booked')).toBe(
        'https://cal.example.com/booked'
      );
      expect(resolvePostSubmitRedirect('')).toBeNull();
      expect(resolvePostSubmitRedirect('//evil.example/phish')).toBeNull();
      expect(resolvePostSubmitRedirect('/\\evil.example')).toBeNull();
      expect(resolvePostSubmitRedirect('javascript:alert(1)')).toBeNull();
      expect(resolvePostSubmitRedirect('data:text/html,hi')).toBeNull();
      expect(resolvePostSubmitRedirect('https://user:pass@evil.example/phish')).toBeNull();
      expect(resolvePostSubmitRedirect('/ok\r\nSet-Cookie: a=b')).toBeNull();
    });

    it('is safe to invoke dispatchFormConversion when window/document globals are absent', () => {
      expect(() =>
        dispatchFormConversion('contact', { locale: 'en', provider: 'custom' })
      ).not.toThrow();
    });

    it('forwards conversion events when analytics.requireConsent is false (direct mode) and gates them otherwise', () => {
      const prevWindow = (globalThis as Record<string, unknown>).window;
      const prevDocument = (globalThis as Record<string, unknown>).document;
      const prevCustomEvent = (globalThis as Record<string, unknown>).CustomEvent;

      try {
        const gtag = vi.fn();
        const plausible = vi.fn();
        const umamiTrack = vi.fn();
        const dispatched: unknown[] = [];
        let gateDataset: Record<string, string | undefined> = {
          requireConsent: 'true',
          cookielessOpen: 'false',
        };

        (globalThis as Record<string, unknown>).CustomEvent = class MockCustomEvent {
          type: string;
          detail: unknown;
          constructor(type: string, init?: { detail?: unknown }) {
            this.type = type;
            this.detail = init?.detail;
          }
        };
        (globalThis as Record<string, unknown>).window = {
          gtag,
          plausible,
          umami: { track: umamiTrack },
          dispatchEvent: (ev: unknown) => {
            dispatched.push(ev);
            return true;
          },
        };
        (globalThis as Record<string, unknown>).document = {
          documentElement: { dataset: { consentAnalytics: 'false' } },
          querySelector: (selector: string) =>
            selector === '[data-analytics-gatekeeper]' ? { dataset: gateDataset } : null,
        };

        dispatchFormConversion('contact', { locale: 'en', provider: 'custom' });
        expect(dispatched).toHaveLength(1);
        expect(gtag).not.toHaveBeenCalled();
        expect(plausible).not.toHaveBeenCalled();
        expect(umamiTrack).not.toHaveBeenCalled();

        gateDataset = { requireConsent: 'false', cookielessOpen: 'false' };
        dispatchFormConversion('newsletter', { locale: 'fa', provider: 'web3forms', source: 'footer' });
        expect(gtag).toHaveBeenCalledWith('event', 'sign_up', {
          locale: 'fa',
          form_provider: 'web3forms',
          form_source: 'footer',
        });
        expect(plausible).toHaveBeenCalledWith('NewsletterSignup', {
          props: { locale: 'fa', source: 'footer' },
        });
        expect(umamiTrack).toHaveBeenCalledWith('NewsletterSignup', {
          locale: 'fa',
          source: 'footer',
        });
      } finally {
        (globalThis as Record<string, unknown>).window = prevWindow;
        (globalThis as Record<string, unknown>).document = prevDocument;
        (globalThis as Record<string, unknown>).CustomEvent = prevCustomEvent;
      }
    });
  });
});
