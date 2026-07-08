import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { PricingReferenceClassificationListInput } from '../../../../../../shared/schemas/pricing/references.schema';
import { listPricingReferenceClassification } from '@/services/pricingReferences';
import { pricingReferenceClassificationKey } from '@/services/query/queryKeys';

/**
 * Résout le snapshot d'un import analysé via classification.list (1 ligne suffit :
 * chaque ligne porte son snapshot_id). Le contrat imports.list n'expose pas encore
 * le snapshot ; cette résolution frontend disparaîtra avec la Phase 5.
 */
export const usePricingReferenceImportSnapshotId = (importId: string | null) => {
  const input = useMemo(
    (): PricingReferenceClassificationListInput => ({
      page: 1,
      page_size: 1,
      sort_by: 'mega',
      sort_direction: 'asc',
      ...(importId ? { import_id: importId } : {})
    }),
    [importId]
  );

  const query = useQuery({
    queryKey: pricingReferenceClassificationKey(input),
    queryFn: () => listPricingReferenceClassification(input),
    enabled: importId !== null
  });

  return {
    snapshotId: query.data?.rows[0]?.snapshot_id ?? null,
    isResolved: query.isSuccess,
    isLoading: importId !== null && query.isLoading,
    isError: query.isError,
    error: query.error
  };
};
