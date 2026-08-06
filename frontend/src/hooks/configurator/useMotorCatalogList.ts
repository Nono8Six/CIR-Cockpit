import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { MotorCatalogListInput } from '../../../../shared/schemas/configurator/motor.schema';
import { listMotorCatalog } from '@/services/configurator/motorConfigurator';
import { configuratorMotorCatalogListKey } from '@/services/query/queryKeys';

/**
 * Liste paginee du catalogue technique moteur du snapshot actif.
 * Mesure runtime C3-8 : 1,2 a 1,4 s. La page precedente reste affichee pendant
 * le chargement de la suivante pour eviter un vide intermittent.
 */
export const useMotorCatalogList = (input: MotorCatalogListInput, enabled = true) =>
  useQuery({
    queryKey: configuratorMotorCatalogListKey(input),
    queryFn: () => listMotorCatalog(input),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000
  });
