# Plan V1 - Saisie tiers et annuaire tiers

Statut : contrat d'execution V1.  
Source de cadrage : `docs/questions-saisie-tiers.md` + `docs/spec-saisie-tiers.md`.  
Priorite d'execution : DB/API -> Saisie -> Annuaire.  
Mode de livraison : tranches validables, avec checkpoint/commit separe quand une tranche est verte.

---

## 0. Avancement V1

Cette section est le journal d'avancement du chantier. A la fin de chaque tranche, l'agent qui execute la tranche doit mettre a jour ces cases dans le meme changement que le code ou la documentation livree.

Regles de mise a jour :

- cocher uniquement ce qui est reellement implemente et valide ;
- ne pas cocher une tranche si une validation bloquante reste a faire ;
- si une tranche est partielle, garder la tranche non cochee et cocher seulement les sous-etapes terminees ;
- ajouter une courte note datee si l'etat n'est pas evident ;
- ne jamais supprimer une case restante sans decision explicite.

Etat au 2026-05-13 :

- [x] Tranche 0 - Baseline et contrat final
  - [x] Plan durable cree dans `docs/plan-saisie-tiers-v1.md`
  - [x] Divergences spec/questions explicitees
  - [x] Prompts de reprise ajoutes pour les tranches 0 a 8
  - [x] Validation docs-only `pnpm run repo:check`
- [x] Tranche 1 - Modele DB et types Supabase
  - [x] Migration SQL locale creee
  - [x] Schema Drizzle aligne localement
  - [x] Types Supabase partages alignes localement
  - [x] Validation locale et rollback SQL effectues
  - [x] Migration appliquee durablement au Supabase lie
  - [x] Types Supabase regeneres officiellement depuis le Supabase lie apres application
  - Note 2026-05-13 : migration distante `20260513151526_add_tier_v1_foundation`, fichier local `backend/migrations/20260513144739_add_tier_v1_foundation.sql`.
- [x] Tranche 2 - Schemas Zod et contrats tRPC
  - [x] Schemas stricts par type de tiers
  - [x] Contrats recherche unifiee
  - [x] Contrats annuaire multi-types
  - [x] Tests de payloads
  - Note 2026-05-13 : contrats V1 ajoutes avec `z.strictObject()`, routes tRPC `data.searchEntitiesUnified` et `directory.tiers-list` exposees en contrat seulement, implementation metier differee en Tranche 3.
- [x] Tranche 3 - Recherche unifiee backend
  - [x] Choix vue SQL `security_invoker` ou service backend documente
  - [x] Query `data.searchEntitiesUnified`
  - [x] Recherche multi-champs et cross-type
  - [x] Tests backend + probes + RLS
  - Note 2026-05-14 : service backend implemente pour `data.searchEntitiesUnified` avec sources `entity` et `profile`, filtres V1, normalisation telephone, tests backend, verification MCP RLS/policies/advisors et `pnpm run qa:fast` PASS. Edge Function `api` redeployee en v55 avec `allowMethodOverride` ; probes runtime tRPC PASS : POST token valide `200 ok:true results`, GET query token valide `200 ok:true results`, anonyme `401 AUTH_REQUIRED`, payload invalide `400 INVALID_PAYLOAD`, suite `pnpm run backend:test:integration` avec `RUN_API_INTEGRATION=1` PASS.
- [x] Tranche 4 - Saisie : relation et recherche
  - [x] `Tout` retire comme choix utilisateur
  - [x] Categories produit fixes
  - [x] Recherche backend debounced
  - [x] Confirmation cross-type
  - [x] Toggle archives
  - Note 2026-05-14 : Saisie alignee sur les categories produit fixes, recherche branchee sur `data.searchEntitiesUnified` via tRPC/TanStack Query avec debounce et `include_archived`, confirmation de bascule cross-type, support `source: "entity"` et `source: "profile"`, tests Saisie/hooks/services PASS et `pnpm run qa:fast` PASS.
- [ ] Tranche 5 - Creation typee
  - [ ] Parcours commun + formulaires specialises
  - [ ] Societes avec recherche officielle + saisie manuelle
  - [ ] Particulier avec ecran Identite
  - [ ] Prospect societe/personne
  - [ ] Fournisseur
  - [ ] Interne CIR rapide
  - [ ] Sollicitation interaction-only
- [ ] Tranche 6 - Conversions
  - [ ] Prospect vers Client a terme
  - [ ] Prospect vers Client comptant
  - [ ] Prospect vers Particulier
  - [ ] Client comptant <-> Client a terme comme edition
  - [ ] Conversions interdites bloquees
  - [ ] Audit backend
- [ ] Tranche 7 - Annuaire tiers
  - [ ] `/clients` renomme en Annuaire tiers
  - [ ] Table unique multi-types
  - [ ] Filtres principaux + sous-filtres contextuels
  - [ ] Recherche elargie backend
  - [ ] Details/edition par type
  - [ ] Archivage par roles autorises
- [ ] Tranche 8 - Gate finale V1
  - [ ] `pnpm run qa`
  - [ ] Probes Supabase runtime si applicables
  - [ ] Validation navigateur assistee si demandee
  - [ ] Rapport QA manuel final
  - [ ] Checkpoint final

---

## 1. Contexte et objectif

L'objectif V1 est de transformer la Saisie et l'annuaire actuel `Clients et prospects` en un systeme tiers coherent, couvrant :

- Client a terme ;
- Client comptant ;
- Particulier ;
- Prospect societe ;
- Prospect personne physique ;
- Fournisseur ;
- Interne CIR ;
- Sollicitation comme interaction telephonique, sans fiche `entities`.

La V1 inclut bien :

- la Saisie cockpit ;
- la recherche unifiee ;
- la creation inline ;
- les conversions autorisees ;
- l'annuaire tiers ;
- l'edition ;
- l'archivage.

Le scope est complet, mais l'execution doit rester progressive. Chaque tranche doit pouvoir etre validee, corrigee, puis checkpointed avant la suivante.

---

## 2. Decisions produit verrouillees

### 2.1 Sources de verite

`docs/spec-saisie-tiers.md` sert de base de reflexion, mais n'est pas fige. Ce plan corrige explicitement les points ou les reponses utilisateur divergent de la spec initiale.

`docs/questions-saisie-tiers.md` conserve le contexte des arbitrages utilisateur. Le present fichier devient la reference operationnelle pour l'implementation.

### 2.2 Saisie

