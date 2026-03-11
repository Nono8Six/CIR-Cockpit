import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  getUiPocClientsPage,
  type GetUiPocClientsPageOptions
} from '@/services/clients/getUiPocClientsPage';
import { useNotifyError } from './useNotifyError';

export const useUiPocClientsPage = (
  options: GetUiPocClientsPageOptions,
  enabled = true
) => {
  const query = useQuery({
    queryKey: ['clients', 'ui-poc-page', options] as const,
    queryFn: () => getUiPocClientsPage(options),
    enabled,
    placeholderData: keepPreviousData
  });

  useNotifyError(query.error, 'Impossible de charger la liste clients du POC.', 'useUiPocClientsPage');

  return query;
};
