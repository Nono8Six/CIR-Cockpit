import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryListRow, DirectorySearchState } from 'shared/schemas/directory.schema';

import AdminSuppliersPage from '@/components/admin-suppliers/AdminSuppliersPage';
import { useAppSessionStateContext } from '@/hooks/useAppSession';
import { useDirectoryPage } from '@/hooks/useDirectoryPage';
import { useDirectorySavedViews } from '@/hooks/useDirectorySavedViews';
import { useDeleteSupplier, useSaveSupplier, useSetSupplierArchived } from '@/hooks/useSaveSupplier';

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  to: string;
};

const mockNavigate = vi.fn();
const defaultSearchState: DirectorySearchState = {
  q: undefined,
  type: 'supplier',
  scope: { mode: 'all_accessible_agencies' },
  departments: [],
  city: undefined,
  cirCommercialIds: [],
  includeArchived: false,
  page: 1,
  pageSize: 50,
  sorting: [{ id: 'name', desc: false }]
};
let searchState = { ...defaultSearchState };

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: MockLinkProps) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useSearch: () => searchState
}));

vi.mock('@/hooks/useAppSession', () => ({
  useAppSessionStateContext: vi.fn()
}));

vi.mock('@/hooks/useDirectoryPage', () => ({
  useDirectoryPage: vi.fn()
}));

vi.mock('@/hooks/useDirectoryOptionAgencies', () => ({
  useDirectoryOptionAgencies: vi.fn(() => ({ data: { agencies: [] } }))
}));

vi.mock('@/hooks/useDirectoryOptionDepartments', () => ({
  useDirectoryOptionDepartments: vi.fn(() => ({ data: { departments: [] } }))
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

vi.mock('@/hooks/useSaveSupplier', () => ({
  useSaveSupplier: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useSetSupplierArchived: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteSupplier: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
}));

vi.mock('@/hooks/useSetDefaultDirectorySavedView', () => ({
  useSetDefaultDirectorySavedView: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
}));

vi.mock('@/components/client-directory/ClientDirectoryFilters', () => ({
  default: ({
    searchDraft,
    searchPlaceholder,
    onSearchDraftChange,
    onSearchPatch,
    showCommercialFilter,
    showTypeFilter
  }: {
    searchDraft: string;
    searchPlaceholder: string;
    onSearchDraftChange: (value: string) => void;
    onSearchPatch: (patch: Partial<DirectorySearchState>) => void;
    showCommercialFilter: boolean;
    showTypeFilter: boolean;
  }) => (
    <div>
      <input
        aria-label="Recherche annuaire"
        placeholder={searchPlaceholder}
        value={searchDraft}
        onChange={(event) => onSearchDraftChange(event.target.value)}
        onBlur={(event) => onSearchPatch({ q: event.target.value, page: 1 })}
      />
      <span data-testid="supplier-filter-flags">
        {showCommercialFilter ? 'commercial' : 'no-commercial'}-{showTypeFilter ? 'type' : 'no-type'}
      </span>
    </div>
  )
}));

vi.mock('@/components/client-directory/DirectorySavedViewsBar', () => ({
  default: () => <div data-testid="supplier-saved-views" />
}));

vi.mock('@/components/admin-suppliers/AdminSuppliersTable', () => ({
  default: ({ rows, onSortChange, onPageChange, onPageSizeChange, onEditSupplier, onArchiveSupplier, onDeleteSupplier, canHardDelete }: {
    rows: DirectoryListRow[];
    onSortChange: (sorting: DirectorySearchState['sorting']) => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    onEditSupplier: (row: DirectoryListRow) => void;
    onArchiveSupplier: (row: DirectoryListRow) => void;
    onDeleteSupplier: (row: DirectoryListRow) => void;
    canHardDelete: boolean;
  }) => (
    <div>
      {rows.map((row) => <span key={row.id}>{row.name}</span>)}
      <button type="button" onClick={() => onSortChange([{ id: 'supplier_code', desc: false }])}>Trier code</button>
      <button type="button" onClick={() => onPageChange(2)}>Page 2</button>
      <button type="button" onClick={() => onPageSizeChange(100)}>100 lignes</button>
      <button type="button" onClick={() => onEditSupplier(rows[0])}>Modifier fournisseur</button>
      <button type="button" onClick={() => onArchiveSupplier(rows[0])}>Archiver fournisseur</button>
      {canHardDelete ? <button type="button" onClick={() => onDeleteSupplier(rows[0])}>Supprimer fournisseur</button> : null}
    </div>
  )
}));

const supplierRow = (overrides: Partial<DirectoryListRow> = {}): DirectoryListRow => ({
  id: 'supplier-1',
  entity_type: 'Fournisseur',
  client_kind: null,
  client_number: null,
  supplier_code: 'SUP1',
  supplier_number: '1001',
  account_type: null,
  name: 'Meca Service',
  city: 'Bordeaux',
  postal_code: '33000',
  department: '33',
  siret: '12345678900011',
  siren: '123456789',
  naf_code: '33.12Z',
  official_name: 'MECA SERVICE',
  primary_phone: '0556000000',
  primary_email: 'contact@meca.test',
  agency_id: null,
  agency_name: null,
  cir_commercial_id: null,
  cir_commercial_name: null,
  archived_at: null,
  updated_at: '2026-01-02T00:00:00.000Z',
  ...overrides
});

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

beforeEach(() => {
  vi.clearAllMocks();
  searchState = { ...defaultSearchState };
  mockMatchMedia();
  vi.mocked(useAppSessionStateContext).mockReturnValue({
    session: { user: { id: 'user-1' } },
    profile: { role: 'agency_admin' },
    activeAgencyId: 'agency-1'
  } as ReturnType<typeof useAppSessionStateContext>);
  vi.mocked(useDirectoryPage).mockReturnValue({
    data: {
      rows: [supplierRow()],
      total: 1,
      page: 1,
      page_size: 50
    },
    isFetching: false,
    isPending: false
  } as unknown as ReturnType<typeof useDirectoryPage>);
  vi.mocked(useSaveSupplier).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useSaveSupplier>);
  vi.mocked(useSetSupplierArchived).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useSetSupplierArchived>);
  vi.mocked(useDeleteSupplier).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useDeleteSupplier>);
});

