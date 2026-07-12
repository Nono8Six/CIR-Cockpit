import type { MyDayGroups } from '@/utils/dashboard/dashboardAggregates';

export type MyDayGroupKey = keyof MyDayGroups;

export type MyDayGroupConfig = {
  key: MyDayGroupKey;
  label: string;
  labelClassName: string;
  dotClassName: string;
};

// Ordre d'affichage de la file : du plus urgent au moins urgent.
export const MY_DAY_GROUPS: MyDayGroupConfig[] = [
  { key: 'overdue', label: 'En retard', labelClassName: 'text-destructive', dotClassName: 'bg-destructive' },
  { key: 'dueToday', label: "Aujourd'hui", labelClassName: 'text-warning-foreground', dotClassName: 'bg-warning' },
  { key: 'upcoming', label: 'À venir (72 h)', labelClassName: 'text-foreground/80', dotClassName: 'bg-success/70' },
  { key: 'toPlan', label: 'À planifier', labelClassName: 'text-foreground/80', dotClassName: 'bg-muted-foreground/50' },
  { key: 'later', label: 'Plus tard', labelClassName: 'text-muted-foreground', dotClassName: 'bg-muted-foreground/30' }
];
