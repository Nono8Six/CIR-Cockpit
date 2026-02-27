import { useContext } from 'react';

import {
  AppSessionActionsContext,
  AppSessionContext,
  AppSessionStateContext
} from '@/components/AppSessionProvider';
import { createAppError } from '@/services/errors/AppError';
import type { AppSessionActions, AppSessionContextValue, AppSessionState } from '@/types/app-session';

const createMissingSessionContextError = () => createAppError({
  code: 'CLIENT_NOT_CONFIGURED',
  message: 'Le contexte de session est indisponible.',
  source: 'client'
});

export const useAppSession = (): AppSessionContextValue => {
  const context = useContext(AppSessionContext);
  if (!context) {
    throw createMissingSessionContextError();
  }
  return context;
};

export const useAppSessionStateContext = (): AppSessionState => {
  const context = useContext(AppSessionStateContext);
  if (!context) {
    throw createMissingSessionContextError();
  }
  return context;
};

export const useAppSessionActions = (): AppSessionActions => {
  const context = useContext(AppSessionActionsContext);
  if (!context) {
    throw createMissingSessionContextError();
  }
  return context;
};
