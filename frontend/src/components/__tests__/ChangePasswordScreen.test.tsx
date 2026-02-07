import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ChangePasswordScreen from '@/components/ChangePasswordScreen';
import { updateUserPassword } from '@/services/auth/updateUserPassword';
import { setProfilePasswordChanged } from '@/services/auth/setProfilePasswordChanged';

vi.mock('@/services/auth/updateUserPassword', () => ({
  updateUserPassword: vi.fn()
}));
vi.mock('@/services/auth/setProfilePasswordChanged', () => ({
  setProfilePasswordChanged: vi.fn()
}));
vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn(() => ({
    code: 'UNKNOWN_ERROR',
    message: 'Erreur',
    source: 'client'
  }))
}));

const mockUpdate = vi.mocked(updateUserPassword);
const mockSetProfile = vi.mocked(setProfilePasswordChanged);

describe('ChangePasswordScreen', () => {
  it('enables submit only when rules pass and passwords match', async () => {
    const user = userEvent.setup();
    mockUpdate.mockResolvedValue(undefined);
    mockSetProfile.mockResolvedValue(undefined);

    render(
      <ChangePasswordScreen
        userEmail="test@example.com"
        onComplete={() => {}}
        onSignOut={() => {}}
      />
    );

    const submit = screen.getByRole('button', { name: /mettre a jour le mot de passe/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/nouveau mot de passe/i), 'Abc1234!');
    await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'Abc1234!');
    expect(submit).toBeEnabled();
  });
});
