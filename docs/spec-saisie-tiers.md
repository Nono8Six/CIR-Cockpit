# Specification - Saisie tiers : modele de donnees unifie V1

> Document de cadrage fonctionnel, data, API et frontend pour la saisie des tiers.
> Statut : brainstorm PO consolide le 2026-04-27.
> Scope V1 : Saisie cockpit, recherche unifiee, creation inline, conversions autorisees, Directory complet, edition et archivage des fiches.
> Hors scope V1 : redesign visuel, suppression hard standard, conversion depuis Sollicitation, synchronisation DB par trigger entre `entities` et `entity_contacts`.

---

## 1. Objectif

L'onglet Saisie doit manipuler tous les types de tiers avec un referentiel unique base sur `entities`, tout en gardant les membres internes de la plateforme dans `profiles`.

Objectifs V1 :

1. Remplacer les anciens modes ambigus par des categories produit fixes.
2. Permettre une recherche unifiee multi-criteres, avec resultats cross-type.
3. Permettre la creation inline adaptee a chaque type.
4. Stocker les coordonnees generales directement sur `entities`.
5. Permettre l'edition complete depuis le Directory.
6. Garder un historique d'interaction fidele au libelle choisi au moment de la saisie.

---

## 2. Categories produit V1

Les types affiches dans Saisie sont fixes cote produit. Ils ne sont plus pilotes par des labels configurables par agence.

Ordre des boutons Saisie :

| Ordre | Bouton UI | Mapping `entities` |
|---:|---|---|
| 1 | Client a terme | `entity_type='Client'`, `account_type='term'`, `client_kind='company'` |
| 2 | Client comptant | `entity_type='Client'`, `account_type='cash'`, `client_kind='company'` |
| 3 | Particulier | `entity_type='Client'`, `account_type='cash'`, `client_kind='individual'` |
| 4 | Prospect | `entity_type='Prospect'`, `client_kind='company'` ou `individual` |
| 5 | Fournisseur | `entity_type='Fournisseur'` |
| 6 | Sollicitation | `entity_type='Sollicitation'` |
| 7 | Interne (CIR) | `entity_type='Interne (CIR)'` pour les externes, `profiles` pour les membres |

Le bouton `Tout` est supprime de la Saisie. La recherche cross-type reste active pour eviter les doublons.

---

## 3. Invariants metier

### 3.1 Client a terme

Un Client a terme est toujours une societe / personne morale.

Invariants :

- `entity_type='Client'`
- `account_type='term'`
- `client_kind='company'`
- `first_name=NULL`
- `last_name=NULL`
- `client_number` obligatoire

### 3.2 Client comptant

Un Client comptant est une societe / personne morale qui paie comptant.

Invariants :

- `entity_type='Client'`
- `account_type='cash'`
- `client_kind='company'`
- `first_name=NULL`
- `last_name=NULL`
- `client_number` obligatoire

### 3.3 Particulier

Un Particulier est une personne physique cliente, toujours comptante.

Invariants :

- `entity_type='Client'`
- `account_type='cash'`
- `client_kind='individual'`
- `first_name` obligatoire
- `last_name` obligatoire
- `name` calcule depuis `first_name + last_name`
- `client_number` obligatoire

Une conversion Particulier <-> societe est bloquee en V1. Si la nature change ou si la fiche a ete creee avec le mauvais type, on cree une nouvelle entite propre.

### 3.4 Prospect

Un Prospect est un tiers sans compte client et sans numero client. Il peut etre une personne physique ou une societe.

Invariants communs :

- `entity_type='Prospect'`
- `account_type=NULL`
- `client_number=NULL`
- `cir_commercial_id=NULL`
- `primary_phone` ou `primary_email` obligatoire

Prospect personne physique :

- `client_kind='individual'`
- `first_name` obligatoire
- `last_name` obligatoire
- `name` calcule depuis `first_name + last_name`

Prospect societe :

- `client_kind='company'`
- `name` obligatoire
- `first_name=NULL`
- `last_name=NULL`
- donnees SIRET/SIREN/adresse optionnelles

### 3.5 Fournisseur

Un Fournisseur est un tiers qui fournit l'agence. Il peut etre cree legerement, puis enrichi ensuite.

Invariants :

