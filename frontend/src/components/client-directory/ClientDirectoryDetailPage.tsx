import { useMemo, useState } from 'react';

import type { DirectoryRouteRef } from 'shared/schemas/directory.schema';
import { ArrowLeftRight, Building2, Mail, MapPin, Phone, Trash2 } from 'lucide-react';
import { useCanGoBack, useNavigate } from '@tanstack/react-router';

import ClientFormDialog from '@/components/ClientFormDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import ProspectFormDialog from '@/components/ProspectFormDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { formatTime } from '@/utils/date/formatTime';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';
import { getDirectoryTypeLabel, isProspectEntityType } from './clientDirectorySearch';

type ClientDirectoryDetailPageProps = {
  routeRef: DirectoryRouteRef;
};

const ClientDirectoryDetailPage = ({ routeRef }: ClientDirectoryDetailPageProps) => {
  const sessionState = useAppSessionStateContext();
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();
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

  if (recordQuery.isLoading || !record) {
    return (
      <section className="flex h-full min-h-0 flex-1 items-center justify-center rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
        Chargement de la fiche…
      </section>
    );
  }

  const isProspect = isProspectEntityType(record.entity_type);
  const canDeleteRecord = userRole === 'super_admin';
  const deleteLabel = 'Supprimer définitivement';
  const deleteMessage = isProspect ? 'Prospect supprime definitivement.' : 'Client supprime definitivement.';
  const handleDeleteRecord = async () => {
    try {
      await deleteEntityMutation.mutateAsync({
        clientId: record.id,
        deleteRelatedInteractions
      });
      notifySuccess(deleteMessage);
      if (canGoBack) {
        globalThis.history.back();
        return;
      }

      globalThis.location.assign('/clients');
    } catch {
      return;
    }
  };

  return (
    <>
      <section className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 lg:px-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
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
                      params: { prospectId: record.id }
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

        <section className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-muted/40 text-muted-foreground">
                <Building2 size={22} />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{getDirectoryTypeLabel(record.entity_type)}</Badge>
                  {record.client_kind === 'individual' ? <Badge variant="outline">Particulier</Badge> : null}
                  {record.archived_at ? <Badge variant="outline">Archivé</Badge> : null}
                  {!isProspect && record.account_type ? (
                    <Badge variant="outline">
                      {record.account_type === 'cash' ? 'Comptant' : 'Compte à terme'}
                    </Badge>
                  ) : null}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">{record.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {isProspect || !record.client_number ? 'Prospect' : `N° ${formatClientNumber(record.client_number)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><MapPin size={14} /> {addressLine || 'Adresse non renseignée'}</span>
                  <span>Agence: {record.agency_name ?? 'Non rattaché'}</span>
                  {record.client_kind === 'individual'
                    ? <span>Contact principal: {[primaryContact?.first_name, primaryContact?.last_name].filter(Boolean).join(' ') || 'Non renseigné'}</span>
                    : <span>Commercial CIR: {record.cir_commercial_name ?? 'Non affecté'}</span>}
                </div>
              </div>
            </div>
            <div className="grid gap-1 text-right text-xs text-muted-foreground">
              <span>Créé le {formatDate(record.created_at)}</span>
              <span>Mis à jour le {formatDate(record.updated_at)}</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-card p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">Informations</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p><span className="font-medium text-foreground">SIRET:</span> {record.siret ?? 'Non renseigné'}</p>
                  <p><span className="font-medium text-foreground">Département:</span> {record.department ?? 'Non renseigné'}</p>
                  <p><span className="font-medium text-foreground">Pays:</span> {record.country}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">Notes</p>
                <p className="mt-3 text-sm text-muted-foreground">{record.notes || 'Aucune note enregistrée.'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">Contacts</p>
              <div className="mt-3 space-y-3">
                {(contactsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun contact rattaché.</p>
                ) : (
                  (contactsQuery.data ?? []).map((contact) => (
                    <div key={contact.id} className="rounded-xl border border-border/70 px-3 py-3 text-sm">
                      <p className="font-medium text-foreground">
                        {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Contact'}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-3 text-muted-foreground">
                        {contact.position ? <span>{contact.position}</span> : null}
                        {contact.email ? <span className="inline-flex items-center gap-1"><Mail size={12} /> {contact.email}</span> : null}
                        {contact.phone ? <span className="inline-flex items-center gap-1"><Phone size={12} /> {contact.phone}</span> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">Activité récente</p>
            <div className="mt-3 space-y-3">
              {(interactionsQuery.data?.interactions ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune interaction récente.</p>
              ) : (
                (interactionsQuery.data?.interactions ?? []).map((interaction) => (
                  <div key={interaction.id} className="rounded-xl border border-border/70 px-3 py-3 text-sm">
                    <p className="font-medium text-foreground">{interaction.subject}</p>
                    <p className="mt-1 text-muted-foreground">{interaction.status}</p>
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      {formatDate(interaction.last_action_at)} à {formatTime(interaction.last_action_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>

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
        <>
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
        </>
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
            ? `Le prospect ${record.name} sera definitivement supprime.`
            : `Le client ${record.name} sera definitivement supprime.`
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
              ? 'Supprimer aussi toutes les interactions rattachees a ce prospect.'
              : 'Supprimer aussi toutes les interactions rattachees a ce client.'}
          </span>
        </label>
      </ConfirmDialog>
    </>
  );
};

export default ClientDirectoryDetailPage;
