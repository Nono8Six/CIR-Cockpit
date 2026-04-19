import { ArrowLeftRight, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export interface ClientDirectoryRecordActionsBarProps {
  isProspect: boolean;
  canDeleteRecord: boolean;
  deleteLabel: string;
  relativeNavigation: {
    previousDisabled: boolean;
    nextDisabled: boolean;
    onOpenPrevious?: () => void;
    onOpenNext?: () => void;
  } | null | undefined;
  onEditClient: () => void;
  onEditProspect: () => void;
  onConvertProspect: () => void;
  onRequestDelete: () => void;
}

const ClientDirectoryRecordActionsBar = ({
  isProspect,
  canDeleteRecord,
  deleteLabel,
  relativeNavigation,
  onEditClient,
  onEditProspect,
  onConvertProspect,
  onRequestDelete,
}: ClientDirectoryRecordActionsBarProps) => (
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
          <Button type="button" variant="outline" size="sm" onClick={onEditProspect}>
            Modifier
          </Button>
          {canDeleteRecord ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onRequestDelete}
            >
              <Trash2 size={14} />
              {deleteLabel}
            </Button>
          ) : null}
          <Button type="button" size="sm" className="gap-2" onClick={onConvertProspect}>
            <ArrowLeftRight size={14} />
            Convertir en client
          </Button>
        </>
      ) : (
        <>
          <Button type="button" size="sm" onClick={onEditClient}>
            Modifier
          </Button>
          {canDeleteRecord ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onRequestDelete}
            >
              <Trash2 size={14} />
              {deleteLabel}
            </Button>
          ) : null}
        </>
      )}
    </div>
  </div>
);

export default ClientDirectoryRecordActionsBar;
