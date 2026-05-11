import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { clientFormSchema } from 'shared/schemas/client.schema';
import { prospectFormSchema } from 'shared/schemas/prospect.schema';

import type { ClientPayload } from '@/services/clients/saveClient';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import type { EntityPayload } from '@/services/entities/saveEntity';
import type { UserRole } from '@/types';

import type { OnboardingValues } from './entityOnboarding.schema';
import type {
  EntityOnboardingSeed,
  OnboardingIntent,
} from './entityOnboarding.types';
import { toNullable } from './entityOnboarding.utils';
import type { EntityOnboardingStepper } from './entityOnboardingSteps';

type SavedEntityResult = {
  id?: string;
  client_number?: string | null;
};

interface UseOnboardingSubmitInput {
  activeAgencyId: string | null;
  effectiveIntent: OnboardingIntent;
  initialEntity: EntityOnboardingSeed | null;
  isIndividualClient: boolean;
  onComplete:
    | ((result: {
        intent: OnboardingIntent;
        client_number?: string | null;
        entity_id?: string | null;
      }) => void)
    | undefined;
  onOpenChange: (open: boolean) => void;
  onSaveClient?: (payload: ClientPayload) => Promise<SavedEntityResult | void>;
  onSaveProspect?: (payload: EntityPayload) => Promise<SavedEntityResult | void>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setStepError: Dispatch<SetStateAction<string | null>>;
  stepper: EntityOnboardingStepper;
  userRole: UserRole;
  values: OnboardingValues;
}

const createMissingSaveCallbackError = (intent: OnboardingIntent) =>
  createAppError({
    code: 'ACTION_REQUIRED',
    message:
      intent === 'client'
        ? "Action d'enregistrement client indisponible."
        : "Action d'enregistrement prospect indisponible.",
    source: 'validation',
    details:
      intent === 'client'
        ? 'onSaveClient est absent du parcours onboarding.'
        : 'onSaveProspect est absent du parcours onboarding.',
  });

const resolveProspectPayloadType = (
  initialEntity: EntityOnboardingSeed | null,
): EntityPayload['entity_type'] =>
  initialEntity?.entity_type === 'Fournisseur' ? 'Fournisseur' : 'Prospect';

