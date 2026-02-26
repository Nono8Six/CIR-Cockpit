import { relations } from 'drizzle-orm';

import {
  agencies,
  agency_members,
  agency_system_users,
  entities,
  entity_contacts,
  interactions,
  profiles
} from './schema.ts';

export const agencyRelations = relations(agencies, ({ many, one }) => ({
  members: many(agency_members),
  entities: many(entities),
  interactions: many(interactions),
  systemUser: one(agency_system_users, {
    fields: [agencies.id],
    references: [agency_system_users.agency_id]
  })
}));

export const profileRelations = relations(profiles, ({ many }) => ({
  memberships: many(agency_members)
}));

export const agencyMemberRelations = relations(agency_members, ({ one }) => ({
  agency: one(agencies, {
    fields: [agency_members.agency_id],
    references: [agencies.id]
  }),
  profile: one(profiles, {
    fields: [agency_members.user_id],
    references: [profiles.id]
  })
}));

export const entityRelations = relations(entities, ({ many, one }) => ({
  agency: one(agencies, {
    fields: [entities.agency_id],
    references: [agencies.id]
  }),
  contacts: many(entity_contacts),
  interactions: many(interactions)
}));

export const entityContactRelations = relations(entity_contacts, ({ one }) => ({
  entity: one(entities, {
    fields: [entity_contacts.entity_id],
    references: [entities.id]
  })
}));

export const interactionRelations = relations(interactions, ({ one }) => ({
  agency: one(agencies, {
    fields: [interactions.agency_id],
    references: [agencies.id]
  }),
  entity: one(entities, {
    fields: [interactions.entity_id],
    references: [entities.id]
  }),
  contact: one(entity_contacts, {
    fields: [interactions.contact_id],
    references: [entity_contacts.id]
  })
}));

