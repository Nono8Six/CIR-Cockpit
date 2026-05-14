import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';

const normalizeOptionalText = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeOptionalTextArray = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      values
        .flatMap((entry) => typeof entry === 'string' ? [entry] : entry == null ? [] : [String(entry)])
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );
};

const optionalTextFilterSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => normalizeOptionalText(value));

const optionalTextArrayFilterSchema = z
  .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
  .transform((value) => normalizeOptionalTextArray(value));

const optionalUuidArrayFilterSchema = z
  .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
  .transform((value) => normalizeOptionalTextArray(value))
  .pipe(z.array(uuidSchema));

const booleanLikeSchema = z
  .union([z.boolean(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = value?.toString().trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  });

export const directoryEntityTypeSchema = z.enum(['all', 'client', 'prospect']);
export const directoryClientKindSchema = z.enum(['company', 'individual']);
const directoryNullableClientKindSchema = z
  .union([directoryClientKindSchema, z.string(), z.null(), z.undefined()])
  .transform((value) => value === 'company' || value === 'individual' ? value : null);
export const directorySortBySchema = z.enum([
  'entity_type',
  'client_number',
  'name',
  'city',
  'department',
  'agency_name',
  'cir_commercial_name',
  'updated_at'
]);
export const directorySortDirectionSchema = z.enum(['asc', 'desc']);
export const directoryDensitySchema = z.enum(['comfortable', 'compact']);

export const directoryActiveAgencyScopeSchema = z.strictObject({
  mode: z.literal('active_agency')
});

export const directorySelectedAgenciesScopeSchema = z.strictObject({
  mode: z.literal('selected_agencies'),
  agencyIds: optionalUuidArrayFilterSchema.pipe(z.array(uuidSchema).min(1, 'Au moins une agence requise'))
});

export const directoryAllAccessibleAgenciesScopeSchema = z.strictObject({
  mode: z.literal('all_accessible_agencies')
});

export const directoryScopeInputSchema = z.discriminatedUnion('mode', [
  directoryActiveAgencyScopeSchema,
  directorySelectedAgenciesScopeSchema,
  directoryAllAccessibleAgenciesScopeSchema
]);

export const DIRECTORY_PAGE_SIZES = [25, 50, 100] as const;

const directoryPageSizeSchema = z
  .coerce
  .number()
  .int()
  .refine((value) => DIRECTORY_PAGE_SIZES.includes(value as typeof DIRECTORY_PAGE_SIZES[number]), {
    message: 'Taille de page invalide'
  });

export const directorySortingRuleSchema = z.strictObject({
  id: directorySortBySchema,
  desc: booleanLikeSchema.default(false)
});

export const directorySortingStateSchema = z
  .array(directorySortingRuleSchema)
  .min(1, 'Au moins un tri requis')
  .max(3, 'Trop de tris simultanes')
  .refine(
    (value) => new Set(value.map((rule) => rule.id)).size === value.length,
    'Colonnes de tri dupliquees'
  );

export const directoryListFiltersSchema = z.strictObject({
  q: optionalTextFilterSchema.optional(),
  departments: optionalTextArrayFilterSchema.default([]),
  city: optionalTextFilterSchema.optional(),
  cirCommercialIds: optionalUuidArrayFilterSchema.default([]),
  includeArchived: booleanLikeSchema.default(false)
});

export const directoryPaginationSchema = z.strictObject({
  page: z.coerce.number().int().min(1, 'Page invalide').default(1),
  pageSize: directoryPageSizeSchema.default(50),
  includeTotal: z.boolean().default(false)
});

export const directoryDebugInputSchema = z.strictObject({
  includeResolvedScope: z.boolean().default(false)
});

export const directoryListInputSchema = z.strictObject({
  scope: directoryScopeInputSchema.default({ mode: 'active_agency' }),
  type: directoryEntityTypeSchema.default('all'),
  filters: directoryListFiltersSchema.default({
    departments: [],
    cirCommercialIds: [],
    includeArchived: false
  }),
  pagination: directoryPaginationSchema.default({
    page: 1,
    pageSize: 50,
    includeTotal: false
  }),
  sorting: directorySortingStateSchema.default([{ id: 'name', desc: false }]),
  debug: directoryDebugInputSchema.optional()
});

export const directoryOptionsAgenciesInputSchema = z.strictObject({
  includeArchived: booleanLikeSchema.default(false)
});

export const directoryOptionsFacetInputSchema = z.strictObject({
  scope: directoryScopeInputSchema.default({ mode: 'active_agency' }),
  type: directoryEntityTypeSchema.default('all'),
  includeArchived: booleanLikeSchema.default(false),
  debug: directoryDebugInputSchema.optional()
});

export const directoryOptionsCitiesInputSchema = directoryOptionsFacetInputSchema.extend({
  q: optionalTextFilterSchema.optional()
});

export const directoryCitySuggestionsInputSchema = z.strictObject({
  q: z.string().trim().min(1, 'Recherche ville requise'),
  scope: directoryScopeInputSchema.default({ mode: 'active_agency' }),
  type: directoryEntityTypeSchema.default('all'),
  includeArchived: booleanLikeSchema.default(false)
});

export const directoryClientRouteRefSchema = z.strictObject({
  kind: z.literal('client'),
  clientNumber: z.string().trim().min(1, 'Numero client requis')
});

export const directoryProspectRouteRefSchema = z.strictObject({
  kind: z.literal('prospect'),
  id: uuidSchema
});

export const directoryRouteRefSchema = z.discriminatedUnion('kind', [
  directoryClientRouteRefSchema,
  directoryProspectRouteRefSchema
]);

const directoryNullableTextSchema = z.string().nullable();
const optionalOfficialTextSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => normalizeOptionalText(value) ?? null);
const optionalOfficialYearSchema = z
  .union([z.number().int().nonnegative(), z.null(), z.undefined()])
  .transform((value) => typeof value === 'number' ? value : null);
