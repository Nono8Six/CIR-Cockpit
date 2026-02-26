import { useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { convertClientSchema, type ConvertClientValues } from '../../../shared/schemas/convert-client.schema';
import { ConvertClientPayload } from '@/services/entities/convertEntityToClient';
import { formatClientNumber, stripClientNumber } from '@/utils/clients/formatClientNumber';

type ConvertClientEntity = {
  id: string;
  name: string;
  client_number?: string | null;
  account_type?: 'term' | 'cash' | null;
};

type UseConvertClientDialogParams = {
  open: boolean;
  entity: ConvertClientEntity | null;
  onConvert: (payload: ConvertClientPayload) => Promise<void>;
};

export const useConvertClientDialog = ({ open, entity, onConvert }: UseConvertClientDialogParams) => {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ConvertClientValues>({
    resolver: zodResolver(convertClientSchema),
    defaultValues: {
      client_number: '',
      account_type: 'term'
    }
  });

  useEffect(() => {
    if (!open) return;
    reset({
      client_number: entity?.client_number ?? '',
      account_type: entity?.account_type ?? 'term'
    });
  }, [entity, open, reset]);

  const clientNumber = useWatch({ control, name: 'client_number' }) ?? '';
  const accountType = useWatch({ control, name: 'account_type' }) ?? 'term';

  const clientNumberField = register('client_number');
  const accountTypeField = register('account_type');

  const handleClientNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = stripClientNumber(event.target.value);
    setValue('client_number', digits, { shouldDirty: true, shouldValidate: true });
  };

  const handleConvert = handleSubmit(async (values) => {
    if (!entity?.id) return;
    try {
      await onConvert({
        id: entity.id,
        client_number: values.client_number,
        account_type: values.account_type
      });
    } catch {
      setError('root', { type: 'server', message: 'Impossible de convertir en client.' });
    }
  });

  const formattedClientNumber = formatClientNumber(clientNumber);

  return {
    errors,
    isSubmitting,
    clientNumber: formattedClientNumber,
    accountType,
    clientNumberField,
    accountTypeField,
    handleClientNumberChange,
    handleConvert
  };
};
