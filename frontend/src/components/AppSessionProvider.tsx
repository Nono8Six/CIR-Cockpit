import { createContext } from 'react';
import type { ReactNode } from 'react';

import type { AppSessionActions, AppSessionContextValue, AppSessionState } from '@/types/app-session';
import { useAppSessionState } from '@/hooks/useAppSessionState';

export const AppSessionContext = createContext<AppSessionContextValue | null>(null);
export const AppSessionStateContext = createContext<AppSessionState | null>(null);
export const AppSessionActionsContext = createContext<AppSessionActions | null>(null);

type AppSessionProviderProps = {
  children: ReactNode;
};

const AppSessionProvider = ({ children }: AppSessionProviderProps) => {
  const { state, actions, value } = useAppSessionState();

  return (
    <AppSessionActionsContext.Provider value={actions}>
      <AppSessionStateContext.Provider value={state}>
        <AppSessionContext.Provider value={value}>
          {children}
        </AppSessionContext.Provider>
      </AppSessionStateContext.Provider>
    </AppSessionActionsContext.Provider>
  );
};

export default AppSessionProvider;
