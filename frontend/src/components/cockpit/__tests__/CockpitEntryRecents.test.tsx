import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CockpitEntryRecents from '@/components/cockpit/CockpitEntryRecents';
import { Channel, type Entity, type Interaction } from '@/types';

const buildInteraction = (overrides: Partial<Interaction> & { id: string }): Interaction => ({
  id: overrides.id,
  agency_id: overrides.agency_id ?? 'agency-1',
  channel: overrides.channel ?? Channel.PHONE,
  company_name: overrides.company_name ?? `Tiers ${overrides.id}`,
  contact_email: overrides.contact_email ?? null,
  contact_id: overrides.contact_id ?? null,
  contact_name: overrides.contact_name ?? '',
  contact_phone: overrides.contact_phone ?? null,
  contact_service: overrides.contact_service ?? '',
  created_at: overrides.created_at ?? '2026-04-19T10:00:00.000Z',
  created_by: overrides.created_by ?? 'user-1',
  entity_id: overrides.entity_id ?? null,
  entity_type: overrides.entity_type ?? 'Client',
  interaction_type: overrides.interaction_type ?? '',
  last_action_at: overrides.last_action_at ?? '2026-04-19T10:00:00.000Z',
  mega_families: overrides.mega_families ?? [],
  notes: overrides.notes ?? null,
  order_ref: overrides.order_ref ?? null,
  reminder_at: overrides.reminder_at ?? null,
  status: overrides.status ?? '',
  status_id: overrides.status_id ?? null,
  status_is_terminal: overrides.status_is_terminal ?? false,
  subject: overrides.subject ?? `Sujet ${overrides.id}`,
  timeline: overrides.timeline ?? [],
  updated_at: overrides.updated_at ?? '2026-04-19T10:00:00.000Z',
  updated_by: overrides.updated_by ?? null
});

const emptyEntities: Entity[] = [];

describe('CockpitEntryRecents', () => {
  it('renvoie null quand il n y a aucune saisie', () => {
    const { container } = render(
      <CockpitEntryRecents interactions={[]} entities={emptyEntities} onSelectRecent={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('rend un roving tabindex avec seulement le premier bouton focusable', () => {
    const interactions = [
      buildInteraction({ id: 'a' }),
      buildInteraction({ id: 'b' }),
      buildInteraction({ id: 'c' })
    ];
    render(
      <CockpitEntryRecents
        interactions={interactions}
        entities={emptyEntities}
        onSelectRecent={vi.fn()}
      />
    );

    const buttons = screen.getAllByTestId('cockpit-entry-recent-item');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute('tabindex', '0');
    expect(buttons[1]).toHaveAttribute('tabindex', '-1');
    expect(buttons[2]).toHaveAttribute('tabindex', '-1');
  });

  it('navigue avec ArrowDown / ArrowUp et boucle aux extremites', async () => {
    const user = userEvent.setup();
    const interactions = [
      buildInteraction({ id: 'a' }),
      buildInteraction({ id: 'b' }),
      buildInteraction({ id: 'c' })
    ];
    render(
      <CockpitEntryRecents
        interactions={interactions}
        entities={emptyEntities}
        onSelectRecent={vi.fn()}
      />
    );

    const buttons = screen.getAllByTestId('cockpit-entry-recent-item');
    act(() => {
      buttons[0].focus();
    });
    expect(buttons[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(buttons[1]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(buttons[2]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(buttons[0]).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(buttons[2]).toHaveFocus();
  });

  it('Home et End positionnent le focus sur les extremites', async () => {
    const user = userEvent.setup();
    const interactions = [
      buildInteraction({ id: 'a' }),
      buildInteraction({ id: 'b' }),
      buildInteraction({ id: 'c' })
    ];
    render(
      <CockpitEntryRecents
        interactions={interactions}
        entities={emptyEntities}
        onSelectRecent={vi.fn()}
      />
    );

    const buttons = screen.getAllByTestId('cockpit-entry-recent-item');
    act(() => {
      buttons[1].focus();
    });
    await user.keyboard('{Home}');
    expect(buttons[0]).toHaveFocus();

    await user.keyboard('{End}');
    expect(buttons[2]).toHaveFocus();
  });

  it('declenche onSelectRecent avec null entity quand l entity_id est absent', async () => {
    const user = userEvent.setup();
    const onSelectRecent = vi.fn();
    const interactions = [
      buildInteraction({ id: 'a', entity_id: null }),
      buildInteraction({ id: 'b', entity_id: null })
    ];
    render(
      <CockpitEntryRecents
        interactions={interactions}
        entities={emptyEntities}
        onSelectRecent={onSelectRecent}
      />
    );

    const buttons = screen.getAllByTestId('cockpit-entry-recent-item');
    await user.click(buttons[1]);

    expect(onSelectRecent).toHaveBeenCalledTimes(1);
    const [interactionArg, entityArg] = onSelectRecent.mock.calls[0];
    expect(interactionArg.id).toBe('b');
    expect(entityArg).toBeNull();
  });
});
