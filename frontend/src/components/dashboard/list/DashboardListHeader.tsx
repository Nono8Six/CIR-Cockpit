import { TableHead, TableRow } from '../../ui/data-display/Table';

const DashboardListHeader = () => (
  <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
    <TableHead className="w-[120px] px-3 text-[11px] font-medium text-muted-foreground/70">
      Dernière action
    </TableHead>
    <TableHead className="w-[64px] px-3 text-center text-[11px] font-medium text-muted-foreground/70">
      Canal
    </TableHead>
    <TableHead className="w-[140px] px-3 text-[11px] font-medium text-muted-foreground/70">
      Statut
    </TableHead>
    <TableHead className="w-[220px] px-3 text-[11px] font-medium text-muted-foreground/70">
      Client / Contact
    </TableHead>
    <TableHead className="px-3 text-[11px] font-medium text-muted-foreground/70">
      Sujet
    </TableHead>
    <TableHead className="w-[110px] px-3 text-right text-[11px] font-medium text-muted-foreground/70">
      Réf
    </TableHead>
    <TableHead className="w-[170px] px-3 text-right text-[11px] font-medium text-muted-foreground/70">
      Action
    </TableHead>
  </TableRow>
);

export default DashboardListHeader;
