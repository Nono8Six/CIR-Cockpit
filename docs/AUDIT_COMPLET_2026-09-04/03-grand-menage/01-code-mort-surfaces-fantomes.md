# Code mort et surfaces fantômes

## Méthode et niveau de preuve

Le graphe des imports part des entrypoints applicatifs, tests et scripts connus. Il couvre 1 048 sources — 1 041 fichiers `.ts`/`.tsx` et 7 fichiers `.js`/`.mjs`/`.css` — ainsi que 3 899 relations. Chaque candidat a aussi été recherché par chemin, nom exporté et import dynamique. Ce résultat prouve l'absence de consommateur **dans le dépôt** ; la gate de suppression exige encore de vérifier les scripts et consommateurs externes éventuels.

Les 37 fichiers sont regroupés en lots pour que les tests, mocks et configurations disparaissent en même temps que la surface qu'ils protégeaient. Tous les fichiers listés dans un lot héritent de son verdict, de son impact, de ses non-objectifs et de sa gate.

## `GM-DEAD-01` — Ancien contrat IA et sémantique produit

**Priorité : P2 · Statut : confirmé par graphe · Verdict : supprimer dans un lot isolé.**

| # | Candidat | Preuve |
| ---: | --- | --- |
| 1 | `backend/src/services/pricing/references/referenceProductSemantics.ts` | aucun import entrant ni entrypoint ; fichier complet à partir de `:1` |
| 2 | `shared/schemas/aiAssistant.schema.ts` | aucun import entrant dans le runtime Node ou le frontend courant ; fichier complet à partir de `:1` |

**Impact.** Ces deux fichiers entretiennent l'idée que le moteur IA Deno et son ancien contrat assistant font encore partie de la surface courante. Ils représentent ensemble environ 899 lignes non vides.

**Lot minimal.** Supprimer les deux fichiers, rechercher leurs noms de symboles dans le générateur tRPC et le corpus documentaire, puis régénérer le contrat. Ne pas toucher à `referenceWatchFacts`, explicitement conservé comme actif métier.

**Fichiers/tests/mocks associés.** Les assertions résiduelles du contrat généré et toute mention dans `docs/ASSISTANT_IA/` doivent être traitées dans le lot documentaire, pas remplacées par des stubs.

**Gate.** `pnpm run contract:trpc:generate`, diff du contrat attendu, typecheck frontend/backend, tests ciblés IA et Référentiels, puis `repo:check:local`.

**Non-objectifs.** Ne pas recréer un schéma « compatible legacy » ; ne pas modifier les tables ou migrations IA historiques.

## `GM-DEAD-02` — Formulaire Prospect remplacé

**Priorité : P2 · Statut : confirmé par graphe · Verdict : supprimer le cluster entier.**

| # | Candidat | Preuve |
| ---: | --- | --- |
| 3 | `frontend/src/components/ProspectFormDialog.tsx` | aucun consommateur ; `:1` |
| 4 | `frontend/src/components/prospect-form/ProspectFormAddressSection.tsx` | consommé uniquement par le cluster mort ; `:1` |
| 5 | `frontend/src/components/prospect-form/ProspectFormContent.tsx` | consommé uniquement par le cluster mort ; `:1` |
| 6 | `frontend/src/components/prospect-form/ProspectFormFooter.tsx` | consommé uniquement par le cluster mort ; `:1` |
| 7 | `frontend/src/components/prospect-form/ProspectFormHeader.tsx` | consommé uniquement par le cluster mort ; `:1` |
| 8 | `frontend/src/components/prospect-form/ProspectFormIdentitySection.tsx` | consommé uniquement par le cluster mort ; `:1` |
| 9 | `frontend/src/components/prospect-form/ProspectFormMetaSection.tsx` | consommé uniquement par le cluster mort ; `:1` |
| 10 | `frontend/src/components/prospect-form/ProspectFormNotesSection.tsx` | consommé uniquement par le cluster mort ; `:1` |
| 11 | `frontend/src/hooks/entities/prospects/useProspectFormDialog.ts` | aucun appelant actif ; `:1` |
| 12 | `frontend/src/hooks/entities/prospects/useProspectFormDialogFields.ts` | consommé uniquement par le hook mort ; `:1` |

