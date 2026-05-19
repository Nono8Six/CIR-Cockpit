import { useState } from 'react';
import { Save, Star, Trash2 } from 'lucide-react';
import type {
  DirectorySavedView,
  DirectorySavedViewSaveInput,
  DirectorySavedViewState
} from '../../../../shared/schemas/system/directory.schema';

import { Badge } from '../ui/data-display/Badge';
import { Button } from '../ui/inputs/basic/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/feedback/Dialog';
import { Input } from '../ui/inputs/basic/Input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/navigation/Popover';

interface DirectorySavedViewsBarProps {
  views: DirectorySavedView[];
  currentState: DirectorySavedViewState;
  isLoading: boolean;
  isMutating: boolean;
  triggerLabel?: string;
  title?: string;
  description?: string;
  saveButtonLabel?: string;
  emptyLabel?: string;
  createDialogTitle?: string;
  updateDialogTitle?: string;
  dialogDescription?: string;
  onApplyView: (view: DirectorySavedView) => void;
  onSaveView: (input: DirectorySavedViewSaveInput) => Promise<void>;
  onDeleteView: (viewId: string) => Promise<void>;
  onSetDefaultView: (viewId: string) => Promise<void>;
}

type SaveDialogState = {
  id?: string;
  name: string;
  isDefault: boolean;
};

const EMPTY_DIALOG_STATE: SaveDialogState = {
  name: '',
  isDefault: false
};

const DirectorySavedViewsBar = ({
  views,
  currentState,
  isLoading,
  isMutating,
  triggerLabel = 'Vues',
  title = 'Mes vues',
  description = 'Appliquez, mettez à jour ou définissez une vue par défaut.',
  saveButtonLabel = "Sauvegarder l'état actuel",
  emptyLabel = 'Aucune vue sauvegardée pour le moment.',
  createDialogTitle = 'Sauvegarder une vue',
  updateDialogTitle = 'Mettre à jour la vue',
  dialogDescription = 'Le nom, le tri, les filtres, la densité et les colonnes visibles seront conservés.',
  onApplyView,
  onSaveView,
  onDeleteView,
  onSetDefaultView
}: DirectorySavedViewsBarProps) => {
  const [dialogState, setDialogState] = useState<SaveDialogState>(EMPTY_DIALOG_STATE);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openCreateDialog = () => {
    setDialogState({
      name: '',
      isDefault: false
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (view: DirectorySavedView) => {
    setDialogState({
      id: view.id,
      name: view.name,
      isDefault: view.is_default
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const trimmedName = dialogState.name.trim();
    if (!trimmedName) {
      return;
    }

    await onSaveView({
      id: dialogState.id,
      name: trimmedName,
      is_default: dialogState.isDefault,
      state: currentState
    });
    setIsDialogOpen(false);
    setDialogState(EMPTY_DIALOG_STATE);
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="dense" className="h-9 rounded-md px-3 text-sm shadow-none">
            {triggerLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[360px] space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          </div>
          <Button type="button" variant="default" size="sm" className="w-full" onClick={openCreateDialog}>
            <Save className="size-4" />
            {saveButtonLabel}
          </Button>
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement des vues…</p>
            ) : null}
            {!isLoading && views.length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptyLabel}</p>
            ) : null}
            {views.map((view) => (
              <div
                key={view.id}
                className="rounded-lg border border-border/60 bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => onApplyView(view)}
                  >
                    <p className="truncate text-sm font-medium text-foreground">{view.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {view.is_default ? 'Vue par défaut' : 'Vue privée'}
                    </p>
                  </button>
                  {view.is_default ? <Badge variant="secondary">Défaut</Badge> : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onApplyView(view)}>
                    Utiliser
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(view)}>
                    Mettre à jour
                  </Button>
                  <Button
                    type="button"
                    variant={view.is_default ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => void onSetDefaultView(view.id)}
                  >
                    <Star className="size-4" />
                    {view.is_default ? 'Déjà par défaut' : 'Par défaut'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={isMutating}
                    onClick={() => void onDeleteView(view.id)}
                  >
                    <Trash2 className="size-4" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.id ? updateDialogTitle : createDialogTitle}
            </DialogTitle>
            <DialogDescription>
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={dialogState.name}
              onChange={(event) => setDialogState((previous) => ({
                ...previous,
                name: event.target.value
              }))}
              placeholder="Nom de la vue"
              aria-label="Nom de la vue sauvegardée"
              maxLength={60}
            />
            <Button
              type="button"
              variant={dialogState.isDefault ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDialogState((previous) => ({
                ...previous,
                isDefault: !previous.isDefault
              }))}
            >
              {dialogState.isDefault ? 'Vue par défaut activée' : 'Définir comme vue par défaut'}
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={isMutating || !dialogState.name.trim()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DirectorySavedViewsBar;
