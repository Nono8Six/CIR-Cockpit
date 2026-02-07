import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { reportError } from '@/services/errors/reportError';
import { appendErrorToJournal } from '@/services/errors/journal';

vi.mock('@/services/errors/journal', () => ({
  appendErrorToJournal: vi.fn().mockResolvedValue(undefined)
}));

describe('reportError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes invalid context source before journaling', () => {
    const error = createAppError({
      code: 'UNKNOWN_ERROR',
      message: 'Erreur test.',
      source: 'unknown'
    });

    reportError(error, { source: 'CockpitForm.saveEntity' });

    expect(appendErrorToJournal).toHaveBeenCalledTimes(1);
    const context = vi.mocked(appendErrorToJournal).mock.calls[0][1];
    expect(context?.source).toBe('CockpitForm.saveEntity');
  });

  it('maps legacy single-token source to feature.action format', () => {
    const error = createAppError({
      code: 'UNKNOWN_ERROR',
      message: 'Erreur test.',
      source: 'unknown'
    });

    reportError(error, { source: 'validation' });

    const context = vi.mocked(appendErrorToJournal).mock.calls[0][1];
    expect(context?.source).toBe('validation.unknown');
  });
});

