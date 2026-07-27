# Configurateurs — C0 Cadrage

| Élément | État au 26/07/2026 |
| --- | --- |
| Cible | Brique `Configurateurs` de CIR Cockpit |
| Premier domaine | Moteurs industriels |
| Statut C0 | **Clos après complément** ; décisions utilisateur validées au §15 |
| Source de vérité architecture | `docs/architecture-cible-cir-cockpit.md` |
| Source de vérité moteurs | `C:\GitHub\CIR_Moteur` et les PDF constructeurs |
| Écritures distantes réalisées | Aucune |

## 1. Résultat attendu

La première valeur livrée est un parcours de remplacement de moteur :

1. l’utilisateur décrit le moteur en place et son montage ;
2. le système distingue les valeurs de plaque, les mesures, les données catalogue et les suggestions statistiques ;
3. le backend compare la spécification à des candidats du catalogue technique actif ;
4. chaque critère reçoit l’un des quatre états `satisfied`, `under_reservation`, `indeterminate` ou `not_satisfied` ;
5. le résultat explique les écarts, les données manquantes, les anomalies et les pages de catalogue utilisées ;
6. le verdict reste une compatibilité documentaire qui exige une validation finale au montage.

Le premier jalon utile couvre le remplacement de bout en bout. Il ne dépend ni d’un futur catalogue commercial CIR, ni d’un modèle de langage.

## 2. Frontière métier verrouillée

La brique appartient au domaine technique.

Elle possède :

- les catalogues techniques constructeurs et leurs versions ;
- les modèles, points de fonctionnement, dimensions, brides et courbes ;
- les spécifications saisies ou mesurées ;
- les règles déterministes de sélection, d’équivalence, de conseil et d’énergie ;
- les preuves documentaires et les anomalies qualité ;
- les configurations techniques sauvegardées ;
- les documents techniques générés.

Elle ne possède pas :

- les références vendables du catalogue CIR ;
- les prix, remises, conditions d’achat, stocks ou disponibilités ;
- les devis et commandes ;
- les règles de marge ou de tarification ;
- une correspondance implicite entre un moteur technique et une référence commerciale.

Il n’existe donc pas de `product_reference_id` sur `motor_model`. Un futur rapprochement commercial utilisera une table de correspondance facultative, gouvernée et extérieure à l’identité technique.

## 3. État vérifié des deux systèmes

### 3.1 CIR Moteur

La base SQLite active contient :

| Objet | Volume vérifié |
| --- | ---: |
| Fabricants | 3 |
| Documents enregistrés | 4 |
| Modèles | 1 652 |
| Points de fonctionnement | 1 997 |
| Cotes dimensionnelles | 37 917 |
| Brides | 8 196 |
| Points de rendement | 4 859 |
| Points de couple | 2 302 |
| Corrélations constructeur | 599 |
| Seuils IEC 60034-30-1 | 640 |
| Seuils IEC TS 60034-30-2 | 65 |
| Anomalies conservées | 38 |

Les trois fabricants sont Bonfiglioli, Innomotics et Leroy-Somer. Leroy-Somer porte les gammes asynchrones et Dyneo+ ; cela ne crée pas un quatrième fabricant.

Le volume de 1 652 modèles décrit la base SQLite actuelle, mais n’est plus un oracle de migration : l’audit complémentaire a identifié 239 lignes de modèles issues de doublons d’extraction. La déduplication devra diminuer ce nombre sans perdre de point de fonctionnement ni de cote. Les oracles de départ restent les 1 997 points et les 37 917 cotes, complétés par les nouveaux jeux validés décrits ci-dessous.

Trois extracteurs complémentaires ont été rejoués le 26/07/2026 :

| Jeu validé | Résultat |
| --- | ---: |
| Bonfiglioli BE, ME, BN et M | 324 points, 0 rejet, 6 anomalies imprimées conservées |
| Leroy-Somer CILS 6154c | 34 points et 68 points de couple variateur |
| Dimensions CILS 6154c | 8 types, 0 point restant à lever |

Les gammes Bonfiglioli IE1/IE2 portent `lifecycle = 'legacy'` : elles restent cherchables comme moteurs en place mais sont exclues des candidats de remplacement par défaut.

La base possède 14 tables, une vue et trois déclencheurs. Les tests d’intégrité, de validation et des quatre services spécialisés passent. La validation du catalogue sort volontairement en code 1 parce qu’elle retrouve 16 erreurs réelles et 22 avertissements :

