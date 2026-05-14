import { describe, expect, it } from 'vitest';

import {
  tierV1ClientCashPayloadSchema,
  tierV1ClientTermPayloadSchema,
  tierV1DirectoryListInputSchema,
  tierV1IndividualPayloadSchema,
  tierV1InternalCirQuickPayloadSchema,
  tierV1PayloadSchema,
  tierV1ProspectCompanyPayloadSchema,
  tierV1ProspectIndividualPayloadSchema,
  tierV1SearchInputSchema,
  tierV1SolicitationInteractionOnlyPayloadSchema,
  tierV1SupplierPayloadSchema
} from '../tier-v1.schema';

const agencyId = '11111111-1111-4111-8111-111111111111';
const cirAgencyId = '22222222-2222-4222-8222-222222222222';

const companyFields = {
  name: 'ACME',
  address: '1 rue de Paris',
  postal_code: '75001',
  department: '75',
  city: 'Paris',
  siret: '12345678901234',
  siren: '123456789',
  naf_code: '6201Z'
};

describe('tier V1 payload schemas', () => {
  it('accepts all V1 tier product payloads', () => {
    const payloads = [
      {
        tier_type: 'client_term',
        agency_id: agencyId,
        client_kind: 'company',
        account_type: 'term',
        client_number: '1001',
        primary_phone: '0102030405',
        ...companyFields
      },
      {
        tier_type: 'client_cash',
        agency_id: agencyId,
        client_kind: 'company',
        account_type: 'cash',
        client_number: '1002',
        primary_email: 'contact@example.com',
        ...companyFields
      },
      {
        tier_type: 'individual',
        agency_id: agencyId,
        client_kind: 'individual',
        account_type: 'cash',
        client_number: '1003',
        first_name: 'Alice',
        last_name: 'Martin',
        primary_phone: '0102030405'
      },
      {
        tier_type: 'prospect_company',
        agency_id: agencyId,
        name: 'Prospect SAS',
        primary_email: 'contact@prospect.example.com'
      },
      {
        tier_type: 'prospect_individual',
        agency_id: agencyId,
        first_name: 'Bruno',
        last_name: 'Durand',
        primary_phone: '0102030405'
      },
      {
        tier_type: 'supplier',
        agency_id: agencyId,
        name: 'SEA Aquitaine',
        primary_phone: '0102030405',
        supplier_code: 'sea1',
        supplier_number: '12345'
      },
      {
        tier_type: 'internal_cir_quick',
        agency_id: agencyId,
        first_name: 'Claire',
        last_name: 'CIR',
        cir_agency_id: cirAgencyId
      },
      {
        tier_type: 'solicitation_interaction_only',
        agency_id: agencyId,
        phone: '0102030405',
        display_name: ''
      }
    ];

    expect(payloads.every((payload) => tierV1PayloadSchema.safeParse(payload).success)).toBe(true);
  });

  it('keeps each specialized payload strict', () => {
    const result = tierV1ClientTermPayloadSchema.safeParse({
      tier_type: 'client_term',
      agency_id: agencyId,
      client_kind: 'company',
      account_type: 'term',
      client_number: '1001',
      primary_phone: '0102030405',
      unexpected: true,
      ...companyFields
    });

    expect(result.success).toBe(false);
  });

  it('rejects fields from another product type', () => {
    const result = tierV1ProspectIndividualPayloadSchema.safeParse({
      tier_type: 'prospect_individual',
      agency_id: agencyId,
      first_name: 'Alice',
      last_name: 'Martin',
      primary_email: 'alice@example.com',
      supplier_code: 'SUP1'
    });

    expect(result.success).toBe(false);
  });

  it('requires a contact method except for internal CIR quick records', () => {
    expect(tierV1SupplierPayloadSchema.safeParse({
      tier_type: 'supplier',
      agency_id: agencyId,
      name: 'SEA Aquitaine'
    }).success).toBe(false);

    expect(tierV1InternalCirQuickPayloadSchema.safeParse({
      tier_type: 'internal_cir_quick',
      agency_id: agencyId,
      first_name: 'Claire',
      last_name: 'CIR',
      cir_agency_id: cirAgencyId
    }).success).toBe(true);
  });

  it('keeps solicitation interaction-only and rejects entity fields', () => {
    expect(tierV1SolicitationInteractionOnlyPayloadSchema.safeParse({
      tier_type: 'solicitation_interaction_only',
      agency_id: agencyId,
      phone: '0102030405',
      entity_id: '33333333-3333-4333-8333-333333333333'
    }).success).toBe(false);
  });
});

describe('tier V1 search and directory contracts', () => {
  it('accepts strict unified search filters', () => {
    expect(tierV1SearchInputSchema.safeParse({
      query: 'acme',
      family: 'clients',
      client_filter: 'term',
      prospect_filter: 'all',
      include_archived: false,
      limit: 20
    }).success).toBe(true);
  });

  it('rejects legacy shortcut fields on V1 directory input', () => {
    expect(tierV1DirectoryListInputSchema.safeParse({
      query: 'acme',
      family: 'all',
      agencyIds: [agencyId]
    }).success).toBe(false);
  });

  it('keeps individual and company product contracts separate', () => {
    expect(tierV1IndividualPayloadSchema.safeParse({
      tier_type: 'individual',
      agency_id: agencyId,
      client_kind: 'individual',
      account_type: 'term',
      client_number: '1003',
      first_name: 'Alice',
      last_name: 'Martin',
      primary_phone: '0102030405'
    }).success).toBe(false);

    expect(tierV1ClientCashPayloadSchema.safeParse({
      tier_type: 'client_cash',
      agency_id: agencyId,
      client_kind: 'company',
      account_type: 'cash',
      client_number: '1002',
      primary_phone: '0102030405',
      ...companyFields
    }).success).toBe(true);
  });

  it('keeps prospect company and client term contracts distinct', () => {
    expect(tierV1ProspectCompanyPayloadSchema.safeParse({
      tier_type: 'prospect_company',
      agency_id: agencyId,
      name: 'Prospect SAS',
      client_number: '1004',
      primary_email: 'contact@prospect.example.com'
    }).success).toBe(false);
  });
});
