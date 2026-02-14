import { describe, expect, it, vi } from 'vitest';

import { getAdminUsers } from '@/services/admin/getAdminUsers';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

vi.mock('../../supabase/requireSupabaseClient');

const mockRequireSupabase = vi.mocked(requireSupabaseClient);

const makePostgrestError = (overrides: Partial<{ code: string; message: string; details: string | null }> = {}) => ({
  code: overrides.code ?? 'PGRST000',
  message: overrides.message ?? 'db error',
  details: overrides.details ?? null,
  hint: null
});

describe('getAdminUsers', () => {
  it('falls back to legacy select when first_name/last_name are unavailable', async () => {
    const profilesOrder = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: makePostgrestError({
          code: 'PGRST204',
          message: "Could not find the 'first_name' column of 'profiles' in the schema cache"
        }),
        status: 400
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'u1',
            email: 'a.ferron@cir.fr',
            display_name: 'FERRON Arnaud',
            role: 'super_admin',
            archived_at: null,
            created_at: '2026-02-10T10:00:00.000Z'
          }
        ],
        error: null,
        status: 200
      });

    const profilesSelect = vi.fn().mockReturnValue({ order: profilesOrder });
    const membershipsSelect = vi.fn().mockResolvedValue({
      data: [{ user_id: 'u1', agency_id: 'agency-1', agencies: { id: 'agency-1', name: 'CIR Paris' } }],
      error: null,
      status: 200
    });

    const from = vi.fn((table: string) => {
      if (table === 'profiles') return { select: profilesSelect };
      if (table === 'agency_members') return { select: membershipsSelect };
      return { select: vi.fn() };
    });

    mockRequireSupabase.mockReturnValue({ from } as never);

    const result = await getAdminUsers();

    expect(profilesSelect).toHaveBeenNthCalledWith(
      1,
      'id, email, display_name, first_name, last_name, role, archived_at, created_at'
    );
    expect(profilesSelect).toHaveBeenNthCalledWith(2, 'id, email, display_name, role, archived_at, created_at');
    expect(result).toEqual([
      {
        id: 'u1',
        email: 'a.ferron@cir.fr',
        display_name: 'FERRON Arnaud',
        first_name: 'Arnaud',
        last_name: 'FERRON',
        role: 'super_admin',
        archived_at: null,
        created_at: '2026-02-10T10:00:00.000Z',
        memberships: [{ agency_id: 'agency-1', agency_name: 'CIR Paris' }]
      }
    ]);
    expect(from).toHaveBeenCalledWith('profiles');
    expect(from).toHaveBeenCalledWith('agency_members');
  });

  it('throws a mapped error when profile loading fails without fallback condition', async () => {
    const profilesOrder = vi.fn().mockResolvedValue({
      data: null,
      error: makePostgrestError({
        code: '42501',
        message: 'permission denied for table profiles'
      }),
      status: 403
    });

    const profilesSelect = vi.fn().mockReturnValue({ order: profilesOrder });
    const membershipsSelect = vi.fn().mockResolvedValue({
      data: [],
      error: null,
      status: 200
    });

    const from = vi.fn((table: string) => {
      if (table === 'profiles') return { select: profilesSelect };
      if (table === 'agency_members') return { select: membershipsSelect };
      return { select: vi.fn() };
    });

    mockRequireSupabase.mockReturnValue({ from } as never);

    await expect(getAdminUsers()).rejects.toMatchObject({
      code: 'AUTH_FORBIDDEN',
      message: 'Accès non autorisé.'
    });
  });
});
