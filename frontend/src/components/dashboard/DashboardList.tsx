import type { ReactNode } from 'react';

import type { Interaction } from '@/types';
import DashboardListHeader from './list/DashboardListHeader';
import DashboardListEmptyRow from './list/DashboardListEmptyRow';
import DashboardListRow from './list/DashboardListRow';

type DashboardListProps = {
  rows: Interaction[];
  getChannelIcon: (channel: string) => ReactNode;
  getStatusBadgeClass: (interaction: Interaction) => string;
  onSelectInteraction: (interaction: Interaction) => void;
};

const DashboardList = ({
  rows,
  getChannelIcon,
  getStatusBadgeClass,
  onSelectInteraction
}: DashboardListProps) => (
  <div className="h-full overflow-auto p-6">
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <DashboardListHeader />
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <DashboardListEmptyRow />
          ) : (
            rows.map((item) => (
              <DashboardListRow
                key={item.id}
                item={item}
                getChannelIcon={getChannelIcon}
                getStatusBadgeClass={getStatusBadgeClass}
                onSelectInteraction={onSelectInteraction}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default DashboardList;
