import { useEffect, type ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { Agency, UserRole } from '@/types';
import type { DirectoryCommercialOption } from 'shared/schemas/directory.schema';
import {
  clientCompanyFormSchema,
  type ClientCompanyFormValues
} from 'shared/schemas/client.schema';
import type { ClientPayload } from '@/services/clients/saveClient';
import { stripClientNumber } from '@/utils/clients/formatClientNumber';

type UseClientFormDialogInput = {
  open: boolean;
  client: {
    id: string;
    client_kind?: string | null;
    client_number: string | null;
    account_type: ClientPayload['account_type'] | null;
    name: string;
    address: string | null;
    postal_code: string | null;
    department: string | null;
    city: string | null;
    siret?: string | null;
    siren?: string | null;
    naf_code?: string | null;
    official_name?: string | null;
    official_data_source?: string | null;
    official_data_synced_at?: string | null;
    notes: string | null;
    agency_id: string | null;
    cir_commercial_id?: string | null;
  } | null;
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  commercials?: DirectoryCommercialOption[];
  onSave: (payload: ClientPayload) => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export const useClientFormDialog = ({
  open,
  client,
  agencies,
  userRole,
  activeAgencyId,
  commercials,
  onSave,
  onOpenChange
}: UseClientFormDialogInput) => {
  const form = useForm<ClientCompanyFormValues>({
    resolver: zodResolver(clientCompanyFormSchema),
    defaultValues: {
      client_number: '',
      client_kind: 'company',
      account_type: 'term',
      name: '',
      address: '',
      postal_code: '',
      department: '',
      city: '',
      siret: '',
      siren: '',
      naf_code: '',
      official_name: '',
      official_data_source: null,
      official_data_synced_at: null,
      notes: '',
      cir_commercial_id: null,
      agency_id: activeAgencyId ?? ''
    }
  });

  const { control, reset, setValue, setError } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      client_number: client?.client_number ?? '',
      client_kind: 'company',
      account_type: client?.account_type ?? 'term',
      name: client?.name ?? '',
      address: client?.address ?? '',
      postal_code: client?.postal_code ?? '',
      department: client?.department ?? '',
      city: client?.city ?? '',
      siret: client?.siret ?? '',
      siren: client?.siren ?? '',
      naf_code: client?.naf_code ?? '',
      official_name: client?.official_name ?? '',
      official_data_source: client?.official_data_source === 'api-recherche-entreprises'
        ? 'api-recherche-entreprises'
        : null,
      official_data_synced_at: client?.official_data_synced_at ?? null,
      notes: client?.notes ?? '',
      cir_commercial_id: client?.cir_commercial_id ?? null,
      agency_id: client?.agency_id ?? activeAgencyId ?? ''
    });
  }, [activeAgencyId, client, open, reset]);

  const clientNumber = useWatch({ control, name: 'client_number' }) ?? '';
  const postalCode = useWatch({ control, name: 'postal_code' }) ?? '';
  const accountType = useWatch({ control, name: 'account_type' }) ?? 'term';
  const agencyValue = useWatch({ control, name: 'agency_id' }) ?? '';

  const handleClientNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = stripClientNumber(event.target.value);
    setValue('client_number', digits, { shouldDirty: true, shouldValidate: true });
  };

  const handlePostalCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 5);
    setValue('postal_code', digits, { shouldDirty: true, shouldValidate: true });
    setValue('department', digits.slice(0, 2), { shouldDirty: true });
  };

  const onSubmit = async (values: ClientCompanyFormValues) => {
    const resolvedAgencyId = userRole === 'tcs'
      ? (activeAgencyId ?? values.agency_id)
      : values.agency_id;

    const payload: ClientPayload = {
      id: client?.id,
      client_number: values.client_number,
      client_kind: 'company',
      account_type: values.account_type,
      name: values.name,
      address: values.address,
      postal_code: values.postal_code,
      department: values.department,
      city: values.city,
      siret: values.siret?.trim() || null,
      siren: values.siren?.trim() || null,
      naf_code: values.naf_code?.trim() || null,
      official_name: values.official_name?.trim() || null,
      official_data_source: values.official_data_source === 'api-recherche-entreprises'
        ? 'api-recherche-entreprises'
        : null,
      official_data_synced_at: values.official_data_synced_at?.trim() || null,
      notes: values.notes?.trim() || null,
      cir_commercial_id: values.cir_commercial_id ?? null,
      agency_id: resolvedAgencyId
    };

    try {
      await onSave(payload);
      onOpenChange(false);
    } catch {
      setError('root', { type: 'server', message: "Impossible d'enregistrer le client." });
    }
  };

  const agencyLabel = agencies.find((agency) => agency.id === activeAgencyId)?.name ?? 'Aucune agence';
  const hasSelectedCommercial = commercials?.some((commercial) => commercial.id === form.getValues('cir_commercial_id')) ?? false;

  useEffect(() => {
    if (hasSelectedCommercial) {
      return;
    }

    setValue('cir_commercial_id', null, { shouldDirty: false, shouldValidate: true });
  }, [commercials, hasSelectedCommercial, setValue]);

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
