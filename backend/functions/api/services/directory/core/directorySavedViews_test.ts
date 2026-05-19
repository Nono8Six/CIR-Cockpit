import { assertEquals, assertThrows } from 'std/assert';

import {
  DIRECTORY_SAVED_VIEWS_LIMIT,
  enforceDirectorySavedViewsLimit,
  requireDirectorySavedView
} from './directorySavedViews.ts';

const readStatus = (value: unknown): number | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = Reflect.get(value, 'status');
  return typeof candidate === 'number' ? candidate : undefined;
};

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = Reflect.get(value, 'code');
  return typeof candidate === 'string' ? candidate : undefined;
};

Deno.test('enforceDirectorySavedViewsLimit allows updates regardless of the existing count', () => {
  enforceDirectorySavedViewsLimit(DIRECTORY_SAVED_VIEWS_LIMIT, false);
});

Deno.test('enforceDirectorySavedViewsLimit rejects creates beyond the limit', () => {
  const error = assertThrows(() =>
    enforceDirectorySavedViewsLimit(DIRECTORY_SAVED_VIEWS_LIMIT, true)
  );

  assertEquals(readStatus(error), 400);
  assertEquals(readCode(error), 'INVALID_PAYLOAD');
});

Deno.test('requireDirectorySavedView returns the first row when present', () => {
  const row = requireDirectorySavedView([{ id: 'view-1' }], 'Vue sauvegardee introuvable.');
  assertEquals(row.id, 'view-1');
});

Deno.test('requireDirectorySavedView throws a not found app error when no row is returned', () => {
  const error = assertThrows(() =>
    requireDirectorySavedView([], 'Vue sauvegardee introuvable.')
  );

  assertEquals(readStatus(error), 404);
  assertEquals(readCode(error), 'NOT_FOUND');
});
