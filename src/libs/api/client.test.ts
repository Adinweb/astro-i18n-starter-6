import { describe, it, expect, vi } from 'vitest';
import {
  getInvalidContactFields,
  resolveApiEndpoint,
  submitContactInquiry,
  validateContactPayload,
  type ContactInquiryPayload,
  type ContactSubmissionResult,
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
});
