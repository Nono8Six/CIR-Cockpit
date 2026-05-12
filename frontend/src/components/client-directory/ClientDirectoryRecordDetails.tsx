import { useMemo, useState } from 'react';

import type { DirectoryRouteRef, DirectorySearchState } from 'shared/schemas/directory.schema';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigate } from '@tanstack/react-router';

import ClientContactDialog from '@/components/ClientContactDialog';
import ClientFormDialog from '@/components/ClientFormDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import EntityContactsPanelSection from '@/components/entity-contact/EntityContactsPanelSection';
import { getEntityContactName } from '@/components/entity-contact/entityContactRow.utils';
import ProspectFormDialog from '@/components/ProspectFormDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgencies } from '@/hooks/useAgencies';
import { useAppSessionStateContext } from '@/hooks/useAppSession';
import { useDeleteClient } from '@/hooks/useSetClientArchived';
import { useDirectoryOptionCommercials } from '@/hooks/useDirectoryOptionCommercials';
import { useDirectoryRecord } from '@/hooks/useDirectoryRecord';
import { useEntityContactActions } from '@/hooks/useEntityContactActions';
import { useEntityContacts } from '@/hooks/useEntityContacts';
import { useEntityInteractions } from '@/hooks/useEntityInteractions';
import { useSaveClient } from '@/hooks/useSaveClient';
import { useSaveProspect } from '@/hooks/useSaveProspect';
import { notifySuccess } from '@/services/errors/notify';

import ClientDirectoryRecordActionsBar from './ClientDirectoryRecordActionsBar';
import ClientDirectoryRecordIdentityCard from './ClientDirectoryRecordIdentityCard';
import ClientDirectoryRecordInfoGrid from './ClientDirectoryRecordInfoGrid';
import { isProspectEntityType, toSelectedAgenciesScope } from './clientDirectorySearch';

export interface ClientDirectoryRecordDetailsProps {
  routeRef: DirectoryRouteRef;
  search: DirectorySearchState;
  onDeleteSuccess?: () => void;
  relativeNavigation?: {
    previousDisabled: boolean;
    nextDisabled: boolean;
    onOpenPrevious?: () => void;
    onOpenNext?: () => void;
  } | null;
}

const RECORD_DETAILS_SECTION_CLASS_NAME =
  'flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 lg:px-6';

