import { useNavigate } from '@tanstack/react-router';
import type { DirectoryListRow } from 'shared/schemas/directory.schema';

import EntityOnboardingDialog from '@/components/EntityOnboardingDialog';
import { useAgencies } from '@/hooks/useAgencies';
import { useAppSessionStateContext } from '@/hooks/useAppSession';
import { useDirectoryOptions } from '@/hooks/useDirectoryOptions';
import { useDirectoryRecord } from '@/hooks/useDirectoryRecord';
import { useSaveClient } from '@/hooks/useSaveClient';
import { notifySuccess } from '@/services/errors/notify';
import { isProspectEntityType } from './clientDirectorySearch';

const saveProspectFallback = async (): Promise<void> => undefined;

type ClientDirectoryConvertPageProps = {
  prospectId: string;
};

const ClientDirectoryConvertPage = ({ prospectId }: ClientDirectoryConvertPageProps) => {
  const sessionState = useAppSessionStateContext();
  const navigate = useNavigate({ from: '/clients/prospects/$prospectId/convert' });
  const userRole = sessionState.profile?.role ?? 'tcs';
  const activeAgencyId = sessionState.activeAgencyId;
  const canLoadDirectory = Boolean(sessionState.session) && (userRole === 'super_admin' || Boolean(activeAgencyId));
  const recordQuery = useDirectoryRecord({ kind: 'prospect', id: prospectId }, canLoadDirectory);
  const record = recordQuery.data?.record ?? null;
  const scopedAgencyIds = record?.agency_id ? [record.agency_id] : activeAgencyId ? [activeAgencyId] : [];
  const agenciesQuery = useAgencies(false, canLoadDirectory);
  const optionsQuery = useDirectoryOptions(
    {
      type: 'client',
      agencyIds: scopedAgencyIds,
      includeArchived: true
    },
    canLoadDirectory && Boolean(record)
  );
  const saveClientMutation = useSaveClient(record?.agency_id ?? activeAgencyId ?? null, true);

  const handleOpenDuplicate = (duplicate: DirectoryListRow) => {
    if (!isProspectEntityType(duplicate.entity_type) && duplicate.client_number) {
      void navigate({
        to: '/clients/$clientNumber',
        params: { clientNumber: duplicate.client_number }
      });
      return;
    }

    void navigate({
      to: '/clients/prospects/$prospectId',
      params: { prospectId: duplicate.id }
    });
  };

  if (!canLoadDirectory) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
        Agence active requise pour afficher l annuaire.
      </section>
    );
  }

  if (recordQuery.isLoading || !record) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
        Chargement du prospect...
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:px-4 sm:py-3 lg:px-6">
      <EntityOnboardingDialog
        open
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            void navigate({
              to: '/clients/prospects/$prospectId',
              params: { prospectId }
            });
          }
        }}
        agencies={agenciesQuery.data ?? []}
        userRole={userRole}
        activeAgencyId={activeAgencyId}
        commercials={optionsQuery.data?.commercials ?? []}
        mode="convert"
        allowedIntents={['client']}
        initialEntity={record}
        sourceLabel="Fiche prospect"
        surface="page"
        backLabel="Retour au prospect"
        onSaveClient={(payload) => saveClientMutation.mutateAsync(payload)}
        onSaveProspect={saveProspectFallback}
        onComplete={({ client_number }) => {
          notifySuccess('Prospect converti en client.');
          if (!client_number) {
            return;
          }

          void navigate({
            to: '/clients/$clientNumber',
            params: { clientNumber: client_number }
          });
        }}
        onOpenDuplicate={handleOpenDuplicate}
      />
    </section>
  );
};

export default ClientDirectoryConvertPage;
