import { useQuery } from '@tanstack/react-query';

import type { PricingReferenceDiffsSummaryGetInput } from '../../../../../../shared/schemas/pricing/references.schema';
import { isAppError } from '@/services/errors/AppError';
import { getPricingReferenceDiffSummary } from '@/services/pricingReferences';
import { pricingReferenceDiffSummaryKey } from '@/services/query/queryKeys';

const EMPTY_SELECTOR: PricingReferenceDiffsSummaryGetInput = {};

/**
 * Un couple base/cible sans run persisté répond PRICING_REFERENCE_DIFF_FAILED :
 * c'est un état attendu (proposer le calcul), pas une erreur à notifier.
 */
export const isMissingDiffRunError = (error: unknown): boolean =>
  isAppError(error) && error.code === 'PRICING_REFERENCE_DIFF_FAILED';

/**
 * Résumé d'un run de diff. Sans base explicite dans le sélecteur, le backend
 * renvoie le dernier run calculé pour la cible (base du calcul automatique).
 */
export const usePricingReferenceDiffSummary = (
  input: PricingReferenceDiffsSummaryGetInput | null
) =>
  useQuery({
    queryKey: pricingReferenceDiffSummaryKey(input ?? EMPTY_SELECTOR),
    queryFn: () => getPricingReferenceDiffSummary(input ?? EMPTY_SELECTOR),
    enabled: input !== null,
    retry: (failureCount, error) => !isMissingDiffRunError(error) && failureCount < 2
  });
