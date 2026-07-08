import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PricingReferenceImportActivateResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import { handleUiError } from '@/services/errors/handleUiError';
import { activatePricingReferenceImport } from '@/services/pricingReferences';
import { invalidatePricingReferenceQueries } from '@/services/query/queryInvalidation';

/**
 * Activation (ou réactivation) d'une version référentielle : mutation
 * `pricing.references.imports.activate` puis invalidation racine
 * `pricing-references` (imports, health, segments, classification, anomalies,
 * diffs) attendue avant `onActivated`, pour que la bascule ACTIF/HISTORIQUE et
 * la pastille header soient déjà rafraîchies à la fermeture du dialog.
 */
export const useActivatePricingReferenceVersion = (
  onActivated?: (response: PricingReferenceImportActivateResponse) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (importId: string) => activatePricingReferenceImport({ import_id: importId }),
    onSuccess: async (response) => {
      await invalidatePricingReferenceQueries(queryClient);
      onActivated?.(response);
    },
    onError: (error) => {
      handleUiError(error, "Impossible d'activer cette version du référentiel.", {
        feature: 'pricing.references.imports.activate'
      });
    }
  });
};
