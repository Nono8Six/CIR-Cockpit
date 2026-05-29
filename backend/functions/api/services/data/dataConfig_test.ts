import { assertEquals, assertThrows } from 'std/assert';

import {
  assertValidStatusCategories,
  buildStatusUpsertRows,
  normalizeLabelList,
  resolveStatusDeleteMode
} from './dataConfig.ts';

Deno.test('normalizeLabelList trims values and deduplicates case-insensitively', () => {
  const normalized = normalizeLabelList(['  SAV ', 'sav', 'Commerce', ' ', 'COMMERCE']);
  assertEquals(normalized, ['SAV', 'Commerce']);
});

Deno.test('assertValidStatusCategories rejects unsupported categories', () => {
  const invalidStatuses = [
    { label: 'A traiter', category: 'todo' },
    { label: 'Invalide', category: 'blocked' }
  ];

  assertThrows(
    () => assertValidStatusCategories(invalidStatuses as Parameters<typeof assertValidStatusCategories>[0]),
    Error,
    'Categorie de statut invalide'
  );
});

Deno.test('buildStatusUpsertRows reuses existing ids by label and marks first as default', () => {
  const rows = buildStatusUpsertRows(
    [
      { label: 'A traiter', category: 'todo' },
      { id: 'explicit-id', label: 'Termine', category: 'done' }
    ] as Parameters<typeof buildStatusUpsertRows>[0],
    'agency-1',
    [{ id: 'existing-id', label: 'A traiter', is_active: true }]
  );

  assertEquals(rows, [
    {
      id: 'existing-id',
      agency_id: 'agency-1',
      label: 'A traiter',
      sort_order: 1,
      is_default: true,
      category: 'todo',
      is_terminal: false,
      is_active: true,
      deactivated_at: null
    },
    {
      id: 'explicit-id',
      agency_id: 'agency-1',
      label: 'Termine',
      sort_order: 2,
      is_default: false,
      category: 'done',
      is_terminal: true,
      is_active: true,
      deactivated_at: null
    }
  ]);
});

Deno.test('resolveStatusDeleteMode deletes unused statuses physically', () => {
  assertEquals(resolveStatusDeleteMode(0, 2), 'delete');
});

Deno.test('resolveStatusDeleteMode deactivates used statuses', () => {
  assertEquals(resolveStatusDeleteMode(3, 2), 'deactivate');
});

Deno.test('resolveStatusDeleteMode rejects deleting the last active status', () => {
  assertThrows(
    () => resolveStatusDeleteMode(0, 1),
    Error,
    'Au moins un statut actif est requis'
  );
});
