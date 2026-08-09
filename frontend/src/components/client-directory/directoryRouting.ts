import type { DirectoryRouteRef } from '../../../../shared/schemas/system/directory.schema';

import type { CanonicalDirectoryListRow } from '@/services/directory/getDirectoryPage';
import { tierHasActiveRole } from '@/services/entities/tierSurfaceRead';

export const getDirectoryRouteRefFromRow = (row: CanonicalDirectoryListRow): DirectoryRouteRef => {
  if (tierHasActiveRole(row.canonical_tier, 'supplier')) {
    return {
      kind: 'supplier',
      id: row.id
    };
  }

  if (tierHasActiveRole(row.canonical_tier, 'client') && row.client_number) {
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
