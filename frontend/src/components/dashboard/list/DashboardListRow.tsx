import { ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatDate } from '@/utils/date/formatDate';
import { formatTime } from '@/utils/date/formatTime';
import DashboardFamilyBadges from './DashboardFamilyBadges';
import type { DashboardListRowProps } from './DashboardListRow.types';

const DashboardListRow = ({
  item,
  getChannelIcon,
  getStatusBadgeClass,
  onSelectInteraction
}: DashboardListRowProps) => (
  <TableRow className="hover:bg-surface-1">
    <TableCell className="px-3 py-2 text-xs font-medium text-muted-foreground">
      <div className="flex flex-col">
        <span>{formatDate(item.last_action_at)}</span>
        <span className="text-[11px] text-muted-foreground">{formatTime(item.last_action_at)}</span>
      </div>
    </TableCell>
    <TableCell className="px-3 py-2 text-center">
      <span className="inline-flex items-center justify-center">{getChannelIcon(item.channel)}</span>
    </TableCell>
    <TableCell className="px-3 py-2">
      <span
        className={`inline-flex max-w-full items-center truncate rounded border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(item)}`}
      >
        {item.status}
      </span>
    </TableCell>
    <TableCell className="px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{item.company_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.contact_name}
          {(item.contact_phone || item.contact_email) && ` · ${item.contact_phone ?? item.contact_email}`}
        </p>
      </div>
    </TableCell>
    <TableCell className="px-3 py-2">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm text-foreground">{item.subject}</p>
        <DashboardFamilyBadges families={item.mega_families} />
      </div>
    </TableCell>
    <TableCell className="px-3 py-2 text-right">
      {item.order_ref && (
        <span className="inline-flex max-w-full items-center truncate rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          #{item.order_ref}
        </span>
      )}
    </TableCell>
    <TableCell className="px-3 py-2 text-right">
      <Button
        type="button"
        variant="ghost"
        size="dense"
        className="h-8 text-primary hover:text-primary"
        onClick={() => onSelectInteraction(item)}
        aria-label={`Ouvrir ${item.company_name}`}
      >
        Ouvrir
        <ChevronRight size={14} aria-hidden="true" />
      </Button>
    </TableCell>
  </TableRow>
);

export default DashboardListRow;
