import { vi } from 'vitest';

type MockAuthClient = {
  signInWithPassword: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
};

type MockSupabaseClient = {
  auth: MockAuthClient;
};

export const createMockSupabaseClient = (
  overrides: Partial<MockSupabaseClient> = {}
): MockSupabaseClient => {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    },
    ...overrides
  };
};
