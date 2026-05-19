import { useEffect, useRef } from 'react';
import { normalizeError } from '@/services/errors/normalizeError';
import { handleUiError } from '@/services/errors/handleUiError';

export const useNotifyError = (
  error: unknown,
  fallbackMessage: string,
  source: string
): void => {
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const appError = normalizeError(error, fallbackMessage);
    const signature = `${appError.code}:${appError.message}`;
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;
    handleUiError(appError, fallbackMessage, { source });
  }, [error, fallbackMessage, source]);
};
