import { describe, expect, it, vi } from 'vitest';

import { handleUiError } from '@/services/errors/handleUiError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

vi.mock('@/services/errors/notify', () => ({
  notifyError: vi.fn()
}));

vi.mock('@/services/errors/reportError', () => ({
  reportError: vi.fn()
}));

const mockNotify = vi.mocked(notifyError);
const mockReport = vi.mocked(reportError);

describe('handleUiError', () => {
  it('normalizes and notifies', () => {
    const result = handleUiError(new Error('boom'), 'Fallback', { source: 'test' });
    expect(result.message).toBeTruthy();
    expect(mockReport).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });
});
