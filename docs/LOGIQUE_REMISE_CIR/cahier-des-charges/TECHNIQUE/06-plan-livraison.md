# T6. Plan de livraison

[← Import / Export](./05-import-export.md) | [Sommaire](../00-sommaire.md)

---

## T6.1 - Phase 1 : Fondations et moteur (Semaines 1-4)

Objectif : poser le socle de donnees, le moteur de cascade SQL et l'API backend. Aucune interface utilisateur a ce stade. A l'issue de cette phase, le moteur est testable en isolation et l'API repond aux appels tRPC.

| # | Etape | Description | Dependances | IA integree |
|---|-------|-------------|-------------|-------------|
| 1.1 | Modele de donnees | Migrations SQL : `pricing_conditions` (avec `marque_force`), `pricing_conditions_global` (multi-niveau), `supplier_derogations`, `bfa_rates`, `supplier_products_history`. Index, contraintes, enums. | - | - |
| 1.2 | Import donnees reelles | Import hierarchie CIR (11 megas, 82 familles, 473 sous-familles) + segments reels (7 548) depuis fichiers AS400. Import catalogues fabricant (SKF, FESTO, etc.). | 1.1 | - |
| 1.3 | Moteur de cascade SQL | Fonctions `resolve_effective_pa()` + `resolve_client_price()` + `resolve_safety_net()` + `resolve_promo_price()`. 19 niveaux, 4 forces marque globale. Tests unitaires exhaustifs. | 1.1 | - |
| 1.4 | RLS et securite | Policies RLS sur toutes les nouvelles tables. Permissions par role (`super_admin`, `agency_admin`, `tcs`) avec alias metier ROI/Direction. Audit triggers. | 1.1 | - |
| 1.5 | Backend API tRPC | Router `pricing` avec toutes les procedures. Middleware auth. Service layer avec fonctions pures testables. | 1.3, 1.4 | - |

### Livrables Phase 1

- Migrations SQL versionnees et appliquees
- Donnees reelles importees (hierarchie + segments + catalogues)
- Fonctions SQL testees unitairement (40+ cas)
- API tRPC fonctionnelle avec auth et RLS
- Tests backend Deno couvrant le service layer

---

## T6.2 - Phase 2 : Interface principale (Semaines 5-8)

Objectif : construire l'interface de consultation et d'edition des conditions. Le TCS peut rechercher un client, naviguer dans l'arbre de conditions, modifier une condition et soumettre une proposition.

| # | Etape | Description | Dependances | IA integree |
|---|-------|-------------|-------------|-------------|
| 2.1 | Page recherche | Recherche client enrichie (nom, departement, ville, commercial, groupement, code, SIRET). Selecteur agence (Direction+). Toggle client/groupement. | 1.5 | IA-4 Recherche NL |
| 2.2 | Fiche client/groupement | En-tete avec metriques (CA, marge moyenne, nombre de conditions, expirations proches). Navigation onglets. | 1.5, 2.1 | IA-2 Insights proactif |
| 2.3 | Onglet Conditions - Arbre | Arbre navigable mega → famille → sous-famille → marque → segment. Heritage visible. Codes couleur marge. Badges source (client, groupement, global). | 1.5, 2.2 | - |
| 2.4 | Onglet Conditions - Tableau | Tableau plat avec tri/filtres avances (niveau, marge, source, expiration). Memes informations que l'arbre. Toggle arbre/tableau persistant. | 2.3 | - |
| 2.5 | Edition inline | Modification unitaire avec contexte complet : PA effectif, PV catalogue, marge actuelle, verdict moteur, apercu cascade temps reel, suggestion IA. Creation de condition. Champ motif obligatoire. | 2.3, 2.4 | IA-1 Suggestion |
| 2.6 | Selection multiple + lot | Checkboxes + barre d'actions sticky. Appliquer une remise en lot sur la selection. Soumettre le lot en une seule proposition. | 2.3, 2.4 | - |
| 2.7 | Simulateur popover | 3 modes de saisie (marge cible / remise / prix). Cascade complete visible en temps reel. Bouton "Appliquer cette valeur". Comparaison des 4 forces de marque globale. | 2.5 | IA-Simulator |

### Livrables Phase 2

- Page recherche avec recherche avancee et filtres
- Fiche client complete avec en-tete metriques
- Double vue arbre/tableau des conditions
- Edition inline avec apercu cascade
- Selection multiple et actions en lot
- Simulateur 3 modes fonctionnel

---

## T6.3 - Phase 3 : Fonctionnalites avancees (Semaines 9-12)