**Impact.** Environ 579 lignes décrivent un parcours Prospect qui n'est plus atteignable. Leur présence augmente les résultats de recherche, maintient des concepts UI divergents et donne de faux points d'extension.

**Lot minimal.** Supprimer ces dix sources et leurs tests directs. Nettoyer seulement la partie Prospect des tests/mocks mixtes.

**Fichiers/tests/mocks associés.** Supprimer `frontend/src/hooks/__tests__/useProspectFormDialog.test.tsx`; retirer le bloc `frontend/src/hooks/__tests__/useEntityFormDialogs.test.tsx:74-115`; retirer les mocks devenus inutiles dans `frontend/src/components/client-directory/__tests__/ClientDirectoryDetailPage.test.tsx:112` et `frontend/src/components/client-directory/__tests__/ClientDirectoryPage.test.tsx:196`; retirer l'exclusion devenue inutile de `frontend/vitest.config.ts:201-206` si elle ne couvre plus aucun fichier.

**Gate.** Recherche globale `ProspectForm`, tests ciblés des formulaires Tiers/annuaires encore actifs, typecheck et lint frontend.

**Non-objectifs.** Ne pas fusionner Prospect et Client dans un nouveau formulaire abstrait ; la suppression doit laisser le parcours canonique existant intact.

## `GM-DEAD-03` — Panneaux de détail Client et Prospect abandonnés

**Priorité : P2 · Statut : confirmé par graphe · Verdict : supprimer les deux familles, sans créer une abstraction commune.**

| # | Candidat | Preuve |
| ---: | --- | --- |
| 13 | `frontend/src/components/client-detail/ClientDetailContactsSection.tsx` | aucun chemin actif ; `:1` |
| 14 | `frontend/src/components/client-detail/ClientDetailEmptyState.tsx` | aucun chemin actif ; `:1` |
| 15 | `frontend/src/components/client-detail/ClientDetailHeader.tsx` | aucun chemin actif ; `:1`; `docs/UI_UX/changelog.md:39` signalait déjà l'ancien header comme mort |
| 16 | `frontend/src/components/client-detail/ClientDetailInfoGrid.tsx` | aucun chemin actif ; `:1` |
| 17 | `frontend/src/components/client-detail/ClientDetailInteractionsSection.tsx` | aucun chemin actif ; `:1` |
| 18 | `frontend/src/components/client-detail/ClientDetailPanel.types.ts` | consommé uniquement par la famille morte ; `:1` |
| 19 | `frontend/src/components/client-detail/useClientDetailInteractions.ts` | consommé uniquement par la famille morte ; `:1` |
| 20 | `frontend/src/components/prospect-detail/ProspectDetailContactsSection.tsx` | aucun chemin actif ; `:1` |
| 21 | `frontend/src/components/prospect-detail/ProspectDetailEmptyState.tsx` | aucun chemin actif ; `:1` |
| 22 | `frontend/src/components/prospect-detail/ProspectDetailHeader.tsx` | aucun chemin actif ; `:1` |
| 23 | `frontend/src/components/prospect-detail/ProspectDetailInfoGrid.tsx` | aucun chemin actif ; `:1` |
| 24 | `frontend/src/components/prospect-detail/ProspectDetailPanel.types.ts` | consommé uniquement par la famille morte ; `:1` |

**Impact.** Les 392 lignes Client et 144 lignes Prospect dupliquent des représentations remplacées. Les conserver encourage une reprise accidentelle d'un ancien panneau plutôt que l'amélioration du détail Tiers courant.

**Lot minimal.** Supprimer les deux dossiers. Ajuster uniquement les snapshots/imports qui citeraient encore les anciens composants.

**Fichiers/tests/mocks associés.** Rechercher `ClientDetail*`, `ProspectDetail*` et les anciens intitulés dans les tests d'annuaire ; ne supprimer un test que s'il ne couvre plus aucun composant actif.

**Gate.** Typecheck/lint frontend et tests ciblés `client-directory` ainsi qu'un parcours lecture seule de détail Client.

**Non-objectifs.** Ne pas factoriser deux familles mortes entre elles ; ne pas remodeler le détail Client actif dans ce lot.

