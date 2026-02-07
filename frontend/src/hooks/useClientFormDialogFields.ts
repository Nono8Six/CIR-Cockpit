import type { UseFormReturn } from 'react-hook-form';

import type { ClientFormValues } from '../../../shared/schemas/client.schema';

type UseClientFormDialogFieldsResult = {
  clientNumberField: ReturnType<UseFormReturn<ClientFormValues>['register']>;
  accountTypeField: ReturnType<UseFormReturn<ClientFormValues>['register']>;
  nameField: ReturnType<UseFormReturn<ClientFormValues>['register']>;
  addressField: ReturnType<UseFormReturn<ClientFormValues>['register']>;
  cityField: ReturnType<UseFormReturn<ClientFormValues>['register']>;
  postalCodeField: ReturnType<UseFormReturn<ClientFormValues>['register']>;
  siretField: ReturnType<UseFormReturn<ClientFormValues>['register']>;
  agencyField: ReturnType<UseFormReturn<ClientFormValues>['register']>;
  notesField: ReturnType<UseFormReturn<ClientFormValues>['register']>;
  errors: UseFormReturn<ClientFormValues>['formState']['errors'];
  isSubmitting: UseFormReturn<ClientFormValues>['formState']['isSubmitting'];
  handleSubmit: UseFormReturn<ClientFormValues>['handleSubmit'];
};

export const useClientFormDialogFields = (
  form: UseFormReturn<ClientFormValues>
): UseClientFormDialogFieldsResult => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = form;

  return {
    clientNumberField: register('client_number'),
    accountTypeField: register('account_type'),
    nameField: register('name'),
    addressField: register('address'),
    cityField: register('city'),
    postalCodeField: register('postal_code'),
    siretField: register('siret'),
    agencyField: register('agency_id'),
    notesField: register('notes'),
    errors,
    isSubmitting,
    handleSubmit
  };
};
