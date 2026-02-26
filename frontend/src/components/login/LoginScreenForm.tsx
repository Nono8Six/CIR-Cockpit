import type { FormEvent } from 'react';
import { CircleAlert, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LoginSubmitState } from '@/hooks/useLoginScreenForm';

type LoginScreenFormProps = {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  submitState: LoginSubmitState;
  fieldError: string | null;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const LoginScreenForm = ({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  submitState,
  fieldError,
  error,
  isSubmitting,
  onSubmit
}: LoginScreenFormProps) => {
  const statusId = 'login-form-status';
  const errorId = 'login-form-error';
  const hasError = Boolean(error);
  const isSuccess = submitState === 'success';

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor="email">
          Email
        </label>
        <div className="relative">
          <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="email"
            type="email"
            autoComplete="username"
            name="email"
            className="pl-9"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            spellCheck={false}
            required
            tone={hasError ? 'destructive' : 'default'}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : statusId}
            data-testid="login-email-input"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor="password">
          Mot de passe
        </label>
        <div className="relative">
          <LockKeyhole aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            name="password"
            className="pl-9"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            required
            tone={hasError ? 'destructive' : 'default'}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : statusId}
            data-testid="login-password-input"
          />
        </div>
      </div>

      <div id={statusId} className="min-h-5 text-xs text-slate-600" role="status" aria-live="polite">
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle aria-hidden className="h-3.5 w-3.5 animate-spin" />
            Connexion en cours...
          </span>
        ) : null}
        {!isSubmitting && isSuccess ? (
          <span className="inline-flex items-center gap-2 text-emerald-700">Connexion réussie. Redirection...</span>
        ) : null}
      </div>

      {fieldError ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
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
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
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
