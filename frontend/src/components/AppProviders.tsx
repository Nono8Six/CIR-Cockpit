import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import ErrorBoundary from '@/components/ErrorBoundary';
import AppSessionProvider from '@/components/AppSessionProvider';
import { queryClient } from '@/services/query/queryClient';

type AppProvidersProps = {
  children: ReactNode;
};

const AppProviders = ({ children }: AppProvidersProps) => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AppSessionProvider>{children}</AppSessionProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default AppProviders;
