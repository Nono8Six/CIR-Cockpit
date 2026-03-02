import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChangePasswordState } from '@/hooks/useChangePasswordState';
import { updateUserPassword } from '@/services/auth/updateUserPassword';
import { setProfilePasswordChanged } from '@/services/auth/setProfilePasswordChanged';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';

vi.mock('@/services/auth/updateUserPassword', () => ({
  updateUserPassword: vi.fn()
}));

vi.mock('@/services/auth/setProfilePasswordChanged', () => ({
  setProfilePasswordChanged: vi.fn()
}));

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

describe('useChangePasswordState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('changes password and completes flow on success', async () => {
    const onComplete = vi.fn();
    vi.mocked(updateUserPassword).mockResolvedValue(undefined);
    vi.mocked(setProfilePasswordChanged).mockResolvedValue(undefined);

    const { result } = renderHook(() => useChangePasswordState({ onComplete }));

    act(() => {
      result.current.setPassword('Password123!');
      result.current.setConfirmPassword('Password123!');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(updateUserPassword).toHaveBeenCalledWith('Password123!');
    expect(setProfilePasswordChanged).toHaveBeenCalledTimes(1);
  });

  it('shows session-expired message when auth error occurs', async () => {
    const sessionExpiredError = createAppError({
      code: 'AUTH_SESSION_EXPIRED',
      message: 'Session expiree.',
      source: 'auth'
    });
    vi.mocked(updateUserPassword).mockRejectedValue(new Error('boom'));
    vi.mocked(handleUiError).mockReturnValue(sessionExpiredError);

    const { result } = renderHook(() => useChangePasswordState({ onComplete: vi.fn() }));

    act(() => {
      result.current.setPassword('Password123!');
      result.current.setConfirmPassword('Password123!');
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Votre session a expiré. Veuillez vous reconnecter.');
  });

  it('reports retry-profile errors after password update', async () => {
    const profileError = createAppError({
      code: 'REQUEST_FAILED',
      message: "Impossible de valider le profil.",
      source: 'edge'
    });
    vi.mocked(setProfilePasswordChanged).mockRejectedValue(new Error('boom'));
    vi.mocked(handleUiError).mockReturnValue(profileError);

    const { result } = renderHook(() => useChangePasswordState({ onComplete: vi.fn() }));

    await act(async () => {
      await result.current.handleRetryProfile();
    });

    expect(handleUiError).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe(profileError.message);
  });
});

