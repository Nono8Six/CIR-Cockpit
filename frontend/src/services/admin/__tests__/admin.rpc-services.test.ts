import { describe, expect, it, vi } from 'vitest';

import type { TrpcClient } from '@/services/api/trpcClient';
import { safeTrpc } from '@/services/api/safeTrpc';
import { archiveAdminAgency } from '@/services/admin/archiveAdminAgency';
import { createAdminAgency } from '@/services/admin/createAdminAgency';
import { hardDeleteAdminAgency } from '@/services/admin/hardDeleteAdminAgency';
import { renameAdminAgency } from '@/services/admin/renameAdminAgency';
import { unarchiveAdminAgency } from '@/services/admin/unarchiveAdminAgency';
import { archiveAdminUser } from '@/services/admin/archiveAdminUser';
import { bulkDeleteAdminUsers } from '@/services/admin/bulkDeleteAdminUsers';
import { createAdminUser } from '@/services/admin/createAdminUser';
import { deleteAdminUser } from '@/services/admin/deleteAdminUser';
import { resetAdminUserPassword } from '@/services/admin/resetAdminUserPassword';
import { setAdminUserMemberships } from '@/services/admin/setAdminUserMemberships';
import { setAdminUserRole } from '@/services/admin/setAdminUserRole';
import { unarchiveAdminUser } from '@/services/admin/unarchiveAdminUser';
import { updateAdminUserIdentity } from '@/services/admin/updateAdminUserIdentity';

vi.mock('../../api/safeTrpc');

type SafeRpcCall = Parameters<typeof safeTrpc>[0];
type SafeRpcParser = Parameters<typeof safeTrpc>[1];

type RpcCase = {
  label: string;
  run: () => unknown;
  endpoint: 'users' | 'agencies';
  expectedJson: Record<string, unknown>;
  validResponse: Record<string, unknown>;
  fallbackMessage: string;
};

const mockSafeRpc = vi.mocked(safeTrpc);

const createAdminTrpcClientFixture = () => {
  const usersPost = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  const agenciesPost = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

  const client = {
    data: {
      profile: { mutate: vi.fn() },
      config: { mutate: vi.fn() },
      entities: { mutate: vi.fn() },
      'entity-contacts': { mutate: vi.fn() },
      interactions: { mutate: vi.fn() }
    },
    admin: {
      users: { mutate: usersPost },
      agencies: { mutate: agenciesPost }
    }
  } as unknown as TrpcClient;

  return { client, usersPost, agenciesPost };
};