describe('AdminSuppliersPage', () => {
  it('loads the supplier grid with supplier-only search and saved views', () => {
    render(<AdminSuppliersPage />);

    expect(screen.getByRole('heading', { name: /fournisseurs/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /nouveau fournisseur/i })).toHaveAttribute('href', '/admin/suppliers/new');
    expect(screen.getByText('Meca Service')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/SIRET, SIREN/i)).toBeInTheDocument();
    expect(screen.getByTestId('supplier-filter-flags')).toHaveTextContent('no-commercial-no-type');
    expect(useDirectoryPage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'supplier',
        scope: { mode: 'all_accessible_agencies' },
        filters: expect.objectContaining({ cirCommercialIds: [] })
      }),
      true
    );
    expect(useDirectorySavedViews).toHaveBeenCalledWith('suppliers', true);
  });

  it('updates URL search state for supplier search, sorting and pagination', async () => {
    const user = userEvent.setup();
    render(<AdminSuppliersPage />);

    await user.type(screen.getByLabelText(/recherche annuaire/i), 'Lille');
    await user.tab();
    await user.click(screen.getByRole('button', { name: /trier code/i }));
    await user.click(screen.getByRole('button', { name: /page 2/i }));
    await user.click(screen.getByRole('button', { name: /100 lignes/i }));

    const navigateCalls = mockNavigate.mock.calls.map((call) => call[0]);
    expect(navigateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ search: expect.any(Function) })
      ])
    );
    const patches = navigateCalls.map((call) => call.search({}));
    expect(patches).toEqual(expect.arrayContaining([
      expect.objectContaining({ q: 'Lille', page: 1, type: 'supplier', scope: { mode: 'all_accessible_agencies' }, cirCommercialIds: [] }),
      expect.objectContaining({ sorting: [{ id: 'supplier_code', desc: false }], page: 1, type: 'supplier', scope: { mode: 'all_accessible_agencies' } }),
      expect.objectContaining({ page: 2, type: 'supplier', scope: { mode: 'all_accessible_agencies' } }),
      expect.objectContaining({ pageSize: 100, page: 1, type: 'supplier', scope: { mode: 'all_accessible_agencies' } })
    ]));
  });

  it('blocks supplier management for tcs users', () => {
    vi.mocked(useAppSessionStateContext).mockReturnValue({
      session: { user: { id: 'user-1' } },
      profile: { role: 'tcs' },
      activeAgencyId: 'agency-1'
    } as ReturnType<typeof useAppSessionStateContext>);

    render(<AdminSuppliersPage />);

    expect(screen.getByText(/réservée aux administrateurs/i)).toBeInTheDocument();
  });

  it('opens supplier edit and archive actions from a row', async () => {
    const user = userEvent.setup();
    const saveMutateAsync = vi.fn().mockResolvedValue(supplierRow());
    const archiveMutateAsync = vi.fn().mockResolvedValue(supplierRow({ archived_at: '2026-01-03T00:00:00.000Z' }));
    vi.mocked(useSaveSupplier).mockReturnValue({ mutateAsync: saveMutateAsync, isPending: false } as unknown as ReturnType<typeof useSaveSupplier>);
    vi.mocked(useSetSupplierArchived).mockReturnValue({ mutateAsync: archiveMutateAsync, isPending: false } as unknown as ReturnType<typeof useSetSupplierArchived>);

    render(<AdminSuppliersPage />);

    await user.click(screen.getByRole('button', { name: /modifier fournisseur/i }));
    await user.clear(screen.getByLabelText(/^nom fournisseur$/i));
    await user.type(screen.getByLabelText(/^nom fournisseur$/i), 'Meca Service Sud');
    await user.click(screen.getByRole('button', { name: /^enregistrer$/i }));

    expect(saveMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      id: 'supplier-1',
      entity_type: 'Fournisseur',
      name: 'Meca Service Sud'
    }));

    await user.click(screen.getByRole('button', { name: /archiver fournisseur/i }));
    await user.click(screen.getByRole('button', { name: /^archiver$/i }));

    expect(archiveMutateAsync).toHaveBeenCalledWith({ supplierId: 'supplier-1', archived: true });
  });
});
