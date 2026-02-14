import { TableHead, TableRow } from '@/components/ui/table';

const DashboardListHeader = () => (
  <TableRow className="bg-slate-50 hover:bg-slate-50">
    <TableHead className="w-[120px] px-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
      Derniere action
    </TableHead>
    <TableHead className="w-[64px] px-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
      Canal
    </TableHead>
    <TableHead className="w-[140px] px-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
      Statut
    </TableHead>
    <TableHead className="w-[220px] px-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
      Client / Contact
    </TableHead>
    <TableHead className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
      Sujet
    </TableHead>
    <TableHead className="w-[110px] px-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
      Ref
    </TableHead>
    <TableHead className="w-[110px] px-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
      Action
    </TableHead>
  </TableRow>
);

export default DashboardListHeader;
