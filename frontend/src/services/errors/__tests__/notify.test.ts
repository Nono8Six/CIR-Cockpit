import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { notifyError } from '@/services/errors/notify';
import { useErrorStore } from '@/stores/errorStore';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('notifyError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useErrorStore.getState().clearErrors();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-06T00:00:00.000Z'));
  });

  it('deduplicates repeated toast notifications in a short window', () => {
    const error = createAppError({
      code: 'UNKNOWN_ERROR',
      message: 'Erreur test.',
      source: 'unknown'
    });

    notifyError(error);
    notifyError(error);

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(useErrorStore.getState().lastError?.code).toBe('UNKNOWN_ERROR');

    vi.advanceTimersByTime(1600);
    notifyError(error);

    expect(toast.error).toHaveBeenCalledTimes(2);
  });
});

