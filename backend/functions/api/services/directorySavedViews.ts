import { and, asc, desc, eq, ne } from 'drizzle-orm';

import { directory_saved_views } from '../../../drizzle/schema.ts';
import type {
  DirectorySavedViewDeleteInput,
  DirectorySavedViewSaveInput,
  DirectorySavedViewSetDefaultInput,
  DirectorySavedViewsListInput
} from '../../../../shared/schemas/directory.schema.ts';
import type {
  DirectorySavedViewDeleteResponse,
  DirectorySavedViewResponse,
  DirectorySavedViewsListResponse
} from '../../../../shared/schemas/api-responses.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { ensureDataRateLimit } from './dataAccess.ts';

export const DIRECTORY_SAVED_VIEWS_LIMIT = 20;

const baseViewSelect = {
  id: directory_saved_views.id,
  name: directory_saved_views.name,
  is_default: directory_saved_views.is_default,
  state: directory_saved_views.state,
  created_at: directory_saved_views.created_at,
  updated_at: directory_saved_views.updated_at
} as const;

export const enforceDirectorySavedViewsLimit = (
  existingCount: number,
  isCreate: boolean
): void => {
  if (isCreate && existingCount >= DIRECTORY_SAVED_VIEWS_LIMIT) {
    throw httpError(400, 'INVALID_PAYLOAD', 'Limite de vues sauvegardees atteinte.');
  }
};

export const requireDirectorySavedView = <T>(
  rows: T[],
  message: string
): T => {
  const view = rows[0];
  if (!view) {
    throw httpError(404, 'NOT_FOUND', message);
  }
  return view;
};

const clearDefaultView = async (
  db: DbClient,
  userId: string,
  excludedViewId?: string
): Promise<void> => {
  await db
    .update(directory_saved_views)
    .set({ is_default: false })
    .where(
      excludedViewId
        ? and(eq(directory_saved_views.user_id, userId), ne(directory_saved_views.id, excludedViewId))
        : eq(directory_saved_views.user_id, userId)
    );
};

export const listDirectorySavedViews = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  _input: DirectorySavedViewsListInput
): Promise<DirectorySavedViewsListResponse> => {
  await ensureDataRateLimit('directory:saved-views:list', authContext.userId);

  try {
    const views = await db
      .select(baseViewSelect)
      .from(directory_saved_views)
      .where(eq(directory_saved_views.user_id, authContext.userId))
      .orderBy(desc(directory_saved_views.is_default), asc(directory_saved_views.name));

    return {
      request_id: requestId,
      ok: true,
      views
    };
  } catch (error) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      'Impossible de charger les vues sauvegardees.',
      error instanceof Error ? error.message : undefined
    );
  }
};

export const saveDirectorySavedView = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectorySavedViewSaveInput
): Promise<DirectorySavedViewResponse> => {
  await ensureDataRateLimit('directory:saved-views:save', authContext.userId);

  try {
    const existingViews = await db
      .select({ id: directory_saved_views.id })
      .from(directory_saved_views)
      .where(eq(directory_saved_views.user_id, authContext.userId));

    const isCreate = !input.id;
    enforceDirectorySavedViewsLimit(existingViews.length, isCreate);

    if (input.is_default) {
      await clearDefaultView(db, authContext.userId, input.id);
    }

    const rows = input.id
      ? await db
          .update(directory_saved_views)
          .set({
            name: input.name,
            state: input.state,
            is_default: input.is_default
          })
          .where(and(
            eq(directory_saved_views.id, input.id),
            eq(directory_saved_views.user_id, authContext.userId)
          ))
          .returning(baseViewSelect)
      : await db
          .insert(directory_saved_views)
          .values({
            user_id: authContext.userId,
            name: input.name,
            state: input.state,
            is_default: input.is_default
          })
          .returning(baseViewSelect);

    const view = requireDirectorySavedView(rows, 'Vue sauvegardee introuvable.');

    return {
      request_id: requestId,
      ok: true,
      view
    };
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'NOT_FOUND'
    ) {
      throw error;
    }

    throw httpError(
      500,
      'DB_WRITE_FAILED',
      'Impossible de sauvegarder la vue.',
      error instanceof Error ? error.message : undefined
    );
  }
};

export const deleteDirectorySavedView = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectorySavedViewDeleteInput
): Promise<DirectorySavedViewDeleteResponse> => {
  await ensureDataRateLimit('directory:saved-views:delete', authContext.userId);

  try {
    const rows = await db
      .delete(directory_saved_views)
      .where(and(
        eq(directory_saved_views.id, input.id),
        eq(directory_saved_views.user_id, authContext.userId)
      ))
      .returning({ id: directory_saved_views.id });

    const deletedView = requireDirectorySavedView(rows, 'Vue sauvegardee introuvable.');

    return {
      request_id: requestId,
      ok: true,
      view_id: deletedView.id
    };
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'NOT_FOUND'
    ) {
      throw error;
    }

    throw httpError(
      500,
      'DB_WRITE_FAILED',
      'Impossible de supprimer la vue.',
      error instanceof Error ? error.message : undefined
    );
  }
};

export const setDefaultDirectorySavedView = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectorySavedViewSetDefaultInput
): Promise<DirectorySavedViewResponse> => {
  await ensureDataRateLimit('directory:saved-views:set-default', authContext.userId);

  try {
    await clearDefaultView(db, authContext.userId, input.id);

    const rows = await db
      .update(directory_saved_views)
      .set({ is_default: true })
      .where(and(
        eq(directory_saved_views.id, input.id),
        eq(directory_saved_views.user_id, authContext.userId)
      ))
      .returning(baseViewSelect);

    const view = requireDirectorySavedView(rows, 'Vue sauvegardee introuvable.');

    return {
      request_id: requestId,
      ok: true,
      view
    };
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'NOT_FOUND'
    ) {
      throw error;
    }

    throw httpError(
      500,
      'DB_WRITE_FAILED',
      'Impossible de definir la vue par defaut.',
      error instanceof Error ? error.message : undefined
    );
  }
};
