import { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import InteractionDetails from '@/components/InteractionDetails';

type DashboardDetailsOverlayProps = {
  interaction: Interaction;
  statuses: AgencyStatus[];
  onClose: () => void;
  onUpdate: (interaction: Interaction, event: TimelineEvent, updates?: InteractionUpdate) => Promise<void>;
  onRequestConvert: (interaction: Interaction) => void;
};

const DashboardDetailsOverlay = ({
  interaction,
  statuses,
  onClose,
  onUpdate,
  onRequestConvert
}: DashboardDetailsOverlayProps) => {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 transition-opacity"
        onClick={onClose}
        aria-label="Fermer le panneau d'interaction"
      />
      <InteractionDetails
        interaction={interaction}
        onClose={onClose}
        onUpdate={onUpdate}
        statuses={statuses}
        onRequestConvert={onRequestConvert}
      />
    </>
  );
};

export default DashboardDetailsOverlay;