## `GM-DEAD-04` — Sous-composants Cockpit débranchés

**Priorité : P2 · Statut : confirmé par graphe · Verdict : supprimer ensemble.**

| # | Candidat | Preuve |
| ---: | --- | --- |
| 25 | `frontend/src/components/cockpit/left/CockpitInteractionTypeSection.tsx` | aucun chemin actif ; `:1` |
| 26 | `frontend/src/components/cockpit/left/CockpitRelationSection.tsx` | aucun chemin actif ; `:1` |
| 27 | `frontend/src/components/cockpit/left/CockpitServicePicker.tsx` | aucun chemin actif ; `:1` |
| 28 | `frontend/src/components/cockpit/left/CockpitServiceQuickToggles.tsx` | aucun chemin actif ; `:1` |
| 29 | `frontend/src/components/cockpit/left/CockpitServiceSection.tsx` | aucun chemin actif ; `:1` |
| 30 | `frontend/src/components/cockpit/right/CockpitFooterSection.tsx` | aucun chemin actif ; `:1` |
| 31 | `frontend/src/components/cockpit/right/CockpitSubjectSection.tsx` | aucun chemin actif ; `:1` |
| 32 | `frontend/src/components/ui/inputs/selects/Combobox.tsx` | son seul consommateur est dans ce cluster mort ; `:1` |

**Impact.** Environ 776 lignes décrivent une composition Cockpit concurrente de l'écran courant. `Combobox.tsx` ne doit pas être conservé comme primitif hypothétique puisqu'aucun usage actif ne le justifie.

**Lot minimal.** Supprimer les huit fichiers et leurs imports/barrels éventuels. Garder les primitives Select/Combobox réellement utilisées ailleurs, notamment `DirectoryFilterCombobox`.

**Fichiers/tests/mocks associés.** Tests Cockpit qui importent directement les sections, snapshots et exports de barrels seulement.

**Gate.** Typecheck/lint, tests Cockpit ciblés, puis parcours Saisie au clavier sans écriture finale.

**Non-objectifs.** Ne pas réarchitecturer l'écran Cockpit actif ; ne pas remplacer les sections mortes par des wrappers vides.

## `GM-DEAD-05` — Candidats isolés

**Priorité : P2/P3 · Statut : confirmé par graphe · Verdict : supprimer individuellement.**

| # | Candidat | Preuve et impact |
| ---: | --- | --- |
| 33 | `frontend/src/components/app-shell/PageToolbar.tsx` | aucun consommateur ; `:1`; faux primitif partagé |
| 34 | `frontend/src/components/interaction-search/HighlightedDigits.tsx` | aucun consommateur ; `:1`; rendu spécialisé abandonné |
| 35 | `frontend/src/hooks/entities/clients/useSetClientArchived.ts` | aucun appelant ; `:1`; laisse croire à une action disponible |
| 36 | `frontend/src/services/clients/setClientArchived.ts` | consommé uniquement par le hook mort ; `:1` |
| 37 | `scripts/run-backend-integration-tests.mjs` | aucun script canonique ne l'appelle ; `:1`; son protocole d'environnement est de plus incohérent avec le runner courant |

**Lot minimal.** Supprimer les deux fichiers d'archivage Client ensemble ; les trois autres peuvent former des commits/lots indépendants. Pour le runner, choisir d'abord si on le supprime au profit de `backend/package.json:15` ou si on le rend canonique ; ne pas conserver deux chemins.

**Fichiers/tests/mocks associés.** Tests d'archivage Client, éventuels barrels de primitives et scripts racine. Le runner est détaillé dans [Dépendances, assets et générés](03-dependances-assets-generes.md#gm-run-01--runner-dintégration-non-canonique).

**Gate.** Recherche globale de chaque symbole/chemin, typecheck/lint, tests Client ciblés et `repo:check:local`.

**Non-objectifs.** Ne pas retirer l'action d'archivage Fournisseur, qui dispose d'un chemin actif ; ne pas inventer un nouveau framework de toolbars.

## `GM-DEAD-06` — Blocs morts dans des fichiers actifs

**Priorité : P2 · Statut : confirmé par recherche d'appels · Verdict : supprimer après tests ciblés.**