- `entity_type='Fournisseur'`
- `name` obligatoire
- `primary_phone` ou `primary_email` obligatoire
- `supplier_code` optionnel
- `supplier_number` optionnel
- `siret`, `siren`, `naf_code`, adresse, ville, code postal optionnels
- `first_name=NULL`
- `last_name=NULL`

### 3.6 Sollicitation

Une Sollicitation est un demarcheur entrant. Elle reste volontairement ultra simple.

Invariants :

- `entity_type='Sollicitation'`
- `primary_phone` obligatoire
- `name` optionnel, default `Inconnu`
- `notes` optionnel
- pas de `supplier_code`
- pas de `supplier_number`
- pas de conversion possible en V1

Si une Sollicitation devient un vrai Prospect ou Fournisseur, on cree une nouvelle entite. La Sollicitation reste comme historique du demarchage.

### 3.7 Interne (CIR)

Deux sources coexistent :

1. Interne membre de la plateforme : `profiles` + `agency_members`.
2. Interne externe : ligne `entities` creee depuis Saisie.

Interne externe :

- `entity_type='Interne (CIR)'`
- `client_kind='individual'`
- `first_name` obligatoire
- `last_name` obligatoire
- `name` calcule depuis `first_name + last_name`
- `cir_agency_id` obligatoire
- `primary_email` auto-prefill mais modifiable
- `primary_phone` optionnel
- `notes` optionnel
- `account_type=NULL`
- `client_number=NULL`

Email interne externe suggere :

- format : `initialeprenom.nom@cir.fr`
- minuscules
- accents supprimes
- nom compacte sans espaces, tirets, apostrophes
- exemple : `Arnaud FERRON` -> `a.ferron@cir.fr`
- exemple : `Elodie Martin` -> `e.martin@cir.fr`
- exemple : `Anne Le Gall` -> `a.legall@cir.fr`

Le champ reste modifiable avant enregistrement car il peut exister des homonymes ou exceptions.

---

## 4. Donnees a ajouter

### 4.1 Table `entities`

Colonnes V1 a ajouter :

| Colonne | Type | Null | Role |
|---|---|---:|---|
| `first_name` | `text` | oui | Prenom pour tiers personne physique |
| `last_name` | `text` | oui | Nom pour tiers personne physique |
| `primary_phone` | `text` | oui | Telephone general ou principal du tiers |
| `primary_email` | `text` | oui | Email general ou principal du tiers |
| `supplier_code` | `text` | oui | Siglet fournisseur court |
| `supplier_number` | `text` | oui | Numero fournisseur interne |
| `cir_agency_id` | `uuid` | oui | FK vers `cir_agencies.id` pour interne externe |

Justification `primary_phone` / `primary_email` :

- Pour une societe, ces champs peuvent representer le standard telephonique ou l'email generique.
- Pour une personne physique, ils representent les coordonnees principales de la personne.
- `entity_contacts` reste reserve aux contacts nominatifs additionnels ou detailles.

### 4.2 Pas de trigger V1

La V1 ne cree pas de trigger de synchronisation entre `entities.primary_*` et `entity_contacts`.

Regle V1 :

- le backend ecrit explicitement `entities.primary_phone` et `entities.primary_email`;
- `entity_contacts` reste une liste de contacts additionnels;
- pas de colonne `entity_contacts.is_primary` en V1;
- pas de fonction `SECURITY DEFINER` necessaire pour ce chantier.

### 4.3 Table `profiles`

Ajouter :

| Colonne | Type | Null | Role |
|---|---|---:|---|
| `phone` | `text` | oui | Telephone professionnel d'un membre plateforme |

### 4.4 Table `cir_agencies`

Nouvelle table de reference globale.

| Colonne | Type | Null | Default | Role |
|---|---|---:|---|---|
| `id` | `uuid` | non | `gen_random_uuid()` | PK |
| `name` | `text` | non | - | Nom agence CIR |
| `region` | `text` | oui | - | Region |
| `city` | `text` | oui | - | Ville principale |
| `created_at` | `timestamptz` | non | `now()` | Creation |
| `updated_at` | `timestamptz` | non | `now()` | Modification |
| `archived_at` | `timestamptz` | oui | - | Archivage |

Regles :

- referentiel global commun a toutes les agences utilisatrices;
- lecture pour tous les utilisateurs authentifies;
- modification reservee `super_admin`;
- seed initial a fournir par le PO avant implementation;
- aucune donnee d'agence CIR ne doit etre inventee.

---

