import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ChangePasswordScreen from '@/components/ChangePasswordScreen';
import { updateUserPassword } from '@/services/auth/updateUserPassword';

vi.mock('@/services/auth/updateUserPassword', () => ({
  updateUserPassword: vi.fn()
}));
vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn(() => ({
    code: 'UNKNOWN_ERROR',
    message: 'Erreur',
    source: 'client'
  }))
}));

const mockUpdate = vi.mocked(updateUserPassword);

describe('ChangePasswordScreen', () => {
  it('enables submit only when rules pass and passwords match', async () => {
    const user = userEvent.setup();
    mockUpdate.mockResolvedValue(undefined);

    render(
      <ChangePasswordScreen
        userEmail="test@example.com"
        onComplete={() => {}}
        onSignOut={() => {}}
      />
    );

    const submit = screen.getByRole('button', { name: /mettre à jour le mot de passe/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'Abc1234!');
    await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'Abc1234!');
    expect(submit).toBeEnabled();
  });
});