const ClientDirectoryRecordDetails = ({
  routeRef,
  search,
  onDeleteSuccess,
  relativeNavigation,
}: ClientDirectoryRecordDetailsProps) => {
  const sessionState = useAppSessionStateContext();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const userRole = sessionState.profile?.role ?? 'tcs';
  const activeAgencyId = sessionState.activeAgencyId;
  const recordQuery = useDirectoryRecord(routeRef, Boolean(sessionState.session));
  const record = recordQuery.data?.record ?? null;
  const commercialsQuery = useDirectoryOptionCommercials(
    {
      type: isProspectEntityType(record?.entity_type ?? '') ? 'prospect' : 'client',
      scope: toSelectedAgenciesScope(record?.agency_id ? [record.agency_id] : activeAgencyId ? [activeAgencyId] : []),
      includeArchived: true,
    },
    Boolean(record),
  );
  const agenciesQuery = useAgencies(false, Boolean(sessionState.session));
  const contactsQuery = useEntityContacts(record?.id ?? null, false, Boolean(record?.id));
  const interactionsQuery = useEntityInteractions(record?.id ?? null, 1, 5, Boolean(record?.id));
  const saveClientMutation = useSaveClient(record?.agency_id ?? activeAgencyId ?? null, true);
  const saveProspectMutation = useSaveProspect(record?.agency_id ?? activeAgencyId ?? null, true, false);
  const contactActions = useEntityContactActions({
    entityId: record?.id ?? null,
    agencyId: record?.agency_id ?? activeAgencyId ?? null
  });
  const deleteEntityMutation = useDeleteClient(record?.agency_id ?? activeAgencyId ?? null, false);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isProspectDialogOpen, setIsProspectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteRelatedInteractions, setDeleteRelatedInteractions] = useState(true);
  const primaryContact = contactsQuery.data?.[0] ?? null;
  const addressLine = useMemo(
    () => [record?.address, [record?.postal_code, record?.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    [record?.address, record?.city, record?.postal_code],
  );
  const showSkeleton = recordQuery.isLoading || !record;
  const isProspect = record ? isProspectEntityType(record.entity_type) : false;
  const canDeleteRecord = userRole === 'super_admin';
  const deleteLabel = 'Supprimer définitivement';
  const deleteMessage = isProspect ? 'Prospect supprimé définitivement.' : 'Client supprimé définitivement.';

  const handleDeleteRecord = async () => {
    if (!record) return;

    try {
      await deleteEntityMutation.mutateAsync({
        clientId: record.id,
        deleteRelatedInteractions,
      });
      notifySuccess(deleteMessage);
      onDeleteSuccess?.();
    } catch {
      return;
    }
  };

  const handleRequestDelete = () => {
    setDeleteRelatedInteractions(true);
    setIsDeleteDialogOpen(true);
  };

  const handleConvertProspect = () => {
    if (!record) return;
    void navigate({
      to: '/clients/prospects/$prospectId/convert',
      params: { prospectId: record.id },
      search: () => search,
    });
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {showSkeleton ? (
        <motion.section
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.15 }}
          aria-busy="true"
          className={RECORD_DETAILS_SECTION_CLASS_NAME}
        >
          <p className="sr-only">Chargement de la fiche…</p>
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-4 w-80" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </motion.section>
      ) : record ? (
        <motion.section
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          className={RECORD_DETAILS_SECTION_CLASS_NAME}
        >
          <ClientDirectoryRecordActionsBar
            isProspect={isProspect}
            canDeleteRecord={canDeleteRecord}
            deleteLabel={deleteLabel}
            relativeNavigation={relativeNavigation}
            onEditClient={() => setIsClientDialogOpen(true)}
            onEditProspect={() => setIsProspectDialogOpen(true)}
            onConvertProspect={handleConvertProspect}
            onRequestDelete={handleRequestDelete}
          />

          <ClientDirectoryRecordIdentityCard
            record={record}
            isProspect={isProspect}
            addressLine={addressLine}
            primaryContact={primaryContact}
          />

          <ClientDirectoryRecordInfoGrid
            record={record}
            contactsSection={
              <EntityContactsPanelSection
                contacts={contactsQuery.data ?? []}
                focusedContactId={null}
                isContactsLoading={contactsQuery.isLoading}
                emptyLabel={isProspect ? 'Aucun contact pour ce prospect.' : 'Aucun contact pour ce client.'}
                onAddContact={contactActions.requestAddContact}
                onEditContact={contactActions.requestEditContact}
                onDeleteContact={contactActions.requestDeleteContact}
              />
            }
            interactions={interactionsQuery.data?.interactions ?? []}
          />

          {!isProspect ? (
            <ClientFormDialog
              open={isClientDialogOpen}
              onOpenChange={setIsClientDialogOpen}
              client={{
                ...record,
                first_name: primaryContact?.first_name ?? null,
                last_name: primaryContact?.last_name ?? null,
                phone: primaryContact?.phone ?? null,
                email: primaryContact?.email ?? null,
              }}
              agencies={agenciesQuery.data ?? []}
              userRole={userRole}
              activeAgencyId={activeAgencyId}
              commercials={commercialsQuery.data?.commercials ?? []}
              onSave={async (payload) => {
                await saveClientMutation.mutateAsync(payload);
                notifySuccess('Client mis à jour.');
                setIsClientDialogOpen(false);
              }}
            />
          ) : null}

          {isProspect ? (
            <ProspectFormDialog
              open={isProspectDialogOpen}
              onOpenChange={setIsProspectDialogOpen}
              prospect={record}
              agencies={agenciesQuery.data ?? []}
              userRole={userRole}
              activeAgencyId={activeAgencyId}
              onSave={async (payload) => {
                await saveProspectMutation.mutateAsync(payload);
                notifySuccess('Prospect mis à jour.');
                setIsProspectDialogOpen(false);
              }}
            />
          ) : null}

          <ClientContactDialog
            open={contactActions.isContactDialogOpen}
            onOpenChange={contactActions.handleContactDialogOpenChange}
            contact={contactActions.contactDialogContact}
            entityId={record.id}
            onSave={contactActions.saveContact}
          />

          <ConfirmDialog
            open={Boolean(contactActions.contactToDelete)}
            onOpenChange={(open) => {
              if (!open) {
                contactActions.requestDeleteContact(null);
              }
            }}
            title="Supprimer ce contact"
            description={
              contactActions.contactToDelete
                ? `Le contact ${getEntityContactName(contactActions.contactToDelete)} sera supprimé de cette fiche.`
                : 'Ce contact sera supprimé de cette fiche.'
            }
            confirmLabel={contactActions.isDeletingContact ? 'Suppression...' : 'Supprimer'}
            variant="destructive"
            onConfirm={() => {
              void contactActions.confirmDeleteContact();
            }}
          />

          <ConfirmDialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => {
              setIsDeleteDialogOpen(open);
              if (!open) {
                setDeleteRelatedInteractions(true);
              }
            }}
            title={isProspect ? 'Supprimer ce prospect' : 'Supprimer ce client'}
            description={
              isProspect
                ? `Le prospect ${record.name} sera définitivement supprimé.`
                : `Le client ${record.name} sera définitivement supprimé.`
            }
            confirmLabel="Supprimer"
            variant="destructive"
            onConfirm={() => {
              void handleDeleteRecord();
            }}
          >
            <label className="flex items-start gap-3 rounded-md border border-border bg-surface-1/60 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-destructive"
                checked={deleteRelatedInteractions}
                onChange={(event) => {
                  setDeleteRelatedInteractions(event.target.checked);
                }}
              />
              <span>
                {isProspect
                  ? 'Supprimer aussi toutes les interactions rattachées à ce prospect.'
                  : 'Supprimer aussi toutes les interactions rattachées à ce client.'}
              </span>
            </label>
          </ConfirmDialog>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
};

export default ClientDirectoryRecordDetails;
