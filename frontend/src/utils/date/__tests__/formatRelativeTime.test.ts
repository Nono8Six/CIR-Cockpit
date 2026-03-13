import { describe, expect, it, vi } from 'vitest';

import { formatRelativeTime } from '../formatRelativeTime';

describe('formatRelativeTime', () => {
  it('returns a relative string for a recent date', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = formatRelativeTime(fiveMinutesAgo);
    expect(result).toContain('minutes');
  });

  it('returns "il y a" prefix (French locale)', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(oneHourAgo);
    expect(result).toMatch(/^il y a/);
  });

  it('handles a Date object input', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(yesterday);
    expect(result).toMatch(/jour|heure/);
  });

  it('returns a longer distance for old dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00Z'));

    const result = formatRelativeTime('2026-02-12T12:00:00Z');
    expect(result).toMatch(/mois/);

    vi.useRealTimers();
  });
});
