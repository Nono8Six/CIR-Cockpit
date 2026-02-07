import { describe, expect, it, vi } from 'vitest';
import type { AuthError } from '@supabase/supabase-js';

import { signInWithPassword } from '@/services/auth/signInWithPassword';
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

vi.mock('../../supabase/requireSupabaseClient');

const mockRequireSupabase = vi.mocked(requireSupabaseClient);

describe('signInWithPassword', () => {
  it('returns session when successful', async () => {
    const mockClient = createMockSupabaseClient();
    const session = { access_token: 'token' } as never;
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { session },
      error: null
    });
    mockRequireSupabase.mockReturnValue(mockClient as never);

    const result = await signInWithPassword({ email: 'a@b.com', password: 'pass' });
    expect(result).toBe(session);
  });

  it('throws mapped error when auth fails', async () => {
    const mockClient = createMockSupabaseClient();
    const error = { message: 'bad', status: 400, code: 'invalid_credentials' } as AuthError;
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error
    });
    mockRequireSupabase.mockReturnValue(mockClient as never);

    await expect(
      signInWithPassword({ email: 'a@b.com', password: 'pass' })
    ).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
  });

  it('throws when session is missing', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: null
    });
    mockRequireSupabase.mockReturnValue(mockClient as never);

    await expect(
      signInWithPassword({ email: 'a@b.com', password: 'pass' })
    ).rejects.toMatchObject({ code: 'AUTH_ERROR' });
  });
});
