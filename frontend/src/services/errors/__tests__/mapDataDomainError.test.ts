import { describe, expect, it } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { mapDataDomainError } from '@/services/errors/mapDataDomainError';

describe('mapDataDomainError', () => {
  it('maps unknown save action errors to DB_WRITE_FAILED', () => {
    const appError = mapDataDomainError(new Error('boom'), {
      action: 'save_entity',
      fallbackMessage: "Impossible d'enregistrer l'entite."
    });

    expect(appError.code).toBe('DB_WRITE_FAILED');
    expect(appError.message).toBe("Impossible d'enregistrer l'entite.");
  });

  it('maps unknown password_changed errors to PROFILE_UPDATE_FAILED', () => {
    const appError = mapDataDomainError(new Error('boom'), {
      action: 'password_changed',
      fallbackMessage: 'Impossible de mettre a jour le profil.'
    });

    expect(appError.code).toBe('PROFILE_UPDATE_FAILED');
    expect(appError.message).toBe('Impossible de mettre a jour le profil.');
  });

  it('keeps pass-through auth errors', () => {
    const authError = createAppError({
      code: 'AUTH_REQUIRED',
      message: 'Veuillez vous reconnecter.',
      source: 'auth'
    });

    const appError = mapDataDomainError(authError, {
      action: 'save_interaction',
      fallbackMessage: "Impossible d'enregistrer l'interaction."
    });

    expect(appError.code).toBe('AUTH_REQUIRED');
    expect(appError.message).toBe('Veuillez vous reconnecter.');
  });
});
