import { z } from "zod/v4";

const enterpriseApiNullableYearSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
      return value;
    }

    if (typeof value === "string") {
      const normalized = Number(value.trim());
      return Number.isInteger(normalized) && normalized >= 0
        ? normalized
        : null;
    }

    return null;
  });

const enterpriseApiNumericValueSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const normalized = Number(value.replace(",", ".").trim());
      return Number.isFinite(normalized) ? normalized : null;
    }

    return null;
  });

const enterpriseApiBooleanLikeSchema = z.union([
  z.boolean(),
  z.string(),
  z.number(),
  z.null(),
  z.undefined(),
]);

export const enterpriseApiEstablishmentSchema = z.looseObject({
  siret: z.string().trim().min(1, "SIRET requis").nullable().optional(),
  adresse: z.string().trim().nullable().optional(),
  code_postal: z.string().trim().nullable().optional(),
  libelle_commune: z.string().trim().nullable().optional(),
  departement: z.string().trim().nullable().optional(),
  region: z.string().trim().nullable().optional(),
  est_siege: z.boolean().optional(),
  activite_principale: z.string().trim().nullable().optional(),
  activite_principale_naf25: z.string().trim().nullable().optional(),
  etat_administratif: z.string().trim().nullable().optional(),
  date_creation: z.string().trim().nullable().optional(),
  date_debut_activite: z.string().trim().nullable().optional(),
  date_fermeture: z.string().trim().nullable().optional(),
  ancien_siege: z.boolean().optional(),
  nom_commercial: z.string().trim().nullable().optional(),
  tranche_effectif_salarie: z.string().trim().nullable().optional(),
  annee_tranche_effectif_salarie: enterpriseApiNullableYearSchema,
  caractere_employeur: enterpriseApiBooleanLikeSchema,
  statut_diffusion_etablissement: z.string().trim().nullable().optional(),
  liste_enseignes: z.union([
    z.array(z.string()),
    z.string(),
    z.null(),
    z.undefined(),
  ]),
});

const enterpriseApiDirectorSchema = z.looseObject({
  nom: z.string().trim().nullable().optional(),
  prenoms: z.string().trim().nullable().optional(),
  annee_de_naissance: z.number().int().nonnegative().nullable().optional(),
  qualite: z.string().trim().nullable().optional(),
  nationalite: z.string().trim().nullable().optional(),
});

const enterpriseApiFinancialYearSchema = z.looseObject({
  ca: enterpriseApiNumericValueSchema,
  resultat_net: enterpriseApiNumericValueSchema,
});

const enterpriseApiComplementsSchema = z.looseObject({
  est_association: enterpriseApiBooleanLikeSchema,
  est_ess: enterpriseApiBooleanLikeSchema,
  est_qualiopi: enterpriseApiBooleanLikeSchema,
  est_rge: enterpriseApiBooleanLikeSchema,
  est_bio: enterpriseApiBooleanLikeSchema,
  est_organisme_formation: enterpriseApiBooleanLikeSchema,
  est_service_public: enterpriseApiBooleanLikeSchema,
  est_societe_mission: enterpriseApiBooleanLikeSchema,
}).partial();

export const enterpriseApiCompanySchema = z.looseObject({
  siren: z.string().trim().min(1, "SIREN requis"),
  nom_complet: z.string().trim().min(1, "Nom complet requis"),
  nom_raison_sociale: z.string().trim().nullable().optional(),
  sigle: z.string().trim().nullable().optional(),
  activite_principale: z.string().trim().nullable().optional(),
  activite_principale_naf25: z.string().trim().nullable().optional(),
  categorie_entreprise: z.string().trim().nullable().optional(),
  caractere_employeur: enterpriseApiBooleanLikeSchema,
  date_creation: z.string().trim().nullable().optional(),
  etat_administratif: z.string().trim().nullable().optional(),
  nature_juridique: z.string().trim().nullable().optional(),
  section_activite_principale: z.string().trim().nullable().optional(),
  tranche_effectif_salarie: z.string().trim().nullable().optional(),
  annee_tranche_effectif_salarie: enterpriseApiNullableYearSchema,
  statut_diffusion: z.string().trim().nullable().optional(),
  nombre_etablissements: z.number().int().nonnegative().nullable().optional(),
  nombre_etablissements_ouverts: z.number().int().nonnegative().nullable()
    .optional(),
  siege: enterpriseApiEstablishmentSchema.nullable().optional(),
  matching_etablissements: z.array(enterpriseApiEstablishmentSchema).default(
    [],
  ),
  dirigeants: z.array(enterpriseApiDirectorSchema).default([]),
  finances: z.record(z.string(), enterpriseApiFinancialYearSchema).nullable()
    .optional(),
  complements: enterpriseApiComplementsSchema.nullable().optional(),
});

export const enterpriseApiSearchResponseSchema = z.looseObject({
  results: z.array(enterpriseApiCompanySchema).default([]),
});

export type EnterpriseApiCompany = z.infer<typeof enterpriseApiCompanySchema>;
export type EnterpriseApiEstablishment = z.infer<
  typeof enterpriseApiEstablishmentSchema
>;
export type EnterpriseApiSearchResponse = z.infer<
  typeof enterpriseApiSearchResponseSchema
>;
