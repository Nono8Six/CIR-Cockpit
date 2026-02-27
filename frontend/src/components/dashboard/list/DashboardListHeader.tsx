import { TableHead, TableRow } from '@/components/ui/table';

const DashboardListHeader = () => (
  <TableRow className="bg-surface-1 hover:bg-surface-1">
    <TableHead className="w-[120px] px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Derniere action
    </TableHead>
    <TableHead className="w-[64px] px-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Canal
    </TableHead>
    <TableHead className="w-[140px] px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Statut
    </TableHead>
    <TableHead className="w-[220px] px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Client / Contact
    </TableHead>
    <TableHead className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Sujet
    </TableHead>
    <TableHead className="w-[110px] px-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Ref
    </TableHead>
    <TableHead className="w-[110px] px-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Action
    </TableHead>
  </TableRow>
);

export default DashboardListHeader;