La Saisie doit utiliser des categories produit fixes. Elle ne doit plus etre pilotee par les labels configurables de `agency_entities`.

Decision :

- retirer `agency_entities` du parcours Saisie ;
- conserver temporairement la table si d'autres usages existent ;
- nettoyer ou deprecier apres audit des consommateurs restants.

Le choix metier `Tout` disparait de l'UI Saisie. On peut garder un etat technique "aucun type selectionne" ou "recherche tous types", mais l'utilisateur ne doit plus enregistrer une interaction avec `Tout`.

### 2.3 Annuaire

L'ecran `/clients` doit devenir `Annuaire tiers`.

Decision UX :

- une seule table ;
- un filtre compact par famille ;
- pas 7 onglets permanents ;
- complexite dans les fiches detail, pas dans la liste principale.

Familles visibles :

- Tous ;
- Clients ;
- Prospects ;
- Fournisseurs ;
- Internes ;
- Sollicitations, uniquement comme historique d'interactions si exposees.

Sous-filtres contextuels :

- Clients : tous clients, a terme, comptants, particuliers ;
- Prospects : tous prospects, societes, personnes.

### 2.4 Sollicitation

Decision importante : une Sollicitation n'est pas une fiche `entities`.

Elle reste une interaction :

- relation `Sollicitation` ;
- telephone obligatoire ;
- nom optionnel ;
- affichage `Inconnu` si aucun nom n'est saisi ;
- recherche par telephone dans l'historique ;
- blocage d'un doublon strict dans la meme agence.

Si une sollicitation devient utile commercialement, on cree une nouvelle fiche Prospect ou Fournisseur, eventuellement pre-remplie depuis l'historique, mais on ne convertit pas la sollicitation.

### 2.5 Internes CIR

Un seul type visible : `Interne (CIR)`.

Deux sources techniques peuvent coexister :

- membre deja cree dans l'outil : `profiles` + `agency_members` ;
- fiche rapide : `entities` avec prenom, nom, agence CIR, telephone/email eventuels.

L'UI ne doit pas exposer une taxonomie confuse. Elle peut afficher un badge discret dans la fiche detail si necessaire : `Compte outil` ou `Fiche rapide`.

### 2.6 Recherche cross-type

La recherche doit afficher les resultats cross-type pour eviter les doublons.

Quand l'utilisateur a choisi un type mais selectionne un resultat d'un autre type, le comportement cible est :

1. afficher une confirmation claire ;
2. expliquer le type reel de la fiche ;
3. basculer vers le vrai type si l'utilisateur confirme.

But : eviter d'enregistrer une interaction incoherente sur une fiche existante.

### 2.7 Coordonnees principales

Les coordonnees principales sont portees par `entities` :

- `primary_phone` ;
- `primary_email`.

`entity_contacts` reste reserve aux contacts nominatifs additionnels. Pas de contact miroir automatique, pas de trigger de synchronisation et pas de `entity_contacts.is_primary` en V1.

---

## 3. Modele cible

### 3.1 Colonnes `entities`

Ajouter ou confirmer :

| Colonne | Role |
|---|---|
| `first_name` | Prenom pour personne physique |
| `last_name` | Nom pour personne physique |
| `primary_phone` | Telephone principal/general |
| `primary_email` | Email principal/general |
| `supplier_code` | Code fournisseur court, optionnel |
| `supplier_number` | Numero fournisseur interne, optionnel |
| `cir_agency_id` | Agence CIR pour interne rapide, si referentiel retenu |
| `client_kind` | `company` ou `individual` |
| `account_type` | `term` ou `cash` pour clients |
| `client_number` | Numero client |

### 3.2 Nouvelle table ou referentiel `cir_agencies`

Objectif : fournir une liste d'agences CIR administrable.

Contraintes :

- aucune donnee d'agence inventee ;
- seed fourni par administrateur/PO ;
- lecture pour utilisateurs authentifies ;
- edition reservee a l'administration.

### 3.3 Table `profiles`

Ajouter :

| Colonne | Role |
|---|---|
| `phone` | Telephone professionnel d'un membre plateforme |

Depuis l'annuaire, les membres plateforme sont consultables. L'edition reste limitee au telephone professionnel. Nom, email, role et agence restent geres par les ecrans admin existants.

### 3.4 Contraintes metier

Contraintes globales :

- `client_number` unique globalement si non NULL ;
- `supplier_code` unique globalement si non NULL ;
- `supplier_number` unique globalement si non NULL.

Contraintes creation :

- client societe : numero client, nom, adresse, code postal, ville, SIRET/SIREN/NAF, et telephone ou email ;
- client comptant : meme parcours que client a terme, avec `account_type='cash'` ;
- particulier : prenom, nom, numero client, telephone ou email ;
- prospect societe : nom, telephone ou email ; SIRET/SIREN optionnels ;
- prospect personne : prenom, nom, telephone ou email ; adresse/ville optionnelles ;
- fournisseur : nom, telephone ou email ; codes fournisseur optionnels ;
- interne rapide : prenom, nom, agence CIR ; telephone/email optionnels ;
- sollicitation : telephone obligatoire, sans fiche `entities`.

### 3.5 Telephone

Comportement cible :

- format francais privilegie dans l'UX ;
- format international accepte si la saisie est explicite et exploitable ;
- recherche basee sur une normalisation serveur ;
- doublon sollicitation bloque dans la meme agence.

---

## 4. Contrats API et types

### 4.1 tRPC / backend

Ajouter progressivement :

- `data.searchEntitiesUnified` comme query tRPC, pas mutation ;
- payloads stricts par type produit ;
- sauvegarde typable pour chaque fiche `entities` ;
- action dediee pour enregistrer une interaction `Sollicitation` sans fiche tiers ;
- listing annuaire multi-types ;
- detail annuaire multi-types ;
- edition multi-types ;
- archivage controle par roles ;
- conversions autorisees avec audit.

Deprecier :

- `data.entities` action `search_index` pour les nouveaux parcours ;
- dependance Saisie a `agency_entities`.

Conserver temporairement :

- anciens endpoints tant que des consommateurs existent.

### 4.2 Payloads cibles

Payloads attendus :

- Client a terme ;
- Client comptant ;
- Particulier ;
- Prospect societe ;
- Prospect personne ;
- Fournisseur ;
- Interne CIR rapide ;
- Sollicitation interaction-only.

Les schemas doivent vivre dans `shared/schemas` quand ils sont partages front/back, avec `.strict()` sur les payloads API.

