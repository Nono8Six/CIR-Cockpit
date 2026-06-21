import { useWatch, type UseFormReturn } from 'react-hook-form';

import type { ClientCompanyFormUiValues } from './useClientFormDialog';

type UseClientFormDialogFieldsResult = {
  clientNumberField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  accountTypeField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  nameField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  cirCommercialField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  cirCommercialValue: ClientCompanyFormUiValues['cir_commercial_id'];
  addressField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  cityField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  postalCodeField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  siretField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  sirenField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  nafCodeField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  officialNameField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  agencyField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  notesField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  firstNameField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  lastNameField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  emailField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  phoneField: ReturnType<UseFormReturn<ClientCompanyFormUiValues>['register']>;
  errors: UseFormReturn<ClientCompanyFormUiValues>['formState']['errors'];
  isSubmitting: UseFormReturn<ClientCompanyFormUiValues>['formState']['isSubmitting'];
  handleSubmit: UseFormReturn<ClientCompanyFormUiValues>['handleSubmit'];
};

export const useClientFormDialogFields = (
  form: UseFormReturn<ClientCompanyFormUiValues>
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
    sirenField: register('siren'),
    nafCodeField: register('naf_code'),
    officialNameField: register('official_name'),
    agencyField: register('agency_id'),
    notesField: register('notes'),
    firstNameField: register('first_name'),
    lastNameField: register('last_name'),
    emailField: register('email'),
    phoneField: register('phone'),
    errors,
    isSubmitting,
    handleSubmit
  };
};
