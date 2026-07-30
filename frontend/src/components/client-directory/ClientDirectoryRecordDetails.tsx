import { useMemo } from 'react';

import type { DirectoryRecord, DirectoryRouteRef } from '../../../../shared/schemas/system/directory.schema';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { RefreshCcw } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { EMPTY_CONFIG } from '@/app/appConstants';
import ClientContactDialog from '@/components/ClientContactDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import EntityContactsPanelSection from '@/components/entity-contact/EntityContactsPanelSection';
import { getEntityContactName } from '@/components/entity-contact/entityContactRow.utils';
import { Button } from '../ui/inputs/basic/Button';
import { Skeleton } from '../ui/feedback/Skeleton';
import { useAgencies } from '../../hooks/admin/agencies/core/useAgencies';
import { useAgencyConfig } from '../../hooks/admin/agencies/core/useAgencyConfig';
import { useAppSessionStateContext } from '../../hooks/session/useAppSession';
import { useDeleteClient } from '../../hooks/entities/clients/useDeleteClient';
import { useDeleteSupplier } from '../../hooks/entities/suppliers/useDeleteSupplier';
import { useDirectoryOptionCommercials } from '../../hooks/directory/options/useDirectoryOptionCommercials';
import { useDirectoryRecord } from '../../hooks/directory/core/useDirectoryRecord';
import { useEntityContactActions } from '../../hooks/entities/contacts/useEntityContactActions';
import { useEntityContacts } from '../../hooks/entities/contacts/useEntityContacts';
import { useSaveClient } from '../../hooks/entities/clients/useSaveClient';
import { useSaveProspect } from '../../hooks/entities/prospects/useSaveProspect';
import { useSaveSupplier } from '../../hooks/entities/suppliers/useSaveSupplier';
import { useAuditLogs } from '../../hooks/admin/audit/useAuditLogs';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifySuccess } from '@/services/errors/notifySuccess';
import type { Interaction } from '@/types';

import ClientDirectoryInteractionDetailsSheet from './ClientDirectoryInteractionDetailsSheet';
import ClientDirectoryRecordActionsBar from './ClientDirectoryRecordActionsBar';
import ClientDirectoryRecordIdentityCard from './ClientDirectoryRecordIdentityCard';
import ClientDirectoryRecordInfoGrid from './ClientDirectoryRecordInfoGrid';
import ClientDirectoryRecordHistoryPanel from './ClientDirectoryRecordHistoryPanel';
import ClientDirectoryRecordInteractionsPanel from './ClientDirectoryRecordInteractionsPanel';
import EntityEditPanel from './edit/EntityEditPanel';
import { isProspectEntityType, toSelectedAgenciesScope, validateDirectorySearch } from './clientDirectorySearch';
import { useClientDirectoryRecordInteractions } from './useClientDirectoryRecordInteractions';

export interface ClientDirectoryRecordDetailsProps {
  routeRef: DirectoryRouteRef;
  isEditOpen?: boolean;
  onDeleteSuccess?: () => void;
}

const RECORD_DETAILS_SECTION_CLASS_NAME =
  'flex h-full min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 lg:px-8 max-w-7xl mx-auto w-full';

const normalizeAddressSegment = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\dA-Za-z]+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr');

const buildAddressLine = (record: DirectoryRecord | null): string => {
  if (!record) return '';

  const address = record.address?.trim() ?? '';
  const cityLine = [record.postal_code, record.city].filter(Boolean).join(' ').trim();
  if (!address) return cityLine;
  if (!cityLine) return address;

  return normalizeAddressSegment(address).includes(normalizeAddressSegment(cityLine))
    ? address
    : `${address}, ${cityLine}`;
};

/**
 * Root details page component for client and prospect directories.
 * Manages queries, state and dialogs for editing, converting, or deleting client/prospect records,
 * and passes visual data to split-column layouts (InfoGrid, IdentityCard, ActionsBar, Timeline).
 *
 * @param props - The component properties.
 * @param props.routeRef - The reference containing directory route details.
 * @param props.onDeleteSuccess - Callback triggered after successfully deleting the record.
 * @returns The rendered JSX element.
 */
