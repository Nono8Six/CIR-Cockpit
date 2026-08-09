import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import InteractionDetails from '@/components/InteractionDetails';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/feedback/Dialog';

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
  <Dialog
    open
    onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}
  >
    <DialogContent
      showCloseButton={false}
      className="h-[90dvh] w-[min(96vw,72rem)] max-w-none overflow-hidden border-border p-0"
      data-testid="client-interaction-details-sheet"
    >
      <DialogHeader className="sr-only">
        <DialogTitle>Détail de l’activité {interaction.company_name}</DialogTitle>
        <DialogDescription>
          Consulter l’activité, son origine, ses participants et son historique.
        </DialogDescription>
      </DialogHeader>
      <InteractionDetails
        interaction={interaction}
        historicalStatuses={historicalStatuses}
        statuses={statuses}
        onClose={onClose}
        onDeleteInteraction={onDeleteInteraction}
        onRequestConvert={onRequestConvert}
        onUpdate={onUpdate}
      />
    </DialogContent>
  </Dialog>
);

export default ClientDirectoryInteractionDetailsSheet;