| Fichier et lignes | Bloc candidat | Fichiers/tests associés | Gate |
| --- | --- | --- | --- |
| `backend/src/services/pricing/references/referenceImports.ts:2567-2804` | types/helpers de `aggregatePricingReferenceSegments` (`:2611`), `searchPricingReferenceSupplierCategories` (`:2694`) et `countPricingReferenceSupplierBrands` (`:2768`), sans appel depuis le cutover | tests Référentiels qui importeraient encore directement ces helpers | typecheck backend + tests `referenceImports*`, contrats Référentiels et export XLSX |
| `backend/src/services/pricing/references/referenceImports.ts:103` | type `SnapshotRow` inutilisé, seul diagnostic strict d'inutilisé non ambigu | aucun | typecheck backend |
| `backend/src/services/ai/aiRunContext.ts:146-280` | `QuotaUsageSnapshot`, `quotaExceededMessage`, `emptyUsage`, `loadQuotaUsage`, `assertQuotaAvailable` ; remplacés par la réservation atomique appelée vers `:466` | retirer les assertions devenues sans objet dans `backend/src/services/ai/aiRunContext_test.ts:67-119` | tests `aiRunContext`, concurrence/réservation IA, typecheck backend |

**Impact.** Ces blocs sont plus trompeurs que de simples exports : ils maintiennent deux manières de calculer les mêmes décisions métier ou quota dans un fichier encore utilisé.

**Non-objectifs.** Ne pas découper `referenceImports.ts` uniquement pour réduire sa taille ; ne pas modifier l'algorithme atomique actif.

## `GM-DEAD-07` — Exports publics candidats, pas suppressions automatiques

**Priorité : P3 · Statut : à valider · Verdict : retirer `export` ou supprimer seulement après contrôle hors dépôt.**

Le contrôle mécanique ne voit aucun consommateur interne pour les symboles aux emplacements suivants :

- backend : `backend/src/app.ts:27`, `backend/src/middleware/auth/auth.ts:84,95,105`, `backend/src/trpc/procedures.ts:139,162`, `backend/src/test/assert.ts:7,90`, `backend/src/services/pricing/references/referenceWatchFacts.schema.ts:91` ;
- frontend : `frontend/src/app/appConstants.tsx:40`, `frontend/src/components/AppHeader.tsx:202`, `frontend/src/components/client-directory/clientDirectorySearch.ts:21,72`, `frontend/src/components/client-directory/edit/entityEditPanel.utils.ts:249`, `frontend/src/components/entity-onboarding/entityOnboarding.utils.ts:57`, `frontend/src/components/entity-onboarding/useOnboardingDuplicateChecks.ts:101`, `frontend/src/components/pricing-references/components/changes/changes-utils.ts:343`, `frontend/src/constants/relations.ts:120`, `frontend/src/hooks/session/useAppSession.ts:17`, `frontend/src/hooks/settings-state/use-settings-state.helpers.ts:23`, `frontend/src/lib/result.ts:25`, `frontend/src/services/entities/tierSurfaceRead.ts:7`, `frontend/src/services/pricingReferences.ts:318,402,485`, `frontend/src/services/query/queryKeys.ts:149,157,209,266`, `frontend/src/stores/errorStore.ts:47-50`, `frontend/src/utils/dashboard/dashboardPipeline.ts:55`, `frontend/src/utils/typeGuards.ts:7,9` ;
- partagé : `shared/reference/officialLabels.ts:1524`, `shared/schemas/pricing/references.schema.ts:232`.

**Impact.** Une API publique plus large que ses usages réels complique les recherches et protège artificiellement des fonctions contre les renommages. L'impact reste faible tant qu'aucun chemin mort n'est réintroduit.

**Lot minimal.** Pour chaque symbole, chercher son nom dans le dépôt, les scripts consommateurs et la documentation ; s'il reste utile localement, retirer seulement le mot-clé `export`; s'il est inutilisé, supprimer symbole et test exclusivement associé.

**Gate.** Typecheck de la couche, contrat tRPC si partagé, tests ciblés du module. **Conserver** `RouterInputs` et `RouterOutputs` dans `backend/src/trpc/router.ts:883-884` : le générateur de contrat les consomme même si le graphe ordinaire ne le voit pas.

