import type { Interaction } from '@/types';
import MyDayRow from './MyDayRow';
import type { MyDayGroupConfig } from './myDayGroupsConfig';

type MyDayGroupProps = {
  config: MyDayGroupConfig;
  interactions: Interaction[];
  activeInteractionId?: string | null;
  isUpdatePending: boolean;
  onSelectInteraction: (interaction: Interaction) => void;
  onCompleteReminder: (interaction: Interaction) => void;
  onPostponeReminder: (interaction: Interaction, daysAhead: number) => void;
};

const MyDayGroup = ({
  config,
  interactions,
  activeInteractionId,
  isUpdatePending,
  onSelectInteraction,
  onCompleteReminder,
  onPostponeReminder
}: MyDayGroupProps) => {
  if (interactions.length === 0) {
    return null;
  }

  return (
    <section aria-label={config.label} data-testid={`dashboard-myday-group-${config.key}`}>
      <div className="mb-2 flex items-baseline gap-2 px-1">
        <h3
          className={`flex items-center gap-2 text-[12px] font-semibold ${config.labelClassName}`}
        >
          <span className={`size-1.5 rounded-full ${config.dotClassName}`} aria-hidden="true" />
          {config.label}
          <span className="font-mono text-[11px] font-medium tabular-nums text-muted-foreground/60">
            {interactions.length}
          </span>
        </h3>
        <span className="hidden text-[11px] text-muted-foreground/70 sm:inline">{config.hint}</span>
      </div>
      <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        {interactions.map((interaction) => (
          <MyDayRow
            key={interaction.id}
            interaction={interaction}
            groupKey={config.key}
            isActive={activeInteractionId === interaction.id}
            isUpdatePending={isUpdatePending}
            onSelect={onSelectInteraction}
            onComplete={onCompleteReminder}
            onPostpone={onPostponeReminder}
          />
        ))}
      </div>
    </section>
  );
};

export default MyDayGroup;
