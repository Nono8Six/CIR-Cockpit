import type { DirectoryCompanySearchResult } from '../../../../../shared/schemas/system/directory.schema';

/**
 * Returns appropriate badge variant for an establishment status.
 * @param {DirectoryCompanySearchResult['establishment_status']} status - Status string.
 * @returns {"destructive" | "success" | "outline"} Badge variant name.
 */
const getStatusBadgeVariant = (
  status: DirectoryCompanySearchResult['establishment_status']
): 'destructive' | 'success' | 'outline' => {
  if (status === 'closed') return 'destructive';
  if (status === 'open') return 'success';
  return 'outline';
};

export default getStatusBadgeVariant;
