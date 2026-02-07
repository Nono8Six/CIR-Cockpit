import { isProspectRelationValue } from '@/constants/relations';

type GateInput = {
  channel?: string | null;
  entityType?: string | null;
  contactService?: string | null;
  interactionType?: string | null;
  subject?: string | null;
  statusId?: string | null;
  companyName?: string | null;
  companyCity?: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactPosition?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  isClientRelation: boolean;
  isInternalRelation: boolean;
  hasSelectedEntity: boolean;
  hasSelectedContact: boolean;
};

export type GateState = {
  canSave: boolean;
  gateMessage: string;
  hasContactMethod: boolean;
  hasBaseRequired: boolean;
};

const hasValue = (value?: string | null) => Boolean(value && value.trim().length > 0);

export const getInteractionGateState = (input: GateInput): GateState => {
  const relation = input.entityType?.trim().toLowerCase() ?? '';
  const isSolicitation = relation === 'sollicitation';
  const hasContactMethod = isSolicitation
    ? hasValue(input.contactPhone)
    : hasValue(input.contactPhone) || hasValue(input.contactEmail);
  const hasBaseRequired = Boolean(
    input.channel &&
      input.entityType &&
      input.contactService &&
      input.interactionType &&
      input.subject &&
      input.statusId
  );

  const hasClientIdentity = Boolean(
    input.isClientRelation && input.hasSelectedEntity && input.hasSelectedContact
  );
  const needsCity = isProspectRelationValue(input.entityType);
  const needsPosition = relation === 'fournisseur';

  const hasNonClientIdentity = Boolean(
    !input.isClientRelation &&
      (input.isInternalRelation || hasValue(input.companyName)) &&
      (!needsCity || hasValue(input.companyCity)) &&
      (isSolicitation || hasValue(input.contactFirstName)) &&
      (isSolicitation || hasValue(input.contactLastName)) &&
      (!needsPosition || hasValue(input.contactPosition)) &&
      (input.isInternalRelation || hasContactMethod)
  );

  const canSave = hasBaseRequired && (input.isClientRelation ? hasClientIdentity : hasNonClientIdentity);

  let gateMessage = '';
  if (!canSave) {
    if (input.isClientRelation) {
      if (!input.hasSelectedEntity) {
        gateMessage = 'Selectionnez un client.';
      } else if (!input.hasSelectedContact) {
        gateMessage = 'Selectionnez un contact.';
      } else {
        gateMessage = 'Completer les informations du client.';
      }
    } else {
      if (!input.isInternalRelation && !hasValue(input.companyName)) {
        gateMessage = 'Renseignez la societe.';
      } else if (!input.isInternalRelation && needsCity && !hasValue(input.companyCity)) {
        gateMessage = 'Renseignez la ville.';
      } else if (!isSolicitation && (!hasValue(input.contactFirstName) || !hasValue(input.contactLastName))) {
        gateMessage = 'Renseignez le contact.';
      } else if (needsPosition && !hasValue(input.contactPosition)) {
        gateMessage = 'Renseignez la fonction.';
      } else if (!input.isInternalRelation && !hasContactMethod) {
        gateMessage = isSolicitation ? 'Renseignez le numero.' : 'Telephone ou email requis.';
      } else if (!hasValue(input.interactionType)) {
        gateMessage = "Type d'interaction requis.";
      } else {
        gateMessage = 'Completer les champs obligatoires.';
      }
    }
  }

  return { canSave, gateMessage, hasContactMethod, hasBaseRequired };
};
