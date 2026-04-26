import type {
  EntityContactInsert,
  EntityInsert,
  EntityUpdate,
  SaveClientPayload,
  SaveEntityPayload,
  SaveIndividualClientPayload,
} from "./dataEntitiesShared.ts";

const isSaveClientPayload = (
  payload: SaveEntityPayload,
): payload is SaveClientPayload => payload.entity_type === "Client";

const isSaveIndividualClientPayload = (
  payload: SaveClientPayload,
): payload is SaveIndividualClientPayload =>
  payload.entity.client_kind === "individual";

type BaseEntityUpdate = Pick<
  EntityUpdate,
  | "entity_type"
  | "name"
  | "agency_id"
  | "address"
  | "postal_code"
  | "department"
  | "city"
  | "siret"
  | "siren"
  | "naf_code"
  | "official_name"
  | "official_data_source"
  | "official_data_synced_at"
  | "notes"
>;

type SaveEntityRows = {
  updateRow: EntityUpdate;
  insertRow: EntityInsert;
  primaryContact: EntityContactInsert | null;
  isIndividualClient: boolean;
};

const buildBaseEntityUpdate = (
  payload: SaveEntityPayload,
  agencyId: string,
): BaseEntityUpdate => {
  const entity = payload.entity;

  return {
    entity_type: payload.entity_type,
    name: entity.name.trim(),
    agency_id: agencyId,
    address: entity.address?.trim() ?? "",
    postal_code: entity.postal_code?.trim() ?? "",
    department: entity.department?.trim() || null,
    city: entity.city?.trim() ?? "",
    siret: entity.siret?.trim() || null,
    siren: entity.siren?.trim() || null,
    naf_code: entity.naf_code?.trim() || null,
    official_name: entity.official_name?.trim() || null,
    official_data_source: entity.official_data_source ?? null,
    official_data_synced_at: entity.official_data_synced_at?.trim() || null,
    notes: entity.notes?.trim() || null,
  };
};

const buildPrimaryContactInsert = (
  payload: SaveIndividualClientPayload,
): EntityContactInsert => ({
  entity_id: payload.id ?? "",
  first_name: payload.entity.primary_contact.first_name.trim() || null,
  last_name: payload.entity.primary_contact.last_name.trim() || "",
  email: payload.entity.primary_contact.email?.trim() || null,
  phone: payload.entity.primary_contact.phone?.trim() || null,
  position: payload.entity.primary_contact.position?.trim() || null,
  notes: payload.entity.primary_contact.notes?.trim() || null,
});

export const buildSaveEntityRows = (
  payload: SaveEntityPayload,
  agencyId: string,
  createdBy: string,
): SaveEntityRows => {
  const baseRow = buildBaseEntityUpdate(payload, agencyId);

  let updateRow: EntityUpdate;
  let primaryContact: EntityContactInsert | null = null;
  let isIndividualClient = false;

  if (isSaveClientPayload(payload)) {
    const clientEntity = payload.entity;

    if (isSaveIndividualClientPayload(payload)) {
      isIndividualClient = true;
      updateRow = {
        ...baseRow,
        client_kind: "individual",
        client_number: clientEntity.client_number.trim().replace(/\s+/g, ""),
        account_type: "cash",
        cir_commercial_id: null,
      };
      primaryContact = buildPrimaryContactInsert(payload);
    } else {
      updateRow = {
        ...baseRow,
        client_kind: "company",
        client_number: clientEntity.client_number.trim().replace(/\s+/g, ""),
        account_type: clientEntity.account_type,
        cir_commercial_id: clientEntity.cir_commercial_id ?? null,
      };
    }
  } else {
    updateRow = {
      ...baseRow,
      client_kind: null,
      client_number: null,
      account_type: null,
      cir_commercial_id: null,
    };
  }

  return {
    updateRow,
    insertRow: {
      ...updateRow,
      created_by: createdBy,
    },
    primaryContact,
    isIndividualClient,
  };
};
