import { useId, useRef, useState } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../ui/feedback/AlertDialog';
import { Button } from '../ui/inputs/basic/Button';
import { Input } from '../ui/inputs/basic/Input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/navigation/DropdownMenu';

export type DirectoryRecordKind = 'client' | 'prospect' | 'supplier';

const RECORD_KIND_LABEL: Record<DirectoryRecordKind, string> = {
  client: 'client',
  prospect: 'prospect',
  supplier: 'fournisseur'
};

export interface ClientDirectoryRecordDangerMenuProps {
  recordKind: DirectoryRecordKind;
  recordName: string;
  deleteLabel: string;
  isDeleting: boolean;
  onConfirmDelete: (deleteRelatedInteractions: boolean) => Promise<boolean>;
}

/**
 * Menu de dépassement de la fiche annuaire regroupant les actions destructives.
 * La suppression définitive n'est plus atteignable en un clic : elle passe par ce menu
 * puis par un AlertDialog qui exige la saisie du nom exact de la fiche.
 *
 * @param props - Les propriétés du composant.
 * @param props.recordKind - Nature de la fiche (client, prospect ou fournisseur).
 * @param props.recordName - Nom exact de la fiche, attendu en saisie de confirmation.
 * @param props.deleteLabel - Libellé de l'entrée de menu et du bouton de confirmation.
 * @param props.isDeleting - True pendant la suppression en cours.
 * @param props.onConfirmDelete - Suppression effective ; retourne true en cas de succès.
 * @returns L'élément JSX rendu.
 */
const ClientDirectoryRecordDangerMenu = ({
  recordKind,
  recordName,
  deleteLabel,
  isDeleting,
  onConfirmDelete
}: ClientDirectoryRecordDangerMenuProps) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmationInputId = useId();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteRelatedInteractions, setDeleteRelatedInteractions] = useState(true);
  const [confirmationValue, setConfirmationValue] = useState('');
  const kindLabel = RECORD_KIND_LABEL[recordKind];
  const canConfirm = confirmationValue.trim() === recordName.trim() && recordName.trim().length > 0;

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (open) {
      setDeleteRelatedInteractions(true);
      setConfirmationValue('');
    }
  };

  const handleConfirmDelete = async () => {
    if (!canConfirm || isDeleting) return;
    const deleted = await onConfirmDelete(deleteRelatedInteractions);
    if (deleted) {
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            size="sm"
            className="border-border px-2 text-muted-foreground hover:text-foreground"
            aria-label="Plus d'actions"
          >
            <MoreVertical aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
            onSelect={() => {
              handleDeleteDialogOpenChange(true);
            }}
          >
            <Trash2 aria-hidden="true" />
            {deleteLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{`Supprimer définitivement ce ${kindLabel} ?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {`La fiche ${kindLabel} « ${recordName} » sera retirée de la base. Cette action est irréversible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 rounded-md border border-border bg-surface-1/60 p-3 text-sm">
            <p>
              <span className="font-medium text-foreground">Supprimé avec la fiche :</span>{' '}
              tous les contacts qui y sont rattachés.
            </p>
            <p>
              <span className="font-medium text-foreground">
                {deleteRelatedInteractions ? 'Supprimé également :' : 'Conservé :'}
              </span>{' '}
              {deleteRelatedInteractions
                ? `toutes les interactions rattachées à ce ${kindLabel}.`
                : `les interactions rattachées, qui restent enregistrées mais perdent leur lien avec ce ${kindLabel}.`}
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-md border border-border bg-surface-1/60 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-destructive"
              checked={deleteRelatedInteractions}
              onChange={(event) => {
                setDeleteRelatedInteractions(event.target.checked);
              }}
            />
            <span>{`Supprimer aussi toutes les interactions rattachées à ce ${kindLabel}.`}</span>
          </label>

          <div className="space-y-1.5">
            <label htmlFor={confirmationInputId} className="block text-sm text-muted-foreground">
              {`Pour confirmer, saisissez le nom exact de la fiche : `}
              <span className="font-medium text-foreground">{recordName}</span>
            </label>
            <Input
              id={confirmationInputId}
              value={confirmationValue}
              autoComplete="off"
              tone="destructive"
              placeholder="Nom de la fiche"
              onChange={(event) => {
                setConfirmationValue(event.target.value);
              }}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canConfirm || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {isDeleting ? 'Suppression…' : deleteLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClientDirectoryRecordDangerMenu;
