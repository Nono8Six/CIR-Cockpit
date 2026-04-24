import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRecentOwnInteractions } from '@/hooks/useRecentOwnInteractions';
import { Channel, type Interaction } from '@/types';

const buildInteraction = (overrides: Partial<Interaction>): Interaction => ({
  id: overrides.id ?? 'interaction-id',
  agency_id: overrides.agency_id ?? 'agency-1',
  channel: overrides.channel ?? Channel.PHONE,
  company_name: overrides.company_name ?? 'ACME',
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
  subject: overrides.subject ?? 'Sujet',
  timeline: overrides.timeline ?? [],
  updated_at: overrides.updated_at ?? '2026-04-19T10:00:00.000Z',
  updated_by: overrides.updated_by ?? null
});

describe('useRecentOwnInteractions', () => {
  it('returns empty array when userId is null', () => {
    const interactions = [buildInteraction({ id: 'a', created_by: 'user-1' })];
    const { result } = renderHook(() => useRecentOwnInteractions(interactions, null));
    expect(result.current).toEqual([]);
  });

  it('filters interactions by created_by and sorts by created_at desc', () => {
    const interactions = [
      buildInteraction({ id: 'a', created_by: 'user-2', created_at: '2026-04-19T12:00:00.000Z' }),
      buildInteraction({ id: 'b', created_by: 'user-1', created_at: '2026-04-19T10:00:00.000Z' }),
      buildInteraction({ id: 'c', created_by: 'user-1', created_at: '2026-04-19T11:00:00.000Z' })
    ];
    const { result } = renderHook(() => useRecentOwnInteractions(interactions, 'user-1'));
    expect(result.current.map((item) => item.id)).toEqual(['c', 'b']);
  });

  it('limits the number of returned interactions', () => {
    const interactions = Array.from({ length: 7 }).map((_, index) =>
      buildInteraction({
        id: `interaction-${index}`,
        created_by: 'user-1',
        created_at: new Date(Date.UTC(2026, 3, 19, 10, index)).toISOString()
      })
    );
    const { result } = renderHook(() => useRecentOwnInteractions(interactions, 'user-1', 3));
    expect(result.current).toHaveLength(3);
    expect(result.current.map((item) => item.id)).toEqual([
      'interaction-6',
      'interaction-5',
      'interaction-4'
    ]);
  });
});
