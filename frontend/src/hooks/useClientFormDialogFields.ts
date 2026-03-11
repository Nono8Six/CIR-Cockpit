import { useWatch, type UseFormReturn } from 'react-hook-form';

import type { ClientCompanyFormValues } from 'shared/schemas/client.schema';

type UseClientFormDialogFieldsResult = {
  clientNumberField: ReturnType<UseFormReturn<ClientCompanyFormValues>['register']>;
  accountTypeField: ReturnType<UseFormReturn<ClientCompanyFormValues>['register']>;
  nameField: ReturnType<UseFormReturn<ClientCompanyFormValues>['register']>;
  cirCommercialField: ReturnType<UseFormReturn<ClientCompanyFormValues>['register']>;
  cirCommercialValue: ClientCompanyFormValues['cir_commercial_id'];
  addressField: ReturnType<UseFormReturn<ClientCompanyFormValues>['register']>;
  cityField: ReturnType<UseFormReturn<ClientCompanyFormValues>['register']>;
  postalCodeField: ReturnType<UseFormReturn<ClientCompanyFormValues>['register']>;
  siretField: ReturnType<UseFormReturn<ClientCompanyFormValues>['register']>;
  agencyField: ReturnType<UseFormReturn<ClientCompanyFormValues>['register']>;
  notesField: ReturnType<UseFormReturn<ClientCompanyFormValues>['register']>;
  errors: UseFormReturn<ClientCompanyFormValues>['formState']['errors'];
  isSubmitting: UseFormReturn<ClientCompanyFormValues>['formState']['isSubmitting'];
  handleSubmit: UseFormReturn<ClientCompanyFormValues>['handleSubmit'];
};

export const useClientFormDialogFields = (
  form: UseFormReturn<ClientCompanyFormValues>
): UseClientFormDialogFieldsResult => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = form;
  const cirCommercialValue = useWatch({ control: form.control, name: 'cir_commercial_id' }) ?? null;

  return {
    clientNumberField: register('client_number'),
    accountTypeField: register('account_type'),
    nameField: register('name'),
    cirCommercialField: register('cir_commercial_id'),
    cirCommercialValue,
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
