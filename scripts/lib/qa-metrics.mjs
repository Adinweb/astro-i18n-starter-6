/**
 * Pure QA metric evaluators for `scripts/qa-browser.mjs` and
 * `scripts/qa-lighthouse.mjs` (CLS budget, JS payload budget, Axe WCAG gating,
 * and Lighthouse category thresholds).
 */

export const DEFAULT_CLS_BUDGET = 0.05;
export const DEFAULT_JS_BUDGET_KB = 180;

export const DEFAULT_LIGHTHOUSE_THRESHOLDS = {
  performance: 90,
  accessibility: 95,
  bestPractices: 95,
  seo: 95,
  cls: DEFAULT_CLS_BUDGET,
};

export function isTrackedAppScriptUrl(url, origin = '') {
  if (typeof url !== 'string' || !url.trim()) return false;
  let pathname = '';
  try {
    const parsed = origin ? new URL(url, origin) : new URL(url, 'http://127.0.0.1');
    if (origin && parsed.origin !== origin) return false;
    pathname = parsed.pathname;
  } catch {
    return false;
  }

  if (pathname.startsWith('/pagefind/')) return false;
  return pathname.endsWith('.js') || pathname.endsWith('.mjs');
}

export function evaluateClsMetric(clsValue, budget = DEFAULT_CLS_BUDGET) {
  const safeValue = Number.isFinite(clsValue) && clsValue >= 0 ? Number(clsValue.toFixed(4)) : 0;
  return {
    ok: safeValue <= budget,
    value: safeValue,
    budget,
  };
}

export function evaluateJsBudget(totalBytes, budgetKb = DEFAULT_JS_BUDGET_KB) {
  const safeBytes = Number.isFinite(totalBytes) && totalBytes >= 0 ? totalBytes : 0;
  const totalKb = Number((safeBytes / 1024).toFixed(1));
  return {
    ok: totalKb <= budgetKb,
    totalKb,
    budgetKb,
  };
}

export function summarizeAxeViolations(violations = []) {
  const list = Array.isArray(violations) ? violations : [];
  const blocking = list.filter(
    (entry) => entry?.impact === 'critical' || entry?.impact === 'serious'
  );
  const summaryLines = blocking.map(
    (entry) => `[${entry.impact}] ${entry.id}: ${entry.help} (${entry.nodes?.length ?? 0} node(s))`
  );
  return {
    ok: blocking.length === 0,
    totalCount: list.length,
    blockingCount: blocking.length,
    summaryLines,
  };
}

export function evaluateLighthouseResult(lhr, thresholds = DEFAULT_LIGHTHOUSE_THRESHOLDS) {
  const categories = lhr?.categories ?? {};
  const toScore = (id) => {
    const raw = categories?.[id]?.score;
    return typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw * 100) : 0;
  };

  const scores = {
    performance: toScore('performance'),
    accessibility: toScore('accessibility'),
    bestPractices: toScore('best-practices'),
    seo: toScore('seo'),
  };

  const clsRaw = lhr?.audits?.['cumulative-layout-shift']?.numericValue;
  const cls = Number.isFinite(clsRaw) ? Number(clsRaw.toFixed(4)) : 0;

  const failures = [];
  if (scores.performance < thresholds.performance) {
    failures.push(`performance ${scores.performance} < ${thresholds.performance}`);
  }
  if (scores.accessibility < thresholds.accessibility) {
    failures.push(`accessibility ${scores.accessibility} < ${thresholds.accessibility}`);
  }
  if (scores.bestPractices < thresholds.bestPractices) {
    failures.push(`best-practices ${scores.bestPractices} < ${thresholds.bestPractices}`);
  }
  if (scores.seo < thresholds.seo) {
    failures.push(`seo ${scores.seo} < ${thresholds.seo}`);
  }
  if (cls > thresholds.cls) {
    failures.push(`CLS ${cls} > ${thresholds.cls}`);
  }

  return {
    ok: failures.length === 0,
    scores,
    cls,
    failures,
  };
}
