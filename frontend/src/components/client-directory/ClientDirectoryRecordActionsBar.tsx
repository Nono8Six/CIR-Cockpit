import { ArrowLeftRight, Pencil, Trash2 } from 'lucide-react';

import { Button } from '../ui/inputs/basic/Button';

export interface ClientDirectoryRecordActionsBarProps {
  isProspect: boolean;
  isSupplier: boolean;
  canDeleteRecord: boolean;
  deleteLabel: string;
  onEditClient: () => void;
  onEditProspect: () => void;
  onEditSupplier: () => void;
  onConvertProspect: () => void;
  onRequestDelete: () => void;
}

/**
 * Renders the actions toolbar for client/prospect detail view.
 * Includes buttons for editing, deleting, or converting a prospect to a client.
 * Styling is optimized for a compact, clean layout with subtle hover states.
 *
 * @param props - The component properties.
 * @param props.isProspect - True if the entity is a prospect.
 * @param props.canDeleteRecord - True if the current user is authorized to delete the record.
 * @param props.deleteLabel - Label for the delete button.
 * @param props.onEditClient - Callback to edit client details.
 * @param props.onEditProspect - Callback to edit prospect details.
 * @param props.onConvertProspect - Callback to convert prospect to client.
 * @param props.onRequestDelete - Callback to open delete confirmation dialog.
 * @returns The rendered JSX element.
 */
const ClientDirectoryRecordActionsBar = ({
  isProspect,
  isSupplier,
  canDeleteRecord,
  deleteLabel,
  onEditClient,
  onEditProspect,
  onEditSupplier,
  onConvertProspect,
  onRequestDelete,
}: ClientDirectoryRecordActionsBarProps) => {
  const handleEdit = isSupplier
    ? onEditSupplier
    : isProspect ? onEditProspect : onEditClient;

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
      {canDeleteRecord ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-destructive/25 text-destructive hover:bg-destructive/10"
          onClick={onRequestDelete}
        >
          <Trash2 aria-hidden="true" />
          {deleteLabel}
        </Button>
      ) : null}
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
    </div>
  );
};

export default ClientDirectoryRecordActionsBar;
