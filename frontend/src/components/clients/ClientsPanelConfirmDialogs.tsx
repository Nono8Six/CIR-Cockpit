import ConfirmDialog from '@/components/ConfirmDialog';
import type { ClientsPanelDialogsProps } from './ClientsPanelDialogs.types';

type ClientsPanelConfirmDialogsProps = Pick<
  ClientsPanelDialogsProps,
  | 'confirmArchive'
  | 'onConfirmArchiveChange'
  | 'onConfirmArchive'
  | 'confirmDeleteClient'
  | 'onConfirmDeleteClientChange'
  | 'confirmDeleteProspect'
  | 'onConfirmDeleteProspectChange'
  | 'deleteRelatedInteractions'
  | 'onDeleteRelatedInteractionsChange'
  | 'onConfirmDeleteClient'
  | 'onConfirmDeleteProspect'
  | 'confirmDeleteContact'
  | 'onConfirmDeleteContactChange'
  | 'onConfirmDeleteContact'
>;

const ClientsPanelConfirmDialogs = ({
  confirmArchive,
  onConfirmArchiveChange,
  onConfirmArchive,
  confirmDeleteClient,
  onConfirmDeleteClientChange,
  confirmDeleteProspect,
  onConfirmDeleteProspectChange,
  deleteRelatedInteractions,
  onDeleteRelatedInteractionsChange,
  onConfirmDeleteClient,
  onConfirmDeleteProspect,
  confirmDeleteContact,
  onConfirmDeleteContactChange,
  onConfirmDeleteContact
}: ClientsPanelConfirmDialogsProps) => (
  <>
    <ConfirmDialog
      open={confirmArchive !== null}
      onOpenChange={(open) => {
        if (!open) onConfirmArchiveChange(null);
      }}
      title={confirmArchive?.nextArchived ? 'Archiver ce client' : 'Restaurer ce client'}
      description={
        confirmArchive?.nextArchived
          ? 'Ce client sera deplace dans les archives. Vous pourrez le restaurer plus tard.'
          : 'Ce client sera restaure et redeviendra actif.'
      }
      confirmLabel={confirmArchive?.nextArchived ? 'Archiver' : 'Restaurer'}
      variant={confirmArchive?.nextArchived ? 'destructive' : 'default'}
      onConfirm={onConfirmArchive}
    />

    <ConfirmDialog
      open={confirmDeleteClient !== null}
      onOpenChange={(open) => {
        if (!open) {
          onConfirmDeleteClientChange(null);
          onDeleteRelatedInteractionsChange(true);
        }
      }}
      title="Supprimer ce client"
      description={`Le client ${confirmDeleteClient?.name ?? ''} sera definitivement supprime.`}
      confirmLabel="Supprimer"
      variant="destructive"
      onConfirm={onConfirmDeleteClient}
    >
      <label className="flex items-start gap-3 rounded-md border border-border bg-surface-1/60 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-destructive"
          checked={deleteRelatedInteractions}
          onChange={(event) => {
            onDeleteRelatedInteractionsChange(event.target.checked);
          }}
        />
        <span>
          Supprimer aussi toutes les interactions rattachees a ce client.
        </span>
      </label>
    </ConfirmDialog>

    <ConfirmDialog
      open={confirmDeleteProspect !== null}
      onOpenChange={(open) => {
        if (!open) {
          onConfirmDeleteProspectChange(null);
          onDeleteRelatedInteractionsChange(true);
        }
      }}
      title="Supprimer ce prospect"
      description={`Le prospect ${confirmDeleteProspect?.name ?? ''} sera definitivement supprime.`}
      confirmLabel="Supprimer"
      variant="destructive"
      onConfirm={onConfirmDeleteProspect}
    >
      <label className="flex items-start gap-3 rounded-md border border-border bg-surface-1/60 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-destructive"
          checked={deleteRelatedInteractions}
          onChange={(event) => {
            onDeleteRelatedInteractionsChange(event.target.checked);
          }}
        />
        <span>
          Supprimer aussi toutes les interactions rattachees a ce prospect.
        </span>
      </label>
    </ConfirmDialog>

    <ConfirmDialog
      open={confirmDeleteContact !== null}
      onOpenChange={(open) => {
        if (!open) onConfirmDeleteContactChange(null);
      }}
      title="Supprimer ce contact"
      description={`Le contact ${confirmDeleteContact?.first_name ?? ''} ${confirmDeleteContact?.last_name ?? ''} sera definitivement supprime.`}
      confirmLabel="Supprimer"
      variant="destructive"
      onConfirm={onConfirmDeleteContact}
    />
  </>
);

export default ClientsPanelConfirmDialogs;
