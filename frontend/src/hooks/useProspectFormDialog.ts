import { useEffect, type ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { Agency, Entity, UserRole } from '@/types';
import { prospectFormSchema, type ProspectFormValues } from '../../../shared/schemas/prospect.schema';
import type { EntityPayload } from '@/services/entities/saveEntity';

type UseProspectFormDialogInput = {
  open: boolean;
  prospect: Entity | null;
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  onSave: (payload: EntityPayload) => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export const useProspectFormDialog = ({
  open,
  prospect,
  agencies,
  userRole,
  activeAgencyId,
  onSave,
  onOpenChange
}: UseProspectFormDialogInput) => {
  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectFormSchema),
    defaultValues: {
      name: '',
      address: '',
      postal_code: '',
      department: '',
      city: '',
      siret: '',
      notes: '',
      agency_id: activeAgencyId ?? ''
    }
  });

  const { control, reset, setValue, setError } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      name: prospect?.name ?? '',
      address: prospect?.address ?? '',
      postal_code: prospect?.postal_code ?? '',
      department: prospect?.department ?? '',
      city: prospect?.city ?? '',
      siret: prospect?.siret ?? '',
      notes: prospect?.notes ?? '',
      agency_id: prospect?.agency_id ?? activeAgencyId ?? ''
    });
  }, [activeAgencyId, open, prospect, reset]);

  const postalCode = useWatch({ control, name: 'postal_code' }) ?? '';
  const agencyValue = useWatch({ control, name: 'agency_id' }) ?? '';

  const handlePostalCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 5);
    setValue('postal_code', digits, { shouldDirty: true, shouldValidate: true });
    setValue('department', digits.slice(0, 2), { shouldDirty: true });
  };

  const onSubmit = async (values: ProspectFormValues) => {
    const resolvedAgencyId = userRole === 'tcs'
      ? (activeAgencyId ?? values.agency_id)
      : values.agency_id;

    const payload: EntityPayload = {
      id: prospect?.id,
      entity_type: prospect?.entity_type ?? 'Prospect',
      name: values.name,
      agency_id: resolvedAgencyId,
      city: values.city,
      address: values.address?.trim() || null,
      postal_code: values.postal_code?.trim() || null,
      department: values.department?.trim() || null,
      siret: values.siret?.trim() || null,
      notes: values.notes?.trim() || null
    };

    try {
      await onSave(payload);
      onOpenChange(false);
    } catch {
      setError('root', { type: 'server', message: "Impossible d'enregistrer le prospect." });
    }
  };

  const agencyLabel = agencies.find((agency) => agency.id === activeAgencyId)?.name ?? 'Aucune agence';
  const relationLabel = prospect?.entity_type ?? 'Prospect';

  return {
    form,
    postalCode,
    agencyValue,
    agencyLabel,
    relationLabel,
    handlePostalCodeChange,
    onSubmit
  };
};
