import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { PricingReferenceClassificationListInput } from '../../../../../../shared/schemas/pricing/references.schema';
import { listPricingReferenceClassification } from '@/services/pricingReferences';
import { pricingReferenceClassificationKey } from '@/services/query/queryKeys';

/**
 * Résolution inverse snapshot → import (affichage de la base auto d'un run) :
 * une ligne de classification du snapshot porte son import_id.
 */
export const usePricingReferenceSnapshotImportId = (snapshotId: string | null) => {
  const input = useMemo(
    (): PricingReferenceClassificationListInput => ({
      page: 1,
      page_size: 1,
      sort_by: 'mega',
      sort_direction: 'asc',
      ...(snapshotId ? { snapshot_id: snapshotId } : {})
    }),
    [snapshotId]
  );

  const query = useQuery({
    queryKey: pricingReferenceClassificationKey(input),
    queryFn: () => listPricingReferenceClassification(input),
    enabled: snapshotId !== null
  });

  return {
    importId: query.data?.rows[0]?.import_id ?? null,
    isLoading: snapshotId !== null && query.isLoading
  };
};
