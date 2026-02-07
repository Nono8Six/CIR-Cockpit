import type { ReactNode } from 'react';

import type { Interaction } from '@/types';

export type DashboardListRowProps = {
  item: Interaction;
  getChannelIcon: (channel: string) => ReactNode;
  getStatusBadgeClass: (interaction: Interaction) => string;
  onSelectInteraction: (interaction: Interaction) => void;
};
