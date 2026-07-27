import { useMemo, useState } from 'react';

import type { CockpitAgencyMember } from '../../../../shared/schemas/interaction/cockpit.schema';
import { ROLE_LABELS } from '@/app/appConstants';
import { useCockpitAgencyMembers } from '@/hooks/admin/agencies/core/useCockpitAgencyMembers';
import type { Interaction } from '@/types';

export type DashboardScope =
  | { kind: 'me' }
  | { kind: 'member'; profileId: string }
  | { kind: 'agency' };

export type DashboardScopeMember = {
  profileId: string;
  name: string;
  roleLabel: string;
  isViewer: boolean;
};

export const getMemberDisplayName = (member: CockpitAgencyMember): string => {
  const displayName = member.display_name?.trim();
  if (displayName) {
    return displayName;
  }

  const composed = [member.first_name, member.last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .trim();

  return composed || member.email;
};

type UseDashboardScopeParams = {
  interactions: Interaction[];
  agencyId: string | null;
  userId: string | null;
};

// Perimetre de lecture du pilotage : ma vue (defaut), la vue d'un collegue TC,
// ou la vue consolidee de l'agence. Filtrage purement client sur created_by.
export const useDashboardScope = ({ interactions, agencyId, userId }: UseDashboardScopeParams) => {
  const [scope, setScope] = useState<DashboardScope>(userId ? { kind: 'me' } : { kind: 'agency' });
  const membersQuery = useCockpitAgencyMembers(agencyId);

  const members = useMemo<DashboardScopeMember[]>(() => {
    const rows = membersQuery.data?.members ?? [];
    return rows
      .map((member) => ({
        profileId: member.profile_id,
        name: getMemberDisplayName(member),
        roleLabel: ROLE_LABELS[member.role],
        isViewer: member.profile_id === userId
      }))
      .sort((first, second) => {
        if (first.isViewer !== second.isViewer) {
          return first.isViewer ? -1 : 1;
        }
        return first.name.localeCompare(second.name, 'fr');
      });
  }, [membersQuery.data, userId]);

  const targetProfileId =
    scope.kind === 'me' ? userId : scope.kind === 'member' ? scope.profileId : null;

  const scopedInteractions = useMemo(() => {
    if (!targetProfileId) {
      return interactions;
    }

    return interactions.filter((interaction) => interaction.created_by === targetProfileId);
  }, [interactions, targetProfileId]);

  const viewerMember = members.find((member) => member.isViewer) ?? null;
  const selectedMember =
    scope.kind === 'member'
      ? members.find((member) => member.profileId === scope.profileId) ?? null
      : scope.kind === 'me'
        ? viewerMember
        : null;

  const scopeLabel =
    scope.kind === 'agency'
      ? members.length > 0
        ? `Agence · ${members.length} membre${members.length > 1 ? 's' : ''}`
        : 'Agence'
      : scope.kind === 'me'
        ? 'Ma vue'
        : selectedMember
          ? `Vue de ${selectedMember.name}`
          : 'Ma vue';

  return {
    scope,
    setScope,
    members,
    membersLoading: membersQuery.isLoading,
    scopedInteractions,
    scopeLabel,
    viewerMember,
    selectedMember,
    isConsolidated: scope.kind === 'agency'
  };
};
