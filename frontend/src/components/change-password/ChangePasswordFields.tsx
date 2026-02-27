import { Eye, EyeOff } from 'lucide-react';
import type { ChangePasswordFieldsProps } from './ChangePasswordFields.types';

const ChangePasswordFields = ({
  password,
  confirmPassword,
  showPassword,
  showConfirm,
  onPasswordChange,
  onConfirmChange,
  onTogglePassword,
  onToggleConfirm,
  passwordsMatch,
  isSubmitting,
  passwordInputRef
}: ChangePasswordFieldsProps) => (
  <>
    <div className="space-y-1">
      <label htmlFor="new-password" className="text-xs font-semibold text-muted-foreground">
        Nouveau mot de passe
      </label>
      <div className="relative">
        <input
          ref={passwordInputRef}
          id="new-password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          name="new-password"
          className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          disabled={isSubmitting}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-muted-foreground"
          onClick={onTogglePassword}
          aria-label={showPassword ? 'Masquer' : 'Afficher'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>

    <div className="space-y-1">
      <label htmlFor="confirm-password" className="text-xs font-semibold text-muted-foreground">
        Confirmer le mot de passe
      </label>
      <div className="relative">
        <input
          id="confirm-password"
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          name="confirm-password"
          className={`w-full rounded-md border px-3 py-2 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 ${
            confirmPassword && !passwordsMatch
              ? 'border-destructive/40 focus-visible:ring-destructive/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
              : 'border-border focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          }`}
          value={confirmPassword}
          onChange={(e) => onConfirmChange(e.target.value)}
          disabled={isSubmitting}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-muted-foreground"
          onClick={onToggleConfirm}
          aria-label={showConfirm ? 'Masquer' : 'Afficher'}
        >
          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {confirmPassword && !passwordsMatch && (
        <p className="text-xs text-destructive mt-1">Les mots de passe ne correspondent pas</p>
      )}
    </div>
  </>
);

export default ChangePasswordFields;