Objectif : completer le perimetre fonctionnel avec les prix marche, derogations fournisseur, BFA, marque globale, copie de conditions et gestion des dates de validite.

| # | Etape | Description | Dependances | IA integree |
|---|-------|-------------|-------------|-------------|
| 3.1 | Onglet Prix marche | Tableau prix marche client + groupement. Import Excel. Recherche fuzzy de references. Alerte coherence (prix marche vs remise segment). | 2.2 | - |
| 3.2 | Derogations fournisseur | Onglet derogations sur fiche client/groupement. CRUD des 3 portees (agence, nationale, globale). Ecran admin Direction pour derogations nationales/globales. Impact PA visible partout dans l'arbre et le tableau. | 2.2, 1.5 | - |
| 3.3 | BFA | Ecran admin BFA (Direction uniquement). Double affichage marge facture + marge BFA partout dans l'application. Indicateur de fiabilite du taux BFA. | 2.2, 1.5 | - |
| 3.4 | Marque globale | UI de pose marque globale : choix de la force, apercu cascade avant validation, alerte surcharge si condition plus fine existe. Badge force dans l'arbre. Restriction TCS (forces standard et securite uniquement). | 2.5 | - |
| 3.5 | Copie de conditions | Wizard de copie en 4 etapes : selection source → selection cible → apercu avant/apres avec detection de conflits → choix de strategie (ecraser, conserver existant, meilleur sous contrainte marge). 3 portees : client→client, groupement→groupement, client→groupement. | 2.5 | IA-7 CopyAdvisor |
| 3.6 | Dates de validite | Presets de duree (3 mois, 6 mois, 1 an, permanent). Badges d'expiration dans l'arbre et le tableau (expire, expire bientot, actif). Filtre "expire bientot" (< 30 jours). Actions prolonger / renouveler / laisser expirer. | 2.5, 2.3 | - |
| 3.7 | Coefficients Centre Logistique | Ecran admin CL (`/remises/admin` → onglet CL) : gestion des coefficients CL par hierarchie produit (mega/fam/sfam) avec heritage. Configuration frais de ligne et frais de port inter-agence. Triple affichage marge (facture/CL/BFA) dans l'arbre, le tableau et le simulateur. Toggle "Produit du CL ?" dans le simulateur pour recalculer la marge. Table `cl_coefficients` + `cl_config`, RLS super_admin/agency_admin. Fonction SQL `resolve_cl_coefficient()`. | 1.5, 2.5, 3.3 | - |

### Livrables Phase 3

- Prix marche avec import Excel et recherche fuzzy
- Derogations fournisseur 3 portees avec ecran admin
- BFA avec double marge visible partout
- Marque globale avec 4 forces et restrictions par role
- Copie de conditions avec gestion des conflits
- Gestion complete des dates de validite
- Coefficients Centre Logistique avec admin, triple marge, simulateur CL

---

## T6.4 - Phase 4 : Validation et enrichissement (Semaines 13-16)

Objectif : mettre en place le circuit de validation, l'import des tarifs fabricant, la consommation historique, la comparaison de clients et le journal des modifications.

| # | Etape | Description | Dependances | IA integree |
|---|-------|-------------|-------------|-------------|
| 4.1 | Validation Agency Admin/Super Admin | Page de validation dediee. Tri par priorite (urgence, montant, anciennete). Actions en lot (valider, rejeter, demander precision). Badge de navigation avec compteur. Auto-validation pour les applications directes `agency_admin/super_admin`. | 2.5, 2.6 | IA-6 ValidAssist |
| 4.2 | Import tarif fabricant | Wizard 5 etapes : upload → mapping colonnes → apercu donnees → delta analysis → confirmation. 4 modes (remplacement complet, ajout uniquement, mise a jour prix, delta intelligent). Auto-mapping IA des colonnes. Historisation stricte (chaque import cree une version). Templates reutilisables par fabricant. | 1.2 | IA-3 Auto-mapping, IA-DeltaAnalysis |
| 4.3 | Consommation | Onglet consommation multi-annee sur la fiche client. Historique de marge par segment. Filtres avec/sans CA. Comparaison N vs N-1. Graphiques de tendance. | 2.2 | IA-8 TrendAnalysis |
| 4.4 | Comparaison clients | Vue cote a cote de 2 clients ou groupements. Detection des ecarts significatifs de conditions. Mise en evidence des differences. | 2.2 | - |
| 4.5 | Historique / Journal | Timeline chronologique de toutes les modifications par client (creation, modification, validation, expiration). Filtres par type d'action et par utilisateur. Export PDF recapitulatif. | 2.2 | - |

