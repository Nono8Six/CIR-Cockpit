import { useCallback, useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';

import type { CockpitAgencyMember } from '../../../../../../shared/schemas/interaction/cockpit.schema';
import { createAppError } from '@/services/errors/AppError';
import { getCockpitAgencyMembers } from '@/services/cockpit/getCockpitAgencyMembers';
import { cockpitAgencyMembersKey } from '@/services/query/queryKeys';
import { useNotifyError } from '../../../cockpit-utils/useNotifyError';

type AgencyOption = {
  id: string;
  name: string;
};

export type CockpitAgencyMemberWithAgency = CockpitAgencyMember & {
  agencyId: string;
  agencyName: string;
};

export const useCockpitAgencyMembers = (agencyId: string | null, enabled = true) => {
  const query = useQuery({
    queryKey: cockpitAgencyMembersKey(agencyId),
    queryFn: () => {
      if (!agencyId) {
        return Promise.reject(createAppError({
          code: 'VALIDATION_ERROR',
          message: 'Identifiant agence requis.',
          source: 'validation'
        }));
      }

      return getCockpitAgencyMembers({ agency_id: agencyId });
    },
    enabled: enabled && Boolean(agencyId),
    staleTime: 5 * 60 * 1000
  });

  useNotifyError(query.error, "Impossible de charger les membres de l'agence", 'useCockpitAgencyMembers');

  return query;
};

export const useCockpitAgencyMembersByAgencyIds = (
  agencies: AgencyOption[],
  enabled = true
) => {
  const queryAgencies = useMemo(() => {
    const seen = new Set<string>();
    return agencies.filter((agency) => {
      if (seen.has(agency.id)) return false;
      seen.add(agency.id);
      return true;
    });
  }, [agencies]);

  const combineResults = useCallback((results: Array<ReturnType<typeof useCockpitAgencyMembers>>) => {
    const members: CockpitAgencyMemberWithAgency[] = [];

    results.forEach((result, index) => {
      const agency = queryAgencies[index];
      if (!agency) return;

      result.data?.members.forEach((member) => {
        members.push({
          ...member,
          agencyId: agency.id,
          agencyName: agency.name
        });
      });
    });

    return {
      members,
      isLoading: results.some((result) => result.isLoading),
      error: results.find((result) => result.error)?.error ?? null
    };
  }, [queryAgencies]);

  const query = useQueries({
    queries: queryAgencies.map((agency) => ({
      queryKey: cockpitAgencyMembersKey(agency.id),
      queryFn: () => getCockpitAgencyMembers({ agency_id: agency.id }),
      enabled: enabled && queryAgencies.length > 0,
      staleTime: 5 * 60 * 1000
    })),
    combine: combineResults
  });

  useNotifyError(query.error, "Impossible de charger les membres de l'agence", 'useCockpitAgencyMembersByAgencyIds');

  return query;
};
