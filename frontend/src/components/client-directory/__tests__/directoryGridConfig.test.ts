import { describe, expect, it } from 'vitest';

import {
  buildDirectoryViewOptionColumns,
  MOBILE_DIRECTORY_COLUMN_VISIBILITY
} from '../directoryGridConfig';

describe('directoryGridConfig', () => {
  it('masque les colonnes secondaires sur mobile par défaut', () => {
    expect(MOBILE_DIRECTORY_COLUMN_VISIBILITY).toEqual({
      department: false,
      agency_name: false,
      cir_commercial_name: false,
      updated_at: false
    });
  });

  it('dérive les colonnes visibles pour le menu affichage', () => {
    expect(buildDirectoryViewOptionColumns({
      department: false,
      agency_name: false
    })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'name', canHide: false, isVisible: true }),
        expect.objectContaining({ id: 'department', canHide: true, isVisible: false }),
        expect.objectContaining({ id: 'agency_name', canHide: true, isVisible: false })
      ])
    );
  });
});
