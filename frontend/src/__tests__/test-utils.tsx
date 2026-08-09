import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import type { TierOrganizationRead } from '../../../shared/schemas/entity/tier-foundation.schema';

type TestRenderOptions = RenderOptions & {
  queryClient?: QueryClient;
};

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

export const renderWithProviders = (
  ui: ReactElement,
  { queryClient, ...options }: TestRenderOptions = {}
) => {
  const client = queryClient ?? createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient: client
  };
};

type TierRoleCode = 'client' | 'prospect' | 'supplier';

export const buildTierOrganizationRead = (
  roleCodes: TierRoleCode[] = ['client'],
  overrides: Partial<TierOrganizationRead> = {}
): TierOrganizationRead => {
  const isClient = roleCodes.includes('client');
  const entityId = overrides.id ?? '11111111-1111-4111-8111-111111111111';
  const agency = { id: '22222222-2222-4222-8222-222222222222', name: 'CIR Bordeaux' };
  const provenance = {
    source_system: 'entities',
    source_record_id: entityId,
    authority: 'compatibility' as const,
    synced_at: null
  };

  return {
    id: entityId,
    legacy_entity_id: entityId,
    name: 'SEA',
    legal_form_code: null,
    naf_code: null,
    city: 'Gradignan',
    primary_phone: null,
    primary_email: null,
    archived_at: null,
    created_at: '2026-03-07T10:00:00.000Z',
    updated_at: '2026-03-07T10:00:00.000Z',
    roles: roleCodes.map((code, index) => ({
      id: `33333333-3333-4333-8333-33333333333${index}`,
      code,
      label: code === 'client' ? 'Client' : code === 'prospect' ? 'Prospect' : 'Fournisseur',
      is_active_reference: true,
      valid_from: '2026-03-07T10:00:00.000Z',
      valid_to: null,
      provenance
    })),
    customer_account_state: isClient ? 'available' : 'not_applicable',
    customer_account: isClient ? {
      id: '44444444-4444-4444-8444-444444444444',
      client_number: '116277',
      account_type: 'cash',
      account_status: null,
      agency,
      primary_commercial: null,
      secondary_commercials: [],
      number_authority: 'erp_as400',
      status_authority: 'erp_as400',
      archived_at: null,
      provenance
    } : null,
    responsible_agency: agency,
    primary_commercial_state: isClient ? 'missing' : 'not_applicable',
    business_profiles: { state: 'reference_data_missing', primary: null, secondary: [] },
    missing_data: isClient
      ? ['primary_commercial', 'business_profile_reference']
      : ['business_profile_reference'],
    provenance,
    compatibility: {
      entity_type: isClient ? 'Client' : roleCodes.includes('supplier') ? 'Fournisseur' : 'Prospect',
      agency_id: agency.id,
      cir_commercial_id: null,
      client_number: isClient ? '116277' : null,
      account_type: isClient ? 'cash' : null
    },
    ...overrides
  };
};
