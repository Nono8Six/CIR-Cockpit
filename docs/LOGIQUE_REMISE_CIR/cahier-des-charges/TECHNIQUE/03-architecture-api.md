# T3. Architecture et API

[← Moteur de calcul SQL](./02-moteur-calcul-sql.md) | [Sommaire](../00-sommaire.md) | [RLS et securite →](./04-rls-securite.md)

---

Specification technique de l'architecture applicative et de l'API du module de remise CIR v3.0. Ce document est destine a l'equipe de developpement et decrit la stack, l'arborescence des fichiers, les procedures tRPC, les endpoints IA et les schemas de validation.

---

## T3.0 - Etat actuel vs cible

Etat actuel du codebase (constate) :
- Le router tRPC en production n'expose pas encore l'ensemble du namespace `pricing.*`.
- Une partie des lectures frontend passe encore par des acces directs Supabase `.from(...)`.
- Le module remise v3 reste une cible d'architecture, a migrer progressivement.

Cible v3 :
- Toutes les operations du module passent par `pricing.*` via l'Edge Function API unique.
- Les acces directs frontend sont reduits puis supprimes au profit des services tRPC types.
- Migration recommandee en 3 paliers : lecture -> mutations -> imports/flux batch.

---

## T3.1 - Stack applicative

Le module de remise s'integre dans le CIR Cockpit existant. Aucune nouvelle dependance structurelle n'est ajoutee sauf SheetJS (import Excel), Recharts (graphiques) et Mistral API (IA contextuelle).

| Couche | Technologie | Version | Usage dans le module remise |
|--------|------------|---------|----------------------------|
| Frontend framework | React | 19 | Composants UI pricing, formulaires conditions |
| Build tool | Vite | 7 | Build production, HMR dev |
| Language | TypeScript | 5.9 | Typage strict, zero `any` |
| CSS | Tailwind CSS | 4 | Utility-first, theming coherent |
| UI Components | shadcn/ui | latest | Primitives (Table, Dialog, Select, etc.) |
| Data fetching | TanStack Query | v5 | Cache conditions, invalidation cascade |
| Forms | React Hook Form | v7 | Edition conditions, derogations, BFA |
| Validation | Zod | v4 | Schemas partages front/back |
| Notifications | Sonner | latest | Toasts succes/erreur |
| Icons | Lucide React | latest | Icones metier (TrendingUp, Calculator, etc.) |
| Date | date-fns | latest | Formatage dates validite, echeances |
| Backend runtime | Deno | latest | Edge Function Supabase |
| Backend framework | Hono | latest | HTTP routing, middleware chain |
| API contract | tRPC | latest | Type safety end-to-end |
| Database | PostgreSQL | 15 (Supabase) | Stockage, RLS multi-tenant, fonctions SQL |
| Auth | Supabase Auth | latest | Sessions JWT, roles |
| Realtime | Supabase Realtime | latest | Notifications validation propositions |
| Excel parsing | SheetJS (xlsx) | latest | Import tarifs Excel/CSV |
| Charts | Recharts | latest | Graphiques marges, evolution prix |
| LLM | Mistral API | Small 3 / Medium 3 | IA contextuelle (insights, suggestions) |

---

## T3.2 - Composants shadcn/ui utilises

Tous les composants shadcn/ui mobilises par le module de remise :

| Composant | Usage dans le module remise |
|-----------|----------------------------|
| **Button** | Actions CRUD (sauvegarder, valider, copier, archiver), boutons de simulation |
| **Input** | Saisie pourcentages de remise, prix, recherche references |
| **Select** | Choix niveau cascade (client/groupement/marque), type de condition, perimetre derogation |
| **Table** | Grilles de conditions, tarifs marche, historique imports, comparaison clients |
| **Dialog** | Modale edition condition, confirmation validation, apercu copie, derogation |
| **Tabs** | Navigation onglets fiche client (conditions, consommation, historique, IA) |
| **Badge** | Statuts (en attente, valide, refuse, expire), niveaux cascade, tags marque |
| **Card** | Cartes KPI (marge brute, CA, nombre conditions), resume IA, metriques |
| **Textarea** | Commentaires proposition, justification derogation, notes IA |
| **Calendar / DatePicker** | Dates de validite des conditions, periodes d'analyse |
| **Tooltip** | Info-bulles sur les niveaux de cascade, explications marge, aide contextuelle |
| **Popover** | Selecteur de references avec recherche, details condition au survol |
| **Separator** | Separation visuelle sections fiche client, blocs formulaire |
| **Skeleton** | Chargement conditions, resultats recherche, insights IA |
| **DropdownMenu** | Actions contextuelles sur ligne condition (editer, dupliquer, archiver) |
| **Command / Combobox** | Recherche client avec autocompletion, recherche reference fuzzy |
| **ScrollArea** | Listes longues de conditions, historique propositions |
| **Alert** | Alertes marge negative, conflits copie, quota IA atteint |
| **Checkbox** | Selection multiple pour validation batch, choix conditions a copier |
| **Toggle / ToggleGroup** | Basculement vue (grille/liste), activation IA, filtre actif/archive |
| **Collapsible** | Sections repliables fiche client, details cascade, analyse IA detaillee |

---

## T3.3 - Architecture des fichiers

### Frontend

```
frontend/src/
├── components/
│   └── pricing/
│       ├── PricingLayout.tsx              # Layout principal, orchestration onglets
│       │
│       ├── search/
│       │   ├── PricingSearchBar.tsx        # Barre de recherche client (Command/Combobox)
│       │   ├── PricingSearchResults.tsx    # Liste resultats avec preview
│       │   └── PricingSearchFilters.tsx    # Filtres agence, segment, statut
│       │
│       ├── client-sheet/
│       │   ├── ClientSheetLayout.tsx       # Fiche client, navigation onglets
│       │   ├── ClientSheetHeader.tsx       # Entete (nom, segment, KPI)
│       │   ├── ClientSheetKpiCards.tsx     # Cartes marge, CA, nb conditions
│       │   └── ClientSheetConsumption.tsx  # Graphique consommation (Recharts)
│       │
│       ├── conditions/
│       │   ├── ConditionTable.tsx          # Grille editable des conditions
│       │   ├── ConditionRow.tsx            # Ligne condition avec actions
│       │   ├── ConditionEditDialog.tsx     # Modale edition (RHF + Zod)
│       │   ├── ConditionCascadeView.tsx    # Visualisation 19 niveaux
│       │   ├── ConditionFilters.tsx        # Filtres marque, famille, statut
│       │   └── ConditionHistory.tsx        # Historique modifications
│       │
│       ├── simulator/
│       │   ├── PriceSimulator.tsx          # Simulateur de prix interactif
│       │   ├── SimulatorInputs.tsx         # Saisie reference, quantite, conditions
│       │   ├── SimulatorResults.tsx        # Resultat decompose (cascade, marge)
│       │   └── SimulatorChart.tsx          # Graphique waterfall marge
│       │
│       ├── market-price/
│       │   ├── MarketPriceTable.tsx        # Grille prix marche par reference
│       │   ├── MarketPriceComparison.tsx   # Ecart prix client vs marche
│       │   └── MarketPriceTrend.tsx        # Evolution temporelle (Recharts)
│       │
│       ├── derogations/                    # ← NEW v3.0
│       │   ├── DerogationList.tsx          # Liste derogations fournisseur
│       │   ├── DerogationEditDialog.tsx    # Creation/edition (perimetre, taux, validite)
│       │   ├── DerogationStatusBadge.tsx   # Badge statut (active, expiree, archivee)
│       │   └── DerogationImpactView.tsx    # Impact sur marge nette
│       │
│       ├── bfa/                            # ← NEW v3.0
│       │   ├── BfaRateTable.tsx            # Grille taux BFA par marque
│       │   ├── BfaRateEditDialog.tsx       # Edition taux (Direction uniquement)
│       │   └── BfaImpactSummary.tsx        # Resume impact BFA sur marge
│       │
│       ├── copy-conditions/                # ← NEW v3.0
│       │   ├── CopyConditionsDialog.tsx    # Modale copie (source, cible, options)
│       │   ├── CopyPreviewTable.tsx        # Apercu avec detection conflits
│       │   └── CopyConflictResolver.tsx    # Resolution conflits (ecraser, ignorer, fusionner)
│       │
│       ├── proposal/
│       │   ├── ProposalSummary.tsx         # Resume proposition avant soumission
│       │   ├── ProposalSubmitDialog.tsx    # Modale soumission avec commentaire
│       │   ├── ProposalList.tsx            # Liste propositions en attente
│       │   └── ProposalStatusTimeline.tsx  # Timeline statut validation
│       │
│       ├── validation/
│       │   ├── ValidationQueue.tsx         # File d'attente validation (ROI+, Direction)
│       │   ├── ValidationCard.tsx          # Carte proposition a valider
│       │   ├── ValidationBatchActions.tsx  # Actions batch (valider/refuser lot)
│       │   └── ValidationHistory.tsx       # Historique decisions
│       │
│       ├── import/
│       │   ├── ImportUploader.tsx          # Upload Excel/CSV (drag & drop)
│       │   ├── ImportMappingEditor.tsx     # Editeur mapping colonnes
│       │   ├── ImportPreview.tsx           # Apercu donnees parsees
│       │   ├── ImportDeltaView.tsx         # Delta avant/apres import
│       │   └── ImportHistory.tsx           # Historique imports
│       │
│       ├── ai/                             # ← NEW v3.0
│       │   ├── AiInsightsCard.tsx          # Carte resume IA proactif
│       │   ├── AiSuggestionPopover.tsx     # Suggestion contextuelle (edition)
│       │   ├── AiSearchBar.tsx             # Recherche langage naturel
│       │   ├── AiAnalysisDialog.tsx        # Analyse approfondie (trends, delta)
│       │   └── AiToggle.tsx               # Toggle activation IA par utilisateur
│       │
│       ├── comparison/                     # ← NEW v3.0
│       │   ├── ComparisonLayout.tsx        # Layout comparaison cote a cote
│       │   ├── ComparisonSelector.tsx      # Selection 2 clients a comparer
│       │   └── ComparisonDiffTable.tsx     # Tableau differences conditions
│       │
│       ├── cl/                             # ← NEW v3.1
│       │   ├── ClCoefficientsTable.tsx     # Grille coefficients CL par hierarchie
│       │   ├── ClCoefficientEditDialog.tsx # Edition coefficient CL
│       │   └── ClConfigPanel.tsx           # Configuration frais ligne/port
│       │
│       └── admin/
│           ├── PricingAdminLayout.tsx      # Administration module remise
│           ├── ClCoefficients.tsx          # ← NEW : Onglet admin CL (orchestrateur)
│           ├── SegmentManager.tsx          # Gestion segments client
│           ├── CascadeLevelManager.tsx     # Configuration niveaux cascade
│           └── AiQuotaMonitor.tsx          # Monitoring quotas IA (Direction)
│
├── hooks/pricing/
│   ├── useClientSearch.ts                 # Recherche client avec debounce
│   ├── useClientConditions.ts             # Query conditions client (cache 5min)
│   ├── useGroupConditions.ts              # Query conditions groupement
│   ├── useClientConsumption.ts            # Query donnees consommation
│   ├── useCascadeResolver.ts              # Hook resolution cascade 19 niveaux
│   ├── usePriceSimulator.ts               # Hook simulation prix interactive
│   ├── useConditionMutation.ts            # Mutation CRUD condition
│   ├── useProposalSubmit.ts               # Mutation soumission proposition
│   ├── useProposalValidation.ts           # Mutation validation/refus
│   ├── usePendingProposals.ts             # Query propositions en attente
│   ├── useMarketPrices.ts                 # Query prix marche
│   ├── useReferenceSearch.ts              # Recherche reference (fuzzy)
│   ├── useSegments.ts                     # Query segments
│   ├── useImportPricelist.ts              # Mutation import tarifs
│   ├── useImportHistory.ts                # Query historique imports
│   ├── useMappingTemplates.ts             # Query/mutation templates mapping
│   ├── useSupplierDerogations.ts          # ← NEW : query derogations fournisseur
│   ├── useBfaRates.ts                     # ← NEW : query taux BFA
│   ├── useCopyConditions.ts               # ← NEW : mutation copie conditions
│   ├── useAiInsights.ts                   # ← NEW : query insights IA
│   ├── useAiSuggest.ts                    # ← NEW : query suggestion IA contextuelle
│   ├── useClCoefficients.ts               # ← NEW : query/mutation coefficients CL
│   └── useClConfig.ts                     # ← NEW : query/mutation config CL
│
├── services/pricing/
│   ├── getClientConditions.ts             # Lecture conditions client
│   ├── getGroupConditions.ts              # Lecture conditions groupement
│   ├── saveCondition.ts                   # Creation/maj condition
│   ├── archiveCondition.ts                # Archivage condition
│   ├── getConsumption.ts                  # Donnees consommation
│   ├── resolveCascade.ts                  # Appel resolution cascade
│   ├── simulatePrice.ts                   # Appel simulation prix
│   ├── submitProposal.ts                  # Soumission proposition
│   ├── validateProposal.ts                # Validation/refus proposition
│   ├── getMarketPrices.ts                 # Lecture prix marche
│   ├── importMarketPrices.ts              # Import prix marche
│   ├── searchReferences.ts               # Recherche references
│   ├── importPricelist.ts                 # Import tarifs Excel
│   ├── getDerogations.ts                  # ← NEW : lecture derogations
│   ├── saveDerogation.ts                  # ← NEW : creation/maj derogation
│   ├── getBfaRates.ts                     # ← NEW : lecture taux BFA
│   ├── copyConditions.ts                  # ← NEW : copie conditions
│   ├── aiService.ts                       # ← NEW : appels endpoints IA
│   └── clService.ts                       # ← NEW : lecture/ecriture coefficients CL
│
├── utils/pricing/
│   ├── marginCalculator.ts                # Calcul marge brute/nette (pure function)
│   ├── cascadeResolver.ts                 # Resolution cascade cote client (preview)
│   └── excelParser.ts                     # Parsing Excel via SheetJS
│
└── schemas/
    └── pricing.schema.ts                  # Schemas Zod locaux (formulaires RHF)
```

