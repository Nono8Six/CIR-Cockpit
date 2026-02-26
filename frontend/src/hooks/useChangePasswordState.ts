import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import { updateUserPassword } from '@/services/auth/updateUserPassword';
import { setProfilePasswordChanged } from '@/services/auth/setProfilePasswordChanged';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { passwordSchema } from '../../../shared/schemas/auth.schema';

type PasswordRule = {
  id: string;
  label: string;
  test: (pw: string) => boolean;
};

const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'Au moins 8 caracteres', test: (pw) => pw.length >= 8 },
  { id: 'digit', label: 'Au moins 1 chiffre', test: (pw) => /\d/.test(pw) },
  { id: 'symbol', label: 'Au moins 1 symbole (!@#$…)', test: (pw) => /[^a-zA-Z0-9]/.test(pw) }
];

const changePasswordFormSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirmation requise')
}).superRefine((values, ctx) => {
  if (values.password !== values.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les mots de passe ne correspondent pas.',
      path: ['confirmPassword']
    });
  }
});

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

type UseChangePasswordStateInput = {
  onComplete: () => void;
};

export const useChangePasswordState = ({ onComplete }: UseChangePasswordStateInput) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState(false);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    },
    mode: 'onChange'
  });
  const { control, setValue, handleSubmit: handleFormSubmit } = form;
  const password = useWatch({ control, name: 'password' }) ?? '';
  const confirmPassword = useWatch({ control, name: 'confirmPassword' }) ?? '';

  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  const ruleResults = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        passed: rule.test(password)
      })),
    [password]
  );
  const passwordsMatch = useMemo(
    () => password === confirmPassword && confirmPassword.length > 0,
    [confirmPassword, password]
  );
  const canSubmit = form.formState.isValid && passwordsMatch && !isSubmitting;

  const setPassword = useCallback((value: string) => {
    setValue('password', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);
  const setConfirmPassword = useCallback((value: string) => {
    setValue('confirmPassword', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  const submitChangePassword = handleFormSubmit(async (values) => {
    setError(null);
    setProfileError(false);
    setIsSubmitting(true);

    try {
      try {
        await updateUserPassword(values.password);
      } catch (err) {
        const appError = handleUiError(err, 'Impossible de changer le mot de passe.', {
          source: 'ChangePasswordScreen.updateUserPassword'
        });
        if (
          appError.code === 'AUTH_SESSION_EXPIRED'
          || appError.code === 'AUTH_REQUIRED'
          || appError.code === 'AUTH_FORBIDDEN'
        ) {
          setError('Votre session a expir\u00e9. Veuillez vous reconnecter.');
          return;
        }
        setError(appError.message);
        return;
      }

      try {
        await setProfilePasswordChanged();
      } catch (err) {
        const appError = handleUiError(
          err,
          "Mot de passe changé, mais le profil n'a pas pu être validé.",
          { source: 'ChangePasswordScreen.setProfilePasswordChanged' }
        );
        setProfileError(true);
        setError(appError.message);
        return;
      }

      onComplete();
    } catch (err) {
      const appError = createAppError({
        code: 'UNKNOWN_ERROR',
        message: 'Une erreur inattendue est survenue.',
        source: 'client'
      });
      const handled = handleUiError(err ?? appError, appError.message, { source: 'ChangePasswordScreen' });
      setError(handled.message);
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = useCallback(() => {
    if (isSubmitting) return;
    void submitChangePassword();
  }, [isSubmitting, submitChangePassword]);

  const handleRetryProfile = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await setProfilePasswordChanged();
      onComplete();
    } catch (err) {
      const appError = handleUiError(
        err,
        "Impossible de valider le profil. Contactez l'administrateur.",
        { source: 'ChangePasswordScreen.retryProfile' }
      );
      setError(appError.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [onComplete]);

  const fieldError = form.formState.errors.password?.message
    ?? form.formState.errors.confirmPassword?.message
    ?? null;

  return {
    form,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    isSubmitting,
    error,
    fieldError,
    profileError,
    ruleResults,
    passwordsMatch,
    canSubmit,
    passwordInputRef,
    handleSubmit,
    handleRetryProfile
  };
};
