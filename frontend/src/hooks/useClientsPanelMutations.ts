import { useDeleteClient, useSetClientArchived } from './useSetClientArchived';
import { useDeleteEntityContact } from './useDeleteEntityContact';
import { useReassignEntity } from './useReassignEntity';
import { useSaveClient } from './useSaveClient';
import { useSaveEntityContact } from './useSaveEntityContact';
import { useSaveProspect } from './useSaveProspect';

type UseClientsPanelMutationsParams = {
  effectiveAgencyId: string | null;
  deleteMutationAgencyId: string | null;
  showArchived: boolean;
  isOrphansFilter: boolean;
  activeEntityId: string | null;
};

export const useClientsPanelMutations = ({
  effectiveAgencyId,
  deleteMutationAgencyId,
  showArchived,
  isOrphansFilter,
  activeEntityId
}: UseClientsPanelMutationsParams) => {
  const saveClientMutation = useSaveClient(effectiveAgencyId, showArchived);
  const saveProspectMutation = useSaveProspect(effectiveAgencyId, showArchived, isOrphansFilter);
  const archiveClientMutation = useSetClientArchived(effectiveAgencyId);
  const deleteClientMutation = useDeleteClient(deleteMutationAgencyId, isOrphansFilter);
  const reassignEntityMutation = useReassignEntity(effectiveAgencyId, isOrphansFilter);
  const saveContactMutation = useSaveEntityContact(activeEntityId, false, effectiveAgencyId);
  const deleteContactMutation = useDeleteEntityContact(activeEntityId, false);

  return {
    saveClientMutation,
    saveProspectMutation,
    archiveClientMutation,
    deleteClientMutation,
    reassignEntityMutation,
    saveContactMutation,
    deleteContactMutation
  };
};
