import { describe, expect, it } from 'vitest';

import {
  QUERY_ROOTS,
  auditLogsRootKey,
  clientsRootKey,
  entitySearchIndexRootKey,
  interactionsKey,
  interactionsRootKey
} from '@/services/query/queryKeys';

describe('queryKeys', () => {
  it('exposes stable root keys', () => {
    expect(interactionsRootKey()).toEqual([QUERY_ROOTS.interactions]);
    expect(clientsRootKey()).toEqual([QUERY_ROOTS.clients]);
    expect(entitySearchIndexRootKey()).toEqual([QUERY_ROOTS.entitySearchIndex]);
    expect(auditLogsRootKey()).toEqual([QUERY_ROOTS.auditLogs]);
  });

  it('normalizes interactions key when agency id is missing', () => {
    expect(interactionsKey(null)).toEqual([QUERY_ROOTS.interactions, 'none']);
  });
});
