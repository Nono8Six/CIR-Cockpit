import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { UserRole } from '@/types';
import { CreateAdminUserPayload } from '@/services/admin/adminUsersCreate';
import { normalizeError } from '@/services/errors/normalizeError';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HAS_DIGIT_REGEX = /\d/;
const HAS_SYMBOL_REGEX = /[^a-zA-Z0-9]/;

type UseUserCreateDialogParams = {
  onCreate: (payload: CreateAdminUserPayload) => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export const useUserCreateDialog = ({ onCreate, onOpenChange }: UseUserCreateDialogParams) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('tcs');
  const [password, setPassword] = useState('');
  const [agencyIds, setAgencyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(email.trim() && firstName.trim() && lastName.trim()),
    [email, firstName, lastName]
  );

  const handleAgencyIdsChange = useCallback((nextAgencyIds: string[]) => {
    setAgencyIds(Array.from(new Set(nextAgencyIds)));
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Email invalide.');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('Nom et prenom requis.');
      return;
    }
    if (role === 'tcs' && agencyIds.length === 0) {
      setError('Un utilisateur TCS doit etre assigne a au moins une agence.');
      return;
    }
    if (normalizedPassword.length > 0 && normalizedPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    if (normalizedPassword.length > 0 && !HAS_DIGIT_REGEX.test(normalizedPassword)) {
      setError('Le mot de passe doit contenir au moins un chiffre.');
      return;
    }
    if (normalizedPassword.length > 0 && !HAS_SYMBOL_REGEX.test(normalizedPassword)) {
      setError('Le mot de passe doit contenir au moins un symbole.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    try {
      await onCreate({
        email: normalizedEmail,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        role,
        agency_ids: agencyIds,
        password: normalizedPassword || undefined
      });
      setEmail('');
      setFirstName('');
      setLastName('');
      setPassword('');
      setRole('tcs');
      setAgencyIds([]);
      onOpenChange(false);
    } catch (error) {
      const appError = normalizeError(error, "Impossible de creer l'utilisateur.");
      setError(appError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    firstName,
    lastName,
    role,
    password,
    agencyIds,
    error,
    isSubmitting,
    canSubmit,
    setEmail,
    setFirstName,
    setLastName,
    setRole,
    setPassword,
    handleAgencyIdsChange,
    handleSubmit
  };
};
