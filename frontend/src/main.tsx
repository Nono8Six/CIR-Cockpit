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

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppSessionProvider>
          <App />
        </AppSessionProvider>
      </ErrorBoundary>
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  </React.StrictMode>
);