const optionalOfficialBooleanSchema = z
  .union([z.boolean(), z.null(), z.undefined()])
  .transform((value) => typeof value === 'boolean' ? value : null);
const officialTextArraySchema = z
  .array(z.string().trim().min(1, 'Valeur requise'))
  .default([]);

export const officialDataSourceSchema = z.literal('api-recherche-entreprises');
export const directoryCompanySearchMatchQualitySchema = z.enum(['exact', 'close', 'expanded']);

export const officialCompanyFieldsSchema = z.strictObject({
  siret: optionalOfficialTextSchema.optional(),
  siren: optionalOfficialTextSchema.optional(),
  naf_code: optionalOfficialTextSchema.optional(),
  official_name: optionalOfficialTextSchema.optional(),
  official_data_source: z
    .union([officialDataSourceSchema, z.null(), z.undefined()])
    .transform((value) => value ?? null)
    .optional(),
  official_data_synced_at: optionalOfficialTextSchema.optional()
});

export const directoryCommercialOptionSchema = z.strictObject({
  id: uuidSchema,
  display_name: z.string().trim().min(1, 'Nom commercial requis')
});

export const directoryAgencyOptionSchema = z.strictObject({
  id: uuidSchema,
  name: z.string().trim().min(1, "Nom d'agence requis")
});

export const directorySuggestionOptionSchema = z.strictObject({
  value: z.string().trim().min(1, 'Valeur requise'),
  label: z.string().trim().min(1, 'Libelle requis')
});

export const directoryColumnVisibilitySchema = z.record(z.string(), z.boolean()).default({});

export const directorySavedViewStateSchema = z.strictObject({
  q: optionalTextFilterSchema.optional(),
  type: directoryEntityTypeSchema.default('all'),
  scope: directoryScopeInputSchema.default({ mode: 'active_agency' }),
  departments: optionalTextArrayFilterSchema.default([]),
  city: optionalTextFilterSchema.optional(),
  cirCommercialIds: optionalUuidArrayFilterSchema.default([]),
  includeArchived: booleanLikeSchema.default(false),
  pageSize: directoryPageSizeSchema.default(50),
  sorting: directorySortingStateSchema.default([{ id: 'name', desc: false }]),
  columnVisibility: directoryColumnVisibilitySchema,
  density: directoryDensitySchema.default('comfortable')
});

export const directorySearchStateSchema = z.strictObject({
  q: optionalTextFilterSchema.optional(),
  type: directoryEntityTypeSchema.default('all'),
  scope: directoryScopeInputSchema.default({ mode: 'active_agency' }),
  departments: optionalTextArrayFilterSchema.default([]),
  city: optionalTextFilterSchema.optional(),
  cirCommercialIds: optionalUuidArrayFilterSchema.default([]),
  includeArchived: booleanLikeSchema.default(false),
  page: z.coerce.number().int().min(1, 'Page invalide').default(1),
  pageSize: directoryPageSizeSchema.default(50),
  sorting: directorySortingStateSchema.default([{ id: 'name', desc: false }])
});

