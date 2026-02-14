import { describe, expect, it } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

describe('mapAdminDomainError', () => {
  it('maps unknown admin update error to USER_UPDATE_FAILED', () => {
    const appError = mapAdminDomainError(new Error('boom'), {
      action: 'update_user',
      fallbackMessage: "Impossible de mettre a jour l'utilisateur."
    });

    expect(appError.code).toBe('USER_UPDATE_FAILED');
    expect(appError.message).toBe("Impossible de mettre a jour l'utilisateur.");
  });

  it('maps reset password to PASSWORD_RESET_FAILED for unknown errors', () => {
    const appError = mapAdminDomainError(new Error('boom'), {
      action: 'reset_password',
      fallbackMessage: 'Impossible de reinitialiser le mot de passe.'
    });

    expect(appError.code).toBe('PASSWORD_RESET_FAILED');
    expect(appError.message).toBe('Impossible de reinitialiser le mot de passe.');
  });

  it('keeps pass-through auth errors', () => {
    const authError = createAppError({
      code: 'AUTH_REQUIRED',
      message: 'Veuillez vous reconnecter.',
      source: 'auth'
    });

    const appError = mapAdminDomainError(authError, {
      action: 'read_audit',
      fallbackMessage: 'Impossible de charger les audits.'
    });

    expect(appError.code).toBe('AUTH_REQUIRED');
    expect(appError.message).toBe('Veuillez vous reconnecter.');
  });
});