### 4.3 Recherche unifiee

La cible preferee est une vue SQL `search_entities` securisee, a condition qu'elle respecte strictement la RLS.

Alternative autorisee :

- service backend dedie si la vue SQL cree un risque de securite ou de maintenance.

La recherche doit couvrir :

- nom societe ;
- prenom ;
- nom ;
- telephone ;
- email ;
- numero client ;
- SIRET ;
- SIREN ;
- code fournisseur ;
- numero fournisseur ;
- ville.

La recherche doit :

- interroger le backend par frappe avec debounce cote front ;
- limiter les resultats ;
- masquer les archives par defaut ;
- offrir un toggle archives visible ;
- remonter les resultats cross-type.

### 4.4 Annuaire

Contrat de listing :

- filtre principal : `all | clients | prospects | suppliers | internals | solicitations` ;
- sous-filtre client : `all | term | cash | individual` ;
- sous-filtre prospect : `all | company | individual` ;
- source resultat : `entity | profile | solicitation_history` si applicable.

Colonnes generiques :

- Type ;
- Nom / identite ;
- Identifiant ;
- Telephone ;
- Email ;
- Ville ;
- Agence ;
- Referent ;
- Mis a jour.

Pour les Sollicitations, si elles apparaissent dans l'annuaire, elles doivent apparaitre comme historique d'interactions, pas comme fiches editables standard.

---

## 5. UX cible

### 5.1 Annuaire tiers

Conserver :

- table dense ;
- recherche en haut ;
- pagination ;
- vues sauvegardees ;
- action primaire en haut a droite ;
- style sobre, professionnel, lisible.

Modifier :

- titre `Clients et prospects` -> `Annuaire tiers` ;
- compteur plus clair ;
- `Affichage` -> `Type` ;
- `N° client` -> `Identifiant` ;
- badges de type plus precis ;
- filtres avances masques ;
- bouton `Nouvelle fiche` avec menu type.

Ne pas faire :

- 7 onglets lourds permanents ;
- 7 tables separees ;
- colonnes specialisees visibles en permanence ;
- panneau trop dense en premiere vue.

### 5.2 Creation inline

`Nouvelle fiche` doit ouvrir un menu :

- Client a terme ;
- Client comptant ;
- Particulier ;
- Prospect societe ;
- Prospect personne ;
- Fournisseur ;
- Interne CIR.

La Sollicitation doit etre creee depuis le contexte Saisie interaction, pas comme fiche annuaire standard.

Parcours :

- societe : recherche officielle d'abord, saisie manuelle toujours disponible ;
- donnees officielles utilisees : badge discret `Donnees verifiees` ;
- personne physique : ecran `Identite` ;
- fournisseur : formulaire leger, codes optionnels ;
- interne rapide : prenom, nom, agence CIR ;
- sollicitation : telephone, nom optionnel, historique par numero.

---

## 6. Plan d'execution par tranches

### Tranche 0 - Baseline et contrat final

Objectif : figer le contrat operationnel avant toute implementation fonctionnelle.

Actions :

- creer ce fichier `docs/plan-saisie-tiers-v1.md` ;
- corriger les divergences avec `docs/spec-saisie-tiers.md` ;
- lister les decisions finales et non-objectifs ;
- relire `CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md` ;
- verifier `git status --short` ;
- executer `pnpm run repo:check`.

Validation :

- docs uniquement ;
- `pnpm run repo:check` vert ;
- coherence plan/spec/questions relue.

Critere de sortie :

- le plan est durable, actionnable et compatible avec les reponses utilisateur.

### Tranche 1 - Modele DB et types Supabase

Objectif : poser le socle de donnees sans brancher toute l'UI.

Actions :

- auditer le schema actuel `entities`, `profiles`, `interactions`, `entity_contacts`, `agency_members` ;
- ajouter migrations `entities` pour les champs V1 manquants ;
- ajouter `profiles.phone` ;
- creer ou preparer `cir_agencies` ;
- ajouter contraintes d'unicite globales ;
- ajouter indexes utiles a la recherche ;
- traiter prudemment le legacy `Prospect / Particulier` ;
- definir la strategie RLS ;
- regenerer `shared/supabase.types.ts`.

Fichiers probables :

- `backend/migrations/*.sql` ;
- `shared/supabase.types.ts` ;
- eventuellement documentation courte dans ce plan si une decision RLS est arbitree.

Validation :

- `pnpm run repo:check` ;
- `deno lint backend/functions/api` ;
- `deno check --config backend/deno.json backend/functions/api/index.ts` ;
- `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` ;
- si migration appliquee au backend lie : verification MCP Supabase tables/policies/advisors.

Critere de sortie :

- schema cible disponible ;
- types Supabase alignes ;
- aucune regression backend.

### Tranche 2 - Schemas Zod et contrats tRPC

Objectif : exprimer les types metier sans ambiguite.

Actions :

- creer/etendre les schemas partages dans `shared/schemas` ;
- ajouter les unions strictes de payloads ;
- conserver `z.union()` si plusieurs payloads partagent la meme action ;
- ajouter contrats de recherche unifiee ;
- ajouter contrats annuaire multi-types ;
- garder compatibilite temporaire avec les consommateurs actuels ;
- ajouter tests de payloads backend/front si necessaire.

Fichiers probables :

- `shared/schemas/*` ;
- `backend/functions/api/*` ;
- tests backend `*_test.ts` ;
- tests frontend si schemas consommes cote front.

Validation :

- tests de schemas ;
- tests de contrats payloads ;
- `pnpm run qa:fast`.

Critere de sortie :

- aucun payload generique ambigu pour les nouveaux parcours ;
- contrat compile cote front/back.

### Tranche 3 - Recherche unifiee backend

Objectif : remplacer l'index client-side par une recherche backend robuste.

Actions :

- utiliser le service backend `data.searchEntitiesUnified`, decision tranche 3 ;
- rechercher sur nom, prenom, telephone, email, numero client, SIRET/SIREN, fournisseur, ville ;
- ajouter filtre archives ;
- ajouter filtres famille/sous-type ;
- ajouter resultats cross-type ;
- integrer `profiles` pour internes membres plateforme ;
- ajouter tests backend de recherche et permissions.

Fichiers probables :

- migration SQL si vue ;
- service backend data/search ;
- schemas tRPC ;
- tests backend.

Validation :

