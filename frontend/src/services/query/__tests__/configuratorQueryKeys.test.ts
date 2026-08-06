import { describe, expect, it } from 'vitest';

import {
  QUERY_ROOTS,
  configuratorMotorAdviceKey,
  configuratorMotorCatalogGetKey,
  configuratorMotorCatalogListKey,
  configuratorMotorCompareKey,
  configuratorMotorEnergyKey,
  configuratorMotorEquivalentsFromMotorKey,
  configuratorMotorEquivalentsFromSpecKey,
  configuratorMotorRootKey
} from '@/services/query/queryKeys';

describe('clefs de cache Configurateurs moteur', () => {
  it('partagent une racine unique, invalidable en une fois lors d une activation', () => {
    const root = QUERY_ROOTS.configuratorMotor;

    expect(configuratorMotorRootKey()).toEqual([root]);
    for (const key of [
      configuratorMotorCatalogListKey({ limit: 25 } as never),
      configuratorMotorCatalogGetKey(null),
      configuratorMotorEquivalentsFromMotorKey(null),
      configuratorMotorEquivalentsFromSpecKey(null),
      configuratorMotorAdviceKey(null),
      configuratorMotorEnergyKey(null),
      configuratorMotorCompareKey(null)
    ]) {
      expect(key[0]).toBe(root);
    }
  });

  it('separe chaque route par un segment distinct', () => {
    const segments = [
      configuratorMotorCatalogListKey({ limit: 25 } as never)[1],
      configuratorMotorCatalogGetKey(null)[1],
      configuratorMotorEquivalentsFromMotorKey(null)[1],
      configuratorMotorEquivalentsFromSpecKey(null)[1],
      configuratorMotorAdviceKey(null)[1],
      configuratorMotorEnergyKey(null)[1],
      configuratorMotorCompareKey(null)[1]
    ];

    expect(new Set(segments).size).toBe(7);
  });

  it('n embarque pas le snapshot : il est resolu par le backend a chaque lecture', () => {
    expect(JSON.stringify(configuratorMotorCatalogListKey({ limit: 25 } as never))).not.toContain(
      'snapshot'
    );
  });

  it('reduit la clef des conseils aux identites, pour rester stable', () => {
    const key = configuratorMotorAdviceKey({
      candidate: { candidate: { operating_point_id: '412' } },
      energy: { motor: { operating_point_id: '999' } }
    } as never);

    expect(key).toEqual([QUERY_ROOTS.configuratorMotor, 'advice', '412', '999']);
  });

  it('distingue deux comparaisons par l ordre demande des moteurs', () => {
    const first = configuratorMotorCompareKey({ operating_point_ids: ['1', '2'] } as never);
    const second = configuratorMotorCompareKey({ operating_point_ids: ['2', '1'] } as never);

    expect(first).not.toEqual(second);
  });

  it('distingue deux pages de catalogue par leur curseur', () => {
    const first = configuratorMotorCatalogListKey({ limit: 25 } as never);
    const second = configuratorMotorCatalogListKey({ limit: 25, cursor: '412' } as never);

    expect(first).not.toEqual(second);
  });
});
