import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';

import { createAppError } from '@/services/errors/AppError';
import { signInWithPassword } from '@/services/auth/signInWithPassword';
import { handleUiError } from '@/services/errors/handleUiError';
import { normalizeError } from '@/services/errors/normalizeError';

type UseLoginScreenFormArgs = {
  onSignIn?: (session: Session) => void;
};

export type LoginSubmitState = 'idle' | 'submitting' | 'success' | 'error';

export const useLoginScreenForm = ({ onSignIn }: UseLoginScreenFormArgs) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<LoginSubmitState>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSubmitState('submitting');
    setIsSubmitting(true);

    try {
      const session = await signInWithPassword({
        email: email.trim(),
        password
      });
      setSubmitState('success');
      onSignIn?.(session);
    } catch (err) {
      const normalizedError = normalizeError(err, 'Identifiants invalides ou compte inactif.');
      const appError = normalizedError.domain === 'auth'
        ? normalizedError
        : createAppError({
            code: 'AUTH_ERROR',
            message: 'Identifiants invalides ou compte inactif.',
            source: 'auth',
            status: normalizedError.status,
            details: normalizedError.details,
            cause: normalizedError
          });
      const handledError = handleUiError(appError, appError.message, {
        source: 'LoginScreen.signIn'
      });
      setError(handledError.message);
      setSubmitState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    isSubmitting,
    submitState,
    error,
    handleSubmit
  };
};
