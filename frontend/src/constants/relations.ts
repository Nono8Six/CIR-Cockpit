export const INTERNAL_RELATION_LABEL = 'Interne (CIR)';
export const SOLICITATION_RELATION_NORMALIZED = 'sollicitation';
export const INTERNAL_COMPANY_NAME = 'CIR';
export type RelationMode =
  | 'client'
  | 'prospect'
  | 'supplier'
  | 'internal'
  | 'solicitation'
  | 'other';

export const isInternalRelationValue = (value?: string | null): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.startsWith('interne') && normalized.includes('cir');
};

export const isSolicitationRelationValue = (value?: string | null): boolean =>
  (value ?? '').trim().toLowerCase() === SOLICITATION_RELATION_NORMALIZED;

export const isProspectRelationValue = (value?: string | null): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.includes('prospect') || normalized.includes('particulier');
};

export const getRelationMode = (value?: string | null): RelationMode => {
  const normalized = (value ?? '').trim().toLowerCase();

  if (normalized === 'client') return 'client';
  if (normalized === 'fournisseur') return 'supplier';
  if (isInternalRelationValue(value)) return 'internal';
  if (isSolicitationRelationValue(value)) return 'solicitation';
  if (isProspectRelationValue(value)) return 'prospect';

  return 'other';
};

export const ensureInternalRelation = (relations: string[]): string[] => {
  const exists = relations.some((relation) => isInternalRelationValue(relation));
  return exists ? relations : [...relations, INTERNAL_RELATION_LABEL];
};
