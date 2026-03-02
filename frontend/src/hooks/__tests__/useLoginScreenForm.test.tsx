import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLoginScreenForm } from '@/hooks/useLoginScreenForm';
import { createAppError } from '@/services/errors/AppError';
import { signInWithPassword } from '@/services/auth/signInWithPassword';
import { normalizeError } from '@/services/errors/normalizeError';
import { handleUiError } from '@/services/errors/handleUiError';

const loginMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  handleUiError: vi.fn((error) => error),
  normalizeError: vi.fn()
}));

vi.mock('@/services/auth/signInWithPassword', () => ({
  signInWithPassword: loginMocks.signInWithPassword
}));

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: loginMocks.handleUiError
}));

vi.mock('@/services/errors/normalizeError', () => ({
  normalizeError: loginMocks.normalizeError
}));

type LoginHarnessProps = {
  onSignIn?: Parameters<typeof useLoginScreenForm>[0]['onSignIn'];
};

const LoginHarness = ({ onSignIn }: LoginHarnessProps) => {
  const state = useLoginScreenForm({
    onSignIn
  });

  return (
    <form data-testid="login-form" onSubmit={state.handleSubmit}>
      <input
        data-testid="email"
        value={state.email}
        onChange={(event) => state.setEmail(event.target.value)}
      />
      <input
        data-testid="password"
        value={state.password}
        onChange={(event) => state.setPassword(event.target.value)}
      />
      <button type="submit">submit</button>
      <output data-testid="submit-state">{state.submitState}</output>
      <output data-testid="error-message">{state.error ?? ''}</output>
    </form>
  );
};

describe('useLoginScreenForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits credentials and exposes success state', async () => {
    const session = { user: { id: 'user-1' } };
    const onSignIn = vi.fn();
    loginMocks.signInWithPassword.mockResolvedValue(session);

    render(<LoginHarness onSignIn={onSignIn} />);
    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'user@example.com' }
    });
    fireEvent.change(screen.getByTestId('password'), {
      target: { value: 'Password123!' }
    });
    fireEvent.submit(screen.getByTestId('login-form'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-state').textContent).toBe('success');
    });
    expect(onSignIn).toHaveBeenCalledWith(session);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password123!'
    });
  });

  it('maps sign-in errors and exposes error state', async () => {
    const appError = createAppError({
      code: 'AUTH_ERROR',
      message: 'Identifiants invalides ou compte inactif.',
      source: 'auth'
    });
    loginMocks.signInWithPassword.mockRejectedValue(new Error('boom'));
    loginMocks.normalizeError.mockReturnValue(appError);
    loginMocks.handleUiError.mockReturnValue(appError);

    render(<LoginHarness />);
    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'user@example.com' }
    });
    fireEvent.change(screen.getByTestId('password'), {
      target: { value: 'WrongPassword' }
    });
    fireEvent.submit(screen.getByTestId('login-form'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-state').textContent).toBe('error');
    });
    expect(screen.getByTestId('error-message').textContent).toBe(appError.message);
    expect(normalizeError).toHaveBeenCalledTimes(1);
    expect(handleUiError).toHaveBeenCalledTimes(1);
  });

  it('clears previous error state before a new submission', async () => {
    const appError = createAppError({
      code: 'AUTH_ERROR',
      message: 'Identifiants invalides ou compte inactif.',
      source: 'auth'
    });
    loginMocks.signInWithPassword
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ user: { id: 'user-1' } });
    loginMocks.normalizeError.mockReturnValue(appError);
    loginMocks.handleUiError.mockReturnValue(appError);

    render(<LoginHarness />);
    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'user@example.com' }
    });
    fireEvent.change(screen.getByTestId('password'), {
      target: { value: 'Password123!' }
    });

    fireEvent.submit(screen.getByTestId('login-form'));
    await waitFor(() => {
      expect(screen.getByTestId('submit-state').textContent).toBe('error');
    });
    expect(screen.getByTestId('error-message').textContent).toBe(appError.message);

    await act(async () => {
      fireEvent.submit(screen.getByTestId('login-form'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('submit-state').textContent).toBe('success');
    });
    expect(screen.getByTestId('error-message').textContent).toBe('');
    expect(signInWithPassword).toHaveBeenCalledTimes(2);
  });
});
