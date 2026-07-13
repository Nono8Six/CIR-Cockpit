import type { MyDayGroups } from '@/utils/dashboard/dashboardAggregates';

export type MyDayGroupKey = keyof MyDayGroups;

export type MyDayGroupConfig = {
  key: MyDayGroupKey;
  label: string;
  hint: string;
  labelClassName: string;
  dotClassName: string;
};

// Ordre d'affichage de la file : du plus urgent au moins urgent.
// Vocabulaire explicite : chaque libelle dit ce que l'utilisateur doit en faire.
export const MY_DAY_GROUPS: MyDayGroupConfig[] = [
  {
    key: 'overdue',
    label: 'Relances en retard',
    hint: 'À rattraper en priorité',
    labelClassName: 'text-destructive',
    dotClassName: 'bg-destructive'
  },
  {
    key: 'dueToday',
    label: "À faire aujourd'hui",
    hint: 'Rappels prévus pour la journée',
    labelClassName: 'text-warning-foreground',
    dotClassName: 'bg-warning'
  },
  {
    key: 'upcoming',
    label: 'Prochaines relances',
    hint: 'Rappels planifiés à venir',
    labelClassName: 'text-foreground/80',
    dotClassName: 'bg-success/70'
  },
  {
    key: 'toPlan',
    label: 'Sans rappel planifié',
    hint: 'Dossiers à traiter, aucune relance posée',
    labelClassName: 'text-foreground/80',
    dotClassName: 'bg-muted-foreground/45'
  }
];