| Règle | Sévérité | Nombre |
| --- | --- | ---: |
| `IE_BELOW_THRESHOLD` | error | 14 |
| `CURRENT_MISMATCH` | error | 2 |
| `EFFICIENCY_CURVE` | warning | 18 |
| `INERTIA_IMPLAUSIBLE` | warning | 4 |

Le script racine `npm run typecheck` est obsolète depuis l’archivage du frontend v1 : le contrôle TypeScript backend passe avec `npx tsc --noEmit`, puis le script échoue uniquement parce qu’il cherche encore `frontend/package.json`.

### 3.2 Écarts de provenance à corriger avant migration

La provenance des 1 997 points de fonctionnement est complète dans SQLite.

En revanche :

- les fichiers JSON des 705 seuils IEC portent bien une provenance PDF ;
- les tables SQLite `iec_efficiency_threshold` et `iec_vsd_efficiency_threshold` ne stockent pas `source_ref_id` ;
- `Dyneo   IE5.pdf`, source des 65 seuils IEC TS 60034-30-2, et le catalogue CILS `6154c_fr_CILS_IE4.pdf` ne sont pas enregistrés dans `catalog_document` ;
- les six PDF présents dans `Catalogue fabricant` ne doivent donc pas être déduits des quatre lignes actuelles de `catalog_document`.

C2 devra charger les seuils depuis les JSON validés et leur provenance, pas recopier les seules tables SQLite.

### 3.3 CIR Cockpit local

- Branche : `main`, alignée sur `origin/main` au début de C0.
- Le worktree contient des modifications Dashboard non liées ; elles sont hors périmètre et doivent rester intactes.
- Stack : React 19, TanStack Router et Query, Zod 4, tRPC 11, Deno Edge Function, Drizzle et PostgreSQL.
- Les migrations actives sont dans `backend/migrations/` : 123 fichiers locaux.
- `supabase/migrations/` est vide et n’est pas la source de vérité du dépôt.
- Le backend possède déjà le patron `pricing/references` : lot, fichiers, contrôle, diff, activation et rollback.
- Les rôles existants sont `super_admin`, `agency_admin` et `tcs`.
- Le client Drizzle appelé `userDb` est actuellement le même objet que `db`. Une RLS fondée sur `auth.uid()` n’est donc pas prouvée par le nom `userDb`.
- `assistantSqlTools.ts` contient néanmoins un patron vérifié pour injecter des claims et exécuter une transaction sous le rôle `authenticated`. C1 devra en extraire un mécanisme applicatif borné pour les accès configurateur concernés.

### 3.4 Supabase distant, lecture seule

Projet vérifié : `CIR_Cockpit`, référence `rbjtrcorlezvocayluok`, PostgreSQL 17.6, état `ACTIVE_HEALTHY`.

| Vérification | Résultat |
| --- | --- |
| Taille de la base | 189 MB |
| Tables `configurator.*` | 0 |
| Tables `public.motor_*` ou `public.configurator_*` | 0 |
| Schémas pertinents présents | `public`, `private`, `extensions` |
| Extensions utiles présentes | `pgcrypto`, `pg_trgm`, `pg_cron` |
| Bucket existant | `pricing-reference-sources`, privé, XLSX uniquement |
| Migrations distantes | 123 |
| Edge Function | `api` v198, active, `verify_jwt=false` avec authentification applicative |

Il n’existe aucun conflit de nom. Le schéma `configurator` peut être créé en C1.

Les conseillers Supabase signalent des écarts antérieurs dans les zones IA et pricing. Ils constituent une baseline indépendante de C0 ; aucune correction opportuniste n’est incluse dans Configurateurs.

## 4. Architecture cible

### 4.1 Schéma et exposition

Le domaine utilise un schéma PostgreSQL dédié `configurator`.

- Le frontend n’accède jamais directement aux tables configurateur.
- La frontière publique est tRPC.
- Le schéma n’est pas ajouté aux schémas Data API exposés sans besoin démontré.
- `anon` ne reçoit aucun privilège.
- `authenticated` reçoit uniquement les privilèges nécessaires aux transactions RLS du backend.
- Les écritures catalogue et activations restent réservées au `super_admin`.
- Les accès aux configurations sauvegardées sont isolés par agence et utilisateur selon la matrice du §8.7.

### 4.2 Noyau commun

