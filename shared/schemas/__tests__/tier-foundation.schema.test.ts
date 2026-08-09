import { describe, expect, it } from 'vitest';

import {
  businessProfileTypeSchema,
  customerAccountSchema,
  organizationBusinessProfileSetSchema,
  organizationClassificationSchema,
  tierDirectoryListInputSchema,
  tierOrganizationReadSchema,
  tierRoleSchema
} from '../entity/tier-foundation.schema.ts';

const entityId = '11111111-1111-4111-8111-111111111111';
const agencyId = '22222222-2222-4222-8222-222222222222';
const commercialId = '33333333-3333-4333-8333-333333333333';
const rowId = '44444444-4444-4444-8444-444444444444';
const now = '2026-08-08T08:00:00.000Z';

const legacyAccount = {
  id: rowId,
  entity_id: entityId,
  client_number: '0123456',
  account_type: 'term',
  account_status: null,
  agency_id: agencyId,
  primary_commercial_id: null,
  number_authority: 'erp_as400',
  status_authority: 'erp_as400',
  source_system: 'entities_compatibility',
  source_record_id: entityId,
  source_synced_at: null,
  archived_at: null,
  created_by: null,
  created_at: now,
  updated_at: now
};

const primaryProfile = {
  id: rowId,
  entity_id: entityId,
  profile_code: 'integrator',
  is_primary: true,
  valid_from: now,
  valid_to: null,
  source_system: 'canonical',
  source_record_id: 'profile-source-1',
  created_by: commercialId,
  created_at: now,
  updated_at: now
};

const provenance = {
  source_system: 'entities_compatibility',
  source_record_id: entityId,
  authority: 'compatibility',
  synced_at: null
};

const canonicalTierRead = {
  id: entityId,
  legacy_entity_id: entityId,
  name: 'Client historique',
  legal_form_code: null,
  naf_code: null,
  city: 'Bordeaux',
  primary_phone: null,
  primary_email: null,
  archived_at: null,
  created_at: now,
  updated_at: now,
  roles: [
    {
      id: rowId,
      code: 'client',
      label: 'Client',
      is_active_reference: true,
      valid_from: now,
      valid_to: null,
      provenance
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      code: 'prospect',
      label: 'Prospect',
      is_active_reference: true,
      valid_from: '2026-01-01T00:00:00.000Z',
      valid_to: now,
      provenance: { ...provenance, source_record_id: 'prospect-history' }
    }
  ],
  customer_account_state: 'available',
  customer_account: {
    id: rowId,
    client_number: '0123456',
    account_type: 'term',
    account_status: null,
    agency: { id: agencyId, name: 'Agence Bordeaux' },
    primary_commercial: null,
    secondary_commercials: [{
      id: commercialId,
      display_name: 'Commercial secondaire',
      email: 'secondaire@cir.fr'
    }],
    number_authority: 'erp_as400',
    status_authority: 'erp_as400',
    archived_at: null,
    provenance
  },
  responsible_agency: { id: agencyId, name: 'Agence Bordeaux' },
  primary_commercial_state: 'missing',
  business_profiles: {
    state: 'reference_data_missing',
    primary: null,
    secondary: []
  },
  missing_data: ['primary_commercial', 'business_profile_reference'],
  provenance: {
    source_system: 'entities',
    source_record_id: entityId,
    authority: 'cir_cockpit',
    synced_at: null
  },
  compatibility: {
    entity_type: 'Client',
    agency_id: agencyId,
    cir_commercial_id: null,
    client_number: '0123456',
    account_type: 'term'
  }
};

