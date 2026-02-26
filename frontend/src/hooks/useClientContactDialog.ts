import { useEffect, type ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { EntityContact } from '@/types';
import { clientContactFormSchema, type ClientContactFormValues } from '../../../shared/schemas/client-contact.schema';
import type { EntityContactPayload } from '@/services/entities/saveEntityContact';
import { formatFrenchPhone } from '@/utils/formatFrenchPhone';

type UseClientContactDialogInput = {
  open: boolean;
  contact: EntityContact | null;
  entityId: string;
  onSave: (payload: EntityContactPayload) => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export const useClientContactDialog = ({
  open,
  contact,
  entityId,
  onSave,
  onOpenChange
}: UseClientContactDialogInput) => {
  const form = useForm<ClientContactFormValues>({
    resolver: zodResolver(clientContactFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      position: '',
      notes: ''
    }
  });

  const { control, reset, setValue, setError } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      first_name: contact?.first_name ?? '',
      last_name: contact?.last_name ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      position: contact?.position ?? '',
      notes: contact?.notes ?? ''
    });
  }, [contact, open, reset]);

  const phoneValue = useWatch({ control, name: 'phone' }) ?? '';

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue('phone', formatFrenchPhone(event.target.value), { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: ClientContactFormValues) => {
    const payload: EntityContactPayload = {
      id: contact?.id,
      entity_id: entityId,
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email?.trim() || null,
      phone: values.phone?.trim() || null,
      position: values.position?.trim() || null,
      notes: values.notes?.trim() || null
    };

    try {
      await onSave(payload);
      onOpenChange(false);
    } catch {
      setError('root', { type: 'server', message: "Impossible d'enregistrer le contact." });
    }
  };

  return {
    form,
    phoneValue,
    handlePhoneChange,
    onSubmit
  };
};
