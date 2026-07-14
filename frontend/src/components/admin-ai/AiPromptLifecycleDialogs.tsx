import type { AiPromptWithVersions } from '../../../../shared/schemas/ai.schema';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/feedback/AlertDialog';

type LifecycleTarget = AiPromptWithVersions | null;

type AiPromptLifecycleDialogsProps = {
  archiveTarget: LifecycleTarget;
  deleteTarget: LifecycleTarget;
  onCloseArchive: () => void;
  onCloseDelete: () => void;
  onConfirmArchive: () => void;
  onConfirmDelete: () => void;
  isArchiving: boolean;
  isDeleting: boolean;
};

export const AiPromptLifecycleDialogs = ({
  archiveTarget,
  deleteTarget,
  onCloseArchive,
  onCloseDelete,
  onConfirmArchive,
  onConfirmDelete,
  isArchiving,
  isDeleting,
}: AiPromptLifecycleDialogsProps) => (
  <>
    <AlertDialog
      open={archiveTarget !== null}
      onOpenChange={(open) => {
        if (!open) onCloseArchive();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {archiveTarget?.archived_at ? 'Restaurer ce template ?' : 'Archiver ce template ?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {archiveTarget?.archived_at
              ? 'Le template redeviendra disponible pour son utilisation et son édition.'
              : 'Le template ne sera plus sélectionné par le backend. Ses versions, coûts et usages resteront consultables.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={isArchiving}
            onClick={onConfirmArchive}
          >
            {archiveTarget?.archived_at ? 'Restaurer' : 'Archiver'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      open={deleteTarget !== null}
      onOpenChange={(open) => {
        if (!open) onCloseDelete();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer définitivement ce template ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action supprime le template et toutes ses versions. Elle est autorisée uniquement
            pour un template archivé qui n’a jamais été utilisé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-foreground">
          <p className="font-semibold">{deleteTarget?.label}</p>
          <p className="mt-1 text-muted-foreground">Cette suppression est irréversible.</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
            onClick={onConfirmDelete}
          >
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
);