- tests backend recherche ;
- probe tRPC `data.searchEntitiesUnified` en GET query tRPC ;
- verification MCP RLS/policies/advisors ;
- `pnpm run qa:fast`.

Critere de sortie :

- recherche backend utilisable par Saisie et Annuaire ;
- archives masquees par defaut ;
- resultats cross-type disponibles.

### Tranche 4 - Saisie : relation et recherche

Objectif : rendre la selection de relation et la recherche coherentes avant la creation avancee.

Actions :

- retirer `Tout` comme choix visible ;
- remplacer les options configurables par categories produit fixes ;
- brancher la recherche backend avec debounce ;
- appeler `data.searchEntitiesUnified` comme query tRPC, sans recreer de recherche client-side ;
- afficher les resultats cross-type ;
- ajouter confirmation de bascule vers le vrai type ;
- ajouter toggle archives visible ;
- conserver l'historique `interactions.entity_type` avec libelle choisi.

Fichiers probables :

- constantes relation ;
- composants Saisie ;
- hooks de recherche ;
- tests composants/hooks.

Validation :

- tests ciblant la Saisie ;
- test cross-type ;
- validation navigateur assistee sur recherche ;
- `pnpm run qa:fast`.

Critere de sortie :

- l'utilisateur ne peut plus enregistrer `Tout` ;
- la recherche est backend-driven ;
- le cross-type evite les doublons.

### Tranche 5 - Creation typee

Objectif : creer chaque type avec un formulaire adapte.

Actions :

- refondre `EntityOnboardingDialog` en parcours commun + formulaires specialises ;
- Client a terme : societe stricte, recherche officielle, saisie manuelle possible ;
- Client comptant : meme parcours, `account_type='cash'` ;
- Particulier : ecran `Identite`, numero client obligatoire ;
- Prospect societe/personne : choix initial ;
- Fournisseur : formulaire leger, codes optionnels ;
- Interne CIR rapide : prenom, nom, agence ;
- Sollicitation : creation d'interaction uniquement.

Fichiers probables :

- `frontend/src/components/entity-onboarding/*` ;
- hooks onboarding ;
- services entities/interactions ;
- schemas partages ;
- tests `EntityOnboardingDialog`.

Validation :

- tests `EntityOnboardingDialog` ;
- tests schemas par type ;
- validation navigateur assistee sur tous les parcours critiques ;
- `pnpm run qa:fast`.

Critere de sortie :

- chaque type V1 a un parcours de creation clair ;
- aucun formulaire monstre ;
- pas de donnees mockees ou inventees.

### Tranche 6 - Conversions

Objectif : securiser les changements de nature metier.

Actions :

- autoriser Prospect -> Client a terme ;
- autoriser Prospect -> Client comptant ;
- autoriser Prospect -> Particulier ;
- gerer Client comptant <-> Client a terme comme edition de meme entite ;
- bloquer les autres conversions ;
- permettre creation d'une nouvelle fiche depuis une Sollicitation pre-remplie, sans conversion ;
- ecrire audit backend ;
- afficher une indication utile dans fiche detail/historique.

Validation :

- tests backend conversions ;
- tests UI conversion ;
- verification anciennes interactions conservees ;
- `pnpm run qa:fast`.

Critere de sortie :

- transitions autorisees uniquement ;
- audit trace ;
- aucun changement silencieux de nature metier.

### Tranche 7 - Annuaire tiers

Objectif : etendre `/clients` en annuaire multi-types.

Actions :

- renommer titre et labels visibles ;
- table unique avec colonnes generiques ;
- filtre type principal ;
- sous-filtres contextuels ;
- badges de type propres ;
- recherche elargie via backend ;
- reutiliser `data.searchEntitiesUnified` pour la recherche globale et cross-type ;
- menu `Nouvelle fiche` type ;
- fiches detail specialisees ;
- edition complete des fiches `entities` ;
- consultation des membres plateforme ;
- archivage accessible `tcs`, `agency_admin`, `super_admin` selon decision utilisateur ;
- suppression hard absente de l'UI standard.

Fichiers probables :

- `frontend/src/components/client-directory/*` ;
- services directory ;
- schemas directory ;
- backend directory ;
- tests table/filtres/routing.

Validation :

- tests Directory table/filtres/routing ;
- tests details par type ;
- validation navigateur assistee desktop/mobile ;
- `pnpm run qa:fast`.

Critere de sortie :

- `/clients` devient un annuaire tiers sobre et exploitable ;
- les types sont consultables sans transformer la page en usine a gaz.

### Tranche 8 - Gate finale V1

Objectif : livraison complete.

Actions :

- executer `pnpm run qa` ;
- verifier absence de `throw new Error` hors tests ;
- verifier absence de `console.error` direct ;
- verifier absence de `toast.error()` direct ;
- verifier `any`, `@ts-ignore`, `@ts-expect-error` ;
- verifier probes Supabase si DB/API impactee ;
- verifier routes tRPC selon leur methode : POST pour mutations, GET pour queries, ou POST avec method override si active ;
- verifier preflight `OPTIONS` ;
- verifier parcours critiques avec Playwright assiste ;
- rediger rapport QA manuel.

Validation :

- `pnpm run qa` ;
- probes Supabase ;
- rapport QA final ;
- checkpoint final.

Critere de sortie :

- V1 livrable selon `docs/qa-runbook.md`.

---

## 7. Scenarios obligatoires

### 7.1 Saisie

- Client a terme via recherche officielle ;
- Client a terme via saisie manuelle ;
- Client comptant via recherche officielle ;
- Particulier avec numero client ;
- Prospect societe sans SIRET ;
- Prospect personne avec telephone ;
- Fournisseur sans code, puis edition code plus tard ;
- Interne CIR rapide ;
- Sollicitation par telephone, sans fiche tiers ;
- cross-type Fournisseur -> resultat Client -> confirmation + bascule ;
- archives visibles via toggle.

### 7.2 Annuaire

- tous types visibles via filtre compact ;
- clients filtrables par a terme/comptant/particulier ;
- prospects filtrables societe/personne ;
- fournisseurs listes avec identifiant contextuel ;
- internes listes comme employes CIR, sans complexite exposee ;
- sollicitations si affichees : historique non fiche standard ;
- archivage par roles autorises ;
- suppression hard absente de l'UI standard.

### 7.3 Backend

- contraintes d'unicite ;
- normalisation telephone ;
- RLS recherche unifiee ;
- payloads stricts ;
- conversions autorisees et bloquees ;
- audit conversion/archive/suppression admin.

