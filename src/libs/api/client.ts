/**
 * Pure client-side HTTP adapter for external APIs configured via `app.config.json`
 * or `PUBLIC_*` environment variables.
 *
 * Supports custom REST endpoints as well as zero-backend providers (`web3forms`,
 * `formspree`, `basin`, and generic `webhook` payloads such as n8n/Make), plus
 * optional Cloudflare Turnstile verification alongside the built-in honeypot.
 */

export type FormProvider = 'custom' | 'web3forms' | 'formspree' | 'basin' | 'webhook';

export interface ContactInquiryPayload {
  name: string;
  email: string;
  topic: string;
  message: string;
  locale: string;
  honeypot?: string;
  turnstileToken?: string;
}

export type ContactSubmissionErrorCode =
  | 'validation'
  | 'turnstile'
  | 'unconfigured'
  | 'timeout'
  | 'http'
  | 'network';

export type ContactSubmissionResult =
  | { ok: true; status: number }
  | { ok: false; errorCode: ContactSubmissionErrorCode; status?: number };

export interface SubmitContactOptions {
  provider?: FormProvider;
  baseUrl?: string;
  endpoint?: string;
  accessKey?: string;
  requireTurnstile?: boolean;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEB3FORMS_DEFAULT_URL = 'https://api.web3forms.com/submit';

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

/**
 * Resolves the target submission URL taking serverless form providers into account.
 * For `web3forms`, automatically defaults to `https://api.web3forms.com/submit` when an
 * `accessKey` is present and no custom endpoint overrides it.
 */
export function resolveFormEndpoint(
  provider: FormProvider = 'custom',
  endpoint = '',
  baseUrl = '',
  accessKey = ''
): string | null {
  if (provider === 'web3forms') {
    const cleanEndpoint = endpoint.trim();
    const cleanBase = baseUrl.trim();
    if (isAbsoluteHttpUrl(cleanEndpoint)) return cleanEndpoint;
    if (isAbsoluteHttpUrl(cleanBase)) return resolveApiEndpoint(cleanEndpoint, cleanBase);
    return accessKey.trim() ? WEB3FORMS_DEFAULT_URL : null;
  }

  return resolveApiEndpoint(endpoint, baseUrl);
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

function formatContactRequestBody(
  payload: ContactInquiryPayload,
  options: { provider?: FormProvider; accessKey?: string } = {}
): Record<string, unknown> {
  const provider = options.provider ?? 'custom';
  const name = payload.name.trim();
  const email = payload.email.trim();
  const topic = payload.topic.trim();
  const message = payload.message.trim();
  const turnstileToken = payload.turnstileToken?.trim();

  switch (provider) {
    case 'web3forms':
      return {
        access_key: options.accessKey?.trim() ?? '',
        name,
        email,
        subject: topic,
        message,
        locale: payload.locale,
        botcheck: false,
        ...(turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {}),
      };
    case 'formspree':
    case 'basin':
      return {
        name,
        email,
        topic,
        _subject: topic,
        message,
        locale: payload.locale,
        ...(turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {}),
      };
    case 'webhook':
      return {
        event: 'contact_inquiry',
        submittedAt: new Date().toISOString(),
        data: {
          name,
          email,
          topic,
          message,
          locale: payload.locale,
          ...(turnstileToken ? { turnstileToken } : {}),
        },
      };
    case 'custom':
    default:
      return {
        name,
        email,
        topic,
        message,
        locale: payload.locale,
        ...(turnstileToken ? { cfTurnstileToken: turnstileToken } : {}),
      };
  }
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

  if (options.requireTurnstile && !payload.turnstileToken?.trim()) {
    return { ok: false, errorCode: 'turnstile' };
  }

  const provider = options.provider ?? 'custom';
  const targetUrl = resolveFormEndpoint(
    provider,
    options.endpoint ?? '/contact',
    options.baseUrl ?? '',
    options.accessKey ?? ''
  );
  if (!targetUrl) {
    return { ok: false, errorCode: 'unconfigured' };
  }

  if (provider === 'web3forms' && !options.accessKey?.trim()) {
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
      body: JSON.stringify(
        formatContactRequestBody(payload, {
          provider,
          accessKey: options.accessKey,
        })
      ),
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

export interface NewsletterSubscriptionPayload {
  email: string;
  locale: string;
  source?: string;
  honeypot?: string;
  turnstileToken?: string;
}

export function validateNewsletterPayload(payload: NewsletterSubscriptionPayload): boolean {
  return EMAIL_PATTERN.test(payload.email.trim());
}

function formatNewsletterRequestBody(
  payload: NewsletterSubscriptionPayload,
  options: { provider?: FormProvider; accessKey?: string } = {}
): Record<string, unknown> {
  const provider = options.provider ?? 'custom';
  const email = payload.email.trim();
  const source = payload.source?.trim();
  const turnstileToken = payload.turnstileToken?.trim();

  switch (provider) {
    case 'web3forms':
      return {
        access_key: options.accessKey?.trim() ?? '',
        email,
        subject: source ? `Newsletter signup (${source})` : 'Newsletter signup',
        locale: payload.locale,
        botcheck: false,
        ...(source ? { source } : {}),
        ...(turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {}),
      };
    case 'formspree':
    case 'basin':
      return {
        email,
        locale: payload.locale,
        ...(source ? { source } : {}),
        ...(turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {}),
      };
    case 'webhook':
      return {
        event: 'newsletter_subscription',
        submittedAt: new Date().toISOString(),
        data: {
          email,
          locale: payload.locale,
          ...(source ? { source } : {}),
          ...(turnstileToken ? { turnstileToken } : {}),
        },
      };
    case 'custom':
    default:
      return {
        email,
        locale: payload.locale,
        ...(source ? { source } : {}),
        ...(turnstileToken ? { cfTurnstileToken: turnstileToken } : {}),
      };
  }
}

export async function submitNewsletterSubscription(
  payload: NewsletterSubscriptionPayload,
  options: SubmitContactOptions = {}
): Promise<ContactSubmissionResult> {
  if (payload.honeypot && payload.honeypot.trim().length > 0) {
    return { ok: true, status: 200 };
  }

  if (!validateNewsletterPayload(payload)) {
    return { ok: false, errorCode: 'validation' };
  }

  if (options.requireTurnstile && !payload.turnstileToken?.trim()) {
    return { ok: false, errorCode: 'turnstile' };
  }

  const provider = options.provider ?? 'custom';
  const endpoint = options.endpoint?.trim() ?? '';
  const targetUrl =
    provider === 'web3forms'
      ? resolveFormEndpoint(provider, endpoint, options.baseUrl ?? '', options.accessKey ?? '')
      : endpoint
        ? resolveApiEndpoint(endpoint, options.baseUrl ?? '')
        : null;
  if (!targetUrl) {
    return { ok: false, errorCode: 'unconfigured' };
  }

  if (provider === 'web3forms' && !options.accessKey?.trim()) {
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
      body: JSON.stringify(
        formatNewsletterRequestBody(payload, {
          provider,
          accessKey: options.accessKey,
        })
      ),
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
