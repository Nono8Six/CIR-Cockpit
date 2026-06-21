import type { DirectoryListRow, DirectoryRouteRef } from '../../../../shared/schemas/system/directory.schema';

import { isProspectEntityType } from './clientDirectorySearch';

export const getDirectoryRouteRefFromRow = (row: DirectoryListRow): DirectoryRouteRef => {
  if (row.entity_type === 'Fournisseur') {
    return {
      kind: 'supplier',
      id: row.id
    };
  }

  if (!isProspectEntityType(row.entity_type) && row.client_number) {
    return {
      kind: 'client',
      clientNumber: row.client_number
    };
  }

  return {
    kind: 'prospect',
    id: row.id
  };
};
