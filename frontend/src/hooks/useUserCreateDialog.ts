import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { UserRole } from '@/types';
import { CreateAdminUserPayload } from '@/services/admin/adminUsersCreate';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        password: password.trim() || undefined
      });
      setEmail('');
      setFirstName('');
      setLastName('');
      setPassword('');
      setRole('tcs');
      setAgencyIds([]);
      onOpenChange(false);
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