### Livrables Phase 4

- Circuit de validation complet avec page dediee
- Import tarif fabricant avec 4 modes et historisation
- Consommation historique multi-annee avec graphiques
- Comparaison cote a cote de 2 clients
- Journal complet avec export PDF

---

## T6.5 - Phase 5 : IA complete et polish (Semaines 17-20)

Objectif : integrer toutes les fonctionnalites IA, ajouter les alertes automatiques et les notifications, puis polir l'ensemble de l'interface.

| # | Etape | Description | Dependances | IA integree |
|---|-------|-------------|-------------|-------------|
| 5.1 | IA complete | Integration de tous les cas IA restants non encore livres. Dashboard consommation IA par agence (tokens, requetes, couts). Quotas par role et par agence. Fallbacks gracieux si quota atteint ou service indisponible. | Toutes phases | Tous cas IA |
| 5.2 | Detection incoherences | Alertes automatiques : ecart anormal segment/parent, condition sans vente depuis 12 mois, marge critique (< seuil configurable), prix marche incohérent avec remise. Tableau des anomalies avec actions correctives. | 4.3 | IA-2 Detection |
| 5.3 | Notifications | Badge de navigation avec compteur (expirations proches, propositions en attente de validation, anomalies detectees). Email recapitulatif hebdomadaire optionnel pour ROI/Direction. | 4.1, 3.6 | - |
| 5.4 | Polish UI/UX | Responsive tablette (TCS itinerants). Accessibilite complete (ARIA labels, navigation clavier, compatibilite lecteur ecran). Animations de transition. Performance : virtualisation des listes longues (react-virtual), lazy loading des onglets. | Toutes phases | - |
| 5.5 | Tests complets | Unitaires moteur (40+ scenarios). Integration API (toutes procedures). E2E parcours complets (10+ scenarios Playwright). Tests IA avec mocks (fallback, quotas, suggestions). Couverture cible : 80% lignes. | Toutes phases | - |

### Livrables Phase 5

- Toutes les fonctionnalites IA operationnelles avec fallback
- Dashboard consommation IA avec quotas
- Detection automatique des incoherences
- Notifications badge + email hebdomadaire
- Interface responsive tablette et accessible
- Suite de tests complete

---

## T6.6 - Phase 6 : Connexion AS400 (post-livraison)

Cette phase est planifiee apres la livraison initiale. Elle depend de la definition des mecanismes de synchronisation avec l'AS400 cote infrastructure.

