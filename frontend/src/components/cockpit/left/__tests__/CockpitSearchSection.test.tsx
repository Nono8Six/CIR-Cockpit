import { createRef, type ComponentProps, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CockpitSearchSection from '@/components/cockpit/left/CockpitSearchSection';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock
}));

vi.mock('@/components/InteractionSearchBar', () => ({
  default: ({ onCreateEntity, createLabel, createDisabled, createMode, inlineCreateSlot, showTypeBadge }: {
    onCreateEntity?: () => void;
    createLabel?: string;
    createDisabled?: boolean;
    createMode?: 'dialog' | 'inline' | 'none';
    inlineCreateSlot?: ReactNode | ((controls: { onCancel: () => void }) => ReactNode);
    showTypeBadge?: boolean;
  }) => (
    <div
      data-testid="interaction-search-bar"
      data-show-type-badge={String(showTypeBadge)}
      data-create-mode={createMode}
    >
      {createLabel ? (
        <button type="button" onClick={onCreateEntity} disabled={createDisabled || (createMode !== 'inline' && !onCreateEntity)}>
          {createLabel}
        </button>
      ) : null}
      {typeof inlineCreateSlot === 'function' ? inlineCreateSlot({ onCancel: vi.fn() }) : inlineCreateSlot}
    </div>
  )
}));

const renderSection = (props: ComponentProps<typeof CockpitSearchSection>) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CockpitSearchSection {...props} />
    </QueryClientProvider>
  );
};

const buildProps = (
  overrides: Partial<ComponentProps<typeof CockpitSearchSection>> = {}
): ComponentProps<typeof CockpitSearchSection> => ({
  activeAgencyId: 'agency-1',
  entityType: 'Prospect',
  entitySearchIndex: { entities: [], contacts: [] },
  entitySearchLoading: false,
  recentEntities: [],
  relationMode: 'prospect',
  onSelectEntityFromSearch: vi.fn(),
  onSelectContactFromSearch: vi.fn(),
  onSelectUnifiedSearchResult: vi.fn(),
  onOpenClientDialog: vi.fn(),
  onOpenProspectDialog: vi.fn(),
  onOpenGlobalSearch: undefined,
  searchInputRef: createRef<HTMLInputElement>(),
  ...overrides
});

describe('CockpitSearchSection', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it('ouvre la creation prospect quand le mode prospect demande une creation', async () => {
    const user = userEvent.setup();
    const onOpenClientDialog = vi.fn();
    const onOpenProspectDialog = vi.fn();

    renderSection(buildProps({ onOpenClientDialog, onOpenProspectDialog }));

    await user.click(screen.getByRole('button', { name: 'Créer un prospect' }));

    expect(onOpenProspectDialog).toHaveBeenCalledTimes(1);
    expect(onOpenClientDialog).not.toHaveBeenCalled();
  });

  it('ouvre la creation client en mode particulier quand la relation est particulier', async () => {
    const user = userEvent.setup();
    const onOpenClientDialog = vi.fn();

    renderSection(buildProps({
      entityType: 'Particulier',
      relationMode: 'individual',
      onOpenClientDialog
    }));

    const createButton = screen.getByRole('button', { name: 'Créer un particulier' });
    expect(createButton).toBeEnabled();

    await user.click(createButton);

    expect(onOpenClientDialog).toHaveBeenCalledWith('individual');
  });

  it('ouvre la création fournisseur complète depuis le cockpit', async () => {
    const user = userEvent.setup();
    renderSection(buildProps({ relationMode: 'supplier', entityType: 'Fournisseur' }));

    expect(screen.getByTestId('interaction-search-bar')).toHaveAttribute('data-create-mode', 'dialog');
    expect(screen.getByRole('button', { name: 'Créer un fournisseur' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Créer un fournisseur' }));
    expect(navigateMock).toHaveBeenCalledWith({ to: '/admin/suppliers/new' });
  });

  it('active toujours les badges type pour les resultats cross-type', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <CockpitSearchSection {...buildProps({ entityType: '', relationMode: 'other' })} />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('interaction-search-bar')).toHaveAttribute(
      'data-show-type-badge',
      'true'
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <CockpitSearchSection {...buildProps({ entityType: 'Prospect', relationMode: 'prospect' })} />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('interaction-search-bar')).toHaveAttribute(
      'data-show-type-badge',
      'true'
    );
  });
});