### Backend

```
backend/functions/api/
├── routes/
│   └── pricing.ts                         # Route Hono /pricing/*, monte les procedures tRPC
│
├── services/pricing/
│   ├── cascadeEngine.ts                   # Moteur cascade 19 niveaux + PA effectif
│   ├── cascadeEngine_test.ts              # Tests unitaires cascade
│   ├── conditionService.ts                # CRUD conditions (client, groupement)
│   ├── conditionService_test.ts           # Tests conditions
│   ├── proposalService.ts                 # Soumission + validation propositions
│   ├── proposalService_test.ts            # Tests propositions
│   ├── marketPriceService.ts              # Gestion prix marche
│   ├── marketPriceService_test.ts         # Tests prix marche
│   ├── derogationService.ts               # ← NEW : CRUD derogations fournisseur
│   ├── derogationService_test.ts          # ← NEW : Tests derogations
│   ├── bfaService.ts                      # ← NEW : Gestion taux BFA
│   ├── bfaService_test.ts                 # ← NEW : Tests BFA
│   ├── copyService.ts                     # ← NEW : Copie conditions inter-entites
│   ├── copyService_test.ts                # ← NEW : Tests copie
│   ├── aiService.ts                       # ← NEW : Orchestration appels LLM
│   ├── aiService_test.ts                  # ← NEW : Tests IA
│   ├── referenceSearch.ts                 # Recherche references (exact + fuzzy)
│   ├── referenceSearch_test.ts            # Tests recherche
│   ├── importService.ts                   # Import/parsing tarifs
│   ├── importService_test.ts              # Tests import
│   ├── clService.ts                       # ← NEW : CRUD coefficients CL + config
│   └── clService_test.ts                  # ← NEW : Tests CL
│
└── trpc/
    └── pricingRouter.ts                   # Router tRPC pricing (toutes procedures)
```

