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
      <label htmlFor="new-password" className="text-xs font-semibold text-slate-600">
        Nouveau mot de passe
      </label>
      <div className="relative">
        <input
          ref={passwordInputRef}
          id="new-password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          name="new-password"
          className="w-full rounded-md border border-slate-200 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-cir-red/40"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          disabled={isSubmitting}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          onClick={onTogglePassword}
          aria-label={showPassword ? 'Masquer' : 'Afficher'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>

    <div className="space-y-1">
      <label htmlFor="confirm-password" className="text-xs font-semibold text-slate-600">
        Confirmer le mot de passe
      </label>
      <div className="relative">
        <input
          id="confirm-password"
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          name="confirm-password"
          className={`w-full rounded-md border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 ${
            confirmPassword && !passwordsMatch
              ? 'border-red-300 focus:ring-red-500/40'
              : 'border-slate-200 focus:ring-cir-red/40'
          }`}
          value={confirmPassword}
          onChange={(e) => onConfirmChange(e.target.value)}
          disabled={isSubmitting}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          onClick={onToggleConfirm}
          aria-label={showConfirm ? 'Masquer' : 'Afficher'}
        >
          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {confirmPassword && !passwordsMatch && (
        <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
      )}
    </div>
  </>
);

export default ChangePasswordFields;
