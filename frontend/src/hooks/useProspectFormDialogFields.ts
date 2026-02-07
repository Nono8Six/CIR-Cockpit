import type { UseFormReturn } from 'react-hook-form';

import type { ProspectFormValues } from '../../../shared/schemas/prospect.schema';

type UseProspectFormDialogFieldsResult = {
  nameField: ReturnType<UseFormReturn<ProspectFormValues>['register']>;
  cityField: ReturnType<UseFormReturn<ProspectFormValues>['register']>;
  addressField: ReturnType<UseFormReturn<ProspectFormValues>['register']>;
  postalCodeField: ReturnType<UseFormReturn<ProspectFormValues>['register']>;
  siretField: ReturnType<UseFormReturn<ProspectFormValues>['register']>;
  agencyField: ReturnType<UseFormReturn<ProspectFormValues>['register']>;
  notesField: ReturnType<UseFormReturn<ProspectFormValues>['register']>;
  errors: UseFormReturn<ProspectFormValues>['formState']['errors'];
  isSubmitting: UseFormReturn<ProspectFormValues>['formState']['isSubmitting'];
  handleSubmit: UseFormReturn<ProspectFormValues>['handleSubmit'];
};

export const useProspectFormDialogFields = (
  form: UseFormReturn<ProspectFormValues>
): UseProspectFormDialogFieldsResult => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = form;

  return {
    nameField: register('name'),
    cityField: register('city'),
    addressField: register('address'),
    postalCodeField: register('postal_code'),
    siretField: register('siret'),
    agencyField: register('agency_id'),
    notesField: register('notes'),
    errors,
    isSubmitting,
    handleSubmit
  };
};
