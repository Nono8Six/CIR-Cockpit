import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ResolvedConfigSnapshot } from '../../../../shared/schemas/system/config.schema';
import type { AgencyStatus } from '@/types';
import {
  buildSettingsFormDefaultValues,
  settingsFormSchema,
  type SettingsFormValues
} from './settingsFormSchema';

/**
 * Custom hook to initialize and watch the settings react-hook-form instance.
 *
 * @param snapshot - The configuration snapshot from the DB.
 * @param agencyId - The active agency ID.
 * @returns The form controls, current observed values, and value setters.
 */
export const useSettingsForm = (
  snapshot: ResolvedConfigSnapshot,
  agencyId: string | null
) => {
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: buildSettingsFormDefaultValues(snapshot, agencyId),
    mode: 'onChange'
  });

  const { control, reset, formState } = form;

  const families = useWatch({ control, name: 'families' }) ?? [];
  const services = useWatch({ control, name: 'services' }) ?? [];
  const interactionTypes = useWatch({ control, name: 'interactionTypes' }) ?? [];
  const statuses = (useWatch({ control, name: 'statuses' }) ?? []) as AgencyStatus[];
  const newFamily = useWatch({ control, name: 'newFamily' }) ?? '';
  const newService = useWatch({ control, name: 'newService' }) ?? '';
  const newInteractionType = useWatch({ control, name: 'newInteractionType' }) ?? '';
  const newStatus = useWatch({ control, name: 'newStatus' }) ?? '';
  const newStatusCategory = useWatch({ control, name: 'newStatusCategory' }) ?? 'todo';

  useEffect(() => {
    if (formState.isDirty) return;
    reset(buildSettingsFormDefaultValues(snapshot, agencyId));
  }, [agencyId, formState.isDirty, reset, snapshot]);

  return {
    form,
    families,
    services,
    interactionTypes,
    statuses,
    newFamily,
    newService,
    newInteractionType,
    newStatus,
    newStatusCategory
  };
};
