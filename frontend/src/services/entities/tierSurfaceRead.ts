import type { TierOrganizationRead } from '../../../../shared/schemas/entity/tier-foundation.schema';

import type { Entity } from '@/types';

export type CanonicalTierRole = 'client' | 'prospect' | 'supplier' | 'manufacturer';

export const getActiveTierRoleCodes = (tier: TierOrganizationRead): string[] =>
  tier.roles
    .filter((role) => role.valid_to === null && role.is_active_reference)
    .map((role) => role.code);

export const tierHasActiveRole = (
  tier: TierOrganizationRead | undefined,
  roleCode: CanonicalTierRole
): boolean => Boolean(tier?.roles.some(
  (role) => role.code === roleCode && role.valid_to === null && role.is_active_reference
));

export const entityHasActiveRole = (entity: Entity, roleCode: CanonicalTierRole): boolean =>
  tierHasActiveRole(entity.canonical_tier, roleCode);

export const getTierRoleLabels = (tier: TierOrganizationRead): string[] =>
  tier.roles
    .filter((role) => role.valid_to === null && role.is_active_reference)
    .map((role) => role.label);

export const getTierBusinessProfileLabel = (tier: TierOrganizationRead): string => {
  if (tier.business_profiles.state === 'reference_data_missing') {
    return 'Référentiel de profils métier indisponible';
  }
  if (tier.business_profiles.state === 'assignment_missing') {
    return 'Profil métier non renseigné';
  }
  return tier.business_profiles.primary?.label ?? 'Profil métier non renseigné';
};
