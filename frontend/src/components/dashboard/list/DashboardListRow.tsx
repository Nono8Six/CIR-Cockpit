import { ChevronRight, Trash2 } from 'lucide-react';

import { Button } from '../../ui/inputs/basic/Button';
import { TableCell, TableRow } from '../../ui/data-display/Table';
import { formatDate } from '@/utils/date/formatDate';
import { formatTime } from '@/utils/date/formatTime';
import DashboardFamilyBadges from './DashboardFamilyBadges';
import type { DashboardListRowProps } from './DashboardListRow.types';

const DashboardListRow = ({
  item,
  getChannelIcon,
  getStatusBadgeClass,
  onSelectInteraction,
  onDeleteInteraction,
  activeInteractionId
}: DashboardListRowProps) => {
  const isActive = activeInteractionId === item.id;

  return (
    <TableRow 
      className={`group/row transition-colors duration-150 relative border-b border-border/60 ${
        isActive 
          ? 'bg-primary/[0.03] hover:bg-primary/[0.03] border-l-2 border-l-primary' 
          : 'hover:bg-muted/50'
      }`}
    >
      <TableCell className="px-3 py-2 text-xs font-mono font-medium text-muted-foreground tabular-nums">
        <div className="flex flex-col">
          <span>{formatDate(item.last_action_at)}</span>
          <span className="text-[10px] text-muted-foreground/60">{formatTime(item.last_action_at)}</span>
        </div>
      </TableCell>
      <TableCell className="px-3 py-2 text-center">
        <span className="inline-flex items-center justify-center opacity-85">{getChannelIcon(item.channel)}</span>
      </TableCell>
      <TableCell className="px-3 py-2">
        <span
          className={`inline-flex max-w-full items-center truncate rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(item)}`}
        >
          {item.status}
        </span>
      </TableCell>
      <TableCell className="px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground/90">{item.company_name}</p>
          <p className="truncate text-[9.5px] text-muted-foreground/80 font-mono tabular-nums leading-normal">
            {item.contact_name}
            {(item.contact_phone || item.contact_email) && ` · ${item.contact_phone ?? item.contact_email}`}
          </p>
        </div>
      </TableCell>
      <TableCell className="px-3 py-2">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs text-foreground/90">{item.subject}</p>
          <DashboardFamilyBadges families={item.mega_families} />
        </div>
      </TableCell>
      <TableCell className="px-3 py-2 text-right">
        {item.order_ref && (
          <span className="inline-flex max-w-full items-center truncate rounded border border-border/40 bg-muted/45 px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted-foreground/80">
            #{item.order_ref}
          </span>
        )}
      </TableCell>
      <TableCell className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-destructive/80 hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
            onClick={() => onDeleteInteraction(item)}
            aria-label={`Supprimer ${item.company_name}`}
          >
            <Trash2 size={12} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="dense"
            className="h-7 text-xs text-primary hover:text-primary"
            onClick={() => onSelectInteraction(item)}
            aria-label={`Ouvrir ${item.company_name}`}
          >
            Ouvrir
            <ChevronRight size={12} aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default DashboardListRow;
