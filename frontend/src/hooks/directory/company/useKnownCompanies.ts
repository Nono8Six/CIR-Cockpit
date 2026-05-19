import { useEffect, useState } from 'react';

import { getKnownCompanies } from '@/services/interactions/getKnownCompanies';
import { handleUiError } from '@/services/errors/handleUiError';

export const useKnownCompanies = () => {
  const [knownCompanies, setKnownCompanies] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadCompanies = async () => {
      try {
        const companies = await getKnownCompanies();
        if (isMounted) {
          setKnownCompanies(companies);
        }
      } catch (error) {
        handleUiError(error, 'Impossible de charger les entreprises.', { source: 'useKnownCompanies' });
        if (isMounted) {
          setKnownCompanies([]);
        }
      }
    };
    loadCompanies();
    return () => {
      isMounted = false;
    };
  }, []);

  return { knownCompanies, setKnownCompanies };
};
