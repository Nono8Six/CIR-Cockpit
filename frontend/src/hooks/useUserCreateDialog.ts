import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { UserRole } from '@/types';
import { CreateAdminUserPayload } from '@/services/admin/adminUsersCreate';
import { handleUiError } from '@/services/errors/handleUiError';
import { userCreateFormSchema, type UserCreateFormValues } from '../../../shared/schemas/user.schema';

type UseUserCreateDialogParams = {
  open: boolean;
  onCreate: (payload: CreateAdminUserPayload) => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_VALUES: UserCreateFormValues = {
  email: '',
  first_name: '',
  last_name: '',
  role: 'tcs',
  password: '',
  agency_ids: []
};

export const useUserCreateDialog = ({ open, onCreate, onOpenChange }: UseUserCreateDialogParams) => {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange'
  });

  const { control, reset, setValue } = form;
  const email = useWatch({ control, name: 'email' }) ?? '';
  const firstName = useWatch({ control, name: 'first_name' }) ?? '';
  const lastName = useWatch({ control, name: 'last_name' }) ?? '';
  const role = (useWatch({ control, name: 'role' }) ?? 'tcs') as UserRole;
  const password = useWatch({ control, name: 'password' }) ?? '';
  const agencyIds = useWatch({ control, name: 'agency_ids' }) ?? [];

  useEffect(() => {
    if (!open) return;
    setError(null);
    reset(DEFAULT_VALUES);
  }, [open, reset]);

  const canSubmit = form.formState.isValid;

  const handleAgencyIdsChange = useCallback((nextAgencyIds: string[]) => {
    setValue('agency_ids', Array.from(new Set(nextAgencyIds)), {
      shouldDirty: true,
      shouldValidate: true
    });
  }, [setValue]);

  const setEmail = useCallback((value: string) => {
    setValue('email', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);
  const setFirstName = useCallback((value: string) => {
    setValue('first_name', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);
  const setLastName = useCallback((value: string) => {
    setValue('last_name', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);
  const setRole = useCallback((value: UserRole) => {
    setValue('role', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);
  const setPassword = useCallback((value: string) => {
    setValue('password', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null);
    setIsSubmitting(true);

    try {
      await onCreate({
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        role: values.role,
        agency_ids: values.agency_ids,
        password: values.password ? values.password.trim() : undefined
      });
      reset(DEFAULT_VALUES);
      onOpenChange(false);
    } catch (submissionError) {
      const appError = handleUiError(submissionError, "Impossible de creer l'utilisateur.", {
        source: 'useUserCreateDialog'
      });
      setError(appError.message);
    } finally {
      setIsSubmitting(false);
    }
  });

  const fieldError = form.formState.errors;
  const firstFieldError = fieldError.email?.message
    ?? fieldError.first_name?.message
    ?? fieldError.last_name?.message
    ?? fieldError.role?.message
    ?? fieldError.agency_ids?.message
    ?? fieldError.password?.message
    ?? null;

  return {
    form,
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
    handleSubmit,
    fieldError: firstFieldError
  };
};