---

## 8. Non-objectifs V1

La V1 ne doit pas inclure :

- 7 onglets lourds permanents dans l'annuaire ;
- Sollicitation comme fiche `entities` ;
- conversion Sollicitation -> Prospect/Fournisseur ;
- trigger de synchronisation `entities` -> `entity_contacts` ;
- `entity_contacts.is_primary` ;
- suppression definitive dans l'UI standard ;
- generation automatique des codes fournisseur ;
- seed invente pour `cir_agencies` ;
- refonte visuelle marketing ou decorative.

---

## 9. Rapport QA attendu par tranche

Chaque tranche doit fournir au minimum :

- perimetre exact ;
- fichiers modifies ;
- commandes executees ;
- resultat PASS/FAIL ;
- validations non executees et justification ;
- risques restants ;
- decision de checkpoint.

Pour une tranche docs uniquement :

- `git status --short` ;
- `pnpm run repo:check` ;
- relecture coherence plan/spec/questions.

Pour une tranche DB/API :

- `pnpm run repo:check` ;
- `deno lint backend/functions/api` ;
- `deno check --config backend/deno.json backend/functions/api/index.ts` ;
- `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` ;
- `pnpm run qa:fast` si impact transversal ;
- probes Supabase/MCP selon `docs/qa-runbook.md`.

Pour une tranche UI :

- tests front cibles ;
- `pnpm run qa:fast` ;
- validation navigateur assistee si parcours utilisateur impacte.

Pour la livraison V1 :

- `pnpm run qa` ;
- rapport QA manuel complet ;
- verification Supabase runtime si DB/API modifiees.

---

## 10. Prompts de reprise par tranche

Objectif : chaque prompt ci-dessous doit pouvoir etre colle dans une nouvelle conversation, sans supposer que l'agent a lu les conversations precedentes.

Regles communes :

- travailler depuis `C:\GitHub\CIR_Cockpit\CIR-Cockpit` ;
- lire avant action `CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md`, `docs/plan-saisie-tiers-v1.md`, `docs/questions-saisie-tiers.md`, `docs/spec-saisie-tiers.md` ;
- executer `git status --short` avant modification ;
- ne jamais revert des changements existants non compris ;
- ne traiter que la tranche demandee ;
- ne pas creer de fonctionnalite hors scope ;
- utiliser les skills obligatoires et Context7 avant code selon `CLAUDE.md` / `AGENTS.md` ;
- utiliser MCP Supabase pour toute tranche DB/API/RLS/migrations/runtime ;
- mettre a jour `## 0. Avancement V1` avant la reponse finale de chaque tranche ;
- produire un rapport final avec fichiers modifies, commandes executees, PASS/FAIL, validations sautees et justification ;
- pour les UI, ne pas lancer automatiquement les E2E si le user veut verifier lui-meme, sauf demande explicite.

Contexte produit non negociable :

- V1 couvre Saisie, recherche unifiee, creation inline, annuaire, edition, archivage ;
- categories produit fixes dans la Saisie, pas de pilotage par `agency_entities` ;
- le choix metier `Tout` disparait de l'UI Saisie ;
- Annuaire tiers = table unique + filtres progressifs, pas 7 onglets lourds ;
- Sollicitation = interaction telephonique, pas fiche `entities` ;
- Interne CIR = un seul type visible, source technique `profiles` ou `entities` masquee ;
- coordonnees principales sur `entities.primary_phone` / `entities.primary_email`, sans contact miroir automatique ;
- creation visuellement commune, mais formulaires specialises par type ;
- recherche officielle entreprise conservee pour les societes, saisie manuelle toujours possible ;
- cross-type : afficher le resultat, demander confirmation, puis basculer vers le vrai type si selectionne.

### 10.1 Prompt Tranche 0 - Baseline et contrat final

```text
Tu travailles dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif : executer uniquement la Tranche 0 du plan V1 Saisie Tiers et Annuaire Tiers.

Contexte produit :
- V1 couvre Saisie, recherche unifiee, creation inline, annuaire, edition, archivage.
- Annuaire tiers doit rester sobre : table unique + filtres progressifs, pas 7 onglets lourds.
- Saisie utilise des categories produit fixes, pas les labels configurables `agency_entities`.
- `Tout` disparait comme choix utilisateur dans la Saisie.
- Sollicitation reste une interaction telephonique, jamais une fiche `entities`.
- Interne CIR reste un seul type visible, meme si les sources techniques sont `profiles` et `entities`.

Avant toute action :
1. Lire `CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md`.
2. Lire `docs/spec-saisie-tiers.md` et `docs/questions-saisie-tiers.md`.
3. Verifier `git status --short`.
4. Ne rien revert.

A faire :
- creer ou completer `docs/plan-saisie-tiers-v1.md` comme source de plan operationnel ;
- expliciter les divergences avec `docs/spec-saisie-tiers.md`, surtout Sollicitation sans fiche `entities` ;
- lister decisions finales, non-objectifs, risques et validations ;
- decouper toutes les tranches V1 de facon validable.

Validation docs-only :
- `pnpm run repo:check` ;
- relecture coherence plan/spec/questions.

Ne pas faire :
- pas de code applicatif ;
- pas de migration DB ;
- pas de refonte UI.

Mise a jour obligatoire :
- avant ta reponse finale, mettre a jour `## 0. Avancement V1` dans `docs/plan-saisie-tiers-v1.md` ;
- cocher uniquement les cases reellement validees ;
- si la tranche est partielle, laisser la tranche principale non cochee et cocher seulement les sous-etapes terminees.

Sortie attendue :
- rapport court avec fichier modifie, commande executee, PASS/FAIL, prochaine tranche recommandee.
```

### 10.2 Prompt Tranche 1 - Modele DB et types Supabase

```text
Tu travailles dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif : executer uniquement la Tranche 1 du plan V1 Saisie Tiers et Annuaire Tiers : socle DB et types Supabase.

Contexte produit :
- Les coordonnees principales doivent vivre sur `entities.primary_phone` et `entities.primary_email`.
- Ajouter les champs V1 sans creer `entity_contacts.is_primary`.
- Ne pas creer de fiche `entities` pour les Sollicitations.
- Interne CIR rapide peut etre une fiche `entities`, mais le compte applicatif vient de `profiles` + `agency_members`.
- `client_number`, `supplier_code`, `supplier_number` doivent etre uniques globalement si non NULL.
- Pas de seed invente pour `cir_agencies`.