### Shared

```
shared/schemas/
├── pricing.schema.ts                      # Schemas partages front/back (conditions, propositions)
├── derogation.schema.ts                   # ← NEW : Schema derogation
├── bfa.schema.ts                          # ← NEW : Schema BFA
└── ai.schema.ts                           # ← NEW : Schema requetes/reponses IA
```

---

## T3.4 - API (procedures tRPC)

Toutes les procedures sont exposees sous le namespace `pricing.*` via le router tRPC. Elles transitent par l'Edge Function unique `/functions/v1/api/trpc/pricing.*`.

### Procedures existantes (mises a jour v3.0)

| Procedure | Type | Input | Output | Role min. |
|-----------|------|-------|--------|-----------|
| `pricing.searchClients` | query | `{ query: string, agencyId: string, limit?: number }` | `ClientSearchResult[]` | `tcs` |
| `pricing.getClientConditions` | query | `{ clientId: string, filters?: ConditionFilters }` | `ClientCondition[]` | `tcs` |
| `pricing.getGroupConditions` | query | `{ groupementId: string, filters?: ConditionFilters }` | `GroupCondition[]` | `tcs` |
| `pricing.getClientConsumption` | query | `{ clientId: string, period: DateRange }` | `ConsumptionData` | `tcs` |
| `pricing.resolveCascade` | query | `{ referenceId: string, clientId: string, quantity: number }` | `CascadeResult` (19 niveaux + PA effectif) | `tcs` |
| `pricing.simulatePrice` | query | `{ referenceId: string, clientId: string, quantity: number, overrides?: ConditionOverride[] }` | `SimulationResult` (avec contexte derog + BFA) | `tcs` |
| `pricing.submitProposal` | mutation | `{ conditions: ProposalCondition[], comment: string, clientId: string }` | `{ proposalId: string, status: string }` | `tcs` |
| `pricing.submitBatchProposal` | mutation | `{ proposals: ProposalCondition[][], comment: string }` | `{ batchId: string, count: number }` | `tcs` |
| `pricing.getPendingProposals` | query | `{ agencyId?: string, status?: ProposalStatus }` | `Proposal[]` | `agency_admin` |
| `pricing.validateProposal` | mutation | `{ proposalId: string, decision: 'approved' \| 'rejected' \| 'demande_precision', comment?: string }` | `{ proposalId: string, status: string }` | `agency_admin` |
| `pricing.validateBatch` | mutation | `{ proposalIds: string[], decision: 'approved' \| 'rejected', comment?: string }` | `{ processed: number, errors: string[] }` | `agency_admin` |
| `pricing.getMarketPrices` | query | `{ referenceIds: string[], source?: string }` | `MarketPrice[]` | `tcs` |
| `pricing.importMarketPrices` | mutation | `{ prices: MarketPriceInput[], source: string }` | `{ imported: number, updated: number }` | `agency_admin` |
| `pricing.searchReferences` | query | `{ query: string, limit?: number }` | `Reference[]` | `tcs` |
| `pricing.fuzzyMatchReference` | query | `{ designation: string, threshold?: number }` | `FuzzyMatch[]` | `tcs` |
| `pricing.getSegments` | query | `{ agencyId?: string }` | `Segment[]` | `tcs` |
| `pricing.importPricelist` | mutation | `{ file: Base64, mappingId?: string }` | `ImportResult` | `agency_admin` |
| `pricing.getImportHistory` | query | `{ agencyId?: string, limit?: number }` | `ImportRecord[]` | `agency_admin` |
| `pricing.saveMappingTemplate` | mutation | `{ name: string, mapping: ColumnMapping }` | `{ templateId: string }` | `agency_admin` |
| `pricing.getMappingTemplates` | query | `{ agencyId?: string }` | `MappingTemplate[]` | `agency_admin` |

