import type { OnboardingValues } from './entityOnboarding.schema';
import type { OnboardingIntent } from './entityOnboarding.types';

export const getMissingChecklist = (
  values: OnboardingValues,
  effectiveIntent: OnboardingIntent,
): string[] => {
  const isIndividualClient =
    effectiveIntent === 'client' && values.client_kind === 'individual';
  const checklist = isIndividualClient
    ? [
        { label: 'Nom', value: values.last_name.trim().length > 0 },
        { label: 'Prenom', value: values.first_name.trim().length > 0 },
        { label: 'Ville', value: values.city.trim().length > 0 },
        { label: 'Code postal', value: values.postal_code.trim().length > 0 },
        {
          label: 'Telephone ou email',
          value:
            values.phone.trim().length > 0 || values.email.trim().length > 0,
        },
        { label: 'Agence', value: values.agency_id.trim().length > 0 },
      ]
    : [
        { label: 'Nom de societe', value: values.name.trim().length > 0 },
        { label: 'Ville', value: values.city.trim().length > 0 },
        { label: 'Agence', value: values.agency_id.trim().length > 0 },
      ];

  if (effectiveIntent === 'client') {
    checklist.push({
      label: 'Numero client',
      value: (values.client_number ?? '').trim().length > 0,
    });
  }

  return checklist.filter((item) => !item.value).map((item) => item.label);
};