| Table proposée | Responsabilité |
| --- | --- |
| `catalog_snapshot` | Version candidate, active ou retirée d’un domaine technique |
| `source_document` | Métadonnées immuables, SHA-256, éditeur, édition et nombre de pages ; aucun PDF constructeur publié dans Cockpit |
| `source_ref` | Document, page PDF, page éditeur, méthode, note de normalisation et vérification CIR |
| `import_batch` | Exécution idempotente de chargement et son empreinte |
| `import_file` | Fichier d’entrée d’un lot et rôle dans le lot |
| `import_issue` | Erreur de fichier, mapping, ligne ou activation |
| `saved_configuration` | Enveloppe versionnée, auteur, agence, client facultatif, snapshot et payload de domaine |

Un `catalog_snapshot` est ajouté par rapport au premier plan. Sans lui, les données actives seraient écrasées et le rollback demandé par l’architecture serait impossible.

### 4.3 Module moteur

| Table proposée | Responsabilité |
| --- | --- |
| `motor_model` | Objet physique et variante documentée, `model_key` stable et `lifecycle` |
| `motor_operating_point` | Performance pour une alimentation, fréquence, tension et couplage |
| `motor_efficiency_point` | Rendement publié selon la charge |
| `motor_torque_point` | Couple publié selon la fréquence absolue |
| `motor_dimension_definition` | Référentiel des codes de cote, casse et sémantique constructeur |
| `motor_dimension` | Cote par modèle, montage et polarité éventuelle |
| `motor_flange_option` | Bride et rôle `standard`, `larger` ou `smaller` |
| `motor_brake_option` | Option frein hors parcours phase 1 : type et couple publiés uniquement |
| `motor_vendor_correlation` | Corrélation déclarée par un constructeur |
| `motor_iec_threshold` | Seuil IEC 60034-30-1 avec provenance obligatoire |
| `motor_iec_vsd_threshold` | Seuil IEC TS 60034-30-2 avec provenance obligatoire |
| `motor_validation_issue` | Anomalie technique avec vraies clés étrangères vers modèle ou point |

`validation_issue(domain, entity_id)` est rejeté : ce polymorphisme supprimerait l’intégrité référentielle. Les erreurs du pipeline restent communes dans `import_issue`; les anomalies techniques restent dans la table du domaine.

Toutes les tables techniques portent `snapshot_id`. Une contrainte partielle garantit un seul snapshot actif par domaine.

`model_key` est une clé métier opaque, normalisée et indépendante du snapshot. Deux écritures ou conventions de `variant_key` décrivant le même moteur physique convergent vers le même `model_key`. La polarité et le point de fonctionnement ne font pas partie de cette identité ; ils restent portés par les tables associées.

### 4.4 Identifiants

- `uuid` pour les lots, snapshots et configurations exposés dans les URL ou contrats ;
- `bigint generated always as identity` pour les lignes techniques internes à fort volume ;
- clés naturelles et contraintes uniques conservées pour l’idempotence ;
- les identifiants SQLite ne deviennent pas des identifiants métier.

L’unicité de l’identité est `(snapshot_id, model_key)`. Le même `model_key` peut réapparaître dans plusieurs snapshots afin de comparer les éditions sans lier l’identité à une ligne historique.

### 4.5 Contraintes à préserver ou renforcer

1. unicité du point `(snapshot_id, model_id, poles, supply_mode, frequency_hz, voltage_v, coupling)` ;
2. IE5 autorisé uniquement avec `supply_mode = 'vfd'` ;
3. moteur synchrone autorisé uniquement avec un point `vfd` ;
4. une bride ne porte pas simultanément un diamètre de trou et un filetage ;
5. chaque donnée catalogue décisive possède un `source_ref_id` non nul ;
6. chaque seuil IEC possède aussi un `source_ref_id` non nul ;
7. toutes les clés étrangères de parcours et de cascade sont indexées ;
8. activation atomique et rollback sans suppression physique ;
9. valeurs absentes conservées à `NULL`, jamais remplacées par une moyenne ou une norme.
10. unicité `(snapshot_id, model_key)` après déduplication documentée ;
11. `motor_dimension` accepte une polarité nullable pour les cotes qui en dépendent ;
12. `lifecycle = 'legacy'` exclut un moteur des candidats par défaut sans empêcher sa consultation comme moteur en place.

## 5. Glossaire canonique

