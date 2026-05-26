import type { ReactNode } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';

import { Button } from '../ui/inputs/basic/Button';
import {
  Table,
  TableBody,
  TableHeader
} from '../ui/data-display/Table';
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
  onDeleteInteraction: (interaction: Interaction) => void;
  activeInteractionId?: string | null;
};

type DashboardListMobileCardProps = {
  item: Interaction;
  getChannelIcon: (channel: string) => ReactNode;
  getStatusBadgeClass: (interaction: Interaction) => string;
  onSelectInteraction: (interaction: Interaction) => void;
  onDeleteInteraction: (interaction: Interaction) => void;
  activeInteractionId?: string | null;
};

const DashboardListMobileCard = ({
  item,
  getChannelIcon,
  getStatusBadgeClass,
  onSelectInteraction,
  onDeleteInteraction,
  activeInteractionId
}: DashboardListMobileCardProps) => {
  const isActive = activeInteractionId === item.id;

  return (
    <article className={`space-y-2 px-4 py-3.5 border-l-2 transition-[background-color,border-color] duration-150 ${
      isActive 
        ? 'bg-primary/5 border-l-primary/70' 
        : 'border-l-transparent hover:bg-surface-1/40'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground/80">
            {getChannelIcon(item.channel)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground/90">{item.company_name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{item.contact_name}</p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(item)}`}
        >
          {item.status}
        </span>
      </div>
      <p className="line-clamp-2 text-xs text-foreground/85">{item.subject}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] text-muted-foreground/80 tabular-nums">
          {formatDate(item.last_action_at)} à {formatTime(item.last_action_at)}
        </p>
        {item.order_ref && (
          <span className="truncate rounded border border-border/40 bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted-foreground">
            #{item.order_ref}
          </span>
        )}
      </div>
      <DashboardFamilyBadges families={item.mega_families} />
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="dense"
          className="h-8 flex-1 justify-between text-xs text-primary hover:text-primary"
          onClick={() => onSelectInteraction(item)}
          aria-label={`Ouvrir ${item.company_name}`}
        >
          Ouvrir les détails
          <ChevronRight size={12} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          onClick={() => onDeleteInteraction(item)}
          aria-label={`Supprimer ${item.company_name}`}
        >
          <Trash2 size={12} aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
};

const DashboardList = ({
  rows,
  getChannelIcon,
  getStatusBadgeClass,
  onSelectInteraction,
  onDeleteInteraction,
  activeInteractionId
}: DashboardListProps) => (
  <div className="h-full min-h-0 overflow-y-auto pt-3 pb-3 px-0" data-testid="dashboard-list">
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
      <div className="divide-y divide-border/60 md:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs text-muted-foreground">
            Aucune interaction trouvée.
          </div>
        ) : (
          rows.map((item) => (
            <DashboardListMobileCard
              key={item.id}
              item={item}
              getChannelIcon={getChannelIcon}
              getStatusBadgeClass={getStatusBadgeClass}
              onSelectInteraction={onSelectInteraction}
              onDeleteInteraction={onDeleteInteraction}
              activeInteractionId={activeInteractionId}
            />
          ))
        )}
      </div>

      <div className="hidden md:block">
        <Table className="w-full table-fixed">
          <TableHeader>
            <DashboardListHeader />
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
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
                  onDeleteInteraction={onDeleteInteraction}
                  activeInteractionId={activeInteractionId}
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
