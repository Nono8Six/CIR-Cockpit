import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useNotifyError } from '@/hooks/useNotifyError';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

const mockHandleUiError = vi.mocked(handleUiError);

describe('useNotifyError', () => {
  it('notifies once per unique error signature', async () => {
    const error = createAppError({ code: 'AUTH_ERROR', message: 'boom' });
    const { rerender } = renderHook(({ err }) =>
      useNotifyError(err, 'fallback', 'test'),
      { initialProps: { err: error } }
    );

    rerender({ err: error });
    await waitFor(() => {
      expect(mockHandleUiError).toHaveBeenCalledTimes(1);
    });
  });
});
