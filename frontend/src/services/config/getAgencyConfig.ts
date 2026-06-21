import type { ResolvedConfigSnapshot } from '../../../../shared/schemas/system/config.schema';

import type { AgencyStatus } from '@/types';
import { getConfigSnapshot } from './getConfigSnapshot';

export type AgencyInteractionTypeConfig = ResolvedConfigSnapshot['references']['interaction_types'][number];
export type AgencyInteractionTypeLike = AgencyInteractionTypeConfig | string;

export type AgencyConfig = {
  statuses: AgencyStatus[];
  historicalStatuses: AgencyStatus[];
  services: string[];
  families: string[];
  interactionTypes: AgencyInteractionTypeLike[];
  resolutions?: NonNullable<ResolvedConfigSnapshot['references']['resolutions']>;
};

export const getInteractionTypeLabels = (
  interactionTypes: AgencyInteractionTypeLike[]
): string[] => interactionTypes.map((type) => typeof type === 'string' ? type : type.label);

export const normalizeInteractionTypeConfig = (
  interactionTypes: AgencyInteractionTypeLike[]
): AgencyInteractionTypeConfig[] =>
  interactionTypes.map((type, index) => typeof type === 'string'
    ? { label: type, requires_product_families: false, sort_order: index + 1 }
    : type
  );

export const mapSnapshotToAgencyConfig = (
  snapshot: ResolvedConfigSnapshot
): AgencyConfig => ({
  statuses: snapshot.references.statuses,
  historicalStatuses: snapshot.references.historical_statuses,
  services: snapshot.references.services,
  families: snapshot.references.families,
  interactionTypes: snapshot.references.interaction_types,
  resolutions: snapshot.references.resolutions ?? []
});

export const getAgencyConfig = async (
  agencyIdOverride?: string
): Promise<AgencyConfig> => mapSnapshotToAgencyConfig(await getConfigSnapshot(agencyIdOverride));
