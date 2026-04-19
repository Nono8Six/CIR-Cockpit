import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/test-utils';
import { useDirectoryCompanyDetails } from '@/hooks/useDirectoryCompanyDetails';
import { useNotifyError } from '@/hooks/useNotifyError';
import { getDirectoryCompanyDetails } from '@/services/directory/getDirectoryCompanyDetails';
import type { DirectoryCompanyDetailsResponse } from 'shared/schemas/api-responses';

vi.mock('@/services/directory/getDirectoryCompanyDetails', () => ({
  getDirectoryCompanyDetails: vi.fn(),
}));

vi.mock('@/hooks/useNotifyError', () => ({
  useNotifyError: vi.fn(),
}));

const buildWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseDirectoryCompanyDetailsTestWrapper';
  return Wrapper;
};

const companyDetailsResponse: DirectoryCompanyDetailsResponse = {
  ok: true,
  company: {
    siren: '123456789',
    official_name: 'Acme SAS',
    name: 'Acme',
    sigle: null,
    nature_juridique: null,
    categorie_entreprise: null,
    date_creation: null,
    etat_administratif: null,
    activite_principale: null,
    activite_principale_naf25: null,
    section_activite_principale: null,
    company_establishments_count: null,
    company_open_establishments_count: null,
    employee_range: null,
    employee_range_year: null,
    is_employer: null,
    diffusion_status: null,
    directors: [],
    financials: null,
    signals: {
      association: false,
      ess: false,
      qualiopi: false,
      rge: false,
      bio: false,
      organisme_formation: false,
      service_public: false,
      societe_mission: false,
    },
  },
};

describe('useDirectoryCompanyDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches company details when siren has 9 digits', async () => {
    vi.mocked(getDirectoryCompanyDetails).mockResolvedValue(companyDetailsResponse);

    const { result } = renderHook(() => useDirectoryCompanyDetails({ siren: '123456789' }), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getDirectoryCompanyDetails).toHaveBeenCalledWith({ siren: '123456789' });
  });

  it('does not run query when siren is too short', async () => {
    vi.mocked(getDirectoryCompanyDetails).mockResolvedValue(companyDetailsResponse);

    renderHook(() => useDirectoryCompanyDetails({ siren: '12345' }), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => {
      expect(getDirectoryCompanyDetails).not.toHaveBeenCalled();
    });
  });

  it('does not run query when disabled', async () => {
    vi.mocked(getDirectoryCompanyDetails).mockResolvedValue(companyDetailsResponse);

    renderHook(() => useDirectoryCompanyDetails({ siren: '123456789' }, false), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => {
      expect(getDirectoryCompanyDetails).not.toHaveBeenCalled();
    });
  });

  it('trims whitespace before checking length', async () => {
    vi.mocked(getDirectoryCompanyDetails).mockResolvedValue(companyDetailsResponse);

    const { result } = renderHook(
      () => useDirectoryCompanyDetails({ siren: '  123456789  ' }),
      { wrapper: buildWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getDirectoryCompanyDetails).toHaveBeenCalledWith({ siren: '123456789' });
  });

  it('forwards query errors to useNotifyError', async () => {
    vi.mocked(getDirectoryCompanyDetails).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useDirectoryCompanyDetails({ siren: '123456789' }), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(useNotifyError).toHaveBeenCalled();
  });
});
