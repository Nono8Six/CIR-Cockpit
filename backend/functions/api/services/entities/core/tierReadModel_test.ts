import { assertEquals, assertThrows } from 'std/assert';

import type { AuthContext } from '../../../types.ts';
import { resolveTierDirectoryScope, toTierContactReads } from './tierReadModel.ts';

const agencyA = '11111111-1111-4111-8111-111111111111';
const agencyB = '22222222-2222-4222-8222-222222222222';

const authContext = (overrides: Partial<AuthContext> = {}): AuthContext => ({
  userId: '33333333-3333-4333-8333-333333333333',
  role: 'tcs',
  agencyIds: [agencyA],
  activeAgencyId: agencyA,
  isSuperAdmin: false,
  ...overrides
});

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const code = Reflect.get(value, 'code');
  return typeof code === 'string' ? code : undefined;
};

Deno.test('tier directory scope keeps active, other-agency and super-admin permissions explicit', () => {
  assertEquals(resolveTierDirectoryScope(authContext(), {
    scope: { mode: 'active_agency' }
  }), {
    mode: 'single_agency',
    agencyIds: [agencyA],
    isGlobal: false
  });

  const forbidden = assertThrows(() => resolveTierDirectoryScope(authContext(), {
    scope: { mode: 'selected_agencies', agencyIds: [agencyB] }
  }));
  assertEquals(readCode(forbidden), 'AUTH_FORBIDDEN');

  assertEquals(resolveTierDirectoryScope(authContext({
    role: 'super_admin',
    isSuperAdmin: true,
    agencyIds: [] as string[],
    activeAgencyId: null
  }), {
    scope: { mode: 'all_accessible_agencies' }
  }), {
    mode: 'global_read',
    agencyIds: [],
    isGlobal: true
  });
});

Deno.test('canonical contact reads preserve historical ids and reject invented fields by construction', () => {
  const contactId = '44444444-4444-4444-8444-444444444444';
  const entityId = '55555555-5555-4555-8555-555555555555';
  const now = '2026-08-08T08:00:00.000Z';
  const [contact] = toTierContactReads([{
    id: contactId,
    entity_id: entityId,
    first_name: null,
    last_name: 'Martin',
    email: null,
    phone: null,
    position: null,
    service_label: null,
    is_primary: true,
    notes: null,
    archived_at: null,
    created_at: now,
    updated_at: now
  }]);

  assertEquals(contact.id, contactId);
  assertEquals(contact.organization_id, entityId);
  assertEquals(contact.legacy_entity_id, entityId);
  assertEquals(contact.provenance.source_system, 'entity_contacts');
});