## 5. Contraintes et normalisation

### 5.1 Unicite

Contraintes V1 :

| Donnee | Contrainte |
|---|---|
| `client_number` | unique globalement si non NULL |
| `supplier_code` | unique globalement si non NULL |
| `supplier_number` | unique globalement si non NULL |
| `Sollicitation.primary_phone` | unique par agence apres normalisation |
| `primary_email` hors cas metier strict | pas unique bloquant |
| `primary_phone` hors Sollicitation | pas unique bloquant |
| email interne externe genere | pas unique bloquant, alerte possible |

### 5.2 Formats

`supplier_code` :

- optionnel;
- regex : `^[A-Z0-9]{1,4}$`;
- exemples : `ROCK`, `SIEM`, `3M`.

`supplier_number` :

- optionnel;
- chiffres uniquement;
- longueur max 15 caracteres.

`client_number` :

- obligatoire pour les categories Client;
- chiffres uniquement;
- unique globalement.

Email :

- trim;
- lowercase.

Telephone :

- affichage et stockage preferes en format francais espace quand reconnu : `06 54 78 58 41`;
- les formats internationaux sont acceptes;
- si un numero international ou non normalisable est saisi, conserver un format maitrise sans bloquer;
- recherche telephone basee sur une comparaison digits-only.

---

## 6. Creation inline par type

### 6.1 Tableau recapitulatif

| Type UI | Champs requis | Champs optionnels | Defaults / champs forces |
|---|---|---|---|
| Client a terme | `name`, `client_number`, `address`, `postal_code`, `city`, `siret`, `siren`, `naf_code`, `primary_phone` ou `primary_email` | `notes`, contacts additionnels | `entity_type='Client'`, `account_type='term'`, `client_kind='company'` |
| Client comptant | `name`, `client_number`, `address`, `postal_code`, `city`, `siret`, `siren`, `naf_code`, `primary_phone` ou `primary_email` | `notes`, contacts additionnels | `entity_type='Client'`, `account_type='cash'`, `client_kind='company'` |
| Particulier | `first_name`, `last_name`, `client_number`, `primary_phone` ou `primary_email` | `address`, `postal_code`, `city`, `notes` | `name` calcule, `entity_type='Client'`, `account_type='cash'`, `client_kind='individual'` |
| Prospect personne physique | `first_name`, `last_name`, `primary_phone` ou `primary_email` | `address`, `postal_code`, `city`, `notes` | `name` calcule, `entity_type='Prospect'`, `client_kind='individual'` |
| Prospect societe | `name`, `primary_phone` ou `primary_email` | `siret`, `siren`, `naf_code`, `address`, `postal_code`, `city`, `notes` | `entity_type='Prospect'`, `client_kind='company'` |
| Fournisseur | `name`, `primary_phone` ou `primary_email` | `supplier_code`, `supplier_number`, `siret`, `siren`, `naf_code`, `address`, `postal_code`, `city`, `notes`, contacts additionnels | `entity_type='Fournisseur'` |
| Sollicitation | `primary_phone` | `name`, `notes` | `name='Inconnu'` si vide, `entity_type='Sollicitation'` |
| Interne externe | `first_name`, `last_name`, `cir_agency_id` | `primary_phone`, `primary_email`, `notes` | `name` calcule, email CIR suggere, `entity_type='Interne (CIR)'` |

### 6.2 Recherche officielle societe

La recherche officielle societe est utilisee quand pertinent :

- Client a terme : oui, parcours societe complet.
- Client comptant : oui, meme parcours que Client a terme, seul `account_type` change.
- Prospect societe : oui si possible, mais donnees officielles optionnelles.
- Fournisseur : oui si possible, mais donnees officielles optionnelles.

Pour Client a terme et Client comptant :

- les champs societe obligatoires restent obligatoires;
- si l'API officielle ne trouve rien ou si un champ manque, la saisie manuelle est autorisee;
- l'utilisateur doit completer les champs obligatoires avant sauvegarde.

### 6.3 Contacts nominatifs

Contacts non obligatoires a la creation V1 :

- Client a terme;
- Client comptant;
- Fournisseur;
- Prospect societe.

Les contacts nominatifs sont ajoutables ensuite via `entity_contacts`.

---

## 7. Recherche unifiee Saisie

### 7.1 Endpoint

Ajouter un endpoint separe :

`data.searchEntitiesUnified`

