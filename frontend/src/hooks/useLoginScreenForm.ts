import { useCallback, useState } from 'react';
import type { FormEventHandler } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import type { Session } from '@supabase/supabase-js';

import { createAppError } from '@/services/errors/AppError';
import { signInWithPassword } from '@/services/auth/signInWithPassword';
import { handleUiError } from '@/services/errors/handleUiError';
import { normalizeError } from '@/services/errors/normalizeError';
import { emailSchema } from '../../../shared/schemas/auth.schema';

type UseLoginScreenFormArgs = {
  onSignIn?: (session: Session) => void;
};

export type LoginSubmitState = 'idle' | 'submitting' | 'success' | 'error';

const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis')
}).strict();

type LoginFormValues = z.infer<typeof loginFormSchema>;

export const useLoginScreenForm = ({ onSignIn }: UseLoginScreenFormArgs) => {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: ''
    },
    mode: 'onChange'
  });

  const { control, setValue, handleSubmit: handleFormSubmit } = form;
  const email = useWatch({ control, name: 'email' }) ?? '';
  const password = useWatch({ control, name: 'password' }) ?? '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<LoginSubmitState>('idle');
  const [error, setError] = useState<string | null>(null);

  const setEmail = useCallback((value: string) => {
    setValue('email', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  const setPassword = useCallback((value: string) => {
    setValue('password', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  const handleSubmit = handleFormSubmit(async (values) => {
    if (isSubmitting) return;

    setError(null);
    setSubmitState('submitting');
    setIsSubmitting(true);

    try {
      const session = await signInWithPassword({
        email: values.email,
        password: values.password
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
  });

  const onSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    void handleSubmit(event);
  };

  const fieldError = form.formState.errors.email?.message ?? form.formState.errors.password?.message ?? null;

  return {
    email,
    setEmail,
    password,
    setPassword,
    isSubmitting,
    submitState,
    error,
    fieldError,
    handleSubmit: onSubmit
  };
};
