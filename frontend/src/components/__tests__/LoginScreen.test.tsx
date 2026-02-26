import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LoginScreen from '@/components/LoginScreen';
import { signInWithPassword } from '@/services/auth/signInWithPassword';

vi.mock('@/services/auth/signInWithPassword', () => ({
  signInWithPassword: vi.fn()
}));
vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn(() => ({
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Identifiants invalides.',
    source: 'auth'
  }))
}));

const mockSignIn = vi.mocked(signInWithPassword);

describe('LoginScreen', () => {
  it('disables submit until fields are filled', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    const button = screen.getByRole('button', { name: /se connecter/i });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret');
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('shows error on failed sign in', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValue(new Error('invalid'));
    render(<LoginScreen />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/mot de passe/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows form validation error when email is invalid', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.type(screen.getByLabelText(/email/i), 'email-invalide');
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByText(/adresse email invalide/i)).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
