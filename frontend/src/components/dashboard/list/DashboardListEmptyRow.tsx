import { TableCell, TableRow } from '@/components/ui/table';

const DashboardListEmptyRow = () => (
  <TableRow>
    <TableCell colSpan={7} className="px-3 py-12 text-center text-sm text-slate-500">
      Aucune interaction trouvee.
    </TableCell>
  </TableRow>
);

export default DashboardListEmptyRow;
