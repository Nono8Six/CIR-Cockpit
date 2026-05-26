import type { DirectoryCompanySearchResult } from '../../../../../shared/schemas/system/directory.schema';

/**
 * Formats the establishment label text.
 * @param {DirectoryCompanySearchResult} company - The company result.
 * @returns {string} Formatted label text.
 */
const getEstablishmentLabel = (company: DirectoryCompanySearchResult): string =>
  [company.postal_code, company.city].filter(Boolean).join(' ') || 'Établissement';

export default getEstablishmentLabel;