Statut `demande_precision` (workflow) :
- transition `pending -> demande_precision` avec commentaire validateur obligatoire
- transition `demande_precision -> pending` avec commentaire de reponse TCS obligatoire
- cloture possible vers `approved` ou `rejected`
- aucun SLA automatique bloque au niveau API

### Nouvelles procedures v3.0

| Procedure | Type | Input | Output | Role min. |
|-----------|------|-------|--------|-----------|
| `pricing.getDerogations` | query | `{ clientId?: string, groupementId?: string, marque?: string }` | `Derogation[]` | `tcs` |
| `pricing.saveDerogation` | mutation | `{ derogation: DerogationInput }` | `{ derogationId: string }` | `agency_admin` (agence) / `super_admin` (nationale/globale) |
| `pricing.archiveDerogation` | mutation | `{ derogationId: string, reason?: string }` | `{ archived: boolean }` | `agency_admin` |
| `pricing.getBfaRates` | query | `{ marques?: string[], year?: number }` | `BfaRate[]` | `tcs` |
| `pricing.saveBfaRate` | mutation | `{ bfaRate: BfaRateInput }` | `{ bfaRateId: string }` | `super_admin` |
| `pricing.copyConditions` | mutation | `{ sourceId: string, targetId: string, options: CopyOptions }` | `{ copied: number, skipped: number, conflicts: number }` | `agency_admin` |
| `pricing.previewCopy` | query | `{ sourceId: string, targetId: string, options: CopyOptions }` | `CopyPreview` (conditions, conflits detectes) | `agency_admin` |
| `pricing.compareClients` | query | `{ clientIdA: string, clientIdB: string, filters?: ConditionFilters }` | `ComparisonResult` (conditions cote a cote, ecarts) | `tcs` |
| `pricing.getClCoefficients` | query | `{ fsmega?: number, fsfam?: number }` | `ClCoefficient[]` (liste des coefs avec heritage resolve) | `tcs` |
| `pricing.saveClCoefficient` | mutation | `{ fsmega: number, fsfam?: number, fssfa?: number, coef_cl: number, date_debut?: string, date_fin?: string }` | `{ coefficientId: string }` | `agency_admin` |
| `pricing.deleteClCoefficient` | mutation | `{ coefficientId: string }` | `{ deleted: boolean }` | `agency_admin` |
| `pricing.getClConfig` | query | `{}` | `ClConfig` (frais de ligne, frais de port) | `tcs` |
| `pricing.saveClConfig` | mutation | `{ frais_ligne_cl: number, frais_port_inter_agence: number }` | `{ updated: boolean }` | `super_admin` |
| `pricing.getGlobalConfig` | query | `{}` | `PricingGlobalConfig` (`copy_min_marge_facture_pct`) | `tcs` |
| `pricing.saveGlobalConfig` | mutation | `{ copy_min_marge_facture_pct: number }` | `{ updated: boolean }` | `super_admin` |

