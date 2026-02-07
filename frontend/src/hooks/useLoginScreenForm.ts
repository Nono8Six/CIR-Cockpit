import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';

import { signInWithPassword } from '@/services/auth/signInWithPassword';
import { handleUiError } from '@/services/errors/handleUiError';

type UseLoginScreenFormArgs = {
  onSignIn?: (session: Session) => void;
};

export const useLoginScreenForm = ({ onSignIn }: UseLoginScreenFormArgs) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const session = await signInWithPassword({
        email: email.trim(),
        password
      });
      onSignIn?.(session);
    } catch (err) {
      const appError = handleUiError(err, 'Identifiants invalides ou compte inactif.', {
        source: 'LoginScreen.signIn'
      });
      setError(appError.message);
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
    error,
    handleSubmit
  };
};
