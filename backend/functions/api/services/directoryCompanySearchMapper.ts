import type { DirectoryCompanySearchResult } from "../../../../shared/schemas/directory.schema.ts";
import {
  normalizeBooleanFlag,
  normalizeEstablishmentStatus,
  normalizeNullableCount,
  normalizeNullableText,
  normalizeNullableYear,
  normalizeTextArray,
} from "./directoryShared.ts";
import type {
  EnterpriseApiCompany,
  EnterpriseApiEstablishment,
} from "./directoryCompanySchemas.ts";

const mapEnterpriseApiEstablishment = (
  company: EnterpriseApiCompany,
  establishment: EnterpriseApiEstablishment,
): DirectoryCompanySearchResult => ({
  name: company.nom_complet,
  address: normalizeNullableText(establishment.adresse),
  postal_code: normalizeNullableText(establishment.code_postal),
  city: normalizeNullableText(establishment.libelle_commune),
  department: normalizeNullableText(establishment.departement),
  region: normalizeNullableText(establishment.region),
  date_creation: normalizeNullableText(establishment.date_creation),
  date_debut_activite: normalizeNullableText(establishment.date_debut_activite),
  employee_range: normalizeNullableText(establishment.tranche_effectif_salarie),
  employee_range_year: normalizeNullableYear(
    establishment.annee_tranche_effectif_salarie,
  ),
  is_employer: normalizeBooleanFlag(establishment.caractere_employeur),
  establishment_diffusion_status: normalizeNullableText(
    establishment.statut_diffusion_etablissement,
  ),
  brands: normalizeTextArray(establishment.liste_enseignes),
  is_head_office: Boolean(establishment.est_siege ?? false),
  is_former_head_office: Boolean(establishment.ancien_siege ?? false),
  establishment_status: normalizeEstablishmentStatus(
    establishment.etat_administratif,
  ),
  establishment_closed_at: normalizeNullableText(establishment.date_fermeture),
  commercial_name: normalizeNullableText(establishment.nom_commercial),
  company_establishments_count: normalizeNullableCount(
    company.nombre_etablissements,
  ),
  company_open_establishments_count: normalizeNullableCount(
    company.nombre_etablissements_ouverts,
  ),
  match_quality: "expanded",
  match_explanation: null,
  siret: normalizeNullableText(establishment.siret),
  siren: normalizeNullableText(company.siren),
  naf_code: normalizeNullableText(
    establishment.activite_principale ?? company.activite_principale,
  ),
  official_name: normalizeNullableText(company.nom_raison_sociale) ??
    company.nom_complet,
  official_data_source: "api-recherche-entreprises",
  official_data_synced_at: new Date().toISOString(),
});

export const mapEnterpriseApiCompany = (
  company: EnterpriseApiCompany,
): DirectoryCompanySearchResult[] => {
  const establishments = company.matching_etablissements.length > 0
    ? company.matching_etablissements
    : company.siege
    ? [company.siege]
    : [];

  return establishments.map((establishment) =>
    mapEnterpriseApiEstablishment(company, establishment)
  );
};
