import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ClientDirectoryPage from '../ClientDirectoryPage';

const mockNavigate = vi.fn();
const searchState = {
  q: 'sea',
  type: 'all' as const,
  agencyIds: [],
  departments: [],
  city: undefined,
  cirCommercialIds: [],
  includeArchived: false,
  page: 1,
  pageSize: 50,
  sorting: [{ id: 'name' as const, desc: false }]
};

const clientRow = {
  id: 'entity-1',
  entity_type: 'Client',
  client_number: '98568547',
  account_type: 'cash' as const,
  name: 'Test comptant',
  city: 'Mérignac',
  department: '33',
  agency_id: 'agency-1',
  agency_name: 'CIR Bordeaux',
  cir_commercial_id: null,
  cir_commercial_name: null,
  archived_at: null,
  updated_at: '2026-03-07T10:00:00.000Z'
};

const prospectRow = {
  ...clientRow,
  id: 'prospect-1',
  entity_type: 'Prospect',
  client_number: null,
  account_type: null
};

const mockMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
};

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => searchState
}));

vi.mock('@/hooks/useAppSession', () => ({
  useAppSessionStateContext: vi.fn(() => ({
    session: { user: { id: 'user-1', email: 'admin@example.com' } },
    profile: { role: 'super_admin' },
    activeAgencyId: 'agency-1'
  }))
}));

vi.mock('@/hooks/useDirectoryPage', () => ({
  useDirectoryPage: vi.fn(() => ({
    isFetching: false,
    isPending: false,
    data: {
      rows: [clientRow, prospectRow],
      total: 2,
      page: 1,
      page_size: 50
    }
  }))
}));

vi.mock('@/hooks/useDirectoryOptions', () => ({
  useDirectoryOptions: vi.fn(() => ({
    data: { commercials: [], departments: [] },
    isFetching: false
  }))
}));

vi.mock('@/hooks/useAgencies', () => ({
  useAgencies: vi.fn(() => ({ data: [] }))
}));

vi.mock('@/hooks/useSaveClient', () => ({
  useSaveClient: vi.fn(() => ({ mutateAsync: vi.fn() }))
}));

vi.mock('@/hooks/useSaveProspect', () => ({
  useSaveProspect: vi.fn(() => ({ mutateAsync: vi.fn() }))
}));

vi.mock('@/hooks/useDirectorySavedViews', () => ({
  useDirectorySavedViews: vi.fn(() => ({ data: { views: [] }, isLoading: false }))
}));

vi.mock('@/hooks/useSaveDirectorySavedView', () => ({
  useSaveDirectorySavedView: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
}));

vi.mock('@/hooks/useDeleteDirectorySavedView', () => ({
  useDeleteDirectorySavedView: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
}));

vi.mock('@/hooks/useSetDefaultDirectorySavedView', () => ({
  useSetDefaultDirectorySavedView: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
}));

vi.mock('../ClientDirectoryFilters', () => ({
  default: () => <div data-testid="directory-filters" />
}));

vi.mock('../DirectorySavedViewsBar', () => ({
  default: () => <div data-testid="directory-saved-views" />
}));

vi.mock('../ClientDirectoryTable', () => ({
  default: ({ onOpenRecord }: { onOpenRecord: (row: typeof clientRow | typeof prospectRow) => void }) => (
    <div>
      <button type="button" onClick={() => onOpenRecord(clientRow)}>Ouvrir client</button>
      <button type="button" onClick={() => onOpenRecord(prospectRow)}>Ouvrir prospect</button>
    </div>
  )
}));

vi.mock('@/components/ClientFormDialog', () => ({
  default: () => null
}));

vi.mock('@/components/ProspectFormDialog', () => ({
  default: () => null
}));

describe('ClientDirectoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia();
  });

  it('opens a client detail route while preserving directory search params', async () => {
    const user = userEvent.setup();

    render(<ClientDirectoryPage />);

    await user.click(screen.getByRole('button', { name: /ouvrir client/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients/$clientNumber',
      params: { clientNumber: '98568547' },
      search: expect.any(Function)
    });

    const navigateCall = mockNavigate.mock.calls.at(-1)?.[0];
    expect(navigateCall?.search()).toEqual(searchState);
  });

  it('opens a prospect detail route while preserving directory search params', async () => {
    const user = userEvent.setup();

    render(<ClientDirectoryPage />);

    await user.click(screen.getByRole('button', { name: /ouvrir prospect/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients/prospects/$prospectId',
      params: { prospectId: 'prospect-1' },
      search: expect.any(Function)
    });

    const navigateCall = mockNavigate.mock.calls.at(-1)?.[0];
    expect(navigateCall?.search()).toEqual(searchState);
  });

  it('opens the integrated create route while preserving directory search', async () => {
    const user = userEvent.setup();

    render(<ClientDirectoryPage />);

    await user.click(screen.getByRole('button', { name: /nouvelle fiche/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients/new',
      search: expect.any(Function)
    });

    const navigateCall = mockNavigate.mock.calls.at(-1)?.[0];
    expect(navigateCall?.search()).toEqual(searchState);
  });
});
