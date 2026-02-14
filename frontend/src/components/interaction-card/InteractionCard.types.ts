import type { AgencyStatus, Interaction, StatusCategory } from '@/types';

export type InteractionCardProps = {
  data: Interaction;
  statusMeta?: AgencyStatus;
};

export type InteractionCardComputedState = {
  isDone: boolean;
  isLate: boolean;
  statusTone: StatusCategory;
  statusLabel: string;
  statusClass: string;
};