export const useOnboardingSubmit = ({
  activeAgencyId,
  effectiveIntent,
  initialEntity,
  isIndividualClient,
  onComplete,
  onOpenChange,
  onSaveClient,
  onSaveProspect,
  setIsSaving,
  setStepError,
  stepper,
  userRole,
  values,
}: UseOnboardingSubmitInput) =>
  useCallback(async () => {
    const agencyId =
      userRole === 'tcs' ? (activeAgencyId ?? values.agency_id) : values.agency_id;

    setIsSaving(true);
    try {
      if (effectiveIntent === 'client') {
        if (!onSaveClient) {
          throw createMissingSaveCallbackError('client');
        }

        const parsed = clientFormSchema.safeParse({
          client_number: values.client_number,
          client_kind: values.client_kind,
          account_type: values.account_type,
          name: isIndividualClient
            ? [values.last_name, values.first_name]
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0)
                .join(' ')
            : values.name,
          address: values.address,
          postal_code: values.postal_code,
          department: values.department,
          city: values.city,
          siret: values.siret,
          siren: values.siren,
          naf_code: values.naf_code,
          official_name: values.official_name,
          official_data_source:
            values.official_data_source === 'api-recherche-entreprises'
              ? 'api-recherche-entreprises'
              : null,
          official_data_synced_at: values.official_data_synced_at,
          notes: values.notes,
          cir_commercial_id: values.cir_commercial_id,
          primary_contact: isIndividualClient
            ? {
                first_name: values.first_name,
                last_name: values.last_name,
                email: values.email,
                phone: values.phone,
                position: '',
                notes: '',
              }
            : undefined,
          agency_id: agencyId,
        });

        if (!parsed.success) {
          setStepError(
            parsed.error.issues[0]?.message ??
              'Le formulaire client est incomplet.',
          );
          stepper.navigation.goTo('details');
          return;
        }

        const savedClient = await onSaveClient({
          id: initialEntity?.id,
          client_number: parsed.data.client_number,
          client_kind: parsed.data.client_kind,
          account_type: parsed.data.account_type,
          name: parsed.data.name,
          address: parsed.data.address,
          postal_code: parsed.data.postal_code,
          department: parsed.data.department,
          city: parsed.data.city,
          siret: parsed.data.siret,
          siren: parsed.data.siren,
          naf_code: parsed.data.naf_code,
          official_name: parsed.data.official_name,
          official_data_source: parsed.data.official_data_source,
          official_data_synced_at: parsed.data.official_data_synced_at,
          notes: parsed.data.notes,
          cir_commercial_id: parsed.data.cir_commercial_id,
          primary_contact:
            parsed.data.client_kind === 'individual'
              ? parsed.data.primary_contact
              : null,
          agency_id: agencyId,
        });

        onComplete?.({
          intent: 'client',
          client_number: savedClient?.client_number ?? parsed.data.client_number,
          entity_id: savedClient?.id ?? initialEntity?.id ?? null,
        });
        onOpenChange(false);
        return;
      }

      if (!onSaveProspect) {
        throw createMissingSaveCallbackError('prospect');
      }

      const parsed = prospectFormSchema.safeParse({
        name: values.name,
        address: values.address,
        postal_code: values.postal_code,
        department: values.department,
        city: values.city,
        siret: values.siret,
        siren: values.siren,
        naf_code: values.naf_code,
        official_name: values.official_name,
        official_data_source:
          values.official_data_source === 'api-recherche-entreprises'
            ? 'api-recherche-entreprises'
            : null,
        official_data_synced_at: values.official_data_synced_at,
        notes: values.notes,
        agency_id: agencyId,
      });

      if (!parsed.success) {
        setStepError(
          parsed.error.issues[0]?.message ??
            'Le formulaire prospect est incomplet.',
        );
        stepper.navigation.goTo('details');
        return;
      }

      const savedProspect = await onSaveProspect({
        id: initialEntity?.id,
        entity_type: resolveProspectPayloadType(initialEntity),
        name: parsed.data.name,
        address: toNullable(parsed.data.address ?? ''),
        postal_code: toNullable(parsed.data.postal_code ?? ''),
        department: toNullable(parsed.data.department ?? ''),
        city: parsed.data.city,
        siret: toNullable(parsed.data.siret ?? ''),
        siren: toNullable(parsed.data.siren ?? ''),
        naf_code: toNullable(parsed.data.naf_code ?? ''),
        official_name: toNullable(parsed.data.official_name ?? ''),
        official_data_source: parsed.data.official_data_source,
        official_data_synced_at: toNullable(
          parsed.data.official_data_synced_at ?? '',
        ),
        notes: toNullable(parsed.data.notes ?? ''),
        agency_id: agencyId,
      });

      onComplete?.({
        intent: 'prospect',
        client_number: null,
        entity_id: savedProspect?.id ?? initialEntity?.id ?? null,
      });
      onOpenChange(false);
    } catch (error) {
      const appError = handleUiError(
        error,
        effectiveIntent === 'client'
          ? "Impossible d'enregistrer le client."
          : "Impossible d'enregistrer le prospect.",
        {
          intent: effectiveIntent,
          source: 'EntityOnboardingDialog.handleSubmit',
        },
      );
      setStepError(appError.message);
    } finally {
      setIsSaving(false);
    }
  }, [
    activeAgencyId,
    effectiveIntent,
    initialEntity,
    isIndividualClient,
    onComplete,
    onOpenChange,
    onSaveClient,
    onSaveProspect,
    setIsSaving,
    setStepError,
    stepper.navigation,
    userRole,
    values,
  ]);
