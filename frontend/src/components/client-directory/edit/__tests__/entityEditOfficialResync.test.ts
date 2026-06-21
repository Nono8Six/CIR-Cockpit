import { describe, expect, it } from 'vitest';

import {
  buildManualOfficialSearchQuery,
  buildOfficialResyncDiffs,
  buildPersistedOfficialIdentityValues,
  getOfficialResyncIdentityBase
} from '../entityEditPanel.utils';
import type { EntityEditFormValues } from '../entityEditPanel.schema';
import type { DirectoryRecord } from '../../../../../../shared/schemas/system/directory.schema';

const baseValues: Pick<
  EntityEditFormValues,
  | 'siret'
  | 'siren'
  | 'naf_code'
  | 'official_name'
  | 'official_data_source'
  | 'official_data_synced_at'
  | 'address'
  | 'postal_code'
  | 'department'
  | 'city'
> = {
  siret: '',
  siren: '123456789',
  naf_code: '6201Z',
  official_name: 'ACME',
  official_data_source: null,
  official_data_synced_at: '',
  address: '1 rue actuelle',
  postal_code: '33000',
  department: '33',
  city: 'Bordeaux'
};

describe('buildOfficialResyncDiffs', () => {
  it('lists only fields whose official value differs from the current form value', () => {
    const diffs = buildOfficialResyncDiffs(baseValues, {
      siren: '123456789',
      naf_code: '7112B',
      official_name: 'ACME OFFICIEL'
    });

    expect(diffs).toEqual([
      {
        field: 'naf_code',
        label: 'Code NAF',
        currentValue: '6201Z',
        officialValue: '7112B'
      },
      {
        field: 'official_name',
        label: 'Nom officiel',
        currentValue: 'ACME',
        officialValue: 'ACME OFFICIEL'
      }
    ]);
  });

  it('renders empty current values as readable text', () => {
    const diffs = buildOfficialResyncDiffs(baseValues, {
      siret: '12345678900011'
    });

    expect(diffs[0]).toMatchObject({
      field: 'siret',
      currentValue: 'Non renseigné',
      officialValue: '12345678900011'
    });
  });
});

describe('getOfficialResyncIdentityBase', () => {
  const baseRecord = {
    siren: '',
    siret: ''
  } as DirectoryRecord;

  it('uses the persisted SIREN as the deterministic identity base', () => {
    expect(getOfficialResyncIdentityBase({
      ...baseRecord,
      siren: '123 456 789',
      siret: '99999999900011'
    })).toEqual({
      siren: '123456789',
      label: 'SIREN 123456789'
    });
  });

  it('falls back to the persisted SIRET legal-unit prefix when SIREN is missing', () => {
    expect(getOfficialResyncIdentityBase({
      ...baseRecord,
      siret: '123 456 789 00011'
    })).toEqual({
      siren: '123456789',
      label: 'SIREN 123456789 extrait du SIRET 12345678900011'
    });
  });

  it('returns null when the record has no saved deterministic company identifier', () => {
    expect(getOfficialResyncIdentityBase(baseRecord)).toBeNull();
  });
});

describe('buildManualOfficialSearchQuery', () => {
  it('builds an official search query from the manual company context', () => {
    expect(buildManualOfficialSearchQuery({
      name: '  ACME  ',
      address: '1 rue actuelle',
      postal_code: '33000',
      city: 'Bordeaux'
    })).toBe('ACME 1 rue actuelle 33000 Bordeaux');
  });
});

describe('buildPersistedOfficialIdentityValues', () => {
  it('uses persisted identifiers so a manual official attachment exposes the SIREN diff', () => {
    expect(buildPersistedOfficialIdentityValues(
      { siren: '', siret: '' } as DirectoryRecord,
      {
        ...baseValues,
        siren: '123456789'
      }
    ).siren).toBe('');
  });
});
