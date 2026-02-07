import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { updateUserPassword } from '@/services/auth/updateUserPassword';
import { setProfilePasswordChanged } from '@/services/auth/setProfilePasswordChanged';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';

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

type UseChangePasswordStateInput = {
  onComplete: () => void;
};

export const useChangePasswordState = ({ onComplete }: UseChangePasswordStateInput) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState(false);

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
  const allRulesPassed = useMemo(() => ruleResults.every((rule) => rule.passed), [ruleResults]);
  const passwordsMatch = useMemo(
    () => password === confirmPassword && confirmPassword.length > 0,
    [confirmPassword, password]
  );
  const canSubmit = allRulesPassed && passwordsMatch && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setError(null);
    setProfileError(false);
    setIsSubmitting(true);

    try {
      try {
        await updateUserPassword(password);
      } catch (err) {
        const appError = handleUiError(err, 'Impossible de changer le mot de passe.', {
          source: 'ChangePasswordScreen.updateUserPassword'
        });
        if (
          appError.code === 'AUTH_SESSION_EXPIRED'
          || appError.code === 'AUTH_REQUIRED'
          || appError.code === 'AUTH_FORBIDDEN'
        ) {
          setError('Votre session a expiré. Veuillez vous reconnecter.');
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
  }, [canSubmit, onComplete, password]);

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

  return {
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
    profileError,
    ruleResults,
    passwordsMatch,
    canSubmit,
    passwordInputRef,
    handleSubmit,
    handleRetryProfile
  };
};
