import type { MyDayView } from '@/utils/dashboard/dashboardAggregates';
import { formatTime } from '@/utils/date/formatTime';
import { toDate } from '@/utils/date/toDate';

type MyDayKpiStripProps = {
  view: MyDayView;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const buildOverdueContext = (view: MyDayView): string => {
  const oldest = view.groups.overdue[0];
  if (!oldest?.reminder_at) {
    return 'Rien en attente';
  }

  const lateDays = Math.floor((Date.now() - toDate(oldest.reminder_at).getTime()) / DAY_MS);
  return lateDays >= 1 ? `La plus ancienne : J+${lateDays}` : "Échéance aujourd'hui";
};

const buildDueTodayContext = (view: MyDayView): string => {
  const next = view.groups.dueToday[0];
  return next?.reminder_at ? `Prochaine à ${formatTime(next.reminder_at)}` : 'Journée dégagée';
};

const MyDayKpiStrip = ({ view }: MyDayKpiStripProps) => {
  const { kpis, groups } = view;
  const tiles = [
    {
      key: 'overdue',
      label: 'Relances en retard',
      value: String(kpis.overdueCount),
      context: buildOverdueContext(view),
      isAlert: kpis.overdueCount > 0
    },
    {
      key: 'due-today',
      label: "À traiter aujourd'hui",
      value: String(kpis.dueTodayCount),
      context: buildDueTodayContext(view),
      isAlert: false
    },
    {
      key: 'open',
      label: 'Dossiers ouverts',
      value: String(kpis.openCount),
      context:
        groups.toPlan.length > 0
          ? `Dont ${groups.toPlan.length} sans rappel`
          : 'Tous les rappels sont posés',
      isAlert: false
    },
    {
      key: 'average-age',
      label: 'Âge moyen',
      value: kpis.averageOpenAgeDays === null ? '—' : `${kpis.averageOpenAgeDays} j`,
      context: 'Depuis la création des dossiers',
      isAlert: false
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" data-testid="dashboard-myday-kpis">
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="rounded-xl border border-border bg-card px-4 py-3 shadow-soft"
          data-testid={`dashboard-myday-kpi-${tile.key}`}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            {tile.isAlert ? (
              <span className="size-1.5 rounded-full bg-destructive" aria-hidden="true" />
            ) : null}
            {tile.label}
          </p>
          <p
            className={`mt-1 font-mono text-[22px] font-bold leading-none tabular-nums ${
              tile.isAlert ? 'text-destructive' : 'text-foreground'
            }`}
          >
            {tile.value}
          </p>
          <p className="mt-1.5 truncate text-[11px] leading-tight text-muted-foreground/75">
            {tile.context}
          </p>
        </div>
      ))}
    </div>
  );
};

export default MyDayKpiStrip;
