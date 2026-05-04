import { assert, assertEquals, assertStringIncludes, assertThrows } from 'std/assert';
import { PgDialect } from 'drizzle-orm/pg-core';

import type { AuthContext } from '../types.ts';
import {
  buildBaseWhereClause,
  buildListWhereClause,
  toAccessibleAgencyCondition,
  resolveDirectoryScope,
  toRoleScopedAgencyCondition,
  type SqlCondition
} from './directoryShared.ts';

const dialect = new PgDialect();

const superAdminContext: AuthContext = {
  userId: 'user-super',
  role: 'super_admin',
  agencyIds: [],
  activeAgencyId: '33333333-3333-3333-3333-333333333333',
  isSuperAdmin: true
};

const memberOneAgencyContext: AuthContext = {
  userId: 'user-member',
  role: 'tcs',
  agencyIds: ['11111111-1111-1111-1111-111111111111'],
  activeAgencyId: '11111111-1111-1111-1111-111111111111',
  isSuperAdmin: false
};

const memberTwoAgenciesContext: AuthContext = {
  userId: 'user-multi',
  role: 'agency_admin',
  agencyIds: [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  ],
  activeAgencyId: '11111111-1111-1111-1111-111111111111',
  isSuperAdmin: false
};

const memberZeroAgenciesContext: AuthContext = {
  userId: 'user-orphan',
  role: 'tcs',
  agencyIds: [],
  activeAgencyId: null,
  isSuperAdmin: false
};

const renderCondition = (condition: SqlCondition | undefined) => {
  if (condition === undefined) {
    return null;
  }
  return dialect.sqlToQuery(condition);
};

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = Reflect.get(value, 'code');
  return typeof candidate === 'string' ? candidate : undefined;
};

// --- toRoleScopedAgencyCondition (fix: directory.record visibility) ---

Deno.test('toRoleScopedAgencyCondition returns undefined for super admin (no agency filter)', () => {
  const condition = toRoleScopedAgencyCondition(superAdminContext);
  assertEquals(condition, undefined);
});

Deno.test('toRoleScopedAgencyCondition denies access when the user has no agencies', () => {
  const rendered = renderCondition(toRoleScopedAgencyCondition(memberZeroAgenciesContext));
  assert(rendered, 'expected a SQL condition for orphan member');
  assertStringIncludes(rendered.sql, 'false');
  assertEquals(rendered.params, []);
});

Deno.test('toRoleScopedAgencyCondition restricts to the single accessible agency', () => {
  const rendered = renderCondition(toRoleScopedAgencyCondition(memberOneAgencyContext));
  assert(rendered, 'expected a SQL condition for single-agency member');
  assertStringIncludes(rendered.sql, '"agency_id"');
  assertEquals(rendered.params, ['11111111-1111-1111-1111-111111111111']);
});

Deno.test('toRoleScopedAgencyCondition restricts to all accessible agencies when the user has many', () => {
  const rendered = renderCondition(toRoleScopedAgencyCondition(memberTwoAgenciesContext));
  assert(rendered, 'expected a SQL condition for multi-agency member');
  assertStringIncludes(rendered.sql.toLowerCase(), ' in ');
  assertEquals(rendered.params, [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  ]);
});

// --- toAccessibleAgencyCondition (regression guard for the listing semantic) ---

Deno.test('toAccessibleAgencyCondition keeps the explicit-choice semantic for super admin without filter', () => {
  const rendered = renderCondition(toAccessibleAgencyCondition(superAdminContext, []));
  assert(rendered, 'expected a SQL condition (super admin without agencyIds must match no rows)');
  assertStringIncludes(rendered.sql, 'false');
});

Deno.test('toAccessibleAgencyCondition narrows super admin to the requested agency', () => {
  const rendered = renderCondition(
    toAccessibleAgencyCondition(superAdminContext, ['33333333-3333-3333-3333-333333333333'])
  );
  assert(rendered, 'expected a SQL condition');
  assertEquals(rendered.params, ['33333333-3333-3333-3333-333333333333']);
});

Deno.test('toAccessibleAgencyCondition falls back to membership for members without explicit agencyIds', () => {
  const rendered = renderCondition(toAccessibleAgencyCondition(memberOneAgencyContext, []));
  assert(rendered, 'expected a SQL condition');
  assertEquals(rendered.params, ['11111111-1111-1111-1111-111111111111']);
});

Deno.test('toAccessibleAgencyCondition rejects cross-agency reads requested by a member', () => {
  assertThrows(() =>
    toAccessibleAgencyCondition(memberOneAgencyContext, ['33333333-3333-3333-3333-333333333333'])
  );
});

Deno.test('resolveDirectoryScope resolves active agency from the authenticated context', () => {
  assertEquals(
    resolveDirectoryScope(memberTwoAgenciesContext, { mode: 'active_agency' }),
    {
      mode: 'single_agency',
      agencyIds: ['11111111-1111-1111-1111-111111111111'],
      isGlobal: false
    }
  );
});

Deno.test('resolveDirectoryScope rejects implicit global directory reads', () => {
  assertThrows(
    () => resolveDirectoryScope(superAdminContext, { mode: 'all_accessible_agencies' }),
    Error,
    'Scope annuaire trop large'
  );
});

Deno.test('directory list and option where clauses reject all_accessible_agencies', () => {
  assertThrows(() =>
    buildListWhereClause(superAdminContext, {
      scope: { mode: 'all_accessible_agencies' },
      type: 'all',
      filters: {
        departments: [],
        cirCommercialIds: [],
        includeArchived: false
      },
      pagination: {
        page: 1,
        pageSize: 50,
        includeTotal: false
      },
      sorting: [{ id: 'name', desc: false }]
    })
  );

  assertThrows(() =>
    buildBaseWhereClause(superAdminContext, {
      scope: { mode: 'all_accessible_agencies' },
      type: 'all',
      includeArchived: false
    })
  );
});

Deno.test('resolveDirectoryScope rejects selected agencies outside membership with AUTH_FORBIDDEN', () => {
  const error = assertThrows(() =>
    resolveDirectoryScope(memberOneAgencyContext, {
      mode: 'selected_agencies',
      agencyIds: ['33333333-3333-3333-3333-333333333333']
    })
  );

  assertEquals(readCode(error), 'AUTH_FORBIDDEN');
});

Deno.test('resolveDirectoryScope can resolve all accessible only when explicitly allowed', () => {
  assertEquals(
    resolveDirectoryScope(memberTwoAgenciesContext, { mode: 'all_accessible_agencies' }, { allowAllAccessible: true }),
    {
      mode: 'multi_agency',
      agencyIds: [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222'
      ],
      isGlobal: false
    }
  );
});