| Terme | Définition |
| --- | --- |
| Configurateur | Parcours déterministe de description, sélection, calcul ou comparaison dans un domaine technique |
| Domaine | Famille de règles et d’objets techniques, par exemple `motor` |
| Catalogue technique | Ensemble versionné de données constructeurs sourcées ; distinct du catalogue commercial CIR |
| Snapshot | Version immuable activable du catalogue technique |
| Modèle moteur | Objet physique partageant carcasse, technologie, dimensions de modèle, inertie et masse |
| Variante | Distinction documentée entre deux modèles de même désignation mais de masse, inertie ou construction différentes |
| Point de fonctionnement | Performance d’un modèle dans des conditions électriques précises |
| Spécification d’origine | Ensemble partiel des caractéristiques du moteur remplacé |
| Contrainte | Valeur attendue accompagnée de son origine, de sa confirmation, de son unité et de sa preuve |
| Candidat | Point de fonctionnement évalué contre une spécification |
| Critère | Comparaison atomique et expliquée entre une contrainte et une donnée candidat |
| Verdict | Synthèse déterministe des critères applicables |
| Suggestion statistique | Valeur observée dans la base avec effectif ; elle ne vaut pas mesure confirmée |
| Preuve | Élément affichable : document et page, mesure confirmée, calcul et règle, ou effectif statistique |
| Anomalie | Non-conformité ou doute conservé qui restreint les affirmations possibles |
| `dataGrade` | Qualité documentaire recalculée d’une donnée catalogue, jamais qualité d’une saisie utilisateur |

## 6. Origine, confirmation et preuve

Les concepts suivants restent séparés :

| Champ | Valeurs |
| --- | --- |
| `origin` | `nameplate`, `user_measurement`, `catalog`, `statistical_suggestion`, `calculation` |
| `confirmation` | `unconfirmed`, `confirmed` |
| `dataGrade` | `A`, `B`, `C`, `D`, uniquement pour une donnée catalogue |
| `evidence.kind` | `source_page`, `measurement`, `sample`, `rule` |

`calculation` est ajouté afin de sourcer explicitement une déduction telle que le nombre de pôles plausible à partir de la vitesse et de la fréquence. Une valeur calculée cite toujours son `ruleCode` et ses entrées.

Règles :

- une plaque transcrite peut fonder les critères électriques lorsqu’elle est confirmée ;
- une mesure utilisateur confirmée peut fonder un critère mécanique, sans recevoir de `dataGrade` ;
- une suggestion statistique non confirmée plafonne le critère à `under_reservation` ;
- une donnée absente donne `indeterminate` ;
- une donnée calculée ne remplace jamais une cote mécanique mesurée ;
- une preuve catalogue contient au minimum document, SHA-256 logique ou identifiant, page et méthode.

`dataGrade` n’est pas recopié depuis SQLite. Il est calculé par le pipeline :

- `A` : donnée sourcée et relue par une personne CIR identifiée ;
- `B` : donnée extraite avec provenance complète, sans relecture humaine ;
- `C` : donnée calculée par une règle versionnée à partir d’entrées sourcées ;
- `D` : donnée incomplète ou non vérifiée, conservée pour audit mais interdite comme fait décisif ou dans la fiche technique.

Le `data_grade` d’un candidat est le plus faible grade parmi ses données décisives applicables.

## 7. Matrice mécanique par montage

| Montage | Fixation requise | Arbre requis |
| --- | --- | --- |
| B3 | A, B, C, H | D, E, F |
| B5 | M, N, P, S, T, Z | D, E, F |
| B35 | A, B, C, H, M, N, P, S, T, Z | D, E, F |
| B14 | M, N, P, S fileté, T, Z | D, E, F |
| B34 | A, B, C, H, M, N, P, S fileté, T, Z | D, E, F |

La hauteur d’axe ne permet jamais de déduire M, N ou P. En B3 et B35, A, B et C restent nécessaires. Une compatibilité complète conserve la formulation :

> Tous les critères mécaniques applicables sont compatibles. Validation finale au montage requise.

Le terme « garantie » est interdit.

`B5R` et `B14R` ne sont pas des montages distincts : ils deviennent des brides `role = 'smaller'` rattachées à B5 ou B14. `V1` est une position de montage, conservée dans les données catalogue, mais n’est pas une forme de bride ni un choix du parcours phase 1.

Le contrat mécanique est composé de trois niveaux : cotes de `frame`, montage choisi, puis bride facultative. Un candidat satisfait la fixation si au moins une bride du bon montage respecte les cotes. Une bride `larger` ou `smaller` donne `satisfied` avec `requires_option = true` et une mention obligatoire dans la fiche ; `under_reservation` reste réservé aux données non confirmées.

## 8. Contrats Zod créés dans `shared/schemas/configurator/`

Les contrats de production seront des objets stricts Zod 4, partagés entre frontend et backend, avec messages français et validation des entrées et sorties.

### 8.1 Vocabulaires

- `configuratorDomainSchema`
- `motorMountingSchema`
- `constraintOriginSchema`
- `constraintConfirmationSchema`
- `dataGradeSchema`
- `evidenceSchema`
- `criterionStatusSchema`
- `verdictStatusSchema`
- `motorDimensionCodeSchema`

