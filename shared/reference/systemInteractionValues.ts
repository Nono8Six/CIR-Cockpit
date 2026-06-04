export const SYSTEM_INTERACTION_VALUES = {
  solicitation: {
    service: 'Sollicitation',
    interactionType: 'Démarchage téléphonique'
  },
  internal: {
    service: 'Interne CIR'
  },
  supplier: {
    service: 'Fournisseur',
    interactionType: 'Interaction fournisseur'
  }
} as const;

export type SystemReferenceDimension = 'statuses' | 'services' | 'families' | 'interaction_types';

export const isSystemReferenceLabel = (
  dimension: SystemReferenceDimension,
  label: string
): boolean => {
  const normalized = label.trim().toLowerCase();
  if (dimension === 'services') {
    return [
      SYSTEM_INTERACTION_VALUES.solicitation.service,
      SYSTEM_INTERACTION_VALUES.internal.service,
      SYSTEM_INTERACTION_VALUES.supplier.service
    ].some((value) => value.toLowerCase() === normalized);
  }
  if (dimension === 'interaction_types') {
    return [
      SYSTEM_INTERACTION_VALUES.solicitation.interactionType,
      SYSTEM_INTERACTION_VALUES.supplier.interactionType
    ].some((value) => value.toLowerCase() === normalized);
  }
  return false;
};
