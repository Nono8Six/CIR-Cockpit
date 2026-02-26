import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { mapSupabaseAuthError } from '@/services/errors/mapSupabaseAuthError';
import { reportError } from '@/services/errors/reportError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { invokeRpc } from '@/services/api/safeRpc';
import { getCurrentUserId } from '@/services/auth/getCurrentUserId';
import { getCurrentUserLabel } from '@/services/auth/getCurrentUserLabel';
import { getProfile } from '@/services/auth/getProfile';
import { getSession } from '@/services/auth/getSession';
import { onAuthStateChange } from '@/services/auth/onAuthStateChange';
import { setProfilePasswordChanged } from '@/services/auth/setProfilePasswordChanged';
import { updateUserPassword } from '@/services/auth/updateUserPassword';

vi.mock('../../supabase/requireSupabaseClient');
vi.mock('../../errors/mapSupabaseAuthError');
vi.mock('../../errors/mapPostgrestError');
vi.mock('../../errors/reportError');
vi.mock('../../api/safeRpc');

const mockRequireSupabase = vi.mocked(requireSupabaseClient);
const mockMapSupabaseAuthError = vi.mocked(mapSupabaseAuthError);
const mockMapPostgrestError = vi.mocked(mapPostgrestError);
const mockReportError = vi.mocked(reportError);
const mockInvokeRpc = vi.mocked(invokeRpc);

const asSupabaseClient = (client: object): ReturnType<typeof requireSupabaseClient> =>
  client as unknown as ReturnType<typeof requireSupabaseClient>;

describe('auth core services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCurrentUserId returns id and maps missing/auth errors', async () => {
    const authError = createAppError({
      code: 'AUTH_ERROR',
      message: 'Erreur auth.',
      source: 'auth'
    });
    mockMapSupabaseAuthError.mockReturnValue(authError);

    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null
          })
        }
      })
    );
    await expect(getCurrentUserId()).resolves.toBe('user-1');

    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'missing' }
          })
        }
      })
    );
    await expect(getCurrentUserId()).rejects.toBe(authError);

    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null
          })
        }
      })
    );
    await expect(getCurrentUserId()).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });

  it('getCurrentUserLabel caches profile label and reports db read errors', async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { display_name: 'Jean Dupont', email: 'jean@cir.fr' },
            error: null,
            status: 200
          })
        }))
      }))
    }));

    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'label-user-1' } },
            error: null
          })
        },
        from
      })
    );

    const first = await getCurrentUserLabel();
    const second = await getCurrentUserLabel();
    expect(first).toBe('Jean Dupont');
    expect(second).toBe('Jean Dupont');
    expect(from).toHaveBeenCalledTimes(1);

    const mappedError = createAppError({
      code: 'DB_READ_FAILED',
      message: 'Erreur profil.',
      source: 'db'
    });
    mockMapPostgrestError.mockReturnValue(mappedError);
    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'label-user-2' } },
            error: null
          })
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'denied' },
                status: 403
              })
            }))
          }))
        }))
      })
    );

    await expect(getCurrentUserLabel()).resolves.toBeNull();
    expect(mockReportError).toHaveBeenCalledWith(mappedError, { source: 'getCurrentUserLabel' });
  });

  it('getProfile returns normalized profile and handles invalid states', async () => {
    const mappedDbError = createAppError({
      code: 'DB_READ_FAILED',
      message: 'Erreur DB.',
      source: 'db'
    });
    const mappedAuthError = createAppError({
      code: 'AUTH_ERROR',
      message: 'Erreur auth.',
      source: 'auth'
    });
    mockMapPostgrestError.mockReturnValue(mappedDbError);
    mockMapSupabaseAuthError.mockReturnValue(mappedAuthError);

    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'profile-1' } },
            error: null
          })
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'profile-1',
                  email: 'profile@cir.fr',
                  display_name: 'Profile One',
                  role: 'tcs',
                  must_change_password: true,
                  password_changed_at: null
                },
                error: null,
                status: 200
              })
            }))
          }))
        }))
      })
    );
    await expect(getProfile()).resolves.toMatchObject({
      id: 'profile-1',
      role: 'tcs',
      must_change_password: true
    });

    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null
          })
        }
      })
    );
    await expect(getProfile()).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });

    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'profile-2' } },
            error: null
          })
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'forbidden' },
                status: 403
              })
            }))
          }))
        }))
      })
    );
    await expect(getProfile()).rejects.toBe(mappedDbError);
  });

  it('getSession, onAuthStateChange, updateUserPassword and setProfilePasswordChanged', async () => {
    const authError = createAppError({
      code: 'AUTH_ERROR',
      message: 'Erreur auth.',
      source: 'auth'
    });
    mockMapSupabaseAuthError.mockReturnValue(authError);

    const subscription = { unsubscribe: vi.fn() };
    const onAuthStateChangeMock = vi.fn((callback: (event: string, session: unknown) => void) => {
      callback('SIGNED_IN', { access_token: 'token' });
      return { data: { subscription } };
    });

    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'token' } },
            error: null
          }),
          onAuthStateChange: onAuthStateChangeMock,
          updateUser: vi.fn().mockResolvedValue({ error: null })
        }
      })
    );

    await expect(getSession()).resolves.toMatchObject({ access_token: 'token' });

    const events: Array<{ event: string; hasSession: boolean }> = [];
    const returnedSubscription = onAuthStateChange((event, session) => {
      events.push({ event, hasSession: Boolean(session) });
    });
    expect(returnedSubscription).toBe(subscription);
    expect(events).toEqual([{ event: 'SIGNED_IN', hasSession: true }]);

    await expect(updateUserPassword('Password#123')).resolves.toBeUndefined();

    mockInvokeRpc.mockResolvedValue(undefined);
    await expect(setProfilePasswordChanged()).resolves.toBeUndefined();
    const [call, parser] = mockInvokeRpc.mock.calls[0];
    expect(typeof call).toBe('function');
    expect(parser({ anything: true })).toBeUndefined();

    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: { message: 'session error' }
          })
        }
      })
    );
    await expect(getSession()).rejects.toBe(authError);
  });
});
