import { describe, expect, it } from 'vitest';

import { createErrorFingerprint } from '../fingerprint';

describe('createErrorFingerprint', () => {
  it('is stable for identical inputs', () => {
    const a = createErrorFingerprint({ code: 'AUTH_ERROR', domain: 'auth', source: 'auth', status: 403 });
    const b = createErrorFingerprint({ code: 'AUTH_ERROR', domain: 'auth', source: 'auth', status: 403 });
    expect(a).toBe(b);
  });

  it('changes when salt changes', () => {
    const base = createErrorFingerprint({ code: 'AUTH_ERROR', domain: 'auth', source: 'auth', status: 403 });
    const salted = createErrorFingerprint(
      { code: 'AUTH_ERROR', domain: 'auth', source: 'auth', status: 403 },
      'extra'
    );
    expect(base).not.toBe(salted);
  });
});