Avant toute action :
1. Lire `CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md`, `docs/plan-saisie-tiers-v1.md`.
2. Lire `docs/questions-saisie-tiers.md` et `docs/spec-saisie-tiers.md`.
3. Lire les migrations recentes dans `backend/migrations`.
4. Executer `git status --short`.
5. Utiliser le skill Supabase et `supabase-postgres-best-practices`.
6. Utiliser `drizzle-orm` avant modification Drizzle.
7. Utiliser MCP Supabase pour inspecter tables, policies, migrations, advisors.
8. Ne rien appliquer durablement au Supabase distant sans l'annoncer explicitement.

A faire :
- ajouter ou confirmer colonnes `entities.first_name`, `entities.last_name`, `entities.primary_phone`, `entities.primary_email`, `entities.supplier_code`, `entities.supplier_number`, `entities.cir_agency_id` ;
- ajouter `profiles.phone` ;
- ajouter/preparer `cir_agencies` avec RLS coherente ;
- ajouter contraintes et index V1 ;
- remapper les anciens `Prospect / Particulier` vers `Prospect` si necessaire ;
- mettre a jour Drizzle ;
- regenerer ou aligner `shared/supabase.types.ts` selon l'etat reel de migration.

Validation :
- `pnpm run repo:check` ;
- `deno lint backend/functions/api` ;
- `deno check --config backend/deno.json backend/functions/api/index.ts` ;
- `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` ;
- `pnpm run qa:fast` si impact transversal ;
- MCP Supabase : migrations, policies, advisors.

Ne pas faire :
- ne pas implementer encore `search_entities` si RLS/vue non tranchee ;
- ne pas brancher l'UI ;
- ne pas creer de trigger de synchronisation contact.

Mise a jour obligatoire :
- avant ta reponse finale, mettre a jour `## 0. Avancement V1` dans `docs/plan-saisie-tiers-v1.md` ;
- cocher uniquement les cases reellement validees ;
- si la tranche est partielle, laisser la tranche principale non cochee et cocher seulement les sous-etapes terminees.

Sortie attendue :
- rapport indiquant si la migration a ete seulement testee en rollback ou appliquee durablement ;
- risques restants et commande exacte a lancer pour la suite.
```

### 10.3 Prompt Tranche 2 - Schemas Zod et contrats tRPC

```text
Tu travailles dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif : executer uniquement la Tranche 2 du plan V1 : schemas Zod stricts et contrats tRPC.

Contexte produit :
- Les payloads generiques doivent laisser place a des payloads specialises par type produit.
- Types couverts : Client a terme, Client comptant, Particulier, Prospect societe, Prospect personne, Fournisseur, Interne CIR rapide, Sollicitation interaction-only.
- Sollicitation n'est pas une fiche `entities`.
- Coordonnees principales sur `entities`, sans contact miroir automatique.
- Les anciens endpoints doivent rester compatibles tant que les consommateurs ne sont pas migres.

Avant toute action :
1. Lire `CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md`, `docs/plan-saisie-tiers-v1.md`.
2. Lire `shared/schemas`, `backend/functions/api`, les routes tRPC/data existantes.
3. Executer `git status --short`.
4. Utiliser `trpc-type-safety`, `cir-error-handling` si erreurs modifiees, `vitest` si tests front/shared.
5. Consulter Context7 pour tRPC/Zod avant implementation.

A faire :
- creer/etendre les schemas partages par type de tiers dans `shared/schemas` ;
- imposer `.strict()` sur payloads API ;
- utiliser `safeParse` sur entrees/sorties externes ;
- ajouter contrats de recherche unifiee ;
- ajouter contrats annuaire multi-types ;
- ajouter tests de payloads backend/shared ;
- conserver les anciens contrats temporairement avec une deprecation explicite si necessaire.

Validation :
- tests schemas/shared ;
- tests backend de contrats, par exemple `payloadContracts_test.ts` si cree ;
- `pnpm run qa:fast`.

Ne pas faire :
- ne pas refondre encore la recherche backend ;
- ne pas refondre l'UI Saisie ;
- ne pas supprimer les anciens endpoints tant que les consommateurs existent.

Mise a jour obligatoire :
- avant ta reponse finale, mettre a jour `## 0. Avancement V1` dans `docs/plan-saisie-tiers-v1.md` ;
- cocher uniquement les cases reellement validees ;
- si la tranche est partielle, laisser la tranche principale non cochee et cocher seulement les sous-etapes terminees.

Sortie attendue :
- rapport avec schemas ajoutes/modifies, compatibilite maintenue, tests PASS/FAIL.
```

### 10.4 Prompt Tranche 3 - Recherche unifiee backend

```text
Tu travailles dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif : executer uniquement la Tranche 3 du plan V1 : recherche unifiee backend.

Contexte produit :
- La Saisie et l'Annuaire doivent chercher dans une source backend unifiee.
- Recherche par nom, prenom, telephone, email, numero client, SIRET/SIREN, code fournisseur, ville.
- Resultats cross-type autorises pour eviter les doublons.
- Sources possibles : `entities`, `profiles` pour internes applicatifs, et historique Sollicitation si expose.
- Sollicitation reste interaction-only, pas fiche standard.

Avant toute action :
1. Lire `CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md`, `docs/plan-saisie-tiers-v1.md`.
2. Lire l'etat de Tranche 1/2 dans les fichiers reels.
3. Executer `git status --short`.
4. Utiliser MCP Supabase : tables, RLS, policies, advisors.
5. Utiliser `supabase-postgres-best-practices`, `trpc-type-safety`, `cir-error-handling`.
6. Consulter Context7 pour tRPC/TanStack Query uniquement si code client ou contrats query sont touches.

A faire :
- choisir explicitement entre vue SQL `search_entities` avec `security_invoker` et service backend equivalent ;
- implementer `data.searchEntitiesUnified` en query tRPC ;
- gerer filtres type/sous-type, archives, limite, agence, droits ;
- normaliser telephone pour recherche ;
- inclure source `entity` / `profile` ;
- ajouter tests backend recherche + permissions ;
- ajouter probes tRPC.

Validation :
- tests backend recherche ;
- probes tRPC `data.searchEntitiesUnified` en methode query tRPC (GET, ou POST seulement si method override active) ;
- verification RLS/policies via MCP Supabase ;
- `pnpm run qa:fast`.

