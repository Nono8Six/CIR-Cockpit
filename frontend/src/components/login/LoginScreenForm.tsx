import type { FormEvent } from 'react';
import { CircleAlert, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LoginSubmitState } from '@/hooks/useLoginScreenForm';

type LoginScreenFormProps = {
  email: string;
  onEmailChange: (value: string) => void;
  onEmailBlur: () => void;
  password: string;
  onPasswordChange: (value: string) => void;
  onPasswordBlur: () => void;
  submitState: LoginSubmitState;
  fieldError: string | null;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const LoginScreenForm = ({
  email,
  onEmailChange,
  onEmailBlur,
  password,
  onPasswordChange,
  onPasswordBlur,
  submitState,
  fieldError,
  error,
  isSubmitting,
  onSubmit
}: LoginScreenFormProps) => {
  const statusId = 'login-form-status';
  const fieldErrorId = 'login-form-field-error';
  const errorId = 'login-form-error';
  const hasError = Boolean(error);
  const hasFieldError = Boolean(fieldError);
  const hasAnyError = hasError || hasFieldError;
  const isSuccess = submitState === 'success';
  const showStatus = isSubmitting || isSuccess;
  const describedBy = hasError
    ? errorId
    : hasFieldError
      ? fieldErrorId
      : showStatus
        ? statusId
        : undefined;

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="email">
          Email
        </label>
        <div className="relative">
          <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
          <Input
            id="email"
            type="email"
            autoComplete="username"
            name="email"
            className="pl-9"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            onBlur={onEmailBlur}
            spellCheck={false}
            required
            tone={hasAnyError ? 'destructive' : 'default'}
            aria-invalid={hasAnyError}
            aria-describedby={describedBy}
            data-testid="login-email-input"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="password">
          Mot de passe
        </label>
        <div className="relative">
          <LockKeyhole aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            name="password"
            className="pl-9"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            onBlur={onPasswordBlur}
            required
            tone={hasAnyError ? 'destructive' : 'default'}
            aria-invalid={hasAnyError}
            aria-describedby={describedBy}
            data-testid="login-password-input"
          />
        </div>
      </div>

      {showStatus ? (
        <div id={statusId} className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle aria-hidden className="h-3.5 w-3.5 animate-spin" />
              Connexion en cours...
            </span>
          ) : null}
          {!isSubmitting && isSuccess ? (
            <span className="inline-flex items-center gap-2 text-success">Connexion réussie. Redirection...</span>
          ) : null}
        </div>
      ) : null}

      {fieldError ? (
        <div
          id={fieldErrorId}
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          <span className="inline-flex items-center gap-2">
            <CircleAlert aria-hidden className="h-3.5 w-3.5 shrink-0" />
            {fieldError}
          </span>
        </div>
      ) : null}

      {hasError && (
        <div
          id={errorId}
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          <span className="inline-flex items-center gap-2">
            <CircleAlert aria-hidden className="h-3.5 w-3.5 shrink-0" />
            {error}
          </span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        size="comfortable"
        disabled={isSubmitting || !email.trim() || !password}
        data-testid="login-submit-button"
      >
        {isSubmitting ? 'Connexion...' : 'Se connecter'}
      </Button>
    </form>
  );
};

export default LoginScreenForm;
