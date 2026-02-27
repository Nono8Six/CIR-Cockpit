import React, { useCallback, type ErrorInfo } from 'react';
import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

const ErrorFallback = ({ resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-surface-1/80 text-muted-foreground font-sans p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Erreur inattendue</CardTitle>
          <CardDescription>
            Une erreur s&apos;est produite. Rechargez la page ou reconnectez-vous si le probleme persiste.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Si le probleme persiste, exportez le journal d&apos;erreurs depuis l&apos;admin.
          </p>
        </CardContent>
        <CardFooter>
          <Button type="button" onClick={resetErrorBoundary} className="w-full">
            Recharger
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const ErrorBoundary = ({ children }: ErrorBoundaryProps) => {
  const handleError = useCallback((error: unknown, info: ErrorInfo) => {
    const normalizedMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const appError = createAppError({
      code: 'UNKNOWN_ERROR',
      message: 'Une erreur inattendue est survenue.',
      source: 'client',
      details: normalizedMessage,
      cause: error
    });

    handleUiError(appError, appError.message, {
      boundary: 'ErrorBoundary',
      componentStack: info.componentStack
    });
  }, []);

  const handleReset = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={handleReset}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundary;
