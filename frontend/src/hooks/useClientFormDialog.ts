import { useEffect, type ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { Agency, Client, UserRole } from '@/types';
import { clientFormSchema, type ClientFormValues } from '../../../shared/schemas/client.schema';
import type { ClientPayload } from '@/services/clients/saveClient';
import { stripClientNumber } from '@/utils/clients/formatClientNumber';

type UseClientFormDialogInput = {
  open: boolean;
  client: Client | null;
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  onSave: (payload: ClientPayload) => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export const useClientFormDialog = ({
  open,
  client,
  agencies,
  userRole,
  activeAgencyId,
  onSave,
  onOpenChange
}: UseClientFormDialogInput) => {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      client_number: '',
      account_type: 'term',
      name: '',
      address: '',
      postal_code: '',
      department: '',
      city: '',
      siret: '',
      notes: '',
      agency_id: activeAgencyId ?? null
    }
  });

  const { control, reset, setValue, setError } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      client_number: client?.client_number ?? '',
      account_type: client?.account_type ?? 'term',
      name: client?.name ?? '',
      address: client?.address ?? '',
      postal_code: client?.postal_code ?? '',
      department: client?.department ?? '',
      city: client?.city ?? '',
      siret: client?.siret ?? '',
      notes: client?.notes ?? '',
      agency_id: client?.agency_id ?? activeAgencyId ?? null
    });
  }, [activeAgencyId, client, open, reset]);

  const clientNumber = useWatch({ control, name: 'client_number' }) ?? '';
  const postalCode = useWatch({ control, name: 'postal_code' }) ?? '';
  const accountType = useWatch({ control, name: 'account_type' }) ?? 'term';
  const agencyValue = useWatch({ control, name: 'agency_id' }) ?? '';

  useEffect(() => {
    const dept = postalCode.slice(0, 2);
    setValue('department', dept, { shouldDirty: true });
  }, [postalCode, setValue]);

  const handleClientNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = stripClientNumber(event.target.value);
    setValue('client_number', digits, { shouldDirty: true, shouldValidate: true });
  };

  const handlePostalCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 5);
    setValue('postal_code', digits, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: ClientFormValues) => {
    const resolvedAgencyId = userRole === 'tcs'
      ? activeAgencyId
      : (values.agency_id ?? activeAgencyId ?? null);

    if (!resolvedAgencyId) {
      setError('agency_id', { type: 'manual', message: 'Agence requise.' });
      return;
    }

    const payload: ClientPayload = {
      id: client?.id,
      client_number: values.client_number,
      account_type: values.account_type,
      name: values.name,
      address: values.address,
      postal_code: values.postal_code,
      department: values.department,
      city: values.city,
      siret: values.siret?.trim() || null,
      notes: values.notes?.trim() || null,
      agency_id: resolvedAgencyId
    };

    await onSave(payload);
    onOpenChange(false);
  };

  const agencyLabel = agencies.find((agency) => agency.id === activeAgencyId)?.name ?? 'Aucune agence';

  return {
    form,
    clientNumber,
    postalCode,
    accountType,
    agencyValue,
    agencyLabel,
    handleClientNumberChange,
    handlePostalCodeChange,
    onSubmit
  };
};
