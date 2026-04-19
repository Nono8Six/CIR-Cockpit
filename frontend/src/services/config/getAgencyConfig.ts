import type { ResolvedConfigSnapshot } from 'shared/schemas/config.schema';

import type { AgencyStatus } from '@/types';
import { getConfigSnapshot } from './getConfigSnapshot';

export type AgencyConfig = {
  statuses: AgencyStatus[];
  services: string[];
  entities: string[];
  families: string[];
  interactionTypes: string[];
};

export const mapSnapshotToAgencyConfig = (
  snapshot: ResolvedConfigSnapshot
): AgencyConfig => ({
  statuses: snapshot.references.statuses,
  services: snapshot.references.services,
  entities: snapshot.references.entities,
  families: snapshot.references.families,
  interactionTypes: snapshot.references.interaction_types
});

export const getAgencyConfig = async (
  agencyIdOverride?: string
): Promise<AgencyConfig> => mapSnapshotToAgencyConfig(await getConfigSnapshot(agencyIdOverride));
