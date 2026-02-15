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

  it('maps unknown delete user error to USER_DELETE_FAILED', () => {
    const appError = mapAdminDomainError(new Error('boom'), {
      action: 'delete_user',
      fallbackMessage: "Impossible de supprimer l'utilisateur."
    });

    expect(appError.code).toBe('USER_DELETE_FAILED');
    expect(appError.message).toBe("Impossible de supprimer l'utilisateur.");
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

  it('keeps pass-through USER_NOT_FOUND', () => {
    const notFoundError = createAppError({
      code: 'USER_NOT_FOUND',
      message: 'Utilisateur introuvable.',
      source: 'db'
    });

    const appError = mapAdminDomainError(notFoundError, {
      action: 'delete_user',
      fallbackMessage: "Impossible de supprimer l'utilisateur."
    });

    expect(appError.code).toBe('USER_NOT_FOUND');
    expect(appError.message).toBe('Utilisateur introuvable.');
  });

  it('keeps pass-through USER_DELETE_HAS_INTERACTIONS', () => {
    const blockedDeleteError = createAppError({
      code: 'USER_DELETE_HAS_INTERACTIONS',
      message: "Impossible de supprimer cet utilisateur car il a cree des interactions.",
      source: 'db'
    });

    const appError = mapAdminDomainError(blockedDeleteError, {
      action: 'delete_user',
      fallbackMessage: "Impossible de supprimer l'utilisateur."
    });

    expect(appError.code).toBe('USER_DELETE_HAS_INTERACTIONS');
    expect(appError.message).toBe("Impossible de supprimer cet utilisateur car il a cree des interactions.");
  });

  it('keeps pass-through USER_DELETE_ANONYMIZATION_FAILED', () => {
    const anonymizationError = createAppError({
      code: 'USER_DELETE_ANONYMIZATION_FAILED',
      message: "Impossible d'anonymiser les interactions avant suppression.",
      source: 'db'
    });

    const appError = mapAdminDomainError(anonymizationError, {
      action: 'delete_user',
      fallbackMessage: "Impossible de supprimer l'utilisateur."
    });

    expect(appError.code).toBe('USER_DELETE_ANONYMIZATION_FAILED');
    expect(appError.message).toBe("Impossible d'anonymiser les interactions avant suppression.");
  });
});
