import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { dataEntitiesSearchIndexResponseSchema } from '../../../../shared/schemas/system/api-responses';

import type { TierContactRead, TierOrganizationRead } from '../../../../shared/schemas/entity/tier-foundation.schema';
import type { Entity, EntityContact } from '@/types';
import { safeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

export type EntitySearchIndex = {
  entities: Entity[];
  contacts: EntityContact[];
  tiers: TierOrganizationRead[];
  tierContacts: TierContactRead[];
};

const parseSearchIndexResponse = createTrpcResponseParser(
  dataEntitiesSearchIndexResponseSchema,
  (response): EntitySearchIndex => {
    const tiersById = new Map(response.tiers.map((tier) => [tier.id, tier]));
    const tierContactsById = new Map(response.tier_contacts.map((contact) => [contact.id, contact]));
    const entities = response.entities.map((entity) => {
      const canonicalTier = tiersById.get(entity.id);
      if (!canonicalTier) {
        throw createAppError({
          code: 'REQUEST_FAILED',
          message: 'Contrat Tiers incomplet pour la recherche.',
          source: 'edge',
          details: `Organisation canonique absente pour ${entity.id}.`
        });
      }
      return { ...entity, canonical_tier: canonicalTier };
    });
    const contacts = response.contacts.map((contact) => {
      const canonicalContact = tierContactsById.get(contact.id);
      if (!canonicalContact) {
        throw createAppError({
          code: 'REQUEST_FAILED',
          message: 'Contrat Tiers incomplet pour la recherche.',
          source: 'edge',
          details: `Contact canonique absent pour ${contact.id}.`
        });
      }
      return { ...contact, canonical_contact: canonicalContact };
    });
    return {
      entities,
      contacts,
      tiers: response.tiers,
      tierContacts: response.tier_contacts
    };
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

export const getEntitySearchIndex = async (
  agencyId: string | null,
  includeArchived = false
): Promise<EntitySearchIndex> => {
  if (!agencyId) {
    return { entities: [], contacts: [], tiers: [], tierContacts: [] };
  }

  return safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'search_index',
        agency_id: agencyId,
        include_archived: includeArchived
      }, options),
    parseSearchIndexResponse,
    "Impossible de charger l'index de recherche."
  ).match(
    (index) => index,
    (error) => {
      throw error;
    }
  );
};