## `GM-DEAD-08` — Codes d'erreur présents au catalogue seulement

**Priorité : P3 · Statut : à valider · Verdict : supprimer par famille après contrôle des clients externes et journaux.**

Codes sans producteur actif détecté :

- identité/utilisateur : `EMAIL_REQUIRED`, `EMAIL_INVALID`, `DISPLAY_NAME_EMPTY`, `DISPLAY_NAME_TOO_LONG`, `AGENCY_IDS_INVALID`, `AGENCY_NAME_REQUIRED`, `AGENCY_NAME_EMPTY`, `AGENCY_NAME_TOO_LONG`, `ROLE_INVALID` ;
- Tiers/HTTP : `ENTITY_DETACH_FAILED`, `METHOD_NOT_ALLOWED` ;
- Référentiels : `PRICING_REFERENCE_IMPORT_INVALID_COLUMNS`, `PRICING_REFERENCE_PERMISSION_DENIED` ;
- IA : `AI_INPUT_TOO_LARGE`, `AI_TOOL_LOOP_DETECTED`, `AI_PROVIDER_EMPTY_RESPONSE` ; `AI_TOOL_ARGUMENTS_INVALID` n'apparaît que dans un test de mapping.

**Impact.** Les codes fantômes gonflent le contrat public et donnent l'impression que des chemins de récupération existent. Mais les retirer sans vérifier les clients Edge encore actifs pourrait casser un consommateur hors dépôt.

**Lot minimal.** Rechercher producteurs, consommateurs frontend, logs récents et ancienne Edge Function ; supprimer ensemble type, catalogue, mapper et tests uniquement si le code est réellement sans producteur ni consommateur. Documenter toute conservation pour compatibilité réelle.

**Gate.** Génération du contrat, conformité erreurs frontend, tests backend/frontend des mappers, sonde d'erreur publique. `RATE_LIMIT` et `RATE_LIMITED` sont tous deux actifs : les **normaliser** dans une décision de contrat dédiée, pas les classer morts.

## `GM-DEAD-09` — `backend/drizzle/relations.ts`

**Priorité : P3 · Statut : À VALIDER · Verdict : conserver jusqu'à preuve de non-usage tooling.**

`backend/drizzle/relations.ts:1-173` n'a pas de consommateur applicatif ni de référence visible dans la configuration actuelle. Drizzle Kit, une commande future ou un import implicite peut néanmoins le consommer.

**Lot minimal.** Vérifier la configuration Drizzle effective et exécuter la commande de génération/introspection réellement utilisée. Si aucune commande ne charge le fichier, supprimer dans un lot autonome.

**Gate.** Typecheck backend, commande Drizzle canonique en lecture seule, diff nul du schéma généré.

**Non-objectif.** Ne pas supprimer des relations parce que les requêtes actuelles sont SQL-first ; la décision porte sur ce fichier, pas sur Drizzle dans son ensemble.

## `GM-DEAD-10` — Deux callbacks obligatoires ne font rien avant d'être écrasés par le shell

**Priorité : P3 · Statut : confirmé · Verdict : retirer le faux contrat, pas la fonctionnalité.**

`frontend/src/App.tsx:262-264` fournit `onOpenAccountPanel: () => undefined` et `onOpenMobileMenu: () => undefined` uniquement pour satisfaire `AppHeaderProps`. `frontend/src/components/AppLayout.tsx:268-275` remplace ensuite systématiquement ces callbacks avant de rendre `AppHeader`. Les deux no-op ne sont donc jamais le comportement final, mais ils donnent l'impression qu'une action visible peut légitimement ne rien faire.

**Correction minimale.** Taper les propriétés reçues par `AppLayout` avec un `Omit` des deux callbacks dont il est propriétaire, puis construire les handlers une seule fois dans `AppLayout`. Conserver les actions Compte et Menu existantes.

**Gate.** Typecheck frontend, tests `AppLayout`/`AppHeader`, puis ouverture clavier et pointeur du menu mobile et du panneau Compte.

**Non-objectifs.** Ne pas créer un contexte de shell ni déplacer l'état du panneau dans `App.tsx`.