Ne pas faire :
- ne pas modifier encore l'UI Saisie sauf raccord minimal de contrat si strictement necessaire ;
- ne pas rendre les Sollicitations editables comme fiches tiers.

Mise a jour obligatoire :
- avant ta reponse finale, mettre a jour `## 0. Avancement V1` dans `docs/plan-saisie-tiers-v1.md` ;
- cocher uniquement les cases reellement validees ;
- si la tranche est partielle, laisser la tranche principale non cochee et cocher seulement les sous-etapes terminees.

Sortie attendue :
- rapport avec choix vue SQL vs service backend, preuves RLS, tests et probes.
```

### 10.5 Prompt Tranche 4 - Saisie : relation et recherche

```text
Tu travailles dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif : executer uniquement la Tranche 4 du plan V1 : relation et recherche dans la Saisie.

Contexte produit :
- L'utilisateur ne doit plus choisir `Tout` comme relation metier.
- La recherche peut rester cross-type en interne.
- La recherche backend disponible est `data.searchEntitiesUnified`, implementee en Tranche 3 comme service backend `entity` + `profile`.
- Les types visibles sont des categories produit fixes, plus de pilotage UI par `agency_entities`.
- Cross-type : afficher le resultat, demander confirmation, puis basculer vers le vrai type.
- Archives accessibles via toggle.

Avant toute action :
1. Lire `CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md`, `docs/plan-saisie-tiers-v1.md`.
2. Lire les composants/hooks Saisie existants.
3. Executer `git status --short`.
4. Utiliser `vercel-react-best-practices` avant React.
5. Utiliser `web-design-guidelines` pour l'UX relation/recherche.
6. Utiliser `trpc-type-safety` si raccord query tRPC.
7. Consulter Context7 pour React/TanStack Query/tRPC avant code.

A faire :
- retirer `Tout` comme choix visible dans la Saisie ;
- remplacer les options configurables par categories produit fixes ;
- brancher `data.searchEntitiesUnified` avec debounce via le client tRPC/TanStack Query existant ;
- afficher les resultats cross-type avec confirmation de bascule ;
- ajouter toggle archives dans la recherche ;
- adapter tests hooks/composants.

Validation :
- tests composants/hooks Saisie ;
- test cross-type ;
- `pnpm run qa:fast` ;
- validation navigateur assistee si demandee par l'utilisateur.

Ne pas faire :
- ne pas implementer encore tous les formulaires de creation specialises ;
- ne pas changer l'annuaire ;
- ne pas supprimer les endpoints historiques non migres.

Mise a jour obligatoire :
- avant ta reponse finale, mettre a jour `## 0. Avancement V1` dans `docs/plan-saisie-tiers-v1.md` ;
- cocher uniquement les cases reellement validees ;
- si la tranche est partielle, laisser la tranche principale non cochee et cocher seulement les sous-etapes terminees.

Sortie attendue :
- rapport UX + technique, captures/validation navigateur seulement si executee.
```

### 10.6 Prompt Tranche 5 - Creation typee

```text
Tu travailles dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif : executer uniquement la Tranche 5 du plan V1 : creation inline typee.

Contexte produit :
- Creation = parcours commun visuellement, formulaires specialises par type.
- Les types et payloads doivent rester alignes sur les schemas stricts Tranche 2 et sur les resultats `TierV1DirectoryRow` produits par la recherche Tranche 3.
- Societes : recherche officielle d'abord, saisie manuelle toujours disponible.
- Badge discret `Donnees verifiees` si creation depuis donnees officielles.
- Personnes physiques : ecran `Identite`, pas ecran entreprise recycle.
- Fournisseur : formulaire leger, codes optionnels.
- Interne rapide : prenom, nom, agence CIR, telephone/email optionnels.
- Sollicitation : creation d'interaction uniquement depuis Saisie, sans fiche tiers.

Avant toute action :
1. Lire `CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md`, `docs/plan-saisie-tiers-v1.md`.
2. Lire `EntityOnboardingDialog` et ses hooks/composants associes.
3. Executer `git status --short`.
4. Utiliser `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`.
5. Utiliser `vitest` pour tests front.
6. Utiliser `trpc-type-safety` et `cir-error-handling` si backend/API touche.
7. Consulter Context7 pour React, RHF, Zod, TanStack Query, tRPC selon fichiers touches.

A faire :
- refondre `EntityOnboardingDialog` en orchestrateur commun + branches specialisees ;
- reutiliser le resultat de recherche unifiee quand une creation est lancee depuis un resultat/cross-type, sans dupliquer la logique de recherche ;
- implementer Client a terme, Client comptant, Particulier, Prospect societe, Prospect personne, Fournisseur, Interne CIR rapide ;
- traiter Sollicitation hors fiche `entities` ;
- brancher les schemas stricts ;
- ajouter tests par type.

Validation :
- tests `EntityOnboardingDialog` et hooks associes ;
- tests schemas par type ;
- `pnpm run qa:fast` ;
- validation navigateur assistee de tous les parcours si demandee.

Ne pas faire :
- ne pas implementer les conversions metier ;
- ne pas refondre encore l'annuaire complet ;
- ne pas creer de contact nominatif automatiquement.

Mise a jour obligatoire :
- avant ta reponse finale, mettre a jour `## 0. Avancement V1` dans `docs/plan-saisie-tiers-v1.md` ;
- cocher uniquement les cases reellement validees ;
- si la tranche est partielle, laisser la tranche principale non cochee et cocher seulement les sous-etapes terminees.

Sortie attendue :
- rapport par type de creation, comportements valides, limites restantes.
```

### 10.7 Prompt Tranche 6 - Conversions

```text
Tu travailles dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif : executer uniquement la Tranche 6 du plan V1 : conversions de nature metier.

Contexte produit :
- Conversions autorisees depuis Prospect : vers Client a terme, Client comptant, Particulier.
- Client comptant <-> Client a terme = edition de la meme entite, pas nouvelle entite.
- Sollicitation ne se convertit jamais : on peut creer une nouvelle fiche pre-remplie, sans conversion.
- Toutes les autres conversions doivent etre bloquees.
- Une trace d'audit backend est obligatoire.

Avant toute action :
1. Lire `CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md`, `docs/plan-saisie-tiers-v1.md`.
2. Lire les services entities/conversions/audit existants.
3. Executer `git status --short`.
4. Utiliser `supabase-postgres-best-practices` si DB/audit change.
5. Utiliser `trpc-type-safety`, `cir-error-handling`, `vitest`.
6. Utiliser MCP Supabase pour policies/audit si DB impactee.
7. Consulter Context7 pour tRPC/Zod/TanStack Query selon fichiers touches.

