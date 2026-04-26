import type { DirectoryCompanyDetails } from "../../../../shared/schemas/directory.schema.ts";
import {
  normalizeBooleanFlag,
  normalizeNullableAmount,
  normalizeNullableCount,
  normalizeNullableText,
  normalizeNullableYear,
  normalizeSignal,
} from "./directoryShared.ts";
import type { EnterpriseApiCompany } from "./directoryCompanySchemas.ts";

const normalizeEnterpriseApiDirectors = (
  directors: EnterpriseApiCompany["dirigeants"],
): DirectoryCompanyDetails["directors"] =>
  directors.flatMap((director) => {
    const fullName = [director.prenoms, director.nom]
      .map((value) => normalizeNullableText(value))
      .filter((value): value is string => value !== null)
      .join(" ");

    if (!fullName) {
      return [];
    }

    return [{
      full_name: fullName,
      role: normalizeNullableText(director.qualite),
      nationality: normalizeNullableText(director.nationalite),
      birth_year: normalizeNullableYear(director.annee_de_naissance),
    }];
  });

const normalizeEnterpriseApiFinancials = (
  financials: EnterpriseApiCompany["finances"],
): DirectoryCompanyDetails["financials"] => {
  if (!financials) {
    return null;
  }

  const latestEntry = Object.entries(financials)
    .map(([year, values]) => ({
      year: Number(year),
      values,
    }))
    .filter((entry) => Number.isInteger(entry.year))
    .sort((left, right) => right.year - left.year)[0];

  if (!latestEntry) {
    return null;
  }

  return {
    latest_year: latestEntry.year,
    revenue: normalizeNullableAmount(latestEntry.values.ca),
    net_income: normalizeNullableAmount(latestEntry.values.resultat_net),
  };
};

const normalizeEnterpriseApiSignals = (
  complements: EnterpriseApiCompany["complements"],
): DirectoryCompanyDetails["signals"] => ({
  association: normalizeSignal(complements?.est_association),
  ess: normalizeSignal(complements?.est_ess),
  qualiopi: normalizeSignal(complements?.est_qualiopi),
  rge: normalizeSignal(complements?.est_rge),
  bio: normalizeSignal(complements?.est_bio),
  organisme_formation: normalizeSignal(complements?.est_organisme_formation),
  service_public: normalizeSignal(complements?.est_service_public),
  societe_mission: normalizeSignal(complements?.est_societe_mission),
});

export const mapEnterpriseApiCompanyDetails = (
  company: EnterpriseApiCompany,
): DirectoryCompanyDetails => ({
  siren: company.siren,
  official_name: normalizeNullableText(company.nom_raison_sociale) ??
    company.nom_complet,
  name: company.nom_complet,
  sigle: normalizeNullableText(company.sigle),
  nature_juridique: normalizeNullableText(company.nature_juridique),
  categorie_entreprise: normalizeNullableText(company.categorie_entreprise),
  date_creation: normalizeNullableText(company.date_creation),
  etat_administratif: normalizeNullableText(company.etat_administratif),
  activite_principale: normalizeNullableText(company.activite_principale),
  activite_principale_naf25: normalizeNullableText(
    company.activite_principale_naf25,
  ),
  section_activite_principale: normalizeNullableText(
    company.section_activite_principale,
  ),
  company_establishments_count: normalizeNullableCount(
    company.nombre_etablissements,
  ),
  company_open_establishments_count: normalizeNullableCount(
    company.nombre_etablissements_ouverts,
  ),
  employee_range: normalizeNullableText(company.tranche_effectif_salarie),
  employee_range_year: normalizeNullableYear(
    company.annee_tranche_effectif_salarie,
  ),
  is_employer: normalizeBooleanFlag(company.caractere_employeur),
  diffusion_status: normalizeNullableText(company.statut_diffusion),
  directors: normalizeEnterpriseApiDirectors(company.dirigeants),
  financials: normalizeEnterpriseApiFinancials(company.finances),
  signals: normalizeEnterpriseApiSignals(company.complements),
});
