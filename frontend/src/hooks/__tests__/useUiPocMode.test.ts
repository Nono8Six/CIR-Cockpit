import { describe, expect, it } from 'vitest';

import {
  parseUiMode,
  resolveUiMode
} from '@/hooks/useUiPocMode';

describe('useUiPocMode helpers', () => {
  it('parseUiMode returns null for unknown values', () => {
    expect(parseUiMode('v3')).toBeNull();
    expect(parseUiMode(null)).toBeNull();
  });

  it('query mode has priority and is persisted', () => {
    const result = resolveUiMode({
      search: '?ui=v2',
      storedMode: 'v1',
      defaultEnabled: false
    });

    expect(result.mode).toBe('v2');
    expect(result.persistedMode).toBe('v2');
  });

  it('stored mode is used when query mode is missing', () => {
    const result = resolveUiMode({
      search: '',
      storedMode: 'v1',
      defaultEnabled: true
    });

    expect(result.mode).toBe('v1');
    expect(result.persistedMode).toBeNull();
  });

  it('product flag sets fallback mode when no query and no storage', () => {
    const enabled = resolveUiMode({
      search: '',
      storedMode: null,
      defaultEnabled: true
    });
    const disabled = resolveUiMode({
      search: '',
      storedMode: null,
      defaultEnabled: false
    });

    expect(enabled.mode).toBe('v2');
    expect(disabled.mode).toBe('v1');
  });
});