L'ancien `data.entities` action `search_index` peut rester temporairement tant que des consommateurs existent. Les nouveaux parcours Saisie migrent vers `data.searchEntitiesUnified`.

### 7.2 Vue SQL `search_entities`

La recherche unifiee repose sur une vue SQL UNION :

1. `entities` pour tous les tiers crees dans le cockpit.
2. `profiles` + `agency_members` pour les internes membres de la plateforme.

Chaque resultat expose :

- `id`
- `source`: `entity` ou `profile`
- `entity_type`
- `client_kind`
- `account_type`
- `display_name`
- `first_name`
- `last_name`
- `phone`
- `email`
- `client_number`
- `supplier_code`
- `supplier_number`
- `cir_agency_id`
- `city`
- `agency_id`
- `archived_at`

Important securite :

- la vue doit respecter RLS;
- utiliser `WITH (security_invoker = true)` si disponible sur la version Postgres cible;
- sinon, documenter et verifier explicitement les grants/RLS;
- la vue ne doit pas devenir un bypass des policies sous-jacentes.

### 7.3 Detection de requete

Mode telephone/numerique si la requete contient majoritairement des chiffres ou signes de telephone.

Recherche numerique sur :

- `primary_phone` / `phone`;
- `client_number`;
- `supplier_code`;
- `supplier_number`.

Recherche texte sur :

- `name` / `display_name`;
- `first_name`;
- `last_name`;
- `primary_email` / `email`;
- `city`;
- `supplier_code`;
- `supplier_number`;
- `client_number`.

### 7.4 Resultats

Regles :

- limite : 20 resultats;
- archivés masques par defaut;
- toggle `inclure archives`;
- recherche cross-type active;
- un resultat hors type courant est affiche avec un hint discret.

Exemple :

> Cette entite est dans Fournisseur. Voulez-vous changer le type de tiers ?

But : eviter la creation de doublons quand l'utilisateur a choisi le mauvais bouton.

---

## 8. Saisie et interactions

### 8.1 Libelle stocke dans `interactions.entity_type`

`interactions.entity_type` stocke le libelle exact choisi dans la Saisie, pas seulement le `entity_type` normalise de `entities`.

Valeurs V1 :

- `Client a terme`
- `Client comptant`
- `Particulier`
- `Prospect`
- `Fournisseur`
- `Sollicitation`
- `Interne (CIR)`

Raison : conserver le contexte historique exact de l'interaction.

Exemple :

- une entite Client comptant devient plus tard Client a terme;
- les anciennes interactions restent `Client comptant`;
- les nouvelles interactions prennent `Client a terme`.

### 8.2 Pas de champ supplementaire V1

Pas de nouveau champ dedie type `tier_label` en V1. On continue avec `interactions.entity_type`.

---

## 9. Conversions V1

### 9.1 Conversions autorisees

| Conversion | Regle |
|---|---|
| Prospect -> Client a terme | Autorisee, demande les champs client societe manquants |
| Prospect -> Client comptant | Autorisee, demande les champs client societe manquants |
| Prospect -> Particulier | Autorisee, pre-remplit les donnees personne et demande `client_number` si manquant |
| Client comptant <-> Client a terme | Autorisee comme modification de fiche, meme entite Client |

### 9.2 Conversions bloquees

| Conversion | Decision |
|---|---|
| Sollicitation -> Prospect | Bloquee V1 |
| Sollicitation -> Fournisseur | Bloquee V1 |
| Particulier -> Client societe | Bloquee V1 |
| Client societe -> Particulier | Bloquee V1 |
| Autres conversions | Bloquees par defaut |

Si une Sollicitation devient pertinente, on cree une nouvelle entite Prospect ou Fournisseur. La Sollicitation reste archive historique du demarchage.

### 9.3 Historique

Toute conversion ou changement de categorie autorise doit :

- verifier la transition;
- respecter les champs obligatoires du type cible;
- conserver les anciennes interactions telles quelles;
- ecrire une trace d'audit.

---

## 10. Directory V1

Le Directory fait partie de la V1. Il doit permettre la consultation, l'edition et l'archivage des types suivants.

### 10.1 Onglets

