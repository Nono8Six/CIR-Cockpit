import { createRef, type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CockpitSearchSection from '@/components/cockpit/left/CockpitSearchSection';

vi.mock('@/components/InteractionSearchBar', () => ({
  default: ({ onCreateEntity, showTypeBadge }: {
    onCreateEntity?: () => void;
    showTypeBadge?: boolean;
  }) => (
    <div data-testid="interaction-search-bar" data-show-type-badge={String(showTypeBadge)}>
      {onCreateEntity ? (
        <button type="button" onClick={onCreateEntity}>
          Créer
        </button>
      ) : null}
    </div>
  )
}));

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
  onOpenClientDialog: vi.fn(),
  onOpenProspectDialog: vi.fn(),
  onOpenGlobalSearch: undefined,
  searchInputRef: createRef<HTMLInputElement>(),
  ...overrides
});

describe('CockpitSearchSection', () => {
  it('ouvre la creation prospect quand le mode prospect demande une creation', async () => {
    const user = userEvent.setup();
    const onOpenClientDialog = vi.fn();
    const onOpenProspectDialog = vi.fn();

    render(
      <CockpitSearchSection
        {...buildProps({ onOpenClientDialog, onOpenProspectDialog })}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Créer' }));

    expect(onOpenProspectDialog).toHaveBeenCalledTimes(1);
    expect(onOpenClientDialog).not.toHaveBeenCalled();
  });

  it('ne propose pas de creation fournisseur tant que le contrat API est absent', () => {
    render(
      <CockpitSearchSection
        {...buildProps({ relationMode: 'supplier', entityType: 'Fournisseur' })}
      />
    );

    expect(screen.queryByRole('button', { name: 'Créer' })).not.toBeInTheDocument();
  });

  it('active les badges type uniquement quand la recherche est en mode Tout', () => {
    const { rerender } = render(
      <CockpitSearchSection {...buildProps({ entityType: '', relationMode: 'other' })} />
    );

    expect(screen.getByTestId('interaction-search-bar')).toHaveAttribute(
      'data-show-type-badge',
      'true'
    );

    rerender(
      <CockpitSearchSection {...buildProps({ entityType: 'Prospect', relationMode: 'prospect' })} />
    );

    expect(screen.getByTestId('interaction-search-bar')).toHaveAttribute(
      'data-show-type-badge',
      'false'
    );
  });
});
