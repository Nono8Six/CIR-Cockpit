import { describe, expect, it, vi } from 'vitest';

import { getPresetDateRange } from '@/utils/date/getPresetDateRange';

describe('getPresetDateRange', () => {
  it('returns custom range unchanged', () => {
    const result = getPresetDateRange('custom', '2026-01-01', '2026-01-31');
    expect(result).toEqual({ startDate: '2026-01-01', endDate: '2026-01-31' });
  });

  it('computes last7 range', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 23, 12, 0, 0));
    const result = getPresetDateRange('last7', '', '');
    expect(result).toEqual({ startDate: '2026-01-17', endDate: '2026-01-23' });
  });

  it('computes lastMonth range', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 23, 12, 0, 0));
    const result = getPresetDateRange('lastMonth', '', '');
    expect(result).toEqual({ startDate: '2025-12-01', endDate: '2025-12-31' });
  });
});
