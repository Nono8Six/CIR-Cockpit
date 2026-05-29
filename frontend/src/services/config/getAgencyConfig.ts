import type { ResolvedConfigSnapshot } from '../../../../shared/schemas/system/config.schema';

import type { AgencyStatus } from '@/types';
import { getConfigSnapshot } from './getConfigSnapshot';

export type AgencyConfig = {
  statuses: AgencyStatus[];
  historicalStatuses: AgencyStatus[];
  services: string[];
  families: string[];
  interactionTypes: string[];
};

export const mapSnapshotToAgencyConfig = (
  snapshot: ResolvedConfigSnapshot
): AgencyConfig => ({
  statuses: snapshot.references.statuses,
  historicalStatuses: snapshot.references.historical_statuses,
  services: snapshot.references.services,
  families: snapshot.references.families,
  interactionTypes: snapshot.references.interaction_types
});

export const getAgencyConfig = async (
  agencyIdOverride?: string
): Promise<AgencyConfig> => mapSnapshotToAgencyConfig(await getConfigSnapshot(agencyIdOverride));