| # | Etape | Description |
|---|-------|-------------|
| 6.1 | Import initial conditions | Import des conditions commerciales existantes depuis l'AS400 vers le modele Supabase. Mapping des codes AS400 vers la hierarchie CIR. Verification de coherence post-import. |
| 6.2 | Import consommation reelle | Donnees de vente historiques multi-annees. Agregation par segment, famille, client. Calcul des marges reelles. |
| 6.3 | Sync bidirectionnelle | Conditions validees dans CIR Cockpit → export vers AS400 (quand le mecanisme sera defini par l'equipe infrastructure). Format et protocole a definir. |
| 6.4 | Reconciliation | Comparaison periodique des conditions entre les 2 systemes. Flags des divergences. Rapport de reconciliation pour le ROI/Direction. |

### Strategie de reconciliation AS400 (post-MEP Phase 6)

**Cockpit est maitre pour les conditions tarifaires apres MEP Phase 6.**

| Regle | Direction du flux | Description |
|-------|------------------|-------------|
| R-AS400-1 | Cockpit → AS400 (sens principal) | Toute condition validee dans Cockpit est poussee vers AS400 |
| R-AS400-2 | AS400 → Cockpit (sens inverse) | Import periodique (quotidien) des commandes/factures pour enrichir la consommation client. PAS de reimport de conditions. |
| R-AS400-3 | Conflit | En cas d'ecart detecte entre les deux systemes, Cockpit gagne. Alerte generee pour investigation. |
| R-AS400-4 | Periode de transition (3 mois post-MEP) | Double saisie toleree, rapprochement hebdomadaire par Direction |

### Prerequis Phase 6

- Acces en lecture aux fichiers AS400 (conditions, consommation)
- Definition du format d'export vers AS400
- Environnement de test AS400 disponible
- Documentation des codes et structures AS400

---

## T6.7 - Tests et qualite

### Tests unitaires (moteur de cascade)

| Test | Description |
|------|-------------|
| Cascade - 19 niveaux isoles | Chaque niveau de la cascade fonctionne isolement avec une seule condition posee |
| Cascade - heritage | Condition mega s'applique si aucune condition plus fine n'existe a un niveau inferieur |
| Cascade - surcharge | Condition segment surcharge la condition mega quand les deux existent |
| Cascade - client > groupement | Condition client est prioritaire sur condition groupement a chaque niveau de la cascade |
| Cascade - prix marche groupement | Priorite 2 (prix marche groupement) fonctionne correctement dans l'ordre de resolution |
| Cascade - marque globale 4 forces | Chaque force (prioritaire, forte, standard, securite) se place correctement dans la cascade |
| Cascade - promo favorable uniquement | Promotion ne s'applique que si elle est plus avantageuse pour le client que le prix cascade |
| Cascade - coef mini | Plancher de coefficient minimum detecte et signale comme alerte sans bloquer |
| Cascade - condition expiree | Fallback vers le niveau superieur quand `date_fin` est depassee |
| PA effectif - derogation reference | PA correctement calcule avec derogation par reference produit |
| PA effectif - derogation CAT_FAB | PA correctement calcule avec derogation par categorie fabricant |
| PA effectif - BFA | PA apres application du taux BFA est correct |
| PA effectif - cascade derog | Resolution des derogations dans le bon ordre (reference > CAT_FAB > fabricant > globale) |
| Formules | Toutes les conversions marge ↔ remise ↔ prix sont mathematiquement correctes et reversibles |
| Import tarif - 4 modes | Chaque mode d'import produit les bonnes donnees dans `supplier_products_history` |
| Import tarif - historisation | Delta correct entre 2 imports successifs du meme fabricant |
| Import prix marche - fuzzy | Suggestions de references proches fonctionnent avec tolerance configurable |
| Import prix marche - coherence | Detection correcte quand prix marche est incoherent avec remise segment |
| Copie conditions - conflits | Detection de tous les types de conflits (meme niveau, meme segment, meme marque) |
| Copie conditions - 3 strategies | Chaque strategie (ecraser, conserver, meilleur sous contrainte marge) produit le resultat attendu |
| Validation - auto-validation | `agency_admin/super_admin` cree une proposition automatiquement validee sans circuit |
| Derogations - 3 portees | Permissions et visibilite correctes pour chaque portee (agence, nationale, globale) |

### Tests E2E (Playwright)

| Parcours | Description |
|----------|-------------|
| Condition large puis affinage | Poser mega -35% → verifier heritage sur famille → poser segment -40% → verifier surcharge → supprimer segment → verifier retour heritage |
| Marque globale avec force | Poser marque globale standard → apercu cascade → changer force en securite → verifier repositionnement dans cascade → verifier restriction TCS |
| Modification en lot | Filtrer conditions par famille → selectionner 5 segments → appliquer remise -30% → verifier apercu → soumettre → verifier proposition en attente |
| Import prix marche | Upload fichier Excel → verification colonnes → correction references fuzzy → confirmation → verifier prix marche sur fiche client |
| Import tarif 4 modes | Test de chaque mode (remplacement, ajout, mise a jour, delta) avec verification delta analysis et historisation |
| Copie conditions | Selectionner client source → selectionner client cible → apercu conflits → choisir strategie "meilleur sous contrainte marge" → verifier resultat |
| Derogation fournisseur | ROI cree derogation agence → verifier impact PA dans arbre → attendre expiration → verifier retour PA normal |
| BFA | Direction modifie taux BFA fabricant → verifier double marge visible sur fiche client → verifier indicateur fiabilite |
| Simulateur complet | Ouvrir simulateur → tester mode marge → tester mode remise → tester mode prix → verifier cascade → appliquer valeur → verifier proposition creee |
| Comparaison clients | Ouvrir client A → lancer comparaison → selectionner client B → verifier ecarts detectes → copier condition de A vers B |

### Criteres de qualite

**Compilation et lint**

- `pnpm run typecheck` : zero erreur TypeScript (mode strict)
- `pnpm run lint` : zero warning ESLint (`--max-warnings=0`)
- `deno check` : zero erreur sur le code backend

**Tests**

- `pnpm run test` : tous les tests frontend passent
- `deno test` : tous les tests backend passent
- Couverture cible : 80% des lignes sur le code metier (moteur, services, hooks)

**Performance**

- `resolve_client_price()` : < 50ms pour un segment donne
- `resolve_effective_pa()` : < 30ms pour une reference
- Recherche client : < 500ms avec 12 000 clients
- Simulateur : < 200ms pour le recalcul cascade complet
- Arbre conditions : < 1s pour le chargement initial (473 sous-familles)
- Import tarif : < 30s pour 10 000 references

**Accessibilite**

- ARIA labels sur tous les elements interactifs
- Navigation clavier complete (arbre, tableau, formulaires, simulateur)
- Compatibilite lecteur ecran (NVDA, VoiceOver)
- Contraste suffisant pour les codes couleur marge

**Responsive**

- Tablette 10" minimum (TCS itinerants)
- Arbre et tableau utilisables en orientation paysage
- Popover simulateur adapte a la taille ecran

**IA**

- Fallback gracieux si quota atteint : message utilisateur clair, donnees SQL toujours disponibles
- Fallback gracieux si service indisponible : fonctionnalite degradee sans blocage
- Temps de reponse IA : < 3s pour une suggestion, < 5s pour une analyse
- Donnees SQL toujours prioritaires sur les suggestions IA

---

## T6.8 - Donnees reelles

Pas de POC fictif. L'outil sera alimente exclusivement avec des donnees reelles des la Phase 1.

### Sources de donnees

| Source | Volume | Origine | Phase |
|--------|--------|---------|-------|
| Hierarchie CIR | 11 megas, 82 familles, 473 sous-familles | Referentiel interne | Phase 1 |
| Segments | 7 548 segments actifs | Fichiers AS400 | Phase 1 |
| Clients | 12 000 clients actifs | CIR Cockpit existant (Supabase) | Deja en base |
| Catalogues fabricant | Variable par fabricant (SKF, FESTO, etc.) | Fichiers Excel fabricants | Phase 1 |
| Groupements | A creer | Saisie ROI/Direction | Phase 2-3 |
| Tarifs fabricant | Mises a jour periodiques | Import Excel (fichiers reels) | Phase 4 |
| Consommation historique | Multi-annees | Import AS400 | Phase 6 |
| Conditions existantes | Toutes conditions actives | Import AS400 | Phase 6 |

### Strategie d'alimentation

1. **Phase 1** : import hierarchie et segments en migration SQL. Les catalogues fabricant sont charges via le wizard d'import (etape 1.2).
2. **Phases 2-5** : les donnees sont creees par les utilisateurs (conditions, groupements, prix marche) sur des clients reels deja presents en base.
3. **Phase 6** : import massif des conditions et consommation historique depuis l'AS400 pour completer le referentiel.

### Environnement de test

- Base Supabase de staging avec un sous-ensemble de donnees reelles (1 agence, 500 clients, hierarchie complete)
- Donnees anonymisees si necessaire pour les tests automatises
- Seed SQL reproductible pour reinitialiser l'environnement de test

---

## T6.9 - Calendrier synthetique

```
Sem 1-4   ████████████████  Phase 1 : Fondations et moteur
Sem 5-8   ████████████████  Phase 2 : Interface principale
Sem 9-12  ████████████████  Phase 3 : Fonctionnalites avancees
Sem 13-16 ████████████████  Phase 4 : Validation et enrichissement
Sem 17-20 ████████████████  Phase 5 : IA complete et polish
Post-liv  ░░░░░░░░░░░░░░░░  Phase 6 : Connexion AS400
```

### Jalons cles

| Jalon | Semaine | Description |
|-------|---------|-------------|
| J1 - Moteur operationnel | S4 | Cascade SQL testee, API fonctionnelle, RLS en place |
| J2 - Interface utilisable | S8 | TCS peut rechercher, consulter, modifier, simuler |
| J3 - Perimetre complet | S12 | Toutes les fonctionnalites metier livrees |
| J4 - Circuit valide | S16 | Validation, import tarifs, consommation, historique |
| J5 - Livraison finale | S20 | IA complete, polish, tests complets, documentation |

### Risques identifies

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Complexite moteur de cascade | Retard Phase 1 | Tests unitaires des le premier jour, validation avec donnees reelles |
| Performance sur gros volumes | Degradation UX | Index optimises, virtualisation listes, monitoring des temps de reponse |
| Qualite donnees AS400 | Mapping incorrect | Import par lot avec verification manuelle, rapport d'anomalies |
| Quotas IA | Fonctionnalite degradee | Fallback SQL systematique, quotas par agence, cache des suggestions |
| Adoption utilisateur | Sous-utilisation | Formation ROI/Direction en priorite, feedback iteratif en Phase 2 |

---

*Document technique - Module de tarification CIR Cockpit v3.0*
