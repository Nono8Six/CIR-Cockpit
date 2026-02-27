import type {
  AgencyStatus,
  Interaction,
  InteractionUpdate,
  TimelineEvent
} from '@/types';
import InteractionDetails from '@/components/InteractionDetails';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';

type DashboardDetailsOverlayProps = {
  interaction: Interaction;
  statuses: AgencyStatus[];
  onClose: () => void;
  onUpdate: (
    interaction: Interaction,
    event: TimelineEvent,
    updates?: InteractionUpdate
  ) => Promise<void>;
  onRequestConvert: (interaction: Interaction) => void;
};

const DashboardDetailsOverlay = ({
  interaction,
  statuses,
  onClose,
  onUpdate,
  onRequestConvert
}: DashboardDetailsOverlayProps) => (
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
      data-testid="dashboard-details-sheet"
    >
      <SheetHeader className="sr-only">
        <SheetTitle>Details interaction {interaction.company_name}</SheetTitle>
        <SheetDescription>
          Consulter le dossier, mettre a jour le statut et ajouter des notes.
        </SheetDescription>
      </SheetHeader>
      <InteractionDetails
        interaction={interaction}
        onClose={onClose}
        onUpdate={onUpdate}
        statuses={statuses}
        onRequestConvert={onRequestConvert}
      />
    </SheetContent>
  </Sheet>
);

export default DashboardDetailsOverlay;
