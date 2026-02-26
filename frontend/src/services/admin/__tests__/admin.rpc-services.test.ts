import { describe, expect, it, vi } from 'vitest';

import type { RpcClient } from '@/services/api/rpcClient';
import { safeRpc } from '@/services/api/safeRpc';
import { adminAgenciesArchive } from '@/services/admin/adminAgenciesArchive';
import { adminAgenciesCreate } from '@/services/admin/adminAgenciesCreate';
import { adminAgenciesHardDelete } from '@/services/admin/adminAgenciesHardDelete';
import { adminAgenciesRename } from '@/services/admin/adminAgenciesRename';
import { adminAgenciesUnarchive } from '@/services/admin/adminAgenciesUnarchive';
import { adminUsersArchive } from '@/services/admin/adminUsersArchive';
import { adminUsersCreate } from '@/services/admin/adminUsersCreate';
import { adminUsersDelete } from '@/services/admin/adminUsersDelete';
import { adminUsersResetPassword } from '@/services/admin/adminUsersResetPassword';
import { adminUsersSetMemberships } from '@/services/admin/adminUsersSetMemberships';
import { adminUsersSetRole } from '@/services/admin/adminUsersSetRole';
import { adminUsersUnarchive } from '@/services/admin/adminUsersUnarchive';
import { adminUsersUpdateIdentity } from '@/services/admin/adminUsersUpdateIdentity';

vi.mock('../../api/safeRpc');

type SafeRpcCall = Parameters<typeof safeRpc>[0];
type SafeRpcParser = Parameters<typeof safeRpc>[1];

type RpcCase = {
  label: string;
  run: () => unknown;
  endpoint: 'users' | 'agencies';
  expectedJson: Record<string, unknown>;
  validResponse: Record<string, unknown>;
  fallbackMessage: string;
};

const mockSafeRpc = vi.mocked(safeRpc);

const createAdminRpcClient = () => {
  const usersPost = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  const agenciesPost = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

  const client = {
    data: {
      profile: { $post: vi.fn() },
      config: { $post: vi.fn() },
      entities: { $post: vi.fn() },
      'entity-contacts': { $post: vi.fn() },
      interactions: { $post: vi.fn() }
    },
    admin: {
      users: { $post: usersPost },
      agencies: { $post: agenciesPost }
    }
  } as unknown as RpcClient;

  return { client, usersPost, agenciesPost };
};

