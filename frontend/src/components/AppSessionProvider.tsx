import { createContext } from 'react';
import type { ReactNode } from 'react';

import type { AppSessionContextValue } from '@/types/app-session';
import { useAppSessionState } from '@/hooks/useAppSessionState';

export const AppSessionContext = createContext<AppSessionContextValue | null>(null);

type AppSessionProviderProps = {
  children: ReactNode;
};

const AppSessionProvider = ({ children }: AppSessionProviderProps) => {
  const contextValue = useAppSessionState();

  return (
    <AppSessionContext.Provider value={contextValue}>
      {children}
    </AppSessionContext.Provider>
  );
};

export default AppSessionProvider;
