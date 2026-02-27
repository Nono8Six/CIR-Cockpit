import { LogOut } from 'lucide-react';

type ChangePasswordActionsProps = {
  profileError: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onRetryProfile: () => void;
  onSignOut: () => void;
};

const ChangePasswordActions = ({
  profileError,
  canSubmit,
  isSubmitting,
  onSubmit,
  onRetryProfile,
  onSignOut
}: ChangePasswordActionsProps) => (
  <div className="space-y-2 pt-2">
    {profileError ? (
      <button
        type="button"
        onClick={onRetryProfile}
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary text-white text-sm font-semibold py-2.5 shadow-sm hover:bg-primary/90 disabled:opacity-60"
      >
        {isSubmitting ? 'Validation…' : 'Reessayer la validation'}
      </button>
    ) : (
      <button
        type="submit"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="w-full rounded-md bg-primary text-white text-sm font-semibold py-2.5 shadow-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Mise a jour…' : 'Mettre a jour le mot de passe'}
      </button>
    )}

    <button
      type="button"
      onClick={onSignOut}
      disabled={isSubmitting}
      className="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-card text-muted-foreground text-sm font-medium py-2 hover:bg-surface-1 disabled:opacity-60"
    >
      <LogOut size={14} />
      Se deconnecter
    </button>
  </div>
);

export default ChangePasswordActions;