| Onglet | Source | Filtre |
|---|---|---|
| Clients a terme | `entities` | `entity_type='Client' AND account_type='term' AND client_kind='company'` |
| Clients comptants | `entities` | `entity_type='Client' AND account_type='cash' AND client_kind='company'` |
| Particuliers | `entities` | `entity_type='Client' AND account_type='cash' AND client_kind='individual'` |
| Prospects | `entities` | `entity_type='Prospect'` |
| Fournisseurs | `entities` | `entity_type='Fournisseur'` |
| Sollicitations | `entities` | `entity_type='Sollicitation'` |
| Internes (CIR) | `entities` + `profiles` | externes + membres plateforme |

### 10.2 Internes (CIR)

L'onglet Internes affiche ensemble :

- membres plateforme : `profiles`, source `profile`;
- internes externes : `entities`, source `entity`.

Filtre secondaire :

- Tous;
- Membres plateforme;
- Externes.

### 10.3 Edition

Directory V1 permet l'edition complete de tous les types geres par `entities` :

- Client a terme;
- Client comptant;
- Particulier;
- Prospect;
- Fournisseur;
- Sollicitation;
- Interne externe.

Les memes regles de champs obligatoires s'appliquent en creation et en edition.

Pour les membres plateforme source `profile`, l'edition reste geree par l'admin utilisateur ou le profil utilisateur selon le champ.

### 10.4 Archivage et suppression

Archivage autorise depuis Directory pour :

- Clients;
- Prospects;
- Fournisseurs;
- Sollicitations;
- Internes externes.

Pour les internes membres plateforme, l'archivage reste gere par l'administration des utilisateurs.

Suppression definitive :

- pas de suppression standard depuis Directory;
- archivage seulement;
- suppression hard reservee `super_admin` / action admin dediee si elle existe deja.

### 10.5 API Directory

Le Directory garde ses endpoints dedies. Il ne doit pas dependre directement de `search_entities` pour toute sa logique, car il a besoin de :

- pagination;
- filtres;
- tris;
- vues sauvegardees;
- fiches detail;
- edition;
- archivage.

Les schemas Directory actuels limites a `all | client | prospect` doivent etre elargis a toutes les categories V1.

---

## 11. API et schemas

### 11.1 Schemas partages

`shared/schemas/data.schema.ts` doit etre elargi pour accepter :

- `saveClientTermEntitySchema`;
- `saveClientCashCompanyEntitySchema`;
- `saveIndividualClientEntitySchema`;
- `saveProspectEntitySchema` avec `client_kind='company' | 'individual'`;
- `saveFournisseurEntitySchema`;
- `saveSollicitationEntitySchema`;
- `saveInterneExternalEntitySchema`.

Conserver `z.union()` pour les payloads partageant `action='save'`.

### 11.2 Backend

Ajouter ou elargir :

- service `data.searchEntitiesUnified`;
- sauvegarde de tous les types;
- listing multi-types;
- conversions autorisees;
- endpoint `data.cirAgencies.list`;
- Directory multi-types;
- edition Directory multi-types;
- archivage Directory multi-types.

### 11.3 Frontend

Adapter :

- constantes de relation;
- 7 boutons Saisie;
- recherche unifiee;
- creation inline par type;
- EntityOnboardingDialog avec branches quick et societe;
- conversions autorisees;
- Directory complet;
- formulaires d'edition Directory.

---

## 12. Migrations SQL V1

Ordre indicatif :

| # | Migration | Contenu |
|---:|---|---|
| 1 | `cir_agencies_table` | table, RLS, policies, indexes, sans seed invente |
| 2 | `entities_person_fields` | `first_name`, `last_name` |
| 3 | `entities_primary_contact_fields` | `primary_phone`, `primary_email` |
| 4 | `entities_supplier_fields` | `supplier_code`, `supplier_number` + contraintes format |
| 5 | `entities_cir_agency_id` | FK vers `cir_agencies`, index |
| 6 | `profiles_phone` | ajout `profiles.phone` |
| 7 | `search_entities_view` | vue UNION securisee |
| 8 | `entities_unique_business_keys` | unicite `client_number`, `supplier_code`, `supplier_number`, sollicitation phone par agence |
| 9 | `legacy_entity_labels_cleanup` | remap legacy |
| 10 | `agency_entities_deprecation_cleanup` | deprecation ou cleanup controle selon usages restants |

Pas de migration V1 pour :

- `entity_contacts.is_primary`;
- trigger de synchronisation;
- fonction `SECURITY DEFINER` de mirror contact.

Apres toute migration de schema :

