import { relations } from 'drizzle-orm';

import {
  agencies,
  agency_members,
  agency_system_users,
  cir_agencies,
  entities,
  entity_contacts,
  interactions,
  pricing_classification_cir,
  pricing_reference_anomalies,
  pricing_reference_diffs,
  pricing_reference_import_files,
  pricing_reference_imports,
  pricing_reference_snapshots,
  pricing_segment_classification_links,
  pricing_segment_purchase_grids,
  pricing_supplier_segments,
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

export const cirAgencyRelations = relations(cir_agencies, ({ many }) => ({
  entities: many(entities)
}));

export const profileRelations = relations(profiles, ({ many }) => ({
  memberships: many(agency_members),
  pricingReferenceImports: many(pricing_reference_imports),
  pricingReferenceSnapshots: many(pricing_reference_snapshots)
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
  cirAgency: one(cir_agencies, {
    fields: [entities.cir_agency_id],
    references: [cir_agencies.id]
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

export const pricingReferenceImportRelations = relations(pricing_reference_imports, ({ many, one }) => ({
  files: many(pricing_reference_import_files),
  snapshots: many(pricing_reference_snapshots),
  anomalies: many(pricing_reference_anomalies),
  creator: one(profiles, {
    fields: [pricing_reference_imports.created_by],
    references: [profiles.id]
  }),
  analyzer: one(profiles, {
    fields: [pricing_reference_imports.analyzed_by],
    references: [profiles.id]
  })
}));

export const pricingReferenceImportFileRelations = relations(pricing_reference_import_files, ({ many, one }) => ({
  import: one(pricing_reference_imports, {
    fields: [pricing_reference_import_files.import_id],
    references: [pricing_reference_imports.id]
  }),
  classificationRows: many(pricing_classification_cir),
  segmentRows: many(pricing_supplier_segments),
  purchaseGridRows: many(pricing_segment_purchase_grids),
  anomalies: many(pricing_reference_anomalies)
}));

export const pricingReferenceSnapshotRelations = relations(pricing_reference_snapshots, ({ many, one }) => ({
  import: one(pricing_reference_imports, {
    fields: [pricing_reference_snapshots.import_id],
    references: [pricing_reference_imports.id]
  }),
  creator: one(profiles, {
    fields: [pricing_reference_snapshots.created_by],
    references: [profiles.id]
  }),
  classifications: many(pricing_classification_cir),
  segments: many(pricing_supplier_segments),
  links: many(pricing_segment_classification_links),
  purchaseGrids: many(pricing_segment_purchase_grids),
  anomalies: many(pricing_reference_anomalies),
  targetDiffs: many(pricing_reference_diffs)
}));

export const pricingClassificationCirRelations = relations(pricing_classification_cir, ({ one, many }) => ({
  snapshot: one(pricing_reference_snapshots, {
    fields: [pricing_classification_cir.snapshot_id],
    references: [pricing_reference_snapshots.id]
  }),
  import: one(pricing_reference_imports, {
    fields: [pricing_classification_cir.import_id],
    references: [pricing_reference_imports.id]
  }),
  sourceFile: one(pricing_reference_import_files, {
    fields: [pricing_classification_cir.source_file_id],
    references: [pricing_reference_import_files.id]
  }),
  segmentLinks: many(pricing_segment_classification_links)
}));

export const pricingSupplierSegmentRelations = relations(pricing_supplier_segments, ({ one, many }) => ({
  snapshot: one(pricing_reference_snapshots, {
    fields: [pricing_supplier_segments.snapshot_id],
    references: [pricing_reference_snapshots.id]
  }),
  import: one(pricing_reference_imports, {
    fields: [pricing_supplier_segments.import_id],
    references: [pricing_reference_imports.id]
  }),
  sourceFile: one(pricing_reference_import_files, {
    fields: [pricing_supplier_segments.source_file_id],
    references: [pricing_reference_import_files.id]
  }),
  links: many(pricing_segment_classification_links),
  purchaseGrids: many(pricing_segment_purchase_grids)
}));

export const pricingSegmentClassificationLinkRelations = relations(pricing_segment_classification_links, ({ one }) => ({
  snapshot: one(pricing_reference_snapshots, {
    fields: [pricing_segment_classification_links.snapshot_id],
    references: [pricing_reference_snapshots.id]
  }),
  segment: one(pricing_supplier_segments, {
    fields: [pricing_segment_classification_links.segment_id],
    references: [pricing_supplier_segments.id]
  }),
  classification: one(pricing_classification_cir, {
    fields: [pricing_segment_classification_links.classification_id],
    references: [pricing_classification_cir.id]
  })
}));

export const pricingSegmentPurchaseGridRelations = relations(pricing_segment_purchase_grids, ({ one }) => ({
  snapshot: one(pricing_reference_snapshots, {
    fields: [pricing_segment_purchase_grids.snapshot_id],
    references: [pricing_reference_snapshots.id]
  }),
  segment: one(pricing_supplier_segments, {
    fields: [pricing_segment_purchase_grids.segment_id],
    references: [pricing_supplier_segments.id]
  })
}));
