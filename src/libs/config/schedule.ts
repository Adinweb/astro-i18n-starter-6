/**
 * Pure ISO date (`YYYY-MM-DD`) and ISO datetime schedule helpers shared by
 * config validation (`app.ts`), build-time top banner filtering
 * (`SiteTopBanner.astro`), and browser runtime evaluation.
 */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/i;

export function isValidScheduleString(value: string): boolean {
  const trimmed = value.trim();
  const dateOnlyMatch = DATE_ONLY_RE.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    return (
      dt.getUTCFullYear() === year &&
      dt.getUTCMonth() === month - 1 &&
      dt.getUTCDate() === day
    );
  }
  if (!ISO_DATETIME_RE.test(trimmed)) return false;
  return Number.isFinite(Date.parse(trimmed));
}

export function parseScheduleBound(
  value: string | undefined,
  bound: 'start' | 'end'
): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const target = DATE_ONLY_RE.test(trimmed)
    ? bound === 'start'
      ? `${trimmed}T00:00:00.000Z`
      : `${trimmed}T23:59:59.999Z`
    : trimmed;
  const ms = Date.parse(target);
  return Number.isFinite(ms) ? ms : null;
}
