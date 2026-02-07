import { describe, expect, it } from 'vitest';

import { safeJsonParse } from '@/utils/safeJsonParse';

describe('safeJsonParse', () => {
  it('returns fallback on non-string', () => {
    expect(safeJsonParse(123, { ok: false })).toEqual({ ok: false });
  });

  it('returns fallback on invalid JSON', () => {
    expect(safeJsonParse('not-json', { ok: false })).toEqual({ ok: false });
  });

  it('parses valid JSON', () => {
    expect(safeJsonParse('{"ok":true}', { ok: false })).toEqual({ ok: true });
  });
});
