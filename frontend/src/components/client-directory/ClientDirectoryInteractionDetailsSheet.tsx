import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import InteractionDetails from '@/components/InteractionDetails';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '../ui/feedback/Sheet';

export interface ClientDirectoryInteractionDetailsSheetProps {
  historicalStatuses: AgencyStatus[];
  interaction: Interaction;
  statuses: AgencyStatus[];
  onClose: () => void;
  onDeleteInteraction: (interaction: Interaction) => void;
  onRequestConvert: (interaction: Interaction) => void;
  onUpdate: (
    interaction: Interaction,
    event: TimelineEvent,
    updates?: InteractionUpdate
  ) => Promise<void> | void;
}

const ClientDirectoryInteractionDetailsSheet = ({
  historicalStatuses,
  interaction,
  statuses,
  onClose,
  onDeleteInteraction,
  onRequestConvert,
  onUpdate
}: ClientDirectoryInteractionDetailsSheetProps) => (
  <Sheet
    open
    onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}
  >
    <SheetContent
      side="right"
      showCloseButton={false}
      className="w-full border-l border-border p-0 sm:max-w-2xl"
      data-testid="client-interaction-details-sheet"
    >
      <SheetHeader className="sr-only">
        <SheetTitle>Détail interaction {interaction.company_name}</SheetTitle>
        <SheetDescription>
          Consulter le dossier, mettre à jour le statut et ajouter des notes.
        </SheetDescription>
      </SheetHeader>
      <InteractionDetails
        interaction={interaction}
        historicalStatuses={historicalStatuses}
        statuses={statuses}
        onClose={onClose}
        onDeleteInteraction={onDeleteInteraction}
        onRequestConvert={onRequestConvert}
        onUpdate={onUpdate}
      />
    </SheetContent>
  </Sheet>
);

export default ClientDirectoryInteractionDetailsSheet;
