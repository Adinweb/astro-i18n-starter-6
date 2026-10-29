/**
 * Pure client-side HTTP adapter for external APIs configured via `app.config.json`
 * or `PUBLIC_*` environment variables.
 *
 * Keeps the Astro site 100% static (Pure SSG) with zero internal backend while
 * providing typed validation, URL resolution, request timeouts, and structured
 * error states for interactive forms.
 */

export interface ContactInquiryPayload {
  name: string;
  email: string;
  topic: string;
  message: string;
  locale: string;
  honeypot?: string;
}

export type ContactSubmissionErrorCode =
  | 'validation'
  | 'unconfigured'
  | 'timeout'
  | 'http'
  | 'network';

export type ContactSubmissionResult =
  | { ok: true; status: number }
  | { ok: false; errorCode: ContactSubmissionErrorCode; status?: number };

export interface SubmitContactOptions {
  baseUrl?: string;
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value);
}

/**
 * Resolves an endpoint path or absolute URL against `baseUrl`.
 * Returns `null` when neither an absolute `endpoint` nor a valid `baseUrl` is configured,
 * allowing static previews to surface a clear configuration notice instead of posting
 * to a non-existent local route.
 */
export function resolveApiEndpoint(endpoint: string, baseUrl = ''): string | null {
  const cleanEndpoint = endpoint.trim();
  const cleanBase = baseUrl.trim();

  if (isAbsoluteHttpUrl(cleanEndpoint)) {
    return cleanEndpoint;
  }

  if (!cleanBase || !isAbsoluteHttpUrl(cleanBase)) {
    return null;
  }

  if (!cleanEndpoint) {
    return cleanBase;
  }

  return `${cleanBase.replace(/\/+$/, '')}/${cleanEndpoint.replace(/^\/+/, '')}`;
}

export function getInvalidContactFields(
  payload: ContactInquiryPayload
): Array<'name' | 'email' | 'topic' | 'message'> {
  const invalid: Array<'name' | 'email' | 'topic' | 'message'> = [];
  if (payload.name.trim().length < 2) invalid.push('name');
  if (!EMAIL_PATTERN.test(payload.email.trim())) invalid.push('email');
  if (payload.topic.trim().length < 1) invalid.push('topic');
  if (payload.message.trim().length < 10) invalid.push('message');
  return invalid;
}

export function validateContactPayload(payload: ContactInquiryPayload): boolean {
  return getInvalidContactFields(payload).length === 0;
}

export async function submitContactInquiry(
  payload: ContactInquiryPayload,
  options: SubmitContactOptions = {}
): Promise<ContactSubmissionResult> {
  if (payload.honeypot && payload.honeypot.trim().length > 0) {
    return { ok: true, status: 200 };
  }

  if (!validateContactPayload(payload)) {
    return { ok: false, errorCode: 'validation' };
  }

  const targetUrl = resolveApiEndpoint(options.endpoint ?? '/contact', options.baseUrl ?? '');
  if (!targetUrl) {
    return { ok: false, errorCode: 'unconfigured' };
  }

  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = Math.max(1000, options.timeoutMs ?? 10000);
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(targetUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Locale': payload.locale,
      },
      body: JSON.stringify({
        name: payload.name.trim(),
        email: payload.email.trim(),
        topic: payload.topic.trim(),
        message: payload.message.trim(),
        locale: payload.locale,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, errorCode: 'http', status: response.status };
    }

    return { ok: true, status: response.status };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, errorCode: 'timeout' };
    }
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, errorCode: 'timeout' };
    }
    return { ok: false, errorCode: 'network' };
  } finally {
    globalThis.clearTimeout(timer);
  }
}
