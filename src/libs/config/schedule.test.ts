import { describe, expect, it } from 'vitest';
import { isValidScheduleString, parseScheduleBound } from './schedule';

describe('schedule helpers', () => {
  it('validates real ISO calendar dates and datetimes while rejecting impossible dates', () => {
    expect(isValidScheduleString('2026-02-28')).toBe(true);
    expect(isValidScheduleString('2026-02-29')).toBe(false);
    expect(isValidScheduleString('2024-02-29')).toBe(true);
    expect(isValidScheduleString('2026-05-01T12:30:00Z')).toBe(true);
    expect(isValidScheduleString('not-a-date')).toBe(false);
  });

  it('expands date-only values to full UTC start/end day boundaries', () => {
    expect(parseScheduleBound(undefined, 'start')).toBeNull();
    expect(parseScheduleBound('  ', 'end')).toBeNull();
    expect(parseScheduleBound('2026-06-01', 'start')).toBe(Date.parse('2026-06-01T00:00:00.000Z'));
    expect(parseScheduleBound('2026-06-01', 'end')).toBe(Date.parse('2026-06-01T23:59:59.999Z'));
    expect(parseScheduleBound('2026-06-01T08:00:00Z', 'end')).toBe(
      Date.parse('2026-06-01T08:00:00Z')
    );
  });
});
