import { useQuery } from '@tanstack/react-query';

import type { PricingReferenceImportsListInput } from '../../../../../../shared/schemas/pricing/references.schema';
import { listPricingReferenceImports } from '@/services/pricingReferences';
import { pricingReferenceImportsKey } from '@/services/query/queryKeys';
import type { PricingReferenceImportSummaryRow } from './changes-utils';

const ANALYZED_IMPORTS_INPUT: PricingReferenceImportsListInput = {
  page: 1,
  page_size: 20,
  status: 'analyse_ok'
};

const EMPTY_IMPORTS: PricingReferenceImportSummaryRow[] = [];

/**
 * Versions candidates aux sélecteurs de comparaison : les 20 imports analysés les
 * plus récents (le contrat imports.list filtre par statut unique).
 */
export const useAnalyzedPricingReferenceImports = () => {
  const query = useQuery({
    queryKey: pricingReferenceImportsKey(ANALYZED_IMPORTS_INPUT),
    queryFn: () => listPricingReferenceImports(ANALYZED_IMPORTS_INPUT)
  });

  return {
    imports: query.data?.imports ?? EMPTY_IMPORTS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  };
};