```bash
supabase gen types typescript --project-id <project_ref> --schema public > shared/supabase.types.ts
```

---

## 13. Migration legacy

Remap simple et prudent :

```sql
UPDATE public.entities
SET entity_type = 'Prospect'
WHERE entity_type = 'Prospect / Particulier';

UPDATE public.interactions
SET entity_type = 'Prospect'
WHERE entity_type = 'Prospect / Particulier';
```

Ne pas tenter de deviner automatiquement les anciens Particuliers.

`agency_entities` :

- les types sont fixes cote produit;
- `agency_entities` ne doit plus piloter la Saisie;
- la table devient obsolete pour cette logique;
- suppression ou deprecation controlee seulement apres verification de tous les usages restants.

---

## 14. Verification end-to-end attendue

### 14.1 Parcours Saisie

Verifier :

1. Client a terme : recherche officielle, champs societe obligatoires, `account_type='term'`.
2. Client comptant : meme parcours societe, `account_type='cash'`.
3. Particulier : prenom, nom, numero client, telephone ou email.
4. Prospect personne physique : prenom, nom, telephone ou email, pas de commercial.
5. Prospect societe : nom societe, telephone ou email, donnees officielles optionnelles.
6. Fournisseur : nom, telephone ou email, codes fournisseur optionnels.
7. Sollicitation : telephone seul, default `Inconnu`, pas de conversion.
8. Interne externe : prenom, nom, agence CIR, email suggere modifiable.
9. Interne member : resultat source `profile` via vue UNION.
10. Cross-type : un resultat hors type choisi remonte avec hint.
11. Archivés : masques par defaut, visibles via toggle.

### 14.2 Parcours Directory

Verifier :

1. Tous les onglets V1 existent.
2. Les filtres Clients a terme / Clients comptants / Particuliers sont corrects.
3. Internes affiche membres et externes avec filtre secondaire.
4. Edition complete respecte les memes contraintes que creation.
5. Archivage fonctionne pour tous les types `entities`.
6. Suppression standard non exposee.

### 14.3 Backend / DB

Verifier :

1. RLS sur `cir_agencies`.
2. Vue `search_entities` sans bypass RLS.
3. Contraintes d'unicite.
4. Normalisation telephone.
5. Absence de trigger non retenu.
6. Types Supabase regeneres.

### 14.4 QA

Appliquer `docs/qa-runbook.md`.

Pendant l'implementation :

```bash
pnpm run qa:fast
```

Gate final selon runbook :

```bash
pnpm run qa
```

Si backend/API/DB impacte, verifier aussi Supabase runtime et Edge Function `api` selon le runbook projet.

---

## 15. Decisions PO consolidees

| Sujet | Decision |
|---|---|
| Client a terme | toujours societe, jamais personne physique |
| Client comptant | societe cash, bouton dedie |
| Particulier | personne physique cash uniquement |
| Prospect | personne physique ou societe |
| Prospect personne physique | prenom + nom + phone/email |
| Prospect societe | nom + phone/email |
| first_name / last_name | colonnes directes dans `entities` |
| Fournisseur | leger, pas de fiche societe complete obligatoire |
| `supplier_code` vs `supplier_number` | deux champs distincts |
| `supplier_number` | chiffres uniquement, max 15 |
| Sollicitation | ultra simple, pas de conversion |
| Interne externe | prenom + nom + agence CIR suffisent |
| Email interne externe | auto-prefill modifiable |
| `cir_agencies` | referentiel global, seed PO |
| Recherche UNION | `entities` + `profiles/agency_members` |
| Cross-type | afficher avec hint |
| Archives | masquees par defaut + toggle |
| `primary_phone/email` | stockes sur `entities` |
| Trigger sync contact | non V1 |
| `entity_contacts.is_primary` | non V1 |
| Contact nominatif obligatoire | non pour clients societe, fournisseurs, prospects societe |
| Unicite client/fournisseur | globale |
| Sollicitation phone unique | par agence |
| Recherche limite | 20 resultats |
| Bouton Tout | supprime |
| `interactions.entity_type` | libelle UI exact historique |
| Changement Client cash/term | modification de fiche, anciennes interactions conservees |
| Conversion Particulier/societe | bloquee V1 |
| Prospect -> Client | autorise vers les 3 categories client |
| Directory | inclus V1, consultation + edition complete |
| Suppression definitive | non standard, archivage seulement |

