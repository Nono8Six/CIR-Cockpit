import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

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
  it('disables submit until fields are filled', () => {
    render(<LoginScreen />);
    const button = screen.getByRole('button', { name: /se connecter/i });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret' } });
    expect(button).toBeEnabled();
  });

  it('shows error on failed sign in', async () => {
    mockSignIn.mockRejectedValue(new Error('invalid'));
    render(<LoginScreen />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/mot de passe/i)).toHaveAttribute('aria-invalid', 'true');
  });
});
