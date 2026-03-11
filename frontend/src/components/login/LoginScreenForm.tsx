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
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <label
          className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"
          htmlFor="email"
        >
          Email
        </label>
        <div className="relative">
          <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="email"
            type="email"
            autoComplete="username"
            name="email"
            className="h-12 rounded-lg border-slate-300 bg-slate-50 pl-10 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] placeholder:text-slate-400 sm:text-sm"
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
        <label
          className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"
          htmlFor="password"
        >
          Mot de passe
        </label>
        <div className="relative">
          <LockKeyhole aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            name="password"
            className="h-12 rounded-lg border-slate-300 bg-slate-50 pl-10 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] placeholder:text-slate-400 sm:text-sm"
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
        <div
          id={statusId}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
          role="status"
          aria-live="polite"
        >
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
        className="h-12 w-full rounded-lg text-sm font-semibold shadow-[0_15px_35px_-22px_rgba(200,30,30,0.95)] transition-transform active:translate-y-px disabled:opacity-100 disabled:bg-primary/65 disabled:text-primary-foreground/95"
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
