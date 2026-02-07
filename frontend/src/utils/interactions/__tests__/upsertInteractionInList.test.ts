import { describe, expect, it } from 'vitest';

import { upsertInteractionInList } from '@/utils/interactions/upsertInteractionInList';
import type { Interaction } from '@/types';

const makeInteraction = (id: string, subject = 'subject') =>
  ({ id, subject } as Interaction);

describe('upsertInteractionInList', () => {
  it('adds to empty list', () => {
    const result = upsertInteractionInList([], makeInteraction('1'));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('prepends when item is new', () => {
    const list = [makeInteraction('1')];
    const result = upsertInteractionInList(list, makeInteraction('2'));
    expect(result[0].id).toBe('2');
    expect(result).toHaveLength(2);
  });

  it('replaces when item exists', () => {
    const list = [makeInteraction('1', 'old')];
    const result = upsertInteractionInList(list, makeInteraction('1', 'new'));
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('new');
  });
});
