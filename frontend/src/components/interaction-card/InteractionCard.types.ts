import type { AgencyStatus, Interaction } from '@/types';

export type InteractionCardProps = {
  data: Interaction;
  statusMeta?: AgencyStatus;
};

export type InteractionCardComputedState = {
  isDone: boolean;
  isLate: boolean;
  statusLabel: string;
  statusClass: string;
};
