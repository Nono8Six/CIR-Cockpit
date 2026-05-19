import { assertEquals, assertThrows } from 'std/assert';

import {
  assertValidStatusCategories,
  buildStatusUpsertRows,
  normalizeLabelList
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
    [{ id: 'existing-id', label: 'A traiter' }]
  );

  assertEquals(rows, [
    {
      id: 'existing-id',
      agency_id: 'agency-1',
      label: 'A traiter',
      sort_order: 1,
      is_default: true,
      category: 'todo',
      is_terminal: false
    },
    {
      id: 'explicit-id',
      agency_id: 'agency-1',
      label: 'Termine',
      sort_order: 2,
      is_default: false,
      category: 'done',
      is_terminal: true
    }
  ]);
});
