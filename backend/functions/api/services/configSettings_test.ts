import { assertEquals, assertThrows } from 'std/assert';
import {
  assertValidStatusCategories,
  buildStatusUpsertRows,
  normalizeLabelList
} from './configSettings.ts';

Deno.test('normalizeLabelList trims whitespace', () => {
  assertEquals(normalizeLabelList(['  foo  ', 'bar']), ['foo', 'bar']);
});

Deno.test('normalizeLabelList drops empty and whitespace-only labels', () => {
  assertEquals(normalizeLabelList(['', '   ', 'a']), ['a']);
});

Deno.test('normalizeLabelList dedupes case-insensitively and keeps first occurrence casing', () => {
  assertEquals(normalizeLabelList(['Foo', 'foo', 'FOO', 'bar']), ['Foo', 'bar']);
});

Deno.test('normalizeLabelList preserves order', () => {
  assertEquals(normalizeLabelList(['c', 'a', 'b']), ['c', 'a', 'b']);
});

Deno.test('assertValidStatusCategories accepts known categories', () => {
  assertValidStatusCategories([
    { id: undefined, label: 'A', category: 'todo' },
    { id: undefined, label: 'B', category: 'in_progress' },
    { id: undefined, label: 'C', category: 'done' }
  ]);
});

Deno.test('assertValidStatusCategories throws on unknown category', () => {
  assertThrows(
    () => assertValidStatusCategories([
      { id: undefined, label: 'X', category: 'bogus' }
    ]),
    Error,
    'Categorie de statut invalide'
  );
});

Deno.test('buildStatusUpsertRows sets sort_order by index and flags first as default', () => {
  const rows = buildStatusUpsertRows(
    [
      { id: undefined, label: 'Nouveau', category: 'todo' },
      { id: undefined, label: 'En cours', category: 'in_progress' }
    ],
    'agency-1',
    []
  );
  assertEquals(rows.length, 2);
  assertEquals(rows[0].sort_order, 1);
  assertEquals(rows[0].is_default, true);
  assertEquals(rows[0].is_terminal, false);
  assertEquals(rows[1].sort_order, 2);
  assertEquals(rows[1].is_default, false);
});

Deno.test('buildStatusUpsertRows marks done category as terminal', () => {
  const rows = buildStatusUpsertRows(
    [{ id: undefined, label: 'Termine', category: 'done' }],
    'agency-1',
    []
  );
  assertEquals(rows[0].is_terminal, true);
});

Deno.test('buildStatusUpsertRows preserves explicit id when provided', () => {
  const rows = buildStatusUpsertRows(
    [{ id: 'explicit-id', label: 'A', category: 'todo' }],
    'agency-1',
    []
  );
  assertEquals(rows[0].id, 'explicit-id');
});

Deno.test('buildStatusUpsertRows resolves id by matching existing label case-insensitively', () => {
  const rows = buildStatusUpsertRows(
    [{ id: undefined, label: 'Nouveau', category: 'todo' }],
    'agency-1',
    [{ id: 'existing-id', label: 'nouveau' }]
  );
  assertEquals(rows[0].id, 'existing-id');
});

Deno.test('buildStatusUpsertRows leaves id undefined for new labels with no existing match', () => {
  const rows = buildStatusUpsertRows(
    [{ id: undefined, label: 'Nouveau', category: 'todo' }],
    'agency-1',
    [{ id: 'other-id', label: 'Autre' }]
  );
  assertEquals(rows[0].id, undefined);
});

Deno.test('buildStatusUpsertRows trims label whitespace', () => {
  const rows = buildStatusUpsertRows(
    [{ id: undefined, label: '  Nouveau  ', category: 'todo' }],
    'agency-1',
    []
  );
  assertEquals(rows[0].label, 'Nouveau');
});

Deno.test('buildStatusUpsertRows sets agency_id on every row', () => {
  const rows = buildStatusUpsertRows(
    [
      { id: undefined, label: 'A', category: 'todo' },
      { id: undefined, label: 'B', category: 'in_progress' }
    ],
    'agency-42',
    []
  );
  for (const row of rows) {
    assertEquals(row.agency_id, 'agency-42');
  }
});
