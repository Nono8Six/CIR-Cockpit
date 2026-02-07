import type { RefObject } from 'react';

export type ChangePasswordFieldsProps = {
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirm: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  onTogglePassword: () => void;
  onToggleConfirm: () => void;
  passwordsMatch: boolean;
  isSubmitting: boolean;
  passwordInputRef: RefObject<HTMLInputElement | null>;
};
