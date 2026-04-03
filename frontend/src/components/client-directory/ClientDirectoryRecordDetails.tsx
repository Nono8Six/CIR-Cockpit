import { useMemo, useState } from 'react';

import type { DirectoryListInput, DirectoryRouteRef } from 'shared/schemas/directory.schema';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Mail, MapPin, Phone, Trash2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigate } from '@tanstack/react-router';

import ClientFormDialog from '@/components/ClientFormDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import ProspectFormDialog from '@/components/ProspectFormDialog';
import AvatarInitials from '@/components/ui/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import StatusDot from '@/components/ui/status-dot';
import { useAgencies } from '@/hooks/useAgencies';
import { useAppSessionStateContext } from '@/hooks/useAppSession';
import { useDeleteClient } from '@/hooks/useSetClientArchived';
import { useDirectoryOptions } from '@/hooks/useDirectoryOptions';
import { useDirectoryRecord } from '@/hooks/useDirectoryRecord';
import { useEntityContacts } from '@/hooks/useEntityContacts';
import { useEntityInteractions } from '@/hooks/useEntityInteractions';
import { useSaveClient } from '@/hooks/useSaveClient';
import { useSaveProspect } from '@/hooks/useSaveProspect';
import { notifySuccess } from '@/services/errors/notify';
import { formatDate } from '@/utils/date/formatDate';
import { formatRelativeTime } from '@/utils/date/formatRelativeTime';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';
import { getDirectoryTypeLabel, isProspectEntityType } from './clientDirectorySearch';

export interface ClientDirectoryRecordDetailsProps {
  routeRef: DirectoryRouteRef;
  search: DirectoryListInput;
  onDeleteSuccess?: () => void;
  relativeNavigation?: {
    previousDisabled: boolean;
    nextDisabled: boolean;
    onOpenPrevious?: () => void;
    onOpenNext?: () => void;
  } | null;
}

const RECORD_DETAILS_SECTION_CLASS_NAME = 'flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 lg:px-6';