const ClientDirectoryRecordDetails = ({
  routeRef,
  isEditOpen = false,
  onDeleteSuccess,
}: ClientDirectoryRecordDetailsProps) => {
  const sessionState = useAppSessionStateContext();
  const navigate = useNavigate();
  const directorySearch = validateDirectorySearch(Object.fromEntries(new URLSearchParams(globalThis.location.search)));
  const reducedMotion = useReducedMotion();
  const userRole = sessionState.profile?.role ?? 'tcs';
  const activeAgencyId = sessionState.activeAgencyId;
  const isSupplierRoute = routeRef.kind === 'supplier';
  const canLoadDirectory = Boolean(sessionState.session)
    && (
      isSupplierRoute
        ? userRole !== 'tcs'
        : userRole === 'super_admin' || Boolean(activeAgencyId)
    );
  const recordQuery = useDirectoryRecord(routeRef, canLoadDirectory);
  const record = recordQuery.data?.record ?? null;
  const isSupplier = isSupplierRoute || record?.entity_type === 'Fournisseur';
  const isProspect = record ? isProspectEntityType(record.entity_type) : false;
  const recordAgencyId = record?.agency_id ?? activeAgencyId ?? null;
  const commercialsQuery = useDirectoryOptionCommercials(
    {
      type: isProspect ? 'prospect' : 'client',
      scope: toSelectedAgenciesScope(record?.agency_id ? [record.agency_id] : activeAgencyId ? [activeAgencyId] : []),
      includeArchived: true,
    },
    Boolean(record && !isSupplier),
  );
  const agenciesQuery = useAgencies(false, Boolean(sessionState.session));
  const contactsQuery = useEntityContacts(record?.id ?? null, false, Boolean(record?.id));
  const auditLogsQuery = useAuditLogs(
    {
      entityId: record?.id ?? null,
      limit: 80
    },
    Boolean(record?.id),
  );
  const configQuery = useAgencyConfig(recordAgencyId, Boolean(recordAgencyId && sessionState.canLoadData));
  const config = configQuery.data ?? EMPTY_CONFIG;
  const interactionsState = useClientDirectoryRecordInteractions({
    agencyId: recordAgencyId,
    entityId: record?.id ?? null,
    statuses: config.statuses
  });
  const saveClientMutation = useSaveClient(record?.agency_id ?? activeAgencyId ?? null, true);
  const saveProspectMutation = useSaveProspect(record?.agency_id ?? activeAgencyId ?? null, true, false);
  const saveSupplierMutation = useSaveSupplier(true);
  const contactActions = useEntityContactActions({
    entityId: record?.id ?? null,
    agencyId: record?.agency_id ?? activeAgencyId ?? null
  });
  const deleteClientMutation = useDeleteClient(record?.agency_id ?? activeAgencyId ?? null, false);
  const deleteSupplierMutation = useDeleteSupplier(true);
  const primaryContact = contactsQuery.data?.find((contact) => contact.is_primary && !contact.archived_at) ?? null;
  const addressLine = useMemo(() => buildAddressLine(record), [record]);
  const showAuthContextError = sessionState.authReady && !canLoadDirectory;
  const showError = (recordQuery.isError || showAuthContextError) && !record;
  const showSkeleton = !showError && (recordQuery.isLoading || !record);
  const recordError = useMemo(() => {
    if (showAuthContextError) {
      return {
        details: null,
        message: "Le contexte d'agence requis pour charger cette fiche est indisponible."
      };
    }
    if (recordQuery.error) {
      const error = normalizeError(
        recordQuery.error,
        isSupplierRoute ? "La fiche fournisseur n'a pas pu être récupérée." : "La fiche client n'a pas pu être récupérée.",
        'REQUEST_FAILED'
      );
      return {
        details: error.details ?? null,
        message: error.message
      };
    }
    return {
      details: null,
      message: isSupplierRoute ? "La fiche fournisseur n'a pas pu être récupérée." : "La fiche client n'a pas pu être récupérée."
    };
  }, [isSupplierRoute, recordQuery.error, showAuthContextError]);
  const canDeleteRecord = userRole === 'super_admin';
  const deleteLabel = 'Supprimer définitivement';
  const deleteMessage = isSupplier
    ? 'Fournisseur supprimé définitivement.'
    : isProspect ? 'Prospect supprimé définitivement.' : 'Client supprimé définitivement.';

  const handleDeleteRecord = async (deleteRelatedInteractions: boolean): Promise<boolean> => {
    if (!record) return false;

    try {
      if (isSupplier) {
        await deleteSupplierMutation.mutateAsync({
          supplierId: record.id,
          deleteRelatedInteractions,
        });
      } else {
        await deleteClientMutation.mutateAsync({
          clientId: record.id,
          deleteRelatedInteractions,
        });
      }
      notifySuccess(deleteMessage);
      onDeleteSuccess?.();
      return true;
    } catch {
      return false;
    }
  };

  const handleConvertProspect = () => {
    if (!record || isSupplier) return;
    void navigate({
      to: '/clients/prospects/$prospectId/convert',
      params: { prospectId: record.id },
      search: () => directorySearch,
    });
  };

  const handleEditRecord = () => {
    if (!record) return;

    if (isSupplier) {
      void navigate({
        to: '/suppliers/$supplierId/edit',
        params: { supplierId: record.id },
      });
      return;
    }

    if (isProspect) {
      void navigate({
        to: '/clients/prospects/$prospectId/edit',
        params: { prospectId: record.id },
      });
      return;
    }

    const clientNumber = record.client_number ?? (routeRef.kind === 'client' ? routeRef.clientNumber : null);
    if (!clientNumber) return;

    void navigate({
      to: '/clients/$clientNumber/edit',
      params: { clientNumber },
    });
  };

  const handleCloseEdit = () => {
    if (!record) return;

    if (isSupplier) {
      void navigate({
        to: '/suppliers/$supplierId',
        params: { supplierId: record.id },
      });
      return;
    }

    if (isProspect) {
      void navigate({
        to: '/clients/prospects/$prospectId',
        params: { prospectId: record.id },
      });
      return;
    }

    const clientNumber = record.client_number ?? (routeRef.kind === 'client' ? routeRef.clientNumber : null);
    if (!clientNumber) return;

    void navigate({
      to: '/clients/$clientNumber',
      params: { clientNumber },
    });
  };

  const handleRequestConvertInteraction = (interaction: Interaction) => {
    if (!interaction.entity_id) return;
    interactionsState.setSelectedInteraction(null);
    void navigate({
      to: '/clients/prospects/$prospectId/convert',
      params: { prospectId: interaction.entity_id }
    });
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {showError ? (
        <motion.section
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.15 }}
          className={RECORD_DETAILS_SECTION_CLASS_NAME}
        >
          <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-5 text-destructive">
            <h1 className="text-base font-semibold">Impossible de charger la fiche.</h1>
            <p className="mt-2 text-sm">
              {recordError.message} Vous pouvez réessayer sans quitter la page.
            </p>
            {recordError.details ? (
              <p className="mt-2 rounded-md border border-destructive/20 bg-background/70 p-2 text-xs text-destructive/80">
                {recordError.details}
              </p>
            ) : null}
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void recordQuery.refetch()}>
              <RefreshCcw size={14} />
              Réessayer
            </Button>
          </div>
        </motion.section>
      ) : showSkeleton ? (
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
          {/* Unified Skeleton Container */}
          <div className="space-y-6">
            {/* Skeleton Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-6 border-b border-neutral-200">
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-4 w-80" />
              </div>
              <Skeleton className="h-8 w-28 shrink-0" />
            </div>
            {/* Skeleton Content */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
              <div className="space-y-6">
                <Skeleton className="h-24 rounded" />
                <Skeleton className="h-44 rounded" />
              </div>
              <div className="xl:border-l xl:border-neutral-200 xl:pl-8">
                <Skeleton className="h-72 rounded" />
              </div>
            </div>
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
          {/* Header Section */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-6 border-b border-neutral-200 shrink-0">
          <ClientDirectoryRecordIdentityCard
            record={record}
            isProspect={isProspect}
            isSupplier={isSupplier}
            addressLine={addressLine}
            primaryContact={primaryContact}
          />
            <div className="mt-1 shrink-0">
              <ClientDirectoryRecordActionsBar
                isProspect={isProspect}
                canDeleteRecord={canDeleteRecord}
                deleteLabel={deleteLabel}
                recordName={record.name}
                isDeleting={deleteClientMutation.isPending || deleteSupplierMutation.isPending}
                onEditClient={handleEditRecord}
                onEditProspect={handleEditRecord}
                onEditSupplier={handleEditRecord}
                onConvertProspect={handleConvertProspect}
                onConfirmDelete={handleDeleteRecord}
                isSupplier={isSupplier}
              />
            </div>
          </div>

          {/* Main Info Grid */}
          <ClientDirectoryRecordInfoGrid
            record={record}
            contactsSection={
              <EntityContactsPanelSection
                contacts={contactsQuery.data ?? []}
                focusedContactId={null}
                isContactsLoading={contactsQuery.isLoading}
                emptyLabel={
                  isSupplier
                    ? 'Aucun contact pour ce fournisseur.'
                    : isProspect ? 'Aucun contact pour ce prospect.' : 'Aucun contact pour ce client.'
                }
                onAddContact={contactActions.requestAddContact}
                onEditContact={contactActions.requestEditContact}
                onDeleteContact={contactActions.requestDeleteContact}
              />
            }
            interactionsSection={
              <ClientDirectoryRecordInteractionsPanel
                filters={interactionsState.filters}
                list={interactionsState.list}
                onDeleteInteraction={interactionsState.setInteractionToDelete}
                onOpenInteraction={interactionsState.setSelectedInteraction}
              />
            }
            historySection={
              <ClientDirectoryRecordHistoryPanel
                logs={auditLogsQuery.data ?? []}
                isLoading={auditLogsQuery.isLoading}
                isError={auditLogsQuery.isError}
                onRetry={() => {
                  void auditLogsQuery.refetch();
                }}
              />
            }
          />

          {interactionsState.selectedInteraction ? (
            <ClientDirectoryInteractionDetailsSheet
              historicalStatuses={config.historicalStatuses}
              interaction={interactionsState.selectedInteraction}
              statuses={config.statuses}
              onClose={() => interactionsState.setSelectedInteraction(null)}
              onDeleteInteraction={interactionsState.setInteractionToDelete}
              onRequestConvert={handleRequestConvertInteraction}
              onUpdate={interactionsState.handleInteractionUpdate}
            />
          ) : null}

          {isEditOpen ? (
            <EntityEditPanel
              open={isEditOpen}
              record={record}
              contacts={contactsQuery.data ?? []}
              agencies={agenciesQuery.data ?? []}
              commercials={commercialsQuery.data?.commercials ?? []}
              userRole={userRole}
              activeAgencyId={activeAgencyId}
              isSaving={saveClientMutation.isPending || saveProspectMutation.isPending || saveSupplierMutation.isPending}
              onClose={handleCloseEdit}
              onRequestAddContact={contactActions.requestAddContact}
              onSaveClient={async (payload) => {
                await saveClientMutation.mutateAsync(payload);
              }}
              onSaveProspect={async (payload) => {
                await saveProspectMutation.mutateAsync(payload);
              }}
              onSaveSupplier={async (payload) => {
                await saveSupplierMutation.mutateAsync(payload);
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
            open={Boolean(interactionsState.interactionToDelete)}
            onOpenChange={(open) => {
              if (!open) {
                interactionsState.setInteractionToDelete(null);
              }
            }}
            title="Supprimer cette interaction"
            description={
              interactionsState.interactionToDelete
                ? `L'interaction « ${interactionsState.interactionToDelete.subject || 'Sans objet'} » sera supprimée de cette fiche.`
                : 'Cette interaction sera supprimée de cette fiche.'
            }
            confirmLabel={interactionsState.isDeletePending ? 'Suppression...' : 'Supprimer'}
            variant="destructive"
            onConfirm={() => {
              void interactionsState.handleConfirmDeleteInteraction();
            }}
          />
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
};

export default ClientDirectoryRecordDetails;
