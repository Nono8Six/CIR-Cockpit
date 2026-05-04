import { useNavigate, useSearch } from '@tanstack/react-router';
import type { DirectoryListRow } from 'shared/schemas/directory.schema';

import EntityOnboardingDialog from '@/components/EntityOnboardingDialog';
import { useAgencies } from '@/hooks/useAgencies';
import { useAppSessionStateContext } from '@/hooks/useAppSession';
import { useDirectoryOptionCommercials } from '@/hooks/useDirectoryOptionCommercials';
import { useSaveClient } from '@/hooks/useSaveClient';
import { useSaveProspect } from '@/hooks/useSaveProspect';
import { notifySuccess } from '@/services/errors/notify';
import {
  isProspectEntityType,
  toSelectedAgenciesScope
} from './clientDirectorySearch';

const ClientDirectoryCreatePage = () => {
  const sessionState = useAppSessionStateContext();
  const navigate = useNavigate({ from: '/clients/new' });
  const search = useSearch({ from: '/clients/new' });
  const userRole = sessionState.profile?.role ?? 'tcs';
  const activeAgencyId = sessionState.activeAgencyId;
  const canLoadDirectory = Boolean(sessionState.session) && (userRole === 'super_admin' || Boolean(activeAgencyId));
  const scopedAgencyIds = search.scope.mode === 'selected_agencies'
    ? search.scope.agencyIds
    : activeAgencyId
      ? [activeAgencyId]
      : [];
  const agenciesQuery = useAgencies(false, canLoadDirectory);
  const commercialsQuery = useDirectoryOptionCommercials(
    {
      type: 'all',
      scope: toSelectedAgenciesScope(scopedAgencyIds),
      includeArchived: search.includeArchived,
    },
    canLoadDirectory
  );
  const primaryAgencyId = scopedAgencyIds[0] ?? activeAgencyId ?? null;
  const saveClientMutation = useSaveClient(primaryAgencyId, search.includeArchived);
  const saveProspectMutation = useSaveProspect(primaryAgencyId, search.includeArchived, false);

  const handleOpenDuplicate = (record: DirectoryListRow) => {
    if (!isProspectEntityType(record.entity_type) && record.client_number) {
      void navigate({
        to: '/clients/$clientNumber',
        params: { clientNumber: record.client_number },
        search: () => search
      });
      return;
    }

    void navigate({
      to: '/clients/prospects/$prospectId',
      params: { prospectId: record.id },
      search: () => search
    });
  };

  if (!canLoadDirectory) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
        Agence active requise pour afficher l annuaire.
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-0">
      <EntityOnboardingDialog
        open
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            if (globalThis.history.length > 1) {
              globalThis.history.back();
              return;
            }

            void navigate({ to: '/clients', search: () => search });
          }
        }}
        agencies={agenciesQuery.data ?? []}
        userRole={userRole}
        activeAgencyId={activeAgencyId}
        commercials={commercialsQuery.data?.commercials ?? []}
        sourceLabel="Annuaire"
        surface="page"
        backLabel="Retour aux resultats"
        onSaveClient={(payload) => saveClientMutation.mutateAsync(payload)}
        onSaveProspect={(payload) => saveProspectMutation.mutateAsync(payload)}
        onComplete={({ intent, client_number, entity_id }) => {
          notifySuccess(intent === 'client' ? 'Client cree.' : 'Prospect cree.');

          if (intent === 'client' && client_number) {
            void navigate({
              to: '/clients/$clientNumber',
              params: { clientNumber: client_number },
              search: () => search
            });
            return;
          }

          if (entity_id) {
            void navigate({
              to: '/clients/prospects/$prospectId',
              params: { prospectId: entity_id },
              search: () => search
            });
          }
        }}
        onOpenDuplicate={handleOpenDuplicate}
      />
    </section>
  );
};

export default ClientDirectoryCreatePage;
