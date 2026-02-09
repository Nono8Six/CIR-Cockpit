import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from '@/App';
import AppSessionProvider from '@/components/AppSessionProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { createAppError } from '@/services/errors/AppError';
import { queryClient } from '@/services/query/queryClient';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw createAppError({
    code: 'CLIENT_NOT_CONFIGURED',
    message: "Element racine introuvable pour initialiser l'application.",
    source: 'client'
  });
}

const MOBILE_TOAST_QUERY = '(max-width: 768px)';

const ResponsiveToaster = () => {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
    return window.matchMedia(MOBILE_TOAST_QUERY).matches;
  });

  React.useEffect(() => {
    if (!('matchMedia' in window)) return undefined;
    const mediaQuery = window.matchMedia(MOBILE_TOAST_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return <Toaster position={isMobile ? 'top-center' : 'bottom-right'} richColors closeButton />;
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppSessionProvider>
          <App />
        </AppSessionProvider>
      </ErrorBoundary>
      <ResponsiveToaster />
    </QueryClientProvider>
  </React.StrictMode>
);
