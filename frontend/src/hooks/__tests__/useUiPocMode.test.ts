import { describe, expect, it } from 'vitest';

import {
  isUiPocFlagEnabled,
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
      envFlag: 'false'
    });

    expect(result.mode).toBe('v2');
    expect(result.persistedMode).toBe('v2');
  });

  it('stored mode is used when query mode is missing', () => {
    const result = resolveUiMode({
      search: '',
      storedMode: 'v1',
      envFlag: 'true'
    });

    expect(result.mode).toBe('v1');
    expect(result.persistedMode).toBeNull();
  });

  it('env flag sets fallback mode when no query and no storage', () => {
    const enabled = resolveUiMode({
      search: '',
      storedMode: null,
      envFlag: 'true'
    });
    const disabled = resolveUiMode({
      search: '',
      storedMode: null,
      envFlag: 'false'
    });

    expect(enabled.mode).toBe('v2');
    expect(disabled.mode).toBe('v1');
  });

  it('isUiPocFlagEnabled handles bool-like strings', () => {
    expect(isUiPocFlagEnabled('1')).toBe(true);
    expect(isUiPocFlagEnabled('true')).toBe(true);
    expect(isUiPocFlagEnabled('on')).toBe(true);
    expect(isUiPocFlagEnabled('false')).toBe(false);
    expect(isUiPocFlagEnabled(undefined)).toBe(false);
  });
});
