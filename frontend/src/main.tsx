import React from 'react';
import * as ReactDOM from 'react-dom';
import ReactDOMClient from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'sonner';

import { appRouter } from '@/app/router';
import AppProviders from '@/components/AppProviders';
import { createAppError } from '@/services/errors/AppError';
import { reportError } from '@/services/errors/reportError';
import { initErrorReporter } from '@/services/errors/sentryStub';
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

if (import.meta.env.DEV) {
  void import('@axe-core/react')
    .then(({ default: axe }) => {
      axe(React, ReactDOM, 1000);
    })
    .catch((error) => {
      const details = error instanceof Error ? error.message : 'Erreur inconnue.';
      reportError(
        createAppError({
          code: 'UNKNOWN_ERROR',
          message: "Impossible d'activer l'audit d'accessibilite en developpement.",
          source: 'client'
        }),
        {
          source: 'main.axe.init',
          details
        }
      );
    });
}

initErrorReporter();

const root = ReactDOMClient.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={appRouter} />
      <ResponsiveToaster />
    </AppProviders>
  </React.StrictMode>
);