describe('TA-1 tier foundation contracts', () => {
  it('keeps role, legal form, NAF and business profile as distinct strict concepts', () => {
    expect(tierRoleSchema.safeParse({
      id: rowId,
      entity_id: entityId,
      role_code: 'client',
      valid_from: now,
      valid_to: null,
      source_system: 'entities_compatibility',
      source_record_id: entityId,
      created_by: null,
      created_at: now,
      updated_at: now
    }).success).toBe(true);

    expect(organizationClassificationSchema.safeParse({
      entity_id: entityId,
      legal_form_code: '5710',
      naf_code: '43.21G'
    }).success).toBe(true);

    expect(businessProfileTypeSchema.safeParse({
      code: 'machine_builder',
      label: 'Constructeur de machines',
      description: null,
      is_active: true,
      sort_order: 10,
      created_at: now,
      updated_at: now,
      role_code: 'client'
    }).success).toBe(false);
  });

  it('accepts an explicitly sourced compatibility account without inventing a commercial', () => {
    expect(customerAccountSchema.safeParse(legacyAccount).success).toBe(true);
  });

  it('requires one principal commercial on the canonical account path', () => {
    const result = customerAccountSchema.safeParse({
      ...legacyAccount,
      source_system: 'canonical'
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Commercial principal requis');

    expect(customerAccountSchema.safeParse({
      ...legacyAccount,
      source_system: 'canonical',
      primary_commercial_id: commercialId
    }).success).toBe(true);
  });

  it('requires exactly one primary profile whenever active profiles exist', () => {
    expect(organizationBusinessProfileSetSchema.safeParse([
      primaryProfile,
      {
        ...primaryProfile,
        id: '55555555-5555-4555-8555-555555555555',
        profile_code: 'machine_builder',
        is_primary: false,
        source_record_id: 'profile-source-2'
      }
    ]).success).toBe(true);

    expect(organizationBusinessProfileSetSchema.safeParse([
      { ...primaryProfile, is_primary: false }
    ]).success).toBe(false);

    expect(organizationBusinessProfileSetSchema.safeParse([
      primaryProfile,
      {
        ...primaryProfile,
        id: '55555555-5555-4555-8555-555555555555',
        profile_code: 'machine_builder',
        source_record_id: 'profile-source-2'
      }
    ]).success).toBe(false);
  });

  it('validates canonical reads with multiple temporal roles and missing governed data', () => {
    const parsed = tierOrganizationReadSchema.safeParse(canonicalTierRead);

    expect(parsed.success).toBe(true);
    expect(parsed.data?.roles).toHaveLength(2);
    expect(parsed.data?.customer_account?.secondary_commercials).toHaveLength(1);
    expect(parsed.data?.customer_account?.primary_commercial).toBeNull();
    expect(parsed.data?.business_profiles.state).toBe('reference_data_missing');
  });

  it('accepts one primary and several secondary governed business profiles', () => {
    const readProfile = {
      id: rowId,
      code: 'integrator',
      label: 'Integrateur',
      is_primary: true,
      valid_from: now,
      valid_to: null,
      provenance: { ...provenance, authority: 'cir_cockpit' }
    };
    const result = tierOrganizationReadSchema.safeParse({
      ...canonicalTierRead,
      business_profiles: {
        state: 'available',
        primary: readProfile,
        secondary: [{
          ...readProfile,
          id: '66666666-6666-4666-8666-666666666666',
          code: 'machine_builder',
          label: 'Constructeur de machines',
          is_primary: false
        }]
      },
      missing_data: ['primary_commercial']
    });

    expect(result.success).toBe(true);
    expect(result.data?.business_profiles.secondary).toHaveLength(1);
  });

  it('rejects unknown fields and inconsistent explicit states', () => {
    expect(tierOrganizationReadSchema.safeParse({
      ...canonicalTierRead,
      invented_profile: 'constructeur'
    }).success).toBe(false);

    expect(tierOrganizationReadSchema.safeParse({
      ...canonicalTierRead,
      customer_account_state: 'available',
      customer_account: null
    }).success).toBe(false);
  });

  it('bounds directory scopes, filters and pagination with strict French validation', () => {
    expect(tierDirectoryListInputSchema.safeParse({
      scope: { mode: 'selected_agencies', agencyIds: [agencyId] },
      role_codes: ['client', 'supplier'],
      business_profile_codes: ['integrator'],
      primary_commercial: 'missing',
      page: 2,
      page_size: 25
    }).success).toBe(true);

    expect(tierDirectoryListInputSchema.safeParse({ page_size: 500 }).success).toBe(false);
    expect(tierDirectoryListInputSchema.safeParse({ role_codes: ['client', 'client'] }).success).toBe(false);
    const unknown = tierDirectoryListInputSchema.safeParse({ registry: ['client'] });
    expect(unknown.success).toBe(false);
    expect(unknown.error?.issues[0]?.code).toBe('unrecognized_keys');
  });
});
