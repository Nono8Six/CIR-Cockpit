import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { mapSettingsDomainError } from '@/services/errors/mapSettingsDomainError';

describe('mapSettingsDomainError', () => {
  it('maps save unknown errors to DB_WRITE_FAILED', () => {
    const appError = mapSettingsDomainError(new Error('save failed'), {
      action: 'save_config',
      fallbackMessage: 'Impossible de sauvegarder la configuration.'
    });

    expect(appError.code).toBe('DB_WRITE_FAILED');
    expect(appError.message).toBe('Impossible de sauvegarder la configuration.');
  });

  it('maps validation errors to CONFIG_INVALID', () => {
    const parsed = z.object({ label: z.string() }).safeParse({});
    if (parsed.success) throw new Error('Validation should fail in this test.');

    const appError = mapSettingsDomainError(
      parsed.error,
      {
        action: 'save_config',
        fallbackMessage: 'Configuration invalide.'
      }
    );

    expect(appError.code).toBe('CONFIG_INVALID');
    expect(appError.message).toBe('Configuration invalide.');
  });

  it('keeps pass-through config errors', () => {
    const configError = createAppError({
      code: 'CONFIG_INVALID',
      message: 'Configuration invalide.',
      source: 'client'
    });

    const appError = mapSettingsDomainError(configError, {
      action: 'save_config',
      fallbackMessage: 'Impossible de sauvegarder la configuration.'
    });

    expect(appError.code).toBe('CONFIG_INVALID');
    expect(appError.message).toBe('Configuration invalide.');
  });
});
