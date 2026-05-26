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

  const { control, reset } = form;

  const families = useWatch({ control, name: 'families' }) ?? [];
  const services = useWatch({ control, name: 'services' }) ?? [];
  const entities = useWatch({ control, name: 'entities' }) ?? [];
  const interactionTypes = useWatch({ control, name: 'interactionTypes' }) ?? [];
  const allowManualEntryOverride = useWatch({ control, name: 'agencyAllowManualEntry' }) ?? 'inherit';
  const defaultCompanyAccountTypeOverride =
    useWatch({ control, name: 'agencyDefaultCompanyAccountType' }) ?? 'inherit';
  const productAllowManualEntry = useWatch({ control, name: 'productAllowManualEntry' }) ?? true;
  const productDefaultCompanyAccountType =
    useWatch({ control, name: 'productDefaultCompanyAccountType' }) ?? 'term';
  const productUiShellV2 = useWatch({ control, name: 'productUiShellV2' }) ?? false;
  const statuses = (useWatch({ control, name: 'statuses' }) ?? []) as AgencyStatus[];
  const newFamily = useWatch({ control, name: 'newFamily' }) ?? '';
  const newService = useWatch({ control, name: 'newService' }) ?? '';
  const newEntity = useWatch({ control, name: 'newEntity' }) ?? '';
  const newInteractionType = useWatch({ control, name: 'newInteractionType' }) ?? '';
  const newStatus = useWatch({ control, name: 'newStatus' }) ?? '';
  const newStatusCategory = useWatch({ control, name: 'newStatusCategory' }) ?? 'todo';

  useEffect(() => {
    reset(buildSettingsFormDefaultValues(snapshot, agencyId));
  }, [agencyId, reset, snapshot]);

  return {
    form,
    allowManualEntryOverride,
    defaultCompanyAccountTypeOverride,
    productAllowManualEntry,
    productDefaultCompanyAccountType,
    productUiShellV2,
    families,
    services,
    entities,
    interactionTypes,
    statuses,
    newFamily,
    newService,
    newEntity,
    newInteractionType,
    newStatus,
    newStatusCategory
  };
};