### Procedures IA v3.0

| Procedure | Type | Input | Output | Role min. |
|-----------|------|-------|--------|-----------|
| `pricing.ai.insights` | query | `{ clientId: string, context?: AiContext }` | `AiInsightsResponse` (resume, alertes, opportunites) | `tcs` |
| `pricing.ai.suggest` | query | `{ clientId: string, referenceId: string, currentCondition?: Condition }` | `AiSuggestion` (taux suggere, justification, confiance) | `tcs` |
| `pricing.ai.search` | query | `{ query: string, agencyId: string }` | `AiSearchResult[]` (clients, conditions, references) | `tcs` |
| `pricing.ai.validateAssist` | query | `{ proposalId: string }` | `AiValidationAssist` (resume, risques, recommandation) | `agency_admin` |
| `pricing.ai.analyze` | query | `{ type: 'import_delta' \| 'trends' \| 'copy_advisor', params: AnalyzeParams }` | `AiAnalysis` (analyse detaillee, visualisations) | `agency_admin` |

---

## T3.5 - Endpoints IA

Les endpoints IA suivent une architecture en 3 couches : collecte de donnees (SQL), construction du prompt, appel LLM.

### Architecture commune

```
Requete utilisateur
    │
    ▼
┌─────────────────┐
│  Couche 1 : SQL │  Collecte des donnees contextuelles
│  (Supabase)     │  via fonctions SQL dediees
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Couche 2 :     │  Construction du prompt systeme
│  Prompt Builder │  + injection des donnees collectees
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Couche 3 :     │  Appel Mistral API (Small 3 ou Medium 3)
│  LLM Call       │  + parsing reponse structuree (JSON mode)
└────────┬────────┘
         │
         ▼
   Reponse formatee
```

### Detail par endpoint

#### `pricing.ai.insights` - Resume proactif

- **Couche 1 (SQL)** : conditions actives du client, consommation 12 mois, marge moyenne, ecart vs prix marche, derogations actives, historique propositions recentes.
- **Couche 2 (Prompt)** : prompt systeme avec role "analyste pricing CIR", donnees injectees en JSON structure. Instruction : generer un resume en 3-5 points, identifier alertes (marge < seuil, conditions expirees) et opportunites (upsell, alignement marche).
- **Couche 3 (LLM)** : Mistral Small 3 (rapide, cout faible, francais natif). Output JSON : `{ summary: string, alerts: Alert[], opportunities: Opportunity[] }`.
- **Cache** : 1h TTL par `clientId`.

#### `pricing.ai.suggest` - Suggestion contextuelle

