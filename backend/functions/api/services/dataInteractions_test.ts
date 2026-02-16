import { assertEquals } from 'std/assert';

import { normalizeInteractionUpdates } from './dataInteractions.ts';

Deno.test('normalizeInteractionUpdates keeps only whitelisted keys', () => {
  const normalized = normalizeInteractionUpdates({
    status: '  En cours  ',
    status_id: 'a6a8c6d2-5adf-4d56-b4aa-f6854699886a',
    order_ref: '  DOS-12 ',
    reminder_at: '2026-02-16T10:00:00.000Z',
    notes: '  note interne  ',
    entity_id: 'b6a8c6d2-5adf-4d56-b4aa-f6854699886a',
    contact_id: null,
    last_action_at: '2026-02-16T11:00:00.000Z',
    status_is_terminal: true,
    mega_families: ['A', 'B'],
    unknown_key: 'ignored'
  } as unknown as Parameters<typeof normalizeInteractionUpdates>[0]);

  assertEquals(normalized, {
    status: 'En cours',
    status_id: 'a6a8c6d2-5adf-4d56-b4aa-f6854699886a',
    order_ref: 'DOS-12',
    reminder_at: '2026-02-16T10:00:00.000Z',
    notes: 'note interne',
    entity_id: 'b6a8c6d2-5adf-4d56-b4aa-f6854699886a',
    contact_id: null,
    last_action_at: '2026-02-16T11:00:00.000Z',
    status_is_terminal: true,
    mega_families: ['A', 'B']
  });
});

Deno.test('normalizeInteractionUpdates drops invalid or empty values', () => {
  const normalized = normalizeInteractionUpdates({
    status: '   ',
    order_ref: '',
    reminder_at: null,
    notes: '   ',
    entity_id: undefined,
    contact_id: '   ',
    last_action_at: '',
    status_is_terminal: 'yes',
    mega_families: ['A', 42]
  } as unknown as Parameters<typeof normalizeInteractionUpdates>[0]);

  assertEquals(normalized, {
    contact_id: null,
    order_ref: null,
    reminder_at: null,
    notes: null
  });
});