const cases: RpcCase[] = [
  {
    label: 'adminAgenciesArchive',
    run: () => adminAgenciesArchive('agency-1'),
    endpoint: 'agencies',
    expectedJson: { action: 'archive', agency_id: 'agency-1' },
    validResponse: { ok: true, agency: { id: 'agency-1', name: 'CIR Paris', archived_at: '2026-02-23T00:00:00.000Z' } },
    fallbackMessage: "Impossible d'archiver l'agence."
  },
  {
    label: 'adminAgenciesCreate',
    run: () => adminAgenciesCreate('CIR Paris'),
    endpoint: 'agencies',
    expectedJson: { action: 'create', name: 'CIR Paris' },
    validResponse: { ok: true, agency: { id: 'agency-2', name: 'CIR Paris', archived_at: null } },
    fallbackMessage: "Impossible de creer l'agence."
  },
  {
    label: 'adminAgenciesHardDelete',
    run: () => adminAgenciesHardDelete('agency-2'),
    endpoint: 'agencies',
    expectedJson: { action: 'hard_delete', agency_id: 'agency-2' },
    validResponse: { ok: true, agency_id: 'agency-2' },
    fallbackMessage: "Impossible de supprimer l'agence."
  },
  {
    label: 'adminAgenciesRename',
    run: () => adminAgenciesRename('agency-3', 'CIR Lyon'),
    endpoint: 'agencies',
    expectedJson: { action: 'rename', agency_id: 'agency-3', name: 'CIR Lyon' },
    validResponse: { ok: true, agency: { id: 'agency-3', name: 'CIR Lyon', archived_at: null } },
    fallbackMessage: "Impossible de renommer l'agence."
  },
  {
    label: 'adminAgenciesUnarchive',
    run: () => adminAgenciesUnarchive('agency-4'),
    endpoint: 'agencies',
    expectedJson: { action: 'unarchive', agency_id: 'agency-4' },
    validResponse: { ok: true, agency: { id: 'agency-4', name: 'CIR Lille', archived_at: null } },
    fallbackMessage: "Impossible de reactiver l'agence."
  },
  {
    label: 'adminUsersArchive',
    run: () => adminUsersArchive('user-1'),
    endpoint: 'users',
    expectedJson: { action: 'archive', user_id: 'user-1' },
    validResponse: { ok: true, user_id: 'user-1', archived: true },
    fallbackMessage: "Impossible d'archiver l'utilisateur."
  },
  {
    label: 'adminUsersCreate',
    run: () =>
      adminUsersCreate({
        email: 'new@cir.fr',
        first_name: 'Jean',
        last_name: 'Dupont',
        role: 'tcs',
        agency_ids: ['agency-1']
      }),
    endpoint: 'users',
    expectedJson: {
      action: 'create',
      email: 'new@cir.fr',
      first_name: 'Jean',
      last_name: 'Dupont',
      role: 'tcs',
      agency_ids: ['agency-1']
    },
    validResponse: {
      ok: true,
      user_id: 'user-2',
      account_state: 'created',
      role: 'tcs',
      agency_ids: ['agency-1']
    },
    fallbackMessage: "Impossible de creer l'utilisateur."
  },
  {
    label: 'adminUsersDelete',
    run: () => adminUsersDelete('user-2'),
    endpoint: 'users',
    expectedJson: { action: 'delete', user_id: 'user-2' },
    validResponse: { ok: true, user_id: 'user-2', deleted: true },
    fallbackMessage: "Impossible de supprimer l'utilisateur."
  },
  {
    label: 'adminUsersResetPassword',
    run: () => adminUsersResetPassword('user-3', 'Temp#123'),
    endpoint: 'users',
    expectedJson: { action: 'reset_password', user_id: 'user-3', password: 'Temp#123' },
    validResponse: { ok: true, user_id: 'user-3', temporary_password: 'Temp#123' },
    fallbackMessage: 'Impossible de reinitialiser le mot de passe.'
  },
  {
    label: 'adminUsersSetMemberships',
    run: () => adminUsersSetMemberships('user-4', ['agency-1', 'agency-2'], 'replace'),
    endpoint: 'users',
    expectedJson: {
      action: 'set_memberships',
      user_id: 'user-4',
      agency_ids: ['agency-1', 'agency-2'],
      mode: 'replace'
    },
    validResponse: {
      ok: true,
      user_id: 'user-4',
      agency_ids: ['agency-1', 'agency-2'],
      membership_mode: 'replace'
    },
    fallbackMessage: 'Impossible de mettre a jour les agences.'
  },
  {
    label: 'adminUsersSetRole',
    run: () => adminUsersSetRole('user-5', 'agency_admin'),
    endpoint: 'users',
    expectedJson: { action: 'set_role', user_id: 'user-5', role: 'agency_admin' },
    validResponse: { ok: true, user_id: 'user-5', role: 'agency_admin' },
    fallbackMessage: 'Impossible de mettre a jour le role.'
  },
  {
    label: 'adminUsersUnarchive',
    run: () => adminUsersUnarchive('user-6'),
    endpoint: 'users',
    expectedJson: { action: 'unarchive', user_id: 'user-6' },
    validResponse: { ok: true, user_id: 'user-6', archived: false },
    fallbackMessage: "Impossible de reactiver l'utilisateur."
  },
  {
    label: 'adminUsersUpdateIdentity',
    run: () =>
      adminUsersUpdateIdentity({
        user_id: 'user-7',
        email: 'u7@cir.fr',
        first_name: 'Claire',
        last_name: 'Martin'
      }),
    endpoint: 'users',
    expectedJson: {
      action: 'update_identity',
      user_id: 'user-7',
      email: 'u7@cir.fr',
      first_name: 'Claire',
      last_name: 'Martin'
    },
    validResponse: {
      ok: true,
      user_id: 'user-7',
      email: 'u7@cir.fr',
      first_name: 'Claire',
      last_name: 'Martin',
      display_name: 'Martin Claire'
    },
    fallbackMessage: "Impossible de mettre a jour l'identite de l'utilisateur."
  }
];

describe('admin RPC wrappers', () => {
  it.each(cases)('$label builds expected payload and parser behavior', async (scenario) => {
    mockSafeRpc.mockReturnValue({} as never);
    scenario.run();

    const [call, parser, fallback] = mockSafeRpc.mock.calls.at(-1) as [
      SafeRpcCall,
      SafeRpcParser,
      string
    ];
    const { client, usersPost, agenciesPost } = createAdminRpcClient();
    await call(client, { headers: { 'x-request-id': 'admin-test' } });

    const targetPost = scenario.endpoint === 'users' ? usersPost : agenciesPost;
    expect(targetPost).toHaveBeenCalledWith(
      {
        json: scenario.expectedJson
      },
      { headers: { 'x-request-id': 'admin-test' } }
    );
    expect(fallback).toBe(scenario.fallbackMessage);

    expect(parser(scenario.validResponse)).toEqual(scenario.validResponse);
    expect(() => parser(null)).toThrowError();
  });
});