- **Couche 1 (SQL)** : condition actuelle, conditions similaires sur le segment, prix marche de la reference, marge actuelle, historique modifications.
- **Couche 2 (Prompt)** : contexte d'edition. Instruction : suggerer un taux de remise optimal avec justification et niveau de confiance (0-100).
- **Couche 3 (LLM)** : Mistral Small 3. Output JSON : `{ suggestedRate: number, justification: string, confidence: number, comparables: Comparable[] }`.
- **Cache** : pas de cache (contextuel a l'edition en cours).

#### `pricing.ai.search` - Recherche langage naturel

- **Couche 1 (SQL)** : extraction des entites de la requete (client, marque, segment, fourchette de valeurs), mapping vers des filtres SQL.
- **Couche 2 (Prompt)** : prompt d'extraction d'intention. Instruction : transformer la requete en filtres structures.
- **Couche 3 (LLM)** : Mistral Small 3. Output JSON : `{ filters: SearchFilter[], interpretation: string }`. Les filtres sont ensuite executes en SQL standard.
- **Cache** : 15min TTL par `query` normalise.

#### `pricing.ai.validateAssist` - Aide a la validation

- **Couche 1 (SQL)** : proposition complete, conditions source et cible, impact marge, historique validations similaires, consommation client.
- **Couche 2 (Prompt)** : role "controleur de gestion". Instruction : evaluer le risque, estimer l'impact financier, formuler une recommandation (approuver / refuser / demander revision).
- **Couche 3 (LLM)** : Mistral Medium 3 (raisonnement plus fin pour les decisions). Output JSON : `{ summary: string, risks: Risk[], financialImpact: FinancialImpact, recommendation: 'approve' | 'reject' | 'review' }`.
- **Cache** : 30min TTL par `proposalId`.

#### `pricing.ai.analyze` - Analyse approfondie

- **Couche 1 (SQL)** : donnees variables selon le type d'analyse :
  - `import_delta` : ancien vs nouveau tarif, references impactees, ecart moyen.
  - `trends` : historique conditions 24 mois, evolution marge, saisonnalite.
  - `copy_advisor` : conditions source et cible, differences, recommandations de fusion.
- **Couche 2 (Prompt)** : prompt specialise par type d'analyse avec instructions de formatage.
- **Couche 3 (LLM)** : Mistral Medium 3. Output JSON adapte au type d'analyse.
- **Cache** : 1h TTL par combinaison `type + params`.

### Controle des couts

| Parametre | Valeur | Description |
|-----------|--------|-------------|
| Quota Mistral Small 3 | 1 000 appels / jour / agence | insights, suggest, search |
| Quota Mistral Medium 3 | 100 appels / jour / agence | validateAssist, analyze |
| Cache TTL | 15min a 1h selon endpoint | Evite les appels redondants |
| Fallback SQL-only | Automatique si quota atteint | Retourne les donnees brutes sans analyse LLM |
| Toggle utilisateur | Par utilisateur | Desactivation volontaire de l'IA |
| Monitoring | Dashboard admin | Consommation quotas en temps reel |

En cas de depassement de quota, les endpoints retournent les donnees SQL brutes (couche 1) sans appel LLM, avec un flag `aiAvailable: false` dans la reponse.

---

## T3.6 - Schemas Zod partages

Schemas dans `shared/schemas/` valides cote client ET cote serveur.

### `conditionSchema`

```typescript
const conditionSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable(),
  groupement_id: z.string().uuid().nullable(),
  reference_id: z.string().uuid(),
  marque: z.string().min(1),
  marque_force: z.boolean().default(false),       // v3.0 : forcer la marque dans la cascade
  famille: z.string().nullable(),
  sous_famille: z.string().nullable(),
  type_condition: z.enum(['remise', 'prix_net', 'prix_fixe']),
  taux_remise: z.number().min(0).max(100).nullable(),
  prix_net: z.number().positive().nullable(),
  date_debut: z.string().date(),
  date_fin: z.string().date().nullable(),
  niveau_cascade: z.number().int().min(1).max(19),
  commentaire: z.string().max(500).nullable(),
});
```

### `derogationSchema`

```typescript
const derogationSchema = z.object({
  id: z.string().uuid().optional(),
  fournisseur_id: z.string().uuid(),
  perimetre: z.enum(['agence', 'nationale', 'globale']),
  client_id: z.string().uuid().nullable(),
  groupement_id: z.string().uuid().nullable(),
  marque: z.string().nullable(),
  taux_derogation: z.number().min(0).max(100),
  date_debut: z.string().date(),
  date_fin: z.string().date().nullable(),
  justification: z.string().min(10).max(1000),
  statut: z.enum(['active', 'expiree', 'archivee']),
});
```

### `bfaRateSchema`

```typescript
const bfaRateSchema = z.object({
  id: z.string().uuid().optional(),
  marque: z.string().min(1),
  annee: z.number().int().min(2020).max(2040),
  taux_bfa: z.number().min(0).max(100),
  seuil_ca: z.number().positive().nullable(),      // seuil CA pour declenchement
  paliers: z.array(z.object({
    seuil: z.number().positive(),
    taux: z.number().min(0).max(100),
  })).nullable(),
});
```

### `proposalSchema`

```typescript
const proposalSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  conditions: z.array(conditionSchema).min(1),
  commentaire: z.string().min(5).max(2000),
  type_validation: z.enum(['agency_admin', 'super_admin']),
  impact_marge: z.number(),
  statut: z.enum(['draft', 'pending', 'demande_precision', 'approved', 'rejected']),
});
```

### `marketPriceSchema`

```typescript
const marketPriceSchema = z.object({
  reference_id: z.string().uuid(),
  source: z.string().min(1),
  prix: z.number().positive(),
  date_releve: z.string().date(),
  zone_geo: z.string().nullable(),
});
```

### `importMappingSchema`

```typescript
const importMappingSchema = z.object({
  name: z.string().min(1).max(100),
  columns: z.record(z.string(), z.string()),     // col Excel -> champ DB
  skip_rows: z.number().int().min(0).default(0),
  sheet_name: z.string().nullable(),
  delimiter: z.string().max(1).nullable(),         // pour CSV
});
```

### `copyConditionsSchema`

```typescript
const copyConditionsSchema = z.object({
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  source_type: z.enum(['client', 'groupement']),
  target_type: z.enum(['client', 'groupement']),
  filter_marques: z.array(z.string()).nullable(),  // copier uniquement certaines marques
  conflict_strategy: z.enum(['skip', 'overwrite', 'best_with_margin_floor']),
  adjust_taux: z.number().nullable(),              // ajustement +/- % sur les taux copies
});
```

Regle metier associee a `best_with_margin_floor` :
- choisir la condition donnant le `PV` client le plus bas
- sous contrainte `marge_facture >= copy_min_marge_facture_pct`
- `copy_min_marge_facture_pct` est lu dans la table singleton `pricing_global_config` (pas passe par le client)

### `aiRequestSchema`

```typescript
const aiRequestSchema = z.object({
  type: z.enum(['insights', 'suggest', 'search', 'validate_assist', 'analyze']),
  client_id: z.string().uuid().optional(),
  reference_id: z.string().uuid().optional(),
  query: z.string().max(500).optional(),
  proposal_id: z.string().uuid().optional(),
  analyze_type: z.enum(['import_delta', 'trends', 'copy_advisor']).optional(),
  analyze_params: z.record(z.string(), z.unknown()).optional(),
});
```

---

## T3.7 - Middleware chain

Les routes pricing suivent la meme chaine de middleware que le reste de l'Edge Function Hono, avec un rate limiter adapte aux endpoints IA.

```
Requete HTTP
    │
    ▼
┌──────────────┐
│  requestId   │  Genere un UUID unique par requete, injecte dans le contexte Hono.
│              │  Propage dans les logs et les reponses d'erreur.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  auth        │  Extraction et validation du JWT Supabase.
│              │  Injection de `user`, `role`, `agencyId` dans le contexte.
│              │  Rejet 401 si token invalide ou expire.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  rateLimit   │  Rate limiter par cle `userId + endpoint`.
│              │  Standard : 60 req/min pour les procedures CRUD.
│              │  IA : quotas specifiques (voir T3.5).
│              │  Rejet 429 si quota depasse.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  errorHandler│  Middleware catch-all Hono.
│              │  Normalise les erreurs en AppError (catalog lookup).
│              │  Formate la reponse JSON avec code, message, fingerprint.
│              │  Log structure via reportError().
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  route       │  Handler tRPC ou route Hono.
│  handler     │  Logique metier deleguee aux services.
│              │  Validation input via Zod (schemas partages).
└──────────────┘
```

### Configuration des routes

```typescript
// backend/functions/api/routes/pricing.ts
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { pricingRouter } from '../trpc/pricingRouter';

const pricing = new Hono();

// Middleware chain appliquee a toutes les routes pricing
pricing.use('/*', authMiddleware);
pricing.use('/*', rateLimitMiddleware({ window: 60_000, max: 60 }));

// Rate limit specifique pour les endpoints IA
pricing.use('/ai/*', rateLimitMiddleware({
  window: 86_400_000,  // 24h
  max: 1000,           // Mistral Small 3 par defaut
  keyPrefix: 'ai',
  getKey: (c) => `${c.get('agencyId')}`,
}));

// Mount tRPC router
pricing.route('/trpc', trpcHonoAdapter(pricingRouter));

export { pricing };
```

### Verification des roles

La verification des roles est effectuee au niveau de chaque procedure tRPC, pas dans le middleware global. Cela permet une granularite fine :

- `tcs` : lecture conditions, simulation, recherche
- `agency_admin` : mutations conditions, validation propositions, import, copie, derogations agence
- `super_admin` : gestion BFA, derogations nationales/globales, configuration cascade, quotas IA

```typescript
// Exemple dans pricingRouter.ts
const pricingRouter = router({
  getClientConditions: protectedProcedure
    .input(getClientConditionsSchema)
    .query(async ({ ctx, input }) => {
      requireRole(ctx, ['tcs', 'agency_admin', 'super_admin']);
      return conditionService.getClientConditions(ctx.supabase, input);
    }),

  saveBfaRate: protectedProcedure
    .input(bfaRateSchema)
    .mutation(async ({ ctx, input }) => {
      requireRole(ctx, ['super_admin']);
      return bfaService.saveBfaRate(ctx.supabase, input);
    }),
});
```

---

*Document technique v3.0 - Module de remise CIR Cockpit*
