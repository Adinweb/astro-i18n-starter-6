import {
  dispatchFormConversion,
  resolvePostSubmitRedirect,
  type ContactSubmissionErrorCode,
  type FormConversionKind,
  type FormProvider,
} from '@/libs/api/client';

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
}

export interface TurnstileController {
  readonly enabled: boolean;
  getToken: (formData: FormData) => string;
  reset: () => void;
}

export interface FeedbackElements {
  box: HTMLElement | null;
  title: HTMLElement | null;
  body: HTMLElement | null;
}

function ensureTurnstileLoaded(): Promise<TurnstileApi | null> {
  const win = window as unknown as {
    turnstile?: TurnstileApi;
    __turnstilePromise?: Promise<TurnstileApi | null>;
  };
  if (win.turnstile) return Promise.resolve(win.turnstile);
  if (win.__turnstilePromise) return win.__turnstilePromise;

  win.__turnstilePromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script]');
    if (existing) {
      existing.addEventListener('load', () => resolve(win.turnstile ?? null), { once: true });
      existing.addEventListener('error', () => resolve(null), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = 'true';
    script.onload = () => resolve(win.turnstile ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return win.__turnstilePromise;
}

export function createTurnstileController(form: HTMLFormElement): TurnstileController {
  const container = form.querySelector<HTMLElement>('[data-turnstile-container]');
  const siteKey = form.dataset.turnstileSiteKey?.trim() ?? '';
  let widgetId: string | null = null;
  let callbackToken = '';

  if (siteKey && container) {
    void ensureTurnstileLoaded().then((api) => {
      if (!api || !container.isConnected || widgetId !== null) return;
      const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      widgetId = api.render(container, {
        sitekey: siteKey,
        theme,
        language: form.dataset.locale ?? 'auto',
        callback: (token: string) => {
          callbackToken = token;
        },
        'expired-callback': () => {
          callbackToken = '';
        },
      });
    });
  }

  return {
    enabled: Boolean(siteKey),
    getToken: (formData: FormData) => {
      const winTurnstile = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      return (
        callbackToken ||
        (widgetId !== null ? (winTurnstile?.getResponse(widgetId) ?? '') : '') ||
        String(formData.get('cf-turnstile-response') ?? '')
      );
    },
    reset: () => {
      callbackToken = '';
      const winTurnstile = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (widgetId !== null) winTurnstile?.reset(widgetId);
    },
  };
}

export function readFormErrorMessages(
  dataset: DOMStringMap
): Record<ContactSubmissionErrorCode, string> {
  return {
    validation: dataset.errValidation ?? '',
    turnstile: dataset.errTurnstile ?? dataset.errValidation ?? '',
    unconfigured: dataset.errUnconfigured ?? '',
    timeout: dataset.errTimeout ?? '',
    http: dataset.errHttp ?? '',
    network: dataset.errNetwork ?? '',
  };
}

export function setFormSubmitting(
  submitBtn: HTMLButtonElement | null,
  submitLabel: HTMLElement | null,
  submitting: boolean,
  submitText?: string,
  submittingText?: string
): void {
  if (submitBtn) submitBtn.disabled = submitting;
  const nextLabel = submitting ? submittingText : submitText;
  if (submitLabel && nextLabel) {
    submitLabel.textContent = nextLabel;
  }
}

export function renderFormFeedback(
  elements: FeedbackElements,
  kind: 'success' | 'error',
  title: string,
  body: string,
  paddingClass = 'p-4'
): void {
  const { box, title: titleEl, body: bodyEl } = elements;
  if (!box || !titleEl || !bodyEl) return;
  box.hidden = false;
  box.className =
    kind === 'success'
      ? `rounded-xl border border-success/30 bg-success/10 ${paddingClass} text-sm text-fg`
      : `rounded-xl border border-error/30 bg-error/10 ${paddingClass} text-sm text-fg`;
  titleEl.textContent = title;
  bodyEl.textContent = body;
}

export function finalizeFormSuccess(options: {
  form: HTMLFormElement;
  kind: FormConversionKind;
  locale: string;
  provider: FormProvider;
  source?: string;
  honeypot: string;
  feedback: FeedbackElements;
  feedbackPadding?: string;
  onReset?: () => void;
}): void {
  const {
    form,
    kind,
    locale,
    provider,
    source,
    honeypot,
    feedback,
    feedbackPadding = 'p-4',
    onReset,
  } = options;

  form.reset();
  onReset?.();
  renderFormFeedback(
    feedback,
    'success',
    form.dataset.msgSuccessTitle ?? '',
    form.dataset.msgSuccessDesc ?? '',
    feedbackPadding
  );

  if (!honeypot.trim()) {
    const redirectTarget = resolvePostSubmitRedirect(form.dataset.redirectTo);
    dispatchFormConversion(kind, {
      locale,
      provider,
      ...(source ? { source } : {}),
      ...(redirectTarget ? { redirectTo: redirectTarget } : {}),
    });
    if (redirectTarget) {
      window.location.assign(redirectTarget);
    }
  }
}
