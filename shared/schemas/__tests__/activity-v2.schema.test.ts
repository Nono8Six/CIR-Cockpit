import { describe, expect, it } from "vitest";

import {
  activityV2ByLegacyInteractionInputSchema,
  activityV2ByLegacyInteractionResponseSchema,
  activityV2CorrectionInputSchema,
} from "../interaction/activity-v2.schema";

const id = "0e23d347-af53-448d-b8e3-c4e29f222743";

describe("activity-v2 schemas", () => {
  it("accepts the additive read model with relational history", () => {
    const parsed = activityV2ByLegacyInteractionResponseSchema.safeParse({
      ok: true,
      request_id: id,
      activity: {
        id,
        legacy_interaction_id: "legacy-text-id",
        agency_id: id,
        author_id: id,
        created_by: id,
        updated_by: id,
        legacy_updated_by_raw: null,
        occurred_at: "2026-08-09T10:00:00.000Z",
        channel: "Téléphone",
        activity_type: "Demande technique",
        subject: "Objet",
        report: "Compte rendu",
        organization_id: null,
        contact_id: null,
        lifecycle_status: "recorded",
        version: 1,
        corrected_at: null,
        archived_at: null,
        created_at: "2026-08-09T10:00:00.000Z",
        updated_at: "2026-08-09T10:00:00.000Z",
        participants: [{
          id,
          participant_kind: "internal",
          internal_profile_id: id,
          external_contact_id: null,
          organization_id: null,
          participant_role: "author",
        }],
        sources: [{
          id,
          source_type: "legacy_interaction",
          source_reference: "legacy-text-id",
          source_label: "public.interactions",
          captured_at: "2026-08-09T10:00:00.000Z",
        }],
        attachments: [],
        history: [{
          id,
          event_order: 1,
          legacy_event_id: "event-1",
          event_type: "creation",
          event_domain: "activity",
          occurred_at: "2026-08-09T10:00:00.000Z",
          author_id: id,
          author_label_raw: "a.ferron@cir.fr",
          content: "Dossier créé",
          raw_event: { type: "creation" },
        }],
        corrections: [],
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects unknown contract keys", () => {
    expect(activityV2ByLegacyInteractionInputSchema.safeParse({
      legacy_interaction_id: "legacy-text-id",
      agency_id: id,
    }).success).toBe(false);
  });

  it("requires a reason, an optimistic version and at least one correction", () => {
    expect(activityV2CorrectionInputSchema.safeParse({
      legacy_interaction_id: "legacy-text-id",
      expected_version: 2,
      reason: "Objet précisé après rappel du client",
      changes: { subject: "Objet corrigé" },
    }).success).toBe(true);
    expect(activityV2CorrectionInputSchema.safeParse({
      legacy_interaction_id: "legacy-text-id",
      expected_version: 2,
      reason: "",
      changes: {},
    }).success).toBe(false);
  });
});
