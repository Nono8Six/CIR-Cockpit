import type { FormEvent } from 'react';

type LoginScreenFormProps = {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const LoginScreenForm = ({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  error,
  isSubmitting,
  onSubmit
}: LoginScreenFormProps) => (
  <form className="space-y-4" onSubmit={onSubmit}>
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        name="email"
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cir-red/40"
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        spellCheck={false}
        required
      />
    </div>
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600" htmlFor="password">
        Mot de passe
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        name="password"
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cir-red/40"
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
        required
      />
    </div>

    {error && (
      <div
        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
        role="status"
        aria-live="polite"
      >
        {error}
      </div>
    )}

    <button
      type="submit"
      className="w-full rounded-md bg-cir-red text-white text-sm font-semibold py-2.5 shadow-sm hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed"
      disabled={isSubmitting || !email.trim() || !password}
    >
      {isSubmitting ? 'Connexion...' : 'Se connecter'}
    </button>
  </form>
);

export default LoginScreenForm;
