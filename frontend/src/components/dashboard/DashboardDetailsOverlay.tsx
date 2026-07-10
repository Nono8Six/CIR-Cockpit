import type {
  AgencyStatus,
  Interaction,
  InteractionUpdate,
  TimelineEvent
} from '@/types';
import InteractionDetails from '@/components/InteractionDetails';
import { getInteractionDisplayName } from '@/utils/interactions/getInteractionDisplayName';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '../ui/feedback/Dialog';

type DashboardDetailsOverlayProps = {
  interaction: Interaction;
  statuses: AgencyStatus[];
  historicalStatuses?: AgencyStatus[];
  onClose: () => void;
  onUpdate: (
    interaction: Interaction,
    event: TimelineEvent,
    updates?: InteractionUpdate
  ) => Promise<void>;
  onRequestConvert: (interaction: Interaction) => void;
  onDeleteInteraction: (interaction: Interaction) => void;
};

const DashboardDetailsOverlay = ({
  interaction,
  statuses,
  historicalStatuses = [],
  onClose,
  onUpdate,
  onRequestConvert,
  onDeleteInteraction
}: DashboardDetailsOverlayProps) => (
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
      overlayClassName="bg-neutral-950/20 backdrop-blur-sm"
      className="flex h-[min(85vh,780px)] w-[min(95vw,720px)] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl border border-border p-0 shadow-2xl shadow-neutral-900/8"
      data-testid="dashboard-details-dialog"
    >
      <DialogTitle className="sr-only">
        {`Détails de l'interaction ${getInteractionDisplayName(interaction)}`}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Consulter le dossier, mettre à jour le statut et ajouter des notes.
      </DialogDescription>
      <InteractionDetails
        interaction={interaction}
        onClose={onClose}
        onUpdate={onUpdate}
        statuses={statuses}
        historicalStatuses={historicalStatuses}
        onRequestConvert={onRequestConvert}
        onDeleteInteraction={onDeleteInteraction}
      />
    </DialogContent>
  </Dialog>
);

export default DashboardDetailsOverlay;