const ClientDirectoryRecordDetails = ({
  routeRef,
  search,
  onDeleteSuccess,
  relativeNavigation
}: ClientDirectoryRecordDetailsProps) => {
  const sessionState = useAppSessionStateContext();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const userRole = sessionState.profile?.role ?? 'tcs';
  const activeAgencyId = sessionState.activeAgencyId;
  const recordQuery = useDirectoryRecord(routeRef, Boolean(sessionState.session));
  const record = recordQuery.data?.record ?? null;
  const optionsQuery = useDirectoryOptions({
    type: isProspectEntityType(record?.entity_type ?? '') ? 'prospect' : 'client',
    agencyIds: record?.agency_id ? [record.agency_id] : activeAgencyId ? [activeAgencyId] : [],
    includeArchived: true
  }, Boolean(record));
  const agenciesQuery = useAgencies(false, Boolean(sessionState.session));
  const contactsQuery = useEntityContacts(record?.id ?? null, false, Boolean(record?.id));
  const interactionsQuery = useEntityInteractions(record?.id ?? null, 1, 5, Boolean(record?.id));
  const saveClientMutation = useSaveClient(record?.agency_id ?? activeAgencyId ?? null, true);
  const saveProspectMutation = useSaveProspect(record?.agency_id ?? activeAgencyId ?? null, true, false);
  const deleteEntityMutation = useDeleteClient(record?.agency_id ?? activeAgencyId ?? null, false);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isProspectDialogOpen, setIsProspectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteRelatedInteractions, setDeleteRelatedInteractions] = useState(true);
  const primaryContact = contactsQuery.data?.[0] ?? null;
  const addressLine = useMemo(
    () => [record?.address, [record?.postal_code, record?.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    [record?.address, record?.city, record?.postal_code]
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
        deleteRelatedInteractions
      });
      notifySuccess(deleteMessage);
      onDeleteSuccess?.();
    } catch {
      return;
    }
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            {relativeNavigation ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Fiche précédente"
                  disabled={relativeNavigation.previousDisabled}
                  onClick={relativeNavigation.onOpenPrevious}
                >
                  <ChevronLeft size={14} />
                  Précédent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Fiche suivante"
                  disabled={relativeNavigation.nextDisabled}
                  onClick={relativeNavigation.onOpenNext}
                >
                  Suivant
                  <ChevronRight size={14} />
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {isProspect ? (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsProspectDialogOpen(true)}>
                    Modifier
                  </Button>
                  {canDeleteRecord ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setDeleteRelatedInteractions(true);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 size={14} />
                      {deleteLabel}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      void navigate({
                        to: '/clients/prospects/$prospectId/convert',
                        params: { prospectId: record.id },
                        search: () => search
                      });
                    }}
                  >
                    <ArrowLeftRight size={14} />
                    Convertir en client
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" size="sm" onClick={() => setIsClientDialogOpen(true)}>
                    Modifier
                  </Button>
                  {canDeleteRecord ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setDeleteRelatedInteractions(true);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 size={14} />
                      {deleteLabel}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <section className="rounded-xl border border-border/50 bg-card/95 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusDot
                      entityType={record.entity_type === 'Client' ? 'Client' : 'Prospect'}
                      archivedAt={record.archived_at ?? null}
                    />
                    <Badge variant="outline">{getDirectoryTypeLabel(record.entity_type)}</Badge>
                    {record.client_kind === 'individual' ? <Badge variant="outline">Particulier</Badge> : null}
                    {record.archived_at ? <Badge variant="outline">Archivé</Badge> : null}
                    {!isProspect && record.account_type ? (
                      <Badge variant="outline">
                        {record.account_type === 'cash' ? 'Comptant' : 'Compte à terme'}
                      </Badge>
                    ) : null}
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">{record.name}</h1>
                    <p className="text-[13px] text-muted-foreground">
                      {isProspect || !record.client_number ? 'Prospect' : `N° ${formatClientNumber(record.client_number)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={14} />
                      {addressLine || 'Adresse non renseignée'}
                    </span>
                    <span>Agence: {record.agency_name ?? 'Non rattaché'}</span>
                    {record.client_kind === 'individual' ? (
                      <span>
                        Contact principal: {[primaryContact?.first_name, primaryContact?.last_name].filter(Boolean).join(' ') || 'Non renseigné'}
                      </span>
                    ) : (
                      <span>Commercial CIR: {record.cir_commercial_name ?? 'Non affecté'}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-1 text-right text-xs text-muted-foreground">
                <span>Créé le {formatDate(record.created_at)}</span>
                <span>Mis à jour {formatRelativeTime(record.updated_at)}</span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground/80">Informations</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <p><span className="font-medium text-foreground">SIRET:</span> {record.siret ?? 'Non renseigné'}</p>
                    <p><span className="font-medium text-foreground">Département:</span> {record.department ?? 'Non renseigné'}</p>
                    <p><span className="font-medium text-foreground">Pays:</span> {record.country}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground/80">Notes</p>
                  <p className={`mt-3 text-sm ${record.notes ? 'text-muted-foreground' : 'italic text-muted-foreground/60'}`}>
                    {record.notes || 'Aucune note enregistrée.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground/80">Contacts</p>
                <div className="mt-3 space-y-3">
                  {(contactsQuery.data ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun contact rattaché.</p>
                  ) : (
                    (contactsQuery.data ?? []).map((contact) => {
                      const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Contact';
                      return (
                        <div key={contact.id} className="flex items-start gap-3 rounded-xl border border-border/50 px-3 py-3 text-sm transition-colors hover:bg-surface-1">
                          <AvatarInitials name={contactName} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{contactName}</p>
                            <div className="mt-1 flex flex-wrap gap-3 text-muted-foreground">
                              {contact.position ? <span>{contact.position}</span> : null}
                              {contact.email ? (
                                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
                                  <Mail size={12} />
                                  {contact.email}
                                </a>
                              ) : null}
                              {contact.phone ? (
                                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
                                  <Phone size={12} />
                                  {contact.phone}
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border/50 bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground/80">Activité récente</p>
              <div className="mt-3 space-y-3">
                {(interactionsQuery.data?.interactions ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune interaction récente.</p>
                ) : (
                  (interactionsQuery.data?.interactions ?? []).map((interaction) => (
                    <div key={interaction.id} className="rounded-xl border border-border/50 px-3 py-3 text-sm">
                      <p className="font-medium text-foreground">{interaction.subject}</p>
                      <p className="mt-1 text-muted-foreground">{interaction.status}</p>
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        {formatRelativeTime(interaction.last_action_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {!isProspect ? (
            <ClientFormDialog
              open={isClientDialogOpen}
              onOpenChange={setIsClientDialogOpen}
              client={{
                ...record,
                first_name: primaryContact?.first_name ?? null,
                last_name: primaryContact?.last_name ?? null,
                phone: primaryContact?.phone ?? null,
                email: primaryContact?.email ?? null
              }}
              agencies={agenciesQuery.data ?? []}
              userRole={userRole}
              activeAgencyId={activeAgencyId}
              commercials={optionsQuery.data?.commercials ?? []}
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