export const directorySavedViewSchema = z.strictObject({
  id: uuidSchema,
  name: z.string().trim().min(1, 'Nom de vue requis'),
  is_default: z.boolean(),
  state: directorySavedViewStateSchema,
  created_at: z.string().trim().min(1, 'Date de creation requise'),
  updated_at: z.string().trim().min(1, 'Date de mise a jour requise')
});

export const directorySavedViewsListInputSchema = z.strictObject({});

export const directorySavedViewSaveInputSchema = z.strictObject({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1, 'Nom de vue requis').max(60, 'Nom de vue trop long'),
  state: directorySavedViewStateSchema,
  is_default: z.boolean().default(false)
});

export const directorySavedViewDeleteInputSchema = z.strictObject({
  id: uuidSchema
});

export const directorySavedViewSetDefaultInputSchema = z.strictObject({
  id: uuidSchema
});

export const directoryListRowSchema = z.strictObject({
  id: uuidSchema,
  entity_type: z.string().trim().min(1, 'Type requis'),
  client_kind: directoryNullableClientKindSchema,
  client_number: directoryNullableTextSchema,
  account_type: z.enum(['term', 'cash']).nullable(),
  name: z.string().trim().min(1, 'Nom requis'),
  city: directoryNullableTextSchema,
  postal_code: directoryNullableTextSchema.optional(),
  department: directoryNullableTextSchema,
  siret: directoryNullableTextSchema.optional(),
  siren: directoryNullableTextSchema.optional(),
  official_name: directoryNullableTextSchema.optional(),
  agency_id: z.string().nullable(),
  agency_name: directoryNullableTextSchema,
  cir_commercial_id: z.string().nullable(),
  cir_commercial_name: directoryNullableTextSchema,
  archived_at: z.string().nullable(),
  updated_at: z.string().trim().min(1, 'Date de mise a jour requise')
});

export const directoryRecordSchema = z.strictObject({
  id: uuidSchema,
  entity_type: z.string().trim().min(1, 'Type requis'),
  client_kind: directoryNullableClientKindSchema,
  client_number: directoryNullableTextSchema,
  account_type: z.enum(['term', 'cash']).nullable(),
  name: z.string().trim().min(1, 'Nom requis'),
  address: directoryNullableTextSchema,
  postal_code: directoryNullableTextSchema,
  department: directoryNullableTextSchema,
  city: directoryNullableTextSchema,
  country: z.string().trim().min(1, 'Pays requis'),
  ...officialCompanyFieldsSchema.shape,
  notes: directoryNullableTextSchema,
  agency_id: z.string().nullable(),
  agency_name: directoryNullableTextSchema,
  cir_commercial_id: z.string().nullable(),
  cir_commercial_name: directoryNullableTextSchema,
  archived_at: z.string().nullable(),
  created_at: z.string().trim().min(1, 'Date de creation requise'),
  updated_at: z.string().trim().min(1, 'Date de mise a jour requise')
});

export const directoryCompanySearchInputSchema = z.strictObject({
  query: z.string().trim().min(1, 'Recherche entreprise requise').max(120, 'Recherche trop longue'),
  department: optionalTextFilterSchema.optional(),
  city: optionalTextFilterSchema.optional(),
  page: z.coerce.number().int().min(1, 'Page invalide').max(10, 'Page invalide').optional(),
  per_page: z.coerce.number().int().min(1, 'Taille invalide').max(20, 'Taille invalide').optional()
});

export const directoryCompanyDetailsInputSchema = z.strictObject({
  siren: z.string().trim().regex(/^\d{9}$/, 'SIREN invalide')
});

const directoryOptionalEmailSchema = z
  .union([z.string().trim().email('Email invalide'), z.literal(''), z.null(), z.undefined()])
  .transform((value) => normalizeOptionalText(value) ?? null);

const directoryOptionalPhoneSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => normalizeOptionalText(value) ?? null);

