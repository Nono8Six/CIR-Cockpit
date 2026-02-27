import { useChangePasswordState } from '@/hooks/useChangePasswordState';
import ChangePasswordHeader from './change-password/ChangePasswordHeader';
import ChangePasswordRules from './change-password/ChangePasswordRules';
import ChangePasswordFields from './change-password/ChangePasswordFields';
import ChangePasswordError from './change-password/ChangePasswordError';
import ChangePasswordActions from './change-password/ChangePasswordActions';

type ChangePasswordScreenProps = {
  userEmail: string;
  onComplete: () => void;
  onSignOut: () => void;
};

const ChangePasswordScreen = ({
  userEmail,
  onComplete,
  onSignOut,
}: ChangePasswordScreenProps) => {
  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    isSubmitting,
    fieldError,
    error,
    profileError,
    ruleResults,
    passwordsMatch,
    canSubmit,
    passwordInputRef,
    handleSubmit,
    handleRetryProfile
  } = useChangePasswordState({ onComplete });

  return (
    <div className="min-h-[100dvh] bg-surface-1/80 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-card shadow-xl border border-border rounded-2xl p-8">
        <ChangePasswordHeader userEmail={userEmail} />

        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Pour des raisons de securite, vous devez definir un nouveau mot de passe
          avant d&apos;acceder a l&apos;application.
        </p>

        <form onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }} className="space-y-4">
          <ChangePasswordFields
            password={password}
            confirmPassword={confirmPassword}
            showPassword={showPassword}
            showConfirm={showConfirm}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirmPassword}
            onTogglePassword={() => setShowPassword((prev) => !prev)}
            onToggleConfirm={() => setShowConfirm((prev) => !prev)}
            passwordsMatch={passwordsMatch}
            isSubmitting={isSubmitting}
            passwordInputRef={passwordInputRef}
          />
          <ChangePasswordRules rules={ruleResults} />
          <ChangePasswordError message={fieldError} />
          <ChangePasswordError message={error} />
          <ChangePasswordActions
            profileError={profileError}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onRetryProfile={handleRetryProfile}
            onSignOut={onSignOut}
          />
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordScreen;