### 8.2 `constraintValueSchema`

Enveloppe générique :

```ts
{
  value: number | string | null;
  unit?: string;
  origin: ConstraintOrigin;
  confirmation: ConstraintConfirmation;
  evidence: Evidence[];
}
```

Les schémas spécialisés fixent l’unité canonique et les bornes :

- puissance en kW ;
- vitesse en tr/min ;
- fréquence en Hz ;
- tension en V ;
- courant en A ;
- couple en N·m ;
- dimensions en mm ;
- masse en kg ;
- inertie en kg·m².

### 8.3 `motorEquivalentFromSpecInputSchema`

```ts
{
  schema_version: 1;
  snapshot_id?: string;
  mounting: MotorMounting;
  electrical: {
    power_kw: ConstraintValue<number>;
    speed_rpm?: ConstraintValue<number>;
    poles?: ConstraintValue<number>;
    frequency_hz: ConstraintValue<number>;
    supply_mode: ConstraintValue<'mains' | 'vfd'>;
    voltage_v?: ConstraintValue<number>;
    coupling?: ConstraintValue<'Y' | 'D'>;
    rated_current_a?: ConstraintValue<number>;
    rated_torque_nm?: ConstraintValue<number>;
  };
  mechanical: {
    frame: {
      dimensions: Partial<Record<'A' | 'B' | 'C' | 'H' | 'D' | 'E' | 'F', ConstraintValue<number>>>;
    };
    flange?: {
      reference?: string;
      dimensions: Partial<Record<'M' | 'N' | 'P' | 'S' | 'T' | 'Z', ConstraintValue<number | string>>>;
    };
  };
  tolerances_mm?: Partial<Record<MotorDimensionCode, number>>;
  cursor?: string;
  limit?: number;
  sort?: 'compatibility' | 'brand' | 'power' | 'efficiency';
}
```

Le configurateur accepte exclusivement les unités SI métier : `kW`, `mm`, `N·m`, `tr/min`, `V`, `A` et `Hz`. Les chevaux-vapeur américains (`hp`), pouces et fractions de pouce sont hors périmètre, sans tranche ultérieure planifiée. Le backend refuse toute grandeur dans une unité non autorisée.

### 8.4 Réponse

`motorEquivalentFromSpecResponseSchema` contient :

- `request_id` ;
- `snapshot` effectivement utilisé ;
- la spécification normalisée et les calculs appliqués ;
- les candidats paginés par curseur ;
- le verdict de chaque candidat ;
- les critères détaillés ;
- les anomalies et restrictions d’argumentaire ;
- les preuves minimales ;
- les critères encore à mesurer ;
- `next_cursor`.

Chaque critère contient au minimum :

```ts
{
  code: string;
  label: string;
  status: CriterionStatus;
  blocking: boolean;
  expected: unknown;
  observed: unknown;
  tolerance?: number;
  delta?: number;
  explanation: string;
  evidence: Evidence[];
  affected_by_issue_codes: string[];
}
```

Chaque candidat porte un `model_key`, un `lifecycle` et, lorsqu’une bride a permis la compatibilité, `matched_flange` avec son identifiant, son rôle et `requires_option`.

### 8.5 Configurations sauvegardées

Une configuration sauvegardée contient :

- la spécification complète ;
- le snapshot utilisé, obligatoire dans l’enveloppe et dans la spécification ;
- le candidat retenu avec son `model_key` ;
- le verdict et ses critères figés ;
- `computed_at`.

À l’ouverture, si le snapshot actif diffère du snapshot sauvegardé, l’interface affiche le verdict historique comme tel et déclenche un recalcul explicite. Un verdict ancien n’est jamais présenté comme courant.

### 8.6 Procédures tRPC visées

| Procédure | Type | Autorisation initiale |
| --- | --- | --- |
| `configurator.motor.catalog.list` | query | authentifié |
| `configurator.motor.catalog.get` | query | authentifié |
| `configurator.motor.suggestions.dimensions` | query | authentifié |
| `configurator.motor.equivalents.fromSpec` | query | authentifié |
| `configurator.motor.equivalents.fromMotor` | query | authentifié |
| `configurator.motor.advice.build` | query | authentifié |
| `configurator.motor.energy.compute` | query | authentifié |
| `configurator.motor.compare` | query | authentifié |
| `configurator.configurations.list/get/save/archive` | query/mutation | authentifié + RLS |
| `configurator.imports.prepare/analyze/diff/activate/rollback` | mutation | `super_admin` |

