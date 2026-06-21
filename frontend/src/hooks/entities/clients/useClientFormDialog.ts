import { useEffect, type ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';

import type { Agency, UserRole } from '@/types';
import type { DirectoryCommercialOption } from '../../../../../shared/schemas/system/directory.schema';
import {
  clientNumberSchema,
  accountTypeSchema,
} from '../../../../../shared/schemas/entity/client.schema';
import { entityDepartmentCodeSchema } from '../../../../../shared/schemas/admin/department.schema';
import { uuidSchema } from '../../../../../shared/schemas/admin/auth.schema';
import type { ClientPayload } from '@/services/clients/saveClient';
import { saveEntityContact } from '@/services/entities/saveEntityContact';
import { invalidateEntityContactMutationQueries } from '@/services/query/queryInvalidation';
import { stripClientNumber } from '@/utils/clients/formatClientNumber';

const optionalCommercialIdSchema = z
  .union([uuidSchema, z.literal(''), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const optionalEmail = z
  .string()
  .trim()
  .email('Email invalide')
  .optional()
  .or(z.literal(''));

export const clientCompanyFormUiSchema = z.strictObject({
  client_number: clientNumberSchema,
  client_kind: z.literal('company'),
  account_type: accountTypeSchema,
  name: z.string().trim().min(1, 'Nom requis'),
  postal_code: z.string().regex(/^\d{5}$/, 'Code postal invalide'),
  department: entityDepartmentCodeSchema,
  city: z.string().trim().min(1, 'Ville requise'),
  notes: z.string().trim().optional().nullable(),
  agency_id: uuidSchema,
  address: z.string().trim().min(1, 'Adresse requise'),
  cir_commercial_id: optionalCommercialIdSchema.optional(),

  // Official fields
  siret: z.string().trim().optional().nullable(),
  siren: z.string().trim().optional().nullable(),
  naf_code: z.string().trim().optional().nullable(),
  official_name: z.string().trim().optional().nullable(),
  official_data_source: z
    .union([z.literal('api-recherche-entreprises'), z.null(), z.undefined()])
    .transform((value) => value ?? null)
    .optional(),
  official_data_synced_at: z.string().trim().optional().nullable(),

  // Primary contact fields
  first_name: z.string().trim().min(1, 'Prénom requis'),
  last_name: z.string().trim().min(1, 'Nom requis'),
  email: optionalEmail,
  phone: z.string().trim().optional().or(z.literal(''))
}).superRefine((values, ctx) => {
  const hasPhone = Boolean(values.phone?.trim());
  const hasEmail = Boolean(values.email?.trim());
  if (!hasPhone && !hasEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Téléphone ou email requis',
      path: ['phone']
    });
  }
});

export type ClientCompanyFormUiValues = z.input<typeof clientCompanyFormUiSchema>;

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
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    email?: string | null;
    primary_contact_id?: string | null;
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
  const queryClient = useQueryClient();

  const form = useForm<ClientCompanyFormUiValues>({
    resolver: zodResolver(clientCompanyFormUiSchema),
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
      agency_id: activeAgencyId ?? '',
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
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
      agency_id: client?.agency_id ?? activeAgencyId ?? '',
      first_name: client?.first_name ?? '',
      last_name: client?.last_name ?? '',
      email: client?.email ?? '',
      phone: client?.phone ?? ''
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

  const onSubmit = async (values: ClientCompanyFormUiValues) => {
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
      // 1. Enregistrer le client
      await onSave(payload);

      // 2. Enregistrer le contact principal (si le client existe)
      if (client?.id) {
        await saveEntityContact({
          id: client.primary_contact_id ?? undefined,
          entity_id: client.id,
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          email: values.email?.trim() || null,
          phone: values.phone?.trim() || null,
          position: 'Contact Principal'
        }).match(
          () => {},
          (err) => {
            throw err;
          }
        );

        // Invalider les requêtes de contact pour mettre à jour la fiche
        await invalidateEntityContactMutationQueries(queryClient, {
          agencyId: resolvedAgencyId,
          entityId: client.id
        });
      }

      onOpenChange(false);
    } catch {
      setError('root', { type: 'server', message: "Impossible d'enregistrer le client ou son contact principal." });
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
