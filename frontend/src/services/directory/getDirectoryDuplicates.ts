import {
  directoryDuplicatesResponseSchema,
  type DirectoryDuplicatesResponse
} from 'shared/schemas/api-responses';
import { type DirectoryDuplicatesInput } from 'shared/schemas/directory.schema';

import { createAppError, isAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/invokeTrpc';
import { callTrpcQuery } from '@/services/api/trpcClient';

const DIRECTORY_DUPLICATES_ROUTE_KEY = 'directory.duplicates:not-found';

const readUnavailableRouteFlag = (key: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.sessionStorage.getItem(key) === '1';
};

const writeUnavailableRouteFlag = (key: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(key, '1');
};

let duplicatesRouteUnavailable = readUnavailableRouteFlag(DIRECTORY_DUPLICATES_ROUTE_KEY);

const parseDirectoryDuplicatesResponse = (payload: unknown): DirectoryDuplicatesResponse => {
  const parsed = directoryDuplicatesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data;
};

export const getDirectoryDuplicates = (
  input: DirectoryDuplicatesInput
): Promise<DirectoryDuplicatesResponse> => {
  if (duplicatesRouteUnavailable) {
    return Promise.resolve({
      request_id: 'directory-duplicates-fallback',
      ok: true,
      matches: []
    });
  }

  return invokeTrpc(
    () => callTrpcQuery('directory.duplicates', input),
    parseDirectoryDuplicatesResponse,
    'Impossible de verifier les doublons.'
  ).catch((error: unknown) => {
    if (!isAppError(error) || error.code !== 'NOT_FOUND') {
      throw error;
    }

    duplicatesRouteUnavailable = true;
    writeUnavailableRouteFlag(DIRECTORY_DUPLICATES_ROUTE_KEY);
    return {
      request_id: 'directory-duplicates-fallback',
      ok: true,
      matches: []
    };
  });
};
