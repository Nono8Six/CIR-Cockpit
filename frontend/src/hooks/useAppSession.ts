import { useContext } from 'react';

import { AppSessionContext } from '@/components/AppSessionProvider';
import { createAppError } from '@/services/errors/AppError';

export const useAppSession = () => {
  const context = useContext(AppSessionContext);
  if (!context) {
    throw createAppError({
      code: 'CLIENT_NOT_CONFIGURED',
      message: 'Le contexte de session est indisponible.',
      source: 'client'
    });
  }
  return context;
};