Une recherche ou un calcul déterministe reste une `query`. Une activation, sauvegarde ou archive est une `mutation`.

### 8.7 Matrice de permissions validée

| Action | `tcs` | `agency_admin` | `super_admin` |
| --- | --- | --- | --- |
| Consulter le catalogue, configurer, comparer et générer une fiche technique | oui | oui | oui |
| Confirmer une mesure terrain | oui | oui | oui |
| Créer et gérer ses configurations personnelles | oui | oui | oui |
| Consulter les configurations partagées de son agence | oui | oui | oui |
| Modifier ou archiver sa propre configuration partagée | oui | oui | oui |
| Administrer toutes les configurations partagées de son agence | non | oui | oui |
| Administrer les configurations partagées de toutes les agences | non | non | oui |
| Importer, activer ou restaurer un snapshot catalogue | non | non | oui |

Une configuration personnelle reste lisible et modifiable par son propriétaire uniquement. Une configuration d’agence est lisible par tous les utilisateurs actifs de l’agence ; son auteur, l’`agency_admin` de cette agence et le `super_admin` peuvent la modifier ou l’archiver. Les politiques RLS vérifient l’agence active côté base.

Toute personne CIR authentifiée peut confirmer une mesure. Le backend inscrit `confirmed_by` et `confirmed_at` depuis la session ; ces deux valeurs ne sont jamais acceptées comme autorité depuis le payload client.

### 8.8 Preuve RLS exigée en C1

La RLS n’est considérée comme prouvée qu’avec des tests PostgreSQL transactionnels qui injectent `request.jwt.claims`, exécutent `SET LOCAL ROLE anon|authenticated`, puis reviennent en arrière.

La matrice couvre au minimum :

- refus total pour `anon` ;
- lecture du catalogue global pour les trois rôles CIR authentifiés ;
- configuration personnelle visible et modifiable uniquement par son propriétaire ;
- configuration d’agence visible dans la même agence et invisible depuis une autre ;
- modification d’un partage par son auteur, l’`agency_admin` de l’agence et le `super_admin` ;
- impossibilité pour `tcs` et `agency_admin` d’importer ou d’activer ;
- import et activation possibles uniquement pour `super_admin` ;
- tests négatifs d’`INSERT`, `SELECT`, `UPDATE` et archivage ;
- `USING` et `WITH CHECK` sur les mises à jour, avec index sur `owner_id`, `agency_id`, `scope` et les colonnes de filtre.

Le simple nom `userDb`, une vérification de service isolée ou une politique `TO authenticated` sans prédicat d’agence/propriétaire ne constitue pas une preuve.

## 9. Règles de verdict

Ordre de sévérité :

1. au moins un critère bloquant `not_satisfied` → verdict `not_satisfied` ;
2. sinon, au moins un critère bloquant `indeterminate` → verdict `indeterminate` ;
3. sinon, au moins un critère `under_reservation` → verdict `under_reservation` ;
4. sinon → verdict `satisfied`.

Un score ne peut jamais masquer un critère bloquant. Il sert uniquement à ordonner des candidats de même classe de verdict.

Les tolérances sont :

- versionnées et nommées ;
- définies par cote et population ;
- affichées avec le critère ;
- surchargeables seulement par un choix explicite et tracé ;
- jamais inventées depuis une tolérance « générale ».

## 10. Effet des anomalies

| Code | Candidat | Verdict ou conseil | PDF |
| --- | --- | --- | --- |
| `IE_BELOW_THRESHOLD` | reste visible | interdit d’affirmer que le rendement publié atteint la classe annoncée | mention obligatoire |
| `CURRENT_MISMATCH` | reste visible | avertit sur le dimensionnement de la protection amont | mention obligatoire |
| `EFFICIENCY_CURVE` | reste visible | information ; calcul énergétique signale la réserve si le point concerné est utilisé | facultatif |
| `INERTIA_IMPLAUSIBLE` | reste visible | désactive tout conseil fondé sur le rapport d’inertie | non requis par défaut |

Une anomalie ne supprime pas silencieusement un candidat. Elle restreint les affirmations autorisées et reste sourcée.

Un snapshot est bloqué uniquement par une erreur d’intégrité, de schéma, de provenance obligatoire, de lecture physique, de doublon d’identité non résolu ou de contrainte référentielle. Une incohérence réellement imprimée, correctement extraite et sourcée reste activable comme anomalie conservée avec restriction d’usage. Le champ de sévérité ne remplace donc pas le booléen explicite `activation_blocking`.

