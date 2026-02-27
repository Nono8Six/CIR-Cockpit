import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHeader
} from '@/components/ui/table';
import type { Interaction } from '@/types';
import { formatDate } from '@/utils/date/formatDate';
import { formatTime } from '@/utils/date/formatTime';
import DashboardFamilyBadges from './list/DashboardFamilyBadges';
import DashboardListEmptyRow from './list/DashboardListEmptyRow';
import DashboardListHeader from './list/DashboardListHeader';
import DashboardListRow from './list/DashboardListRow';

type DashboardListProps = {
  rows: Interaction[];
  getChannelIcon: (channel: string) => ReactNode;
  getStatusBadgeClass: (interaction: Interaction) => string;
  onSelectInteraction: (interaction: Interaction) => void;
};

type DashboardListMobileCardProps = {
  item: Interaction;
  getChannelIcon: (channel: string) => ReactNode;
  getStatusBadgeClass: (interaction: Interaction) => string;
  onSelectInteraction: (interaction: Interaction) => void;
};

const DashboardListMobileCard = ({
  item,
  getChannelIcon,
  getStatusBadgeClass,
  onSelectInteraction
}: DashboardListMobileCardProps) => (
  <article className="space-y-2 px-3 py-3">
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
          {getChannelIcon(item.channel)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{item.company_name}</p>
          <p className="truncate text-xs text-muted-foreground">{item.contact_name}</p>
        </div>
      </div>
      <span
        className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-xs font-semibold uppercase ${getStatusBadgeClass(item)}`}
      >
        {item.status}
      </span>
    </div>
    <p className="line-clamp-2 text-sm text-foreground">{item.subject}</p>
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        {formatDate(item.last_action_at)} a {formatTime(item.last_action_at)}
      </p>
      {item.order_ref && (
        <span className="truncate rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          #{item.order_ref}
        </span>
      )}
    </div>
    <DashboardFamilyBadges families={item.mega_families} />
    <Button
      type="button"
      variant="ghost"
      size="dense"
      className="h-8 w-full justify-between text-primary hover:text-primary"
      onClick={() => onSelectInteraction(item)}
      aria-label={`Ouvrir ${item.company_name}`}
    >
      Ouvrir les details
      <ChevronRight size={14} aria-hidden="true" />
    </Button>
  </article>
);

const DashboardList = ({
  rows,
  getChannelIcon,
  getStatusBadgeClass,
  onSelectInteraction
}: DashboardListProps) => (
  <div className="h-full min-h-0 overflow-y-auto p-3 sm:p-4" data-testid="dashboard-list">
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="divide-y divide-border/70 md:hidden">
        {rows.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">
            Aucune interaction trouvee.
          </div>
        ) : (
          rows.map((item) => (
            <DashboardListMobileCard
              key={item.id}
              item={item}
              getChannelIcon={getChannelIcon}
              getStatusBadgeClass={getStatusBadgeClass}
              onSelectInteraction={onSelectInteraction}
            />
          ))
        )}
      </div>

      <div className="hidden md:block">
        <Table className="w-full table-fixed">
          <TableHeader>
            <DashboardListHeader />
          </TableHeader>
          <TableBody className="divide-y divide-border/70">
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
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
);

export default DashboardList;
