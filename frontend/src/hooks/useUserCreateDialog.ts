import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Agency, UserRole } from '@/types';
import { CreateAdminUserPayload } from '@/services/admin/adminUsersCreate';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UseUserCreateDialogParams = {
  onCreate: (payload: CreateAdminUserPayload) => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export const useUserCreateDialog = ({ onCreate, onOpenChange }: UseUserCreateDialogParams) => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('tcs');
  const [password, setPassword] = useState('');
  const [agencyIds, setAgencyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => Boolean(email.trim()), [email]);

  const handleToggleAgency = (agency: Agency) => {
    setAgencyIds(prev =>
      prev.includes(agency.id)
        ? prev.filter(id => id !== agency.id)
        : [...prev, agency.id]
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Email invalide.');
      return;
    }
    if (role === 'tcs' && agencyIds.length === 0) {
      setError('Un utilisateur TCS doit etre assigne a au moins une agence.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    await onCreate({
      email: normalizedEmail,
      display_name: displayName.trim() || undefined,
      role,
      agency_ids: agencyIds,
      password: password.trim() || undefined
    });
    setIsSubmitting(false);
    setEmail('');
    setDisplayName('');
    setPassword('');
    setRole('tcs');
    setAgencyIds([]);
    onOpenChange(false);
  };

  return {
    email,
    displayName,
    role,
    password,
    agencyIds,
    error,
    isSubmitting,
    canSubmit,
    setEmail,
    setDisplayName,
    setRole,
    setPassword,
    handleToggleAgency,
    handleSubmit
  };
};