## 11. Import, activation et rollback

### 11.1 Source initiale

L’extraction des catalogues PDF reste dans `C:\GitHub\CIR_Moteur`. La migration initiale de Cockpit ne relit pas les anciens JSON historiques de `backend/data/` et ne réextrait pas les PDF. Elle reçoit un lot validé et son manifeste de provenance, construits à partir de :

- les sorties validées de `tools/extract/out/` ;
- `backend/data/iec-30-1-thresholds.json` ;
- les métadonnées des PDF et leurs empreintes ;
- la base SQLite seulement comme oracle de réconciliation des volumes et contraintes ;
- les sorties brutes pour les contrôles ciblés.

### 11.2 Cycle

1. calculer l’empreinte du lot et refuser un doublon idempotent ;
2. enregistrer le manifeste, les empreintes et les métadonnées de source sans publier ni stocker les PDF dans Cockpit ;
3. charger dans un snapshot candidat ;
4. contrôler volumes, provenance, contraintes, doublons et anomalies ;
5. produire un diff avec le snapshot actif ;
6. faire valider l’activation ;
7. activer atomiquement le candidat et retirer l’ancien ;
8. conserver l’ancien pour rollback.

Pour CILS, le catalogue dédié 6154c est retenu comme source active la plus complète sur les dix recouvrements de puissance avec 5147. Les lignes 5147 correspondantes restent dans l’historique de leur snapshot et ne sont pas proposées simultanément comme candidats actifs.

### 11.3 Critères de non-régression de C2

- nombre de modèles recalculé après déduplication ; 1 652 n’est pas une cible ;
- aucun des 1 997 points de départ perdu hors remplacement CILS explicitement tracé ;
- aucune des 37 917 cotes de départ perdue, hors fusion de doublon explicitement tracée ;
- ajout contrôlé des 324 points Bonfiglioli legacy, 34 points CILS, 68 couples CILS et 8 types dimensionnels CILS ;
- 8 196 brides ;
- 599 corrélations ;
- 705 seuils avec provenance ;
- 38 anomalies, mêmes codes et cibles ;
- aucun point ni seuil sans provenance ;
- `LSHRM 160MR1` conserve ses quatre points ;
- aucun IE5 sur réseau ;
- aucune suppression ou correction silencieuse d’une valeur PDF.

## 12. PDF

Décision technique validée : `@react-pdf/renderer` 4.1 ou ultérieur, utilisé côté navigateur pour une fiche technique sans prix.

Motifs :

- compatible React 19 ;
- texte vectoriel et sélectionnable ;
- composants, styles, métadonnées, polices, pagination et répétition d’en-têtes ;
- génération d’un Blob téléchargeable sans rasteriser l’interface ;
- tests structurels possibles sur le document.

Le serveur Deno ne doit pas dépendre des API Node `renderToFile` ou `renderToStream` sans preuve de compatibilité. Si une génération serveur devient obligatoire, elle fera l’objet d’un choix runtime séparé.

Le générateur HTML archivé du frontend v1 n’est pas réutilisé comme moteur :

- valeurs par défaut présentées comme des faits ;
- contenu interpolé sans contrat strict ;
- référence fondée sur `Date.now()` ;
- impression navigateur non reproductible ;
- mélange entre fiche technique et offre commerciale.

Le document ne contient ni prix, ni total, ni conditions commerciales. Le gabarit, le logo et les mentions légales ne sont pas disponibles en C0 : C9 commence par un point de validation visuelle et juridique. Aucun logo ni texte légal ne sera inventé.

Les PDF constructeurs ne sont ni publiés ni téléchargeables depuis Cockpit. L’interface et la fiche affichent uniquement les métadonnées utiles du catalogue, son empreinte et la page source.

## 13. Assistant IA

Décision validée pour le premier jalon :

> Aucun outil IA Configurateurs exposé pour l’instant.

Justification :

- la sélection, le verdict, les conseils et l’énergie sont déterministes ;
- aucune valeur ajoutée réelle ne justifie un appel modèle avant le parcours opérationnel ;
- le contrat IA doit être extrait d’un usage réel, pas conçu dans l’abstrait ;
- la provenance et les permissions doivent d’abord être prouvées sans IA.

Signal de réévaluation : utilisateurs confrontés de façon répétée à une question explicative que les écrans déterministes et les preuves ne résolvent pas.

## 14. Scénarios d’acceptation

### 14.1 Parcours nominal

Un utilisateur saisit une plaque 37 kW, 4 pôles, 50 Hz et les cotes complètes d’un montage B35. L’API retourne au moins un candidat, les treize critères applicables, les écarts chiffrés, les preuves et un verdict reproductible.