A faire :
- implementer les conversions autorisees ;
- bloquer explicitement les conversions interdites avec erreurs francaises ;
- gerer Client comptant <-> Client a terme comme edition ;
- permettre creation pre-remplie depuis Sollicitation sans conversion ;
- ecrire audit backend ;
- afficher historique/indication utile cote UI si dans scope de la tranche.

Validation :
- tests backend conversions ;
- tests UI conversion si UI touchee ;
- verification que les anciennes interactions restent conservees ;
- `pnpm run qa:fast`.

Ne pas faire :
- ne pas transformer Sollicitation en fiche `entities` ;
- ne pas supprimer l'historique ;
- ne pas autoriser une conversion non listee.

Mise a jour obligatoire :
- avant ta reponse finale, mettre a jour `## 0. Avancement V1` dans `docs/plan-saisie-tiers-v1.md` ;
- cocher uniquement les cases reellement validees ;
- si la tranche est partielle, laisser la tranche principale non cochee et cocher seulement les sous-etapes terminees.

Sortie attendue :
- matrice conversions autorisees/bloquees, tests, audit, risques.
```

### 10.8 Prompt Tranche 7 - Annuaire tiers

```text
Tu travailles dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif : executer uniquement la Tranche 7 du plan V1 : transformer `/clients` en Annuaire tiers.

Contexte produit :
- Renommer `Clients et prospects` en `Annuaire tiers`.
- La recherche globale doit reutiliser `data.searchEntitiesUnified`; ne pas recreer une seconde recherche annuaire divergente.
- Garder une table dense, sobre, professionnelle.
- Pas 7 onglets lourds : filtre principal compact + sous-filtres contextuels.
- Types principaux : Tous, Clients, Prospects, Fournisseurs, Internes, Sollicitations seulement comme historique si exposees.
- Sous-filtres Clients : Tous, A terme, Comptants, Particuliers.
- Sous-filtres Prospects : Tous, Societes, Personnes.
- Sollicitations ne sont pas des fiches editables standard.
- Suppression hard absente de l'UI standard.

Avant toute action :
1. Lire `CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md`, `docs/plan-saisie-tiers-v1.md`.
2. Lire les composants/services Directory actuels.
3. Executer `git status --short`.
4. Utiliser `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`.
5. Utiliser `trpc-type-safety` si contrats annuaire touches.
6. Utiliser `playwright-cli` uniquement pour validation assistee si demandee.
7. Consulter Context7 pour React, TanStack Query, tRPC.

A faire :
- renommer titre et labels visibles ;
- generifier colonnes : type, nom/identite, identifiant, telephone, email, ville, agence, referent, mis a jour ;
- ajouter filtre type principal et sous-filtres contextuels ;
- brancher recherche backend elargie via `data.searchEntitiesUnified` ;
- ajouter badges de type propres ;
- ajouter menu `Nouvelle fiche` type ;
- ajouter details specialises et edition complete `entities` ;
- consulter membres plateforme ;
- gerer archivage pour `tcs`, `agency_admin`, `super_admin`.

Validation :
- tests table/filtres/routing ;
- tests details par type ;
- `pnpm run qa:fast` ;
- validation navigateur desktop/mobile si demandee.

Ne pas faire :
- ne pas exposer 7 onglets permanents ;
- ne pas rendre les Sollicitations editables comme fiches standard ;
- ne pas ajouter suppression hard dans l'UI standard.

Mise a jour obligatoire :
- avant ta reponse finale, mettre a jour `## 0. Avancement V1` dans `docs/plan-saisie-tiers-v1.md` ;
- cocher uniquement les cases reellement validees ;
- si la tranche est partielle, laisser la tranche principale non cochee et cocher seulement les sous-etapes terminees.

Sortie attendue :
- rapport UI/UX + technique, comportement par type, validations.
```

### 10.9 Prompt Tranche 8 - Gate finale V1

```text
Tu travailles dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif : executer uniquement la Tranche 8 du plan V1 : gate finale et rapport de livraison V1.

Contexte produit :
- La V1 doit etre complete sur Saisie, recherche unifiee, creation inline, Annuaire tiers, edition, archivage.
- Tous les types doivent etre couverts : Client a terme, Client comptant, Particulier, Prospect societe, Prospect personne, Fournisseur, Interne CIR, Sollicitation interaction-only.
- Annuaire tiers doit rester table unique + filtres progressifs.
- Sollicitation ne doit jamais etre devenue une fiche `entities`.

Avant toute action :
1. Lire `CLAUDE.md`, `AGENTS.md`, `docs/qa-runbook.md`, `docs/plan-saisie-tiers-v1.md`.
2. Lire l'historique git local et `git status --short`.
3. Identifier les tranches deja livrees et les changements non commit.
4. Utiliser MCP Supabase si DB/API/runtime impacte.
5. Ne pas corriger de gros probleme sans expliquer le blocage ; pour petites corrections de gate, appliquer puis relancer.

A faire :
- executer le runbook QA selon `docs/qa-runbook.md` ;
- executer `pnpm run qa` ;
- verifier les interdits : `throw new Error`, `console.error`, `toast.error`, `any`, `@ts-ignore`, `@ts-expect-error` ;
- verifier probes Supabase runtime si DB/API impactee ;
- verifier routes tRPC selon leur methode : POST pour mutations, GET pour queries, ou POST avec method override si active ;
- verifier preflight `OPTIONS` ;
- verifier Playwright assiste sur parcours critiques si demande ;
- rediger rapport QA manuel complet.

Validation :
- `pnpm run qa` PASS ;
- probes Supabase PASS si applicables ;
- rapport QA final ;
- decision LIVRABLE AUTORISE ou LIVRABLE BLOQUE.

Ne pas faire :
- ne pas lancer une nouvelle feature ;
- ne pas masquer un skip ;
- ne pas livrer si une gate bloquante est KO.

Mise a jour obligatoire :
- avant ta reponse finale, mettre a jour `## 0. Avancement V1` dans `docs/plan-saisie-tiers-v1.md` ;
- cocher uniquement les cases reellement validees ;
- si la tranche est partielle, laisser la tranche principale non cochee et cocher seulement les sous-etapes terminees.

Sortie attendue :
- rapport final structure selon `docs/qa-runbook.md`, avec decision claire.
```
