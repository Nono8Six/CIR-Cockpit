
import type { Session } from '@supabase/supabase-js';

import { useLoginScreenForm } from '@/hooks/useLoginScreenForm';
import LoginScreenBrand from './login/LoginScreenBrand';
import LoginScreenForm from './login/LoginScreenForm';

type LoginScreenProps = {
  onSignIn?: (session: Session) => void;
};

const LoginScreen = ({ onSignIn }: LoginScreenProps) => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isSubmitting,
    error,
    handleSubmit
  } = useLoginScreenForm({ onSignIn });

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white shadow-xl border border-slate-200 rounded-2xl p-8">
        <LoginScreenBrand />
        <LoginScreenForm
          email={email}
          onEmailChange={setEmail}
          password={password}
          onPasswordChange={setPassword}
          error={error}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />

        <div className="mt-6 text-xs text-slate-500 leading-relaxed">
          Comptes crees par un admin. Pas d&apos;inscription publique. Support interne uniquement.
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
