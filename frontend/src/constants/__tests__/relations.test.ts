import { describe, expect, it } from 'vitest';

import {
  CASH_CLIENT_RELATION_LABEL,
  getRelationLabelForTierType,
  isClientRelationValue,
  isIndividualRelationValue,
  isProspectRelationValue,
  normalizeVisibleRelationValue,
  PRODUCT_RELATION_OPTIONS,
  PROSPECT_RELATION_LABEL,
  TERM_CLIENT_RELATION_LABEL
} from '@/constants/relations';

describe('relations helpers', () => {
  it('detects prospect labels without merging particuliers', () => {
    expect(isProspectRelationValue('Prospect')).toBe(true);
    expect(isProspectRelationValue('Particulier')).toBe(false);
    expect(isProspectRelationValue('Client')).toBe(false);
  });

  it('detects the new client and individual labels', () => {
    expect(isClientRelationValue('Client à terme')).toBe(true);
    expect(isClientRelationValue('Client comptant')).toBe(true);
    expect(isIndividualRelationValue('Particulier')).toBe(true);
  });

  it('exposes fixed product relation options without Tout', () => {
    expect(PRODUCT_RELATION_OPTIONS).not.toContain('Tout');
    expect(PRODUCT_RELATION_OPTIONS).toContain(TERM_CLIENT_RELATION_LABEL);
    expect(PRODUCT_RELATION_OPTIONS).toContain(CASH_CLIENT_RELATION_LABEL);
  });

  it('normalizes legacy labels to visible product categories', () => {
    expect(normalizeVisibleRelationValue('Client')).toBe(TERM_CLIENT_RELATION_LABEL);
    expect(normalizeVisibleRelationValue('Prospect / Particulier')).toBe(PROSPECT_RELATION_LABEL);
    expect(normalizeVisibleRelationValue('Inconnu')).toBe('');
  });

  it('maps V1 search result types to Saisie relations', () => {
    expect(getRelationLabelForTierType('client_cash')).toBe(CASH_CLIENT_RELATION_LABEL);
    expect(getRelationLabelForTierType('prospect_individual')).toBe(PROSPECT_RELATION_LABEL);
  });
});
