import ConfirmDialog from '@/components/ConfirmDialog';
import type { ClientsPanelDialogsProps } from './ClientsPanelDialogs.types';

type ClientsPanelConfirmDialogsProps = Pick<
  ClientsPanelDialogsProps,
  | 'confirmArchive'
  | 'onConfirmArchiveChange'
  | 'onConfirmArchive'
  | 'confirmDeleteContact'
  | 'onConfirmDeleteContactChange'
  | 'onConfirmDeleteContact'
>;

const ClientsPanelConfirmDialogs = ({
  confirmArchive,
  onConfirmArchiveChange,
  onConfirmArchive,
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
