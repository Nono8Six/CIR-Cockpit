import { Agency } from '@/types';
import AgencyFormDialog from '@/components/AgencyFormDialog';
import ConfirmDialog from '@/components/ConfirmDialog';

type ConfirmArchiveState = {
  agency: Agency;
  nextArchived: boolean;
} | null;

type AgenciesManagerDialogsProps = {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  renameOpen: boolean;
  onRenameOpenChange: (open: boolean) => void;
  selectedAgency: Agency | null;
  onCreate: (name: string) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  confirmArchive: ConfirmArchiveState;
  onConfirmArchiveChange: (value: ConfirmArchiveState) => void;
  onConfirmArchive: () => Promise<void>;
  confirmDelete: Agency | null;
  onConfirmDeleteChange: (value: Agency | null) => void;
  onConfirmDelete: () => Promise<void>;
};

const AgenciesManagerDialogs = ({
  createOpen,
  onCreateOpenChange,
  renameOpen,
  onRenameOpenChange,
  selectedAgency,
  onCreate,
  onRename,
  confirmArchive,
  onConfirmArchiveChange,
  onConfirmArchive,
  confirmDelete,
  onConfirmDeleteChange,
  onConfirmDelete
}: AgenciesManagerDialogsProps) => {
  return (
    <>
      <AgencyFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        title="Nouvelle agence"
        onSubmit={onCreate}
      />

      <AgencyFormDialog
        open={renameOpen}
        onOpenChange={onRenameOpenChange}
        title="Renommer l'agence"
        initialValue={selectedAgency?.name}
        onSubmit={onRename}
      />

      <ConfirmDialog
        open={confirmArchive !== null}
        onOpenChange={(open) => { if (!open) onConfirmArchiveChange(null); }}
        title={confirmArchive?.nextArchived ? "Archiver l'agence" : "Restaurer l'agence"}
        description={confirmArchive?.nextArchived
          ? `L'agence ${confirmArchive?.agency.name ?? ''} sera archivee.`
          : `L'agence ${confirmArchive?.agency.name ?? ''} sera restauree.`}
        confirmLabel={confirmArchive?.nextArchived ? 'Archiver' : 'Restaurer'}
        variant={confirmArchive?.nextArchived ? 'destructive' : 'default'}
        onConfirm={onConfirmArchive}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => { if (!open) onConfirmDeleteChange(null); }}
        title="Supprimer l'agence"
        description={`L'agence ${confirmDelete?.name ?? ''} sera definitivement supprimee.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={onConfirmDelete}
      />
    </>
  );
};

export default AgenciesManagerDialogs;
