import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initErrorReporter } from '@/services/errors/sentryStub';
import { setErrorReporter } from '@/services/errors/reportError';

vi.mock('@/services/errors/reportError', () => ({
  setErrorReporter: vi.fn()
}));

describe('sentryStub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined);
    vi.spyOn(console, 'dir').mockImplementation(() => undefined);
    vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined);
  });

  it('registers a reporter in development mode', () => {
    initErrorReporter(true);
    expect(setErrorReporter).toHaveBeenCalledTimes(1);
  });

  it('does not register a reporter in production mode', () => {
    initErrorReporter(false);
    expect(setErrorReporter).not.toHaveBeenCalled();
  });

  it('extracts error code when reporter receives an AppError-like object', () => {
    initErrorReporter(true);
    const reporter = vi.mocked(setErrorReporter).mock.calls[0]?.[0];
    expect(reporter).toBeTypeOf('function');
    if (!reporter) {
      return;
    }

    reporter({ code: 'AUTH_ERROR' });

    expect(console.groupCollapsed).toHaveBeenCalledWith('[ErrorReporter] AUTH_ERROR');
  });

  it('falls back to UNKNOWN_ERROR when reporter receives an unknown payload', () => {
    initErrorReporter(true);
    const reporter = vi.mocked(setErrorReporter).mock.calls[0]?.[0];
    expect(reporter).toBeTypeOf('function');
    if (!reporter) {
      return;
    }

    reporter('unexpected');

    expect(console.groupCollapsed).toHaveBeenCalledWith('[ErrorReporter] UNKNOWN_ERROR');
  });
});