const cases: RpcCase[] = [
  {
    label: 'archiveAdminAgency',
    run: () => archiveAdminAgency('agency-1'),
    endpoint: 'agencies',
    expectedJson: { action: 'archive', agency_id: 'agency-1' },
    validResponse: { ok: true, agency: { id: 'agency-1', name: 'CIR Paris', archived_at: '2026-02-23T00:00:00.000Z' } },
    fallbackMessage: "Impossible d'archiver l'agence."
  },
  {
    label: 'createAdminAgency',
    run: () => createAdminAgency('CIR Paris'),
    endpoint: 'agencies',
    expectedJson: { action: 'create', name: 'CIR Paris' },
    validResponse: { ok: true, agency: { id: 'agency-2', name: 'CIR Paris', archived_at: null } },
    fallbackMessage: "Impossible de creer l'agence."
  },
  {
    label: 'hardDeleteAdminAgency',
    run: () => hardDeleteAdminAgency('agency-2'),
    endpoint: 'agencies',
    expectedJson: { action: 'hard_delete', agency_id: 'agency-2' },
    validResponse: { ok: true, agency_id: 'agency-2' },
    fallbackMessage: "Impossible de supprimer l'agence."
  },
  {
    label: 'renameAdminAgency',
    run: () => renameAdminAgency('agency-3', 'CIR Lyon'),
    endpoint: 'agencies',
    expectedJson: { action: 'rename', agency_id: 'agency-3', name: 'CIR Lyon' },
    validResponse: { ok: true, agency: { id: 'agency-3', name: 'CIR Lyon', archived_at: null } },
    fallbackMessage: "Impossible de renommer l'agence."
  },
  {
    label: 'unarchiveAdminAgency',
    run: () => unarchiveAdminAgency('agency-4'),
    endpoint: 'agencies',
    expectedJson: { action: 'unarchive', agency_id: 'agency-4' },
    validResponse: { ok: true, agency: { id: 'agency-4', name: 'CIR Lille', archived_at: null } },
    fallbackMessage: "Impossible de reactiver l'agence."
  },
  {
    label: 'archiveAdminUser',
    run: () => archiveAdminUser('user-1'),
    endpoint: 'users',
    expectedJson: { action: 'archive', user_id: 'user-1' },
    validResponse: { ok: true, user_id: 'user-1', archived: true },
    fallbackMessage: "Impossible d'archiver l'utilisateur."
  },
  {
    label: 'createAdminUser',
    run: () =>
      createAdminUser({
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
    label: 'deleteAdminUser',
    run: () => deleteAdminUser('user-2'),
    endpoint: 'users',
    expectedJson: { action: 'delete', user_id: 'user-2' },
    validResponse: { ok: true, user_id: 'user-2', deleted: true },
    fallbackMessage: "Impossible de supprimer l'utilisateur."
  },
  {
    label: 'bulkDeleteAdminUsers',
    run: () => bulkDeleteAdminUsers(['user-2', 'user-3']),
    endpoint: 'users',
    expectedJson: { action: 'bulk_delete', user_ids: ['user-2', 'user-3'] },
    validResponse: {
      ok: true,
      deleted: true,
      deleted_count: 2,
      user_ids: ['user-2', 'user-3'],
      anonymized_interactions: 0,
      anonymized_agency_ids: [],
      anonymized_orphan_interactions: 0
    },
    fallbackMessage: 'Impossible de supprimer les utilisateurs selectionnes.'
  },
  {
    label: 'resetAdminUserPassword',
    run: () => resetAdminUserPassword('user-3', 'Temp#123'),
    endpoint: 'users',
    expectedJson: { action: 'reset_password', user_id: 'user-3', password: 'Temp#123' },
    validResponse: { ok: true, user_id: 'user-3', temporary_password: 'Temp#123' },
    fallbackMessage: 'Impossible de reinitialiser le mot de passe.'
  },
  {
    label: 'setAdminUserMemberships',
    run: () => setAdminUserMemberships('user-4', ['agency-1', 'agency-2'], 'replace'),
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
    label: 'setAdminUserRole',
    run: () => setAdminUserRole('user-5', 'agency_admin'),
    endpoint: 'users',
    expectedJson: { action: 'set_role', user_id: 'user-5', role: 'agency_admin' },
    validResponse: { ok: true, user_id: 'user-5', role: 'agency_admin' },
    fallbackMessage: 'Impossible de mettre a jour le role.'
  },
  {
    label: 'unarchiveAdminUser',
    run: () => unarchiveAdminUser('user-6'),
    endpoint: 'users',
    expectedJson: { action: 'unarchive', user_id: 'user-6' },
    validResponse: { ok: true, user_id: 'user-6', archived: false },
    fallbackMessage: "Impossible de reactiver l'utilisateur."
  },
  {
    label: 'updateAdminUserIdentity',
    run: () =>
      updateAdminUserIdentity({
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
    const { client, usersPost, agenciesPost } = createAdminTrpcClientFixture();
    await call(client, { context: { headers: { 'x-request-id': 'admin-test' } } });

    const targetPost = scenario.endpoint === 'users' ? usersPost : agenciesPost;
    expect(targetPost).toHaveBeenCalledWith(scenario.expectedJson,
      { context: { headers: { 'x-request-id': 'admin-test' } } }
    );
    expect(fallback).toBe(scenario.fallbackMessage);

    expect(parser(scenario.validResponse)).toEqual(scenario.validResponse);
    expect(() => parser(null)).toThrowError();
  });
});