export const directoryCompanyDuplicateInputSchema = z.strictObject({
  kind: z.literal('company'),
  scope: directoryScopeInputSchema.default({ mode: 'active_agency' }),
  includeArchived: booleanLikeSchema.default(true),
  siret: optionalOfficialTextSchema.optional(),
  siren: optionalOfficialTextSchema.optional(),
  name: z.string().trim().min(1, 'Nom requis'),
  city: optionalTextFilterSchema.optional()
});

export const directoryIndividualDuplicateInputSchema = z.strictObject({
  kind: z.literal('individual'),
  scope: directoryScopeInputSchema.default({ mode: 'active_agency' }),
  includeArchived: booleanLikeSchema.default(true),
  first_name: z.string().trim().min(1, 'Prenom requis'),
  last_name: z.string().trim().min(1, 'Nom requis'),
  postal_code: z.string().trim().regex(/^\d{5}$/, 'Code postal invalide'),
  city: z.string().trim().min(1, 'Ville requise'),
  email: directoryOptionalEmailSchema,
  phone: directoryOptionalPhoneSchema
}).superRefine((values, ctx) => {
  if (!values.email && !values.phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Telephone ou email requis',
      path: ['phone']
    });
  }
});

export const directoryDuplicatesInputSchema = z.discriminatedUnion('kind', [
  directoryCompanyDuplicateInputSchema,
  directoryIndividualDuplicateInputSchema
]);

export const directoryCompanySearchEstablishmentStatusSchema = z.enum(['open', 'closed', 'unknown']);

export const directoryCompanySearchResultSchema = z.strictObject({
  name: z.string().trim().min(1, 'Nom entreprise requis'),
  address: directoryNullableTextSchema,
  postal_code: directoryNullableTextSchema,
  city: directoryNullableTextSchema,
  department: directoryNullableTextSchema,
  region: optionalOfficialTextSchema,
  date_creation: optionalOfficialTextSchema,
  date_debut_activite: optionalOfficialTextSchema,
  employee_range: optionalOfficialTextSchema,
  employee_range_year: optionalOfficialYearSchema,
  is_employer: optionalOfficialBooleanSchema,
  establishment_diffusion_status: optionalOfficialTextSchema,
  brands: officialTextArraySchema,
  is_head_office: z.boolean(),
  is_former_head_office: z.boolean(),
  establishment_status: directoryCompanySearchEstablishmentStatusSchema,
  establishment_closed_at: directoryNullableTextSchema,
  commercial_name: directoryNullableTextSchema,
  company_establishments_count: z.number().int().nonnegative().nullable(),
  company_open_establishments_count: z.number().int().nonnegative().nullable(),
  match_quality: directoryCompanySearchMatchQualitySchema,
  match_explanation: directoryNullableTextSchema,
  ...officialCompanyFieldsSchema.shape
});

export const directoryCompanyDirectorSchema = z.strictObject({
  full_name: z.string().trim().min(1, 'Nom dirigeant requis'),
  role: directoryNullableTextSchema,
  nationality: directoryNullableTextSchema,
  birth_year: z.number().int().nonnegative().nullable()
});

export const directoryCompanyFinancialsSchema = z.strictObject({
  latest_year: z.number().int().nonnegative(),
  revenue: z.number().finite().nullable(),
  net_income: z.number().finite().nullable()
});

export const directoryCompanySignalsSchema = z.strictObject({
  association: z.boolean(),
  ess: z.boolean(),
  qualiopi: z.boolean(),
  rge: z.boolean(),
  bio: z.boolean(),
  organisme_formation: z.boolean(),
  service_public: z.boolean(),
  societe_mission: z.boolean()
});

export const directoryCompanyDetailsSchema = z.strictObject({
  siren: z.string().trim().regex(/^\d{9}$/, 'SIREN requis'),
  official_name: z.string().trim().min(1, 'Raison sociale requise'),
  name: z.string().trim().min(1, 'Nom complet requis'),
  sigle: directoryNullableTextSchema,
  nature_juridique: directoryNullableTextSchema,
  categorie_entreprise: directoryNullableTextSchema,
  date_creation: directoryNullableTextSchema,
  etat_administratif: directoryNullableTextSchema,
  activite_principale: directoryNullableTextSchema,
  activite_principale_naf25: directoryNullableTextSchema,
  section_activite_principale: directoryNullableTextSchema,
  company_establishments_count: z.number().int().nonnegative().nullable(),
  company_open_establishments_count: z.number().int().nonnegative().nullable(),
  employee_range: directoryNullableTextSchema,
  employee_range_year: z.number().int().nonnegative().nullable(),
  is_employer: z.boolean().nullable(),
  diffusion_status: directoryNullableTextSchema,
  directors: z.array(directoryCompanyDirectorSchema),
  financials: directoryCompanyFinancialsSchema.nullable(),
  signals: directoryCompanySignalsSchema
});

