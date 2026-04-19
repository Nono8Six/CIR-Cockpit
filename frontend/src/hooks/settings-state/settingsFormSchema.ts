import { z } from 'zod/v4';
import type { ResolvedConfigSnapshot } from 'shared/schemas/config.schema';
import { uuidSchema } from 'shared/schemas/auth.schema';

import { normalizeStatusesForUi } from '../useSettingsState.helpers';

const MAX_CONFIG_LABEL_LENGTH = 120;

const statusCategorySchema = z.enum(['todo', 'in_progress', 'done']);
const booleanOverrideSchema = z.enum(['inherit', 'enabled', 'disabled']);
const accountTypeOverrideSchema = z.enum(['inherit', 'term', 'cash']);
const accountTypeSchema = z.enum(['term', 'cash']);

const settingsStatusSchema = z
  .object({
    id: z.string().optional(),
    agency_id: z.string().optional(),
    label: z
      .string()
      .trim()
      .min(1, 'Label requis')
      .max(MAX_CONFIG_LABEL_LENGTH, 'Label trop long'),
    category: statusCategorySchema,
    is_terminal: z.boolean(),
    is_default: z.boolean(),
    sort_order: z.number().int(),
  })
  .strict();

export const settingsFormSchema = z
  .object({
    agency_id: uuidSchema,
    agencyAllowManualEntry: booleanOverrideSchema,
    agencyDefaultCompanyAccountType: accountTypeOverrideSchema,
    productAllowManualEntry: z.boolean(),
    productDefaultCompanyAccountType: accountTypeSchema,
    productUiShellV2: z.boolean(),
    statuses: z.array(settingsStatusSchema).min(1, 'Au moins un statut requis'),
    services: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label service trop long')),
    entities: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label entite trop long')),
    families: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label famille trop long')),
    interactionTypes: z.array(
      z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, "Label type d'interaction trop long"),
    ),
    newFamily: z.string(),
    newService: z.string(),
    newEntity: z.string(),
    newInteractionType: z.string(),
    newStatus: z.string(),
    newStatusCategory: statusCategorySchema,
  })
  .strict();

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
export type BooleanOverrideValue = 'inherit' | 'enabled' | 'disabled';
export type AccountTypeOverrideValue = 'inherit' | 'term' | 'cash';

const toBooleanOverrideValue = (value: boolean | undefined): BooleanOverrideValue => {
  if (value === undefined) return 'inherit';
  return value ? 'enabled' : 'disabled';
};

const toAccountTypeOverrideValue = (value: 'term' | 'cash' | undefined): AccountTypeOverrideValue =>
  value ?? 'inherit';

export const buildSettingsFormDefaultValues = (
  snapshot: ResolvedConfigSnapshot,
  agencyId: string | null,
): SettingsFormValues => ({
  agency_id: agencyId ?? '',
  agencyAllowManualEntry: toBooleanOverrideValue(snapshot.agency.onboarding.allow_manual_entry),
  agencyDefaultCompanyAccountType: toAccountTypeOverrideValue(
    snapshot.agency.onboarding.default_account_type_company,
  ),
  productAllowManualEntry: snapshot.product.onboarding.allow_manual_entry,
  productDefaultCompanyAccountType: snapshot.product.onboarding.default_account_type_company,
  productUiShellV2: snapshot.product.feature_flags.ui_shell_v2,
  statuses: normalizeStatusesForUi(snapshot.references.statuses),
  services: snapshot.references.services,
  entities: snapshot.references.entities,
  families: snapshot.references.families,
  interactionTypes: snapshot.references.interaction_types,
  newFamily: '',
  newService: '',
  newEntity: '',
  newInteractionType: '',
  newStatus: '',
  newStatusCategory: 'todo',
});

export const toAgencyOnboardingPayload = (
  values: SettingsFormValues,
): ResolvedConfigSnapshot['agency']['onboarding'] => ({
  ...(values.agencyAllowManualEntry === 'inherit'
    ? {}
    : { allow_manual_entry: values.agencyAllowManualEntry === 'enabled' }),
  ...(values.agencyDefaultCompanyAccountType === 'inherit'
    ? {}
    : { default_account_type_company: values.agencyDefaultCompanyAccountType }),
});