### 14.2 Suggestion non confirmée

Une cote D est proposée à partir de 113 observations identiques. Tant que l’utilisateur ne la confirme pas, aucun candidat ne peut recevoir le verdict `satisfied`.

### 14.3 Donnée absente

Le catalogue candidat ne publie pas une cote obligatoire. Le critère est `indeterminate`, la cote apparaît dans la liste à mesurer et aucun zéro ou standard IEC n’est injecté.

### 14.4 Incompatibilité

Une cote de bride dépasse la tolérance versionnée. Le critère est `not_satisfied`, l’écart est affiché et aucun score global ne le masque.

### 14.5 Anomalie catalogue

Un candidat porte `IE_BELOW_THRESHOLD`. Il reste proposé, mais l’argumentaire de classe est bloqué et le PDF porte la mention.

### 14.6 Variante homonyme

Deux modèles `LSHRM 160MR1` de masses différentes restent deux variantes distinctes. L’API et l’interface ne les fusionnent pas.

### 14.7 Multi-agence

Deux utilisateurs d’agences différentes peuvent consulter le même catalogue technique global. Ils ne voient pas les configurations sauvegardées de l’autre agence, sauf règle de partage explicitement validée.

### 14.8 Import et rollback

Réimporter le même lot ne crée aucun doublon. Activer un nouveau snapshot est atomique. Le rollback restaure exactement l’ancien snapshot actif.

### 14.9 Sécurité

`anon` ne lit aucune table configurateur. Un utilisateur authentifié ne peut ni activer un catalogue ni contourner l’isolation des configurations. Le service role n’est jamais exposé au frontend.

### 14.10 Défaillance

Un timeout, payload invalide, conflit d’activation, échec Storage ou échec de persistance produit un code CIR stable, un `request_id`, aucune double activation et un état reprenable.

## 15. Décisions utilisateur validées le 26/07/2026

| # | Décision |
| --- | --- |
| 1 | Tous les utilisateurs CIR authentifiés consultent et configurent. `agency_admin` administre le partage de son agence ; `super_admin` administre globalement et possède seul les droits d’import et d’activation. |
| 2 | Les configurations peuvent être personnelles ou partagées avec l’agence. |
| 3 | Le PDF est une fiche technique sans prix. |
| 4 | Toute personne CIR authentifiée peut confirmer une mesure terrain ; le serveur trace l’auteur et la date. |
| 5 | Cockpit expose les métadonnées de catalogue et la page de provenance, jamais le PDF constructeur au téléchargement. |
| 6 | Aucun outil ni appel IA dans la première phase. |
| 7 | Le configurateur utilise exclusivement les unités SI ; `hp`, pouces et fractions sont hors périmètre. |
| 8 | L’OCR est hors périmètre initial. |
| 9 | L’extraction PDF reste dans CIR Moteur ; Cockpit reçoit les jeux validés et leur manifeste de provenance. |
| 10 | Aucun gabarit, logo ou jeu de mentions légales n’est fourni pour l’instant ; C9 prévoit leur validation avant finalisation. |
| 11 | Pour les recouvrements CILS, le catalogue dédié 6154c est retenu car il est le plus complet ; 5147 reste historique. |
| 12 | Un snapshot est bloqué par les erreurs d’intégrité, provenance ou lecture physique, pas par une incohérence constructeur sourcée et conservée. |
| 13 | `dataGrade` est recalculé depuis la provenance, la règle et la relecture ; il n’est pas repris tel quel de SQLite. |
| 14 | La preuve RLS repose sur des tests PostgreSQL sous rôles et claims réels, avec cas positifs et négatifs. |
| 15 | L’identité stable inter-snapshots est `model_key`, indépendante de `variant_key` et des points de fonctionnement. |

## 16. Gate de sortie C0

C0 est **clos au 26/07/2026**. Les conditions suivantes sont satisfaites :

- les quinze arbitrages du §15 sont répondus ou explicitement reportés ;
- les contrats Zod sont créés et testés dans `shared/schemas/configurator/` ;
- la matrice de permissions et la stratégie RLS sont verrouillées ;
- la frontière fiche technique / offre commerciale est cohérente ;
- les scénarios d’acceptation sont approuvés ;
- C1 possède une liste de tables, contraintes, index, RLS et tests sans décision métier implicite.

La prochaine tranche autorisée est C1 : schéma PostgreSQL, migrations, index, RLS et tests. C0 n’a créé aucun objet distant et n’autorise pas implicitement l’exécution de C1.