export const directoryDuplicateMatchSchema = z.strictObject({
  record: directoryListRowSchema,
  reason: z.string().trim().min(1, 'Raison requise')
});

export type DirectoryEntityType = z.infer<typeof directoryEntityTypeSchema>;
export type DirectoryClientKind = z.infer<typeof directoryClientKindSchema>;
export type DirectorySortBy = z.infer<typeof directorySortBySchema>;
export type DirectorySortDirection = z.infer<typeof directorySortDirectionSchema>;
export type DirectoryDensity = z.infer<typeof directoryDensitySchema>;
export type DirectoryScopeInput = z.infer<typeof directoryScopeInputSchema>;
export type DirectorySortingRule = z.infer<typeof directorySortingRuleSchema>;
export type DirectoryListFilters = z.infer<typeof directoryListFiltersSchema>;
export type DirectoryPagination = z.infer<typeof directoryPaginationSchema>;
export type DirectoryDebugInput = z.infer<typeof directoryDebugInputSchema>;
export type DirectoryListInput = z.infer<typeof directoryListInputSchema>;
export type DirectoryOptionsAgenciesInput = z.infer<typeof directoryOptionsAgenciesInputSchema>;
export type DirectoryOptionsFacetInput = z.infer<typeof directoryOptionsFacetInputSchema>;
export type DirectoryOptionsCitiesInput = z.infer<typeof directoryOptionsCitiesInputSchema>;
export type DirectoryCitySuggestionsInput = z.infer<typeof directoryCitySuggestionsInputSchema>;
export type DirectoryRouteRef = z.infer<typeof directoryRouteRefSchema>;
export type DirectoryCommercialOption = z.infer<typeof directoryCommercialOptionSchema>;
export type DirectoryAgencyOption = z.infer<typeof directoryAgencyOptionSchema>;
export type DirectorySuggestionOption = z.infer<typeof directorySuggestionOptionSchema>;
export type DirectorySearchState = z.infer<typeof directorySearchStateSchema>;
export type DirectorySavedViewState = z.infer<typeof directorySavedViewStateSchema>;
export type DirectorySavedView = z.infer<typeof directorySavedViewSchema>;
export type DirectorySavedViewsListInput = z.infer<typeof directorySavedViewsListInputSchema>;
export type DirectorySavedViewSaveInput = z.infer<typeof directorySavedViewSaveInputSchema>;
export type DirectorySavedViewDeleteInput = z.infer<typeof directorySavedViewDeleteInputSchema>;
export type DirectorySavedViewSetDefaultInput = z.infer<typeof directorySavedViewSetDefaultInputSchema>;
export type DirectoryListRow = z.infer<typeof directoryListRowSchema>;
export type DirectoryRecord = z.infer<typeof directoryRecordSchema>;
export type OfficialCompanyFields = z.infer<typeof officialCompanyFieldsSchema>;
export type DirectoryCompanySearchMatchQuality = z.infer<typeof directoryCompanySearchMatchQualitySchema>;
export type DirectoryCompanySearchEstablishmentStatus = z.infer<typeof directoryCompanySearchEstablishmentStatusSchema>;
export type DirectoryCompanySearchInput = z.infer<typeof directoryCompanySearchInputSchema>;
export type DirectoryCompanyDetailsInput = z.infer<typeof directoryCompanyDetailsInputSchema>;
export type DirectoryCompanySearchResult = z.infer<typeof directoryCompanySearchResultSchema>;
export type DirectoryCompanyDirector = z.infer<typeof directoryCompanyDirectorSchema>;
export type DirectoryCompanyFinancials = z.infer<typeof directoryCompanyFinancialsSchema>;
export type DirectoryCompanySignals = z.infer<typeof directoryCompanySignalsSchema>;
export type DirectoryCompanyDetails = z.infer<typeof directoryCompanyDetailsSchema>;
export type DirectoryDuplicatesInput = z.infer<typeof directoryDuplicatesInputSchema>;
export type DirectoryDuplicateMatch = z.infer<typeof directoryDuplicateMatchSchema>;
