import { describe, expect, it, vi } from 'vitest';
import type { AuthError } from '@supabase/supabase-js';

import { signOut } from '@/services/auth/signOut';
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

vi.mock('../../supabase/requireSupabaseClient');

const mockRequireSupabase = vi.mocked(requireSupabaseClient);

describe('signOut', () => {
  it('resolves when signOut succeeds', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.auth.signOut.mockResolvedValue({ error: null });
    mockRequireSupabase.mockReturnValue(mockClient as never);
    await expect(signOut()).resolves.toBeUndefined();
  });

  it('throws mapped error on failure', async () => {
    const mockClient = createMockSupabaseClient();
    const error = { message: 'fail', status: 401 } as AuthError;
    mockClient.auth.signOut.mockResolvedValue({ error });
    mockRequireSupabase.mockReturnValue(mockClient as never);
    await expect(signOut()).rejects.toMatchObject({ code: 'AUTH_FORBIDDEN' });
  });
});
