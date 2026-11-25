/**
 * Pure QA metric evaluators for `scripts/qa-browser.mjs` (CLS budget,
 * client JavaScript payload budget, and Axe accessibility violation gating).
 */

export const DEFAULT_CLS_BUDGET = 0.05;
export const DEFAULT_JS_BUDGET_KB = 180;

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
