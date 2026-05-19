import { TableCell, TableRow } from '../../ui/data-display/Table';

const DashboardListEmptyRow = () => (
  <TableRow>
    <TableCell colSpan={7} className="px-3 py-12 text-center text-sm text-muted-foreground">
      Aucune interaction trouvee.
    </TableCell>
  </TableRow>
);

export default DashboardListEmptyRow;
