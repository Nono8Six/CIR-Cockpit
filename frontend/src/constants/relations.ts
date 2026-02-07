export const INTERNAL_RELATION_LABEL = 'Interne (CIR)';
export const SOLICITATION_RELATION_NORMALIZED = 'sollicitation';
export const INTERNAL_COMPANY_NAME = 'CIR';

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

export const ensureInternalRelation = (relations: string[]): string[] => {
  const exists = relations.some((relation) => isInternalRelationValue(relation));
  return exists ? relations : [...relations, INTERNAL_RELATION_LABEL];
};
