import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ClientDirectoryDrawerRoute from '../ClientDirectoryDrawerRoute';

const mockNavigate = vi.fn();
const mockHistoryBack = vi.fn();

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
  city: 'Merignac',
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

const mockMatchMedia = (isDesktopDrawer = true) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 1280px)' ? isDesktopDrawer : false,
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
  useNavigate: () => mockNavigate
}));

vi.mock('../ClientDirectoryWorkspace', () => ({
  default: ({
    onOpenRecord,
    onCreateRecord,
    detailPane
  }: {
    onOpenRecord: (row: typeof clientRow | typeof prospectRow, search: typeof searchState) => void;
    onCreateRecord: (search: typeof searchState) => void;
    detailPane?: ReactNode;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenRecord(clientRow, searchState)}>Ouvrir client drawer</button>
      <button type="button" onClick={() => onOpenRecord(prospectRow, searchState)}>Ouvrir prospect drawer</button>
      <button type="button" onClick={() => onCreateRecord(searchState)}>Nouvelle fiche drawer</button>
      {detailPane}
    </div>
  )
}));

vi.mock('../ClientDirectoryRecordDetails', () => ({
  default: ({
    onClose,
    routeRef,
    surface
  }: {
    onClose?: () => void;
    routeRef: { kind: string };
    surface: string;
  }) => (
    <div>
      <span>{routeRef.kind}</span>
      <span>{surface}</span>
      <button type="button" onClick={() => onClose?.()}>Fermer detail</button>
    </div>
  )
}));

describe('ClientDirectoryDrawerRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window.history, 'back').mockImplementation(mockHistoryBack);
    Object.defineProperty(window.history, 'length', {
      configurable: true,
      value: 1
    });
    mockMatchMedia(true);
  });

  it('redirects to the canonical detail route below xl', async () => {
    mockMatchMedia(false);

    render(<ClientDirectoryDrawerRoute routeRef={{ kind: 'client', clientNumber: '98568547' }} search={searchState} />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/clients/$clientNumber',
        params: { clientNumber: '98568547' },
        replace: true
      });
    });
  });

  it('replaces the current drawer route when opening another record', async () => {
    const user = userEvent.setup();

    render(<ClientDirectoryDrawerRoute routeRef={{ kind: 'client', clientNumber: '98568547' }} search={searchState} />);

    await user.click(screen.getByRole('button', { name: /ouvrir prospect drawer/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients/prospects/$prospectId/drawer',
      params: { prospectId: 'prospect-1' },
      search: expect.any(Function),
      replace: true,
      mask: {
        to: '/clients/prospects/$prospectId',
        params: { prospectId: 'prospect-1' }
      }
    });

    const navigateCall = mockNavigate.mock.calls.at(-1)?.[0];
    expect(navigateCall?.search()).toEqual(searchState);
  });

  it('returns to the list with preserved search when the drawer closes without history', async () => {
    const user = userEvent.setup();

    render(<ClientDirectoryDrawerRoute routeRef={{ kind: 'client', clientNumber: '98568547' }} search={searchState} />);

    await user.click(screen.getByRole('button', { name: /fermer detail/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/clients',
      search: expect.any(Function),
      replace: true
    });

    const navigateCall = mockNavigate.mock.calls.at(-1)?.[0];
    expect(navigateCall?.search()).toEqual(searchState);
  });

  it('uses history.back when the drawer closes with a previous entry available', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window.history, 'length', {
      configurable: true,
      value: 2
    });

    render(<ClientDirectoryDrawerRoute routeRef={{ kind: 'client', clientNumber: '98568547' }} search={searchState} />);

    await user.click(screen.getByRole('button', { name: /fermer detail/i }));

    expect(mockHistoryBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
