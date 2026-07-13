import { Inbox } from 'lucide-react';

import type { Interaction } from '@/types';
import type { MyDayView } from '@/utils/dashboard/dashboardAggregates';
import MyDayGroup from './myday/MyDayGroup';
import { MY_DAY_GROUPS } from './myday/myDayGroupsConfig';

type DashboardMyDayProps = {
  view: MyDayView;
  activeInteractionId?: string | null;
  isUpdatePending: boolean;
  onSelectInteraction: (interaction: Interaction) => void;
  onCompleteReminder: (interaction: Interaction) => void;
  onPostponeReminder: (interaction: Interaction, daysAhead: number) => void;
};

const DashboardMyDay = ({
  view,
  activeInteractionId,
  isUpdatePending,
  onSelectInteraction,
  onCompleteReminder,
  onPostponeReminder
}: DashboardMyDayProps) => {
  const isQueueEmpty = MY_DAY_GROUPS.every((group) => view.groups[group.key].length === 0);

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-5 overflow-y-auto px-0.5 pt-4 pb-6"
      data-testid="dashboard-myday"
    >
      {isQueueEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 px-4 text-center shadow-soft">
          <span className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-success/10">
            <Inbox size={18} className="text-success" aria-hidden="true" />
          </span>
          <p className="text-[13px] font-semibold text-foreground">Tout est à jour</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Aucune relance en attente ni dossier à planifier.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {MY_DAY_GROUPS.map((group) => (
            <MyDayGroup
              key={group.key}
              config={group}
              interactions={view.groups[group.key]}
              activeInteractionId={activeInteractionId}
              isUpdatePending={isUpdatePending}
              onSelectInteraction={onSelectInteraction}
              onCompleteReminder={onCompleteReminder}
              onPostponeReminder={onPostponeReminder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardMyDay;
