import { ArrowLeftRight, Pencil } from 'lucide-react';

import { Button } from '../ui/inputs/basic/Button';
import ClientDirectoryRecordDangerMenu from './ClientDirectoryRecordDangerMenu';

export interface ClientDirectoryRecordActionsBarProps {
  isProspect: boolean;
  isSupplier: boolean;
  canDeleteRecord: boolean;
  deleteLabel: string;
  recordName: string;
  isDeleting: boolean;
  onEditClient: () => void;
  onEditProspect: () => void;
  onEditSupplier: () => void;
  onConvertProspect: () => void;
  onConfirmDelete: (deleteRelatedInteractions: boolean) => Promise<boolean>;
}

/**
 * Renders the actions toolbar for client/prospect detail view.
 * Includes buttons for editing, deleting, or converting a prospect to a client.
 * Styling is optimized for a compact, clean layout with subtle hover states.
 *
 * @param props - The component properties.
 * @param props.isProspect - True if the entity is a prospect.
 * @param props.canDeleteRecord - True if the current user is authorized to delete the record.
 * @param props.deleteLabel - Label for the delete menu entry.
 * @param props.recordName - Exact record name, required to confirm the deletion.
 * @param props.isDeleting - True while the deletion is in flight.
 * @param props.onEditClient - Callback to edit client details.
 * @param props.onEditProspect - Callback to edit prospect details.
 * @param props.onConvertProspect - Callback to convert prospect to client.
 * @param props.onConfirmDelete - Performs the deletion; resolves to true on success.
 * @returns The rendered JSX element.
 */
const ClientDirectoryRecordActionsBar = ({
  isProspect,
  isSupplier,
  canDeleteRecord,
  deleteLabel,
  recordName,
  isDeleting,
  onEditClient,
  onEditProspect,
  onEditSupplier,
  onConvertProspect,
  onConfirmDelete,
}: ClientDirectoryRecordActionsBarProps) => {
  const handleEdit = isSupplier
    ? onEditSupplier
    : isProspect ? onEditProspect : onEditClient;
  const recordKind = isSupplier ? 'supplier' : isProspect ? 'prospect' : 'client';

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-border text-foreground"
        onClick={handleEdit}
      >
        <Pencil aria-hidden="true" />
        Modifier
      </Button>
      {isProspect && !isSupplier ? (
        <Button
          type="button"
          size="sm"
          onClick={onConvertProspect}
        >
          <ArrowLeftRight aria-hidden="true" />
          Convertir en client
        </Button>
      ) : null}
      {canDeleteRecord ? (
        <ClientDirectoryRecordDangerMenu
          recordKind={recordKind}
          recordName={recordName}
          deleteLabel={deleteLabel}
          isDeleting={isDeleting}
          onConfirmDelete={onConfirmDelete}
        />
      ) : null}
    </div>
  );
};

export default ClientDirectoryRecordActionsBar;
