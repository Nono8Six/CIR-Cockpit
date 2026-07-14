# Architecture « Contexte Universel » pour l'Assistant IA CIR

> Créé le 2026-07-14. Analyse comparative de l'approche Attio (« Universal Context™ »),
> audit vérifié de la base réelle (Supabase MCP, projet `rbjtrcorlezvocayluok`) et du code
> backend, puis plan d'implémentation détaillé. Ce document est une étude d'architecture :
> il ne modifie aucun comportement et ne remplace pas
> `plan-fiabilisation-assistant-ia.md`, qu'il complète (voir §8 pour le séquencement).

## 1. Origine et objectif

Question du PO : comment obtenir un assistant qui « a le contexte de toute la base CIR »
et répond avec la fluidité d'un agent frontier, tout en gardant l'exactitude exigée par un
référentiel tarifaire ?

Réponse courte, démontrée dans ce document : **le « contexte universel » n'est pas un
prompt géant, c'est une couche de données auto-descriptive et cherchable**. Attio ne donne
jamais « tout » à son modèle : il lui donne un moyen uniforme de *retrouver* n'importe quel
morceau au moment utile. CIR Cockpit possède déjà la moitié de cette architecture (magasin
unifié Postgres + RLS + snapshots + outils stricts) ; il lui manque la moitié descriptive
(schéma qui se documente, catalogue cherchable, projections typées) et le bon modèle sur le
chemin difficile.

## 2. Ce qu'Attio fait réellement

Synthèse des articles d'ingénierie Attio (« Introducing Universal Context », « Ask Attio:
a technical look at our new agent ») et de l'observation du produit :

| Mécanisme | Description | Équivalent CIR aujourd'hui |
| --- | --- | --- |
| Magasin unique (« Particle ») | Tout — records, emails, appels, produit — dans un seul format graph-relationnel opérationnel, pas un warehouse répliqué | **Déjà acquis** : Postgres unique, RLS, snapshots versionnés |
| Capture automatique | « It logs itself » : 15 M emails/jour synchronisés ; le contexte est universel parce que la capture l'est | Partiel : imports Excel + CRM saisi ; pas de flux auto |
| Schéma-as-data | L'agent **cherche** dans le schéma (« Attributes searched: 19 results ») au lieu de recevoir un dump | **Absent** : `get_database_catalog` = dump complet à chaque question |
| Types riches | SQL sur projection typée (`(stage).title`) : le schéma exposé est sémantique, pas brut | **Absent** : colonnes financières en `text`, pièges de cast |
| Index sémantiques consistants | Embeddings + full-text dans le magasin transactionnel (« External Consistency »), jamais une base vectorielle en retard | Absent ; `pg_trgm` installé mais inutilisé par l'assistant |
| Registre de capacités dynamique | Jeu d'outils construit par conversation selon permissions/contexte | Partiel : allowlists P2 par intention (statiques) |
| « Interests » | L'élément ouvert à l'écran est hydraté en contexte structuré | **Déjà acquis** : `page_context` (import_id, target_snapshot_id) |
| Multi-provider frontier | Anthropic, Vertex AI, OpenAI avec bascule automatique | Absent : un seul modèle 24B pour tous les régimes |
| Transparence | Intention annoncée avant les outils, « 2 tools used », SQL dépliable, lignes/durée | Prévu en P5 (provenance structurée) |

La formule Attio : **capture universelle + méta-modèle unique + schéma cherchable +
récupération à la demande + modèle frontier**. Aucun de ces éléments n'est un prompt géant.

## 3. État des lieux vérifié CIR Cockpit (audit du 2026-07-14)

### 3.1 Base de données (vérifiée via Supabase MCP)

- **44 tables `public`**, RLS activée partout. Volumes réels : `pricing_supplier_segments`
  64 801 lignes, `pricing_segment_purchase_grids` 89 278, `pricing_segment_classification_links`
  64 808, `pricing_reference_anomalies` 5 368, `pricing_reference_diffs` 7 659,
  `pricing_classification_cir` 3 479, 7 snapshots/imports. Côté CRM : `interactions`,
  `entities`, `entity_contacts`, `agencies` (faibles volumes actuels).
- **Découverte structurante** : les conditions d'achat (`remise_ha`, `coef_retro`, `coef_ha`,
  `coef_majvte`, `borne_acha`, dates de validité) vivent dans
  `pricing_segment_purchase_grids`, **pas** dans `pricing_supplier_segments`. Une question
  du type « top 3 CAT_FAB de FEST par remise d'achat » exige une jointure
  segments ↔ grilles d'achat que rien ne documente pour le modèle aujourd'hui.
- **Toutes les colonnes financières sont `text`.** Échantillon vérifié (2 000 valeurs de
  `remise_ha`) : 100 % au format numérique à point décimal, avec artefacts float d'Excel
  (`66`, `71.2`, `79.05`, `69.400000000000006`). Un `ORDER BY remise_ha DESC` généré par un
  modèle trie donc **alphabétiquement** en silence : SQL valide, snapshot correct, résultat
  faux. C'est l'incident I-07 du plan de fiabilisation à l'état pur.
- **5 commentaires `pg_description` dans tout le schéma `public`.** La couche descriptive
  est vide, alors que `describe_database_tables` lit déjà `obj_description` /
  `col_description` : le code est prêt à consommer une documentation qui n'existe pas.
- Extensions : `pg_trgm` **installé** (similarité trigramme, index GIN possibles) ;
  `unaccent`, `vector` (pgvector 0.8) et `pgroonga` disponibles mais **non installés**.
- IA : `ai_model_configs` contient déjà 2 modèles (`mistralai/mistral-small-3.2-24b-instruct`,
  `deepseek/deepseek-v4-pro`) — l'infrastructure multi-modèles existe. 9 versions de prompt
  (`draft`/`published`/`archived`). `ai_usage_events` trace mode d'exécution, outils, coût.

### 3.2 Code backend (vérifié)

La chaîne actuelle est déjà sérieusement durcie :

- Routage d'intentions déterministe (`assistantIntentRouting.ts`) avec allowlists exactes
  par intention (P2), quatre chemins sans provider (P1).
- Fallback SQL (`assistantSqlTools.ts`) avec vraie défense : tokenizer dédié, allowlist de
  fonctions, schémas/relations interdits, `ILIKE` imposé pour les recherches textuelles,
  `snapshot_id` obligatoire sur les 5 tables versionnées (`VERSIONED_TABLES`), refus du
  piège `agency_id`, fingerprint SQL canonique anti-boucle, transaction `READ ONLY` sous
  rôle `authenticated` + RLS, timeout 5 s, 50 lignes max.
- `get_database_catalog` renvoie **l'intégralité** des 44 tables et de leurs colonnes à
  chaque question imprévue → 27–49K tokens d'entrée mesurés par question en baseline P0.
- `referenceSemantics.ts` : 4 alias de marques (`FESTO→FEST`, `ROCKWELL→ROCK`) et
  4 expansions de termes (`drive`/`variateur`/`vfd`) codés en dur — l'embryon du
  dictionnaire sémantique, minimal et non extensible sans redéploiement.

### 3.3 Diagnostic : les six écarts avec Attio

1. **Le schéma est transmis, pas cherchable.** Attio : 19 attributs pertinents récupérés.
   CIR : 44 tables dumpées, et le modèle invente quand même des colonnes.
2. **Le schéma ne se décrit pas.** 5 commentaires en base. Le modèle ne peut pas savoir que
   `remise_ha` est un pourcentage stocké en texte, ni que les grilles d'achat se joignent
   aux segments par `segment_id` + `snapshot_id`.
3. **Pas de projection typée.** Le SQL libre travaille sur les tables brutes avec leurs
   pièges (`text` partout, jointures implicites, snapshot à connaître).
4. **Sémantique métier minimale et codée en dur.** 4 alias, 4 synonymes ; tout ajout passe
   par un déploiement d'Edge Function.
5. **Aucune recherche floue sur les libellés.** `cat_fab_l` n'a ni index trigramme ni
   normalisation d'accents ; les recherches reposent sur des synonymes énumérés.
6. **Un seul modèle pour tous les régimes.** Le 24B échoue précisément là où on l'utilise
   le plus (SQL imprévu), et les évaluations P6 le confirment sur cinq modèles : le
   problème est le chemin, pas le modèle — mais une fois le chemin réparé, la synthèse et
   le SQL résiduel méritent un modèle qui raisonne.

## 4. Ce qu'on ne copie PAS d'Attio (décisions explicites)

- **Pas de nouveau magasin de données.** Particle résout un problème qu'on n'a pas :
  Postgres + snapshots + RLS est déjà notre magasin unifié et transactionnel.
- **Pas d'embeddings/pgvector en première intention.** ~9 000 `CAT_FAB` distincts par
  snapshot se cherchent très bien avec `pg_trgm` + `ILIKE` + synonymes. Installer pgvector
  serait une dépendance et un pipeline d'indexation pour un gain non démontré. Décision
  réversible : si les mesures montrent des recherches ratées pour cause de vocabulaire
  (pas de casse ni d'accents), on réévalue.
- **Pas d'abandon de la couche déterministe.** Attio tolère l'exploratoire ; un comptage
  tarifaire non. Les chemins P1/P2 restent la voie royale et gratuite.
- **Pas de streaming SSE ni de conversations en arbre** : hors périmètre, arbitré en P7
  sur mesures.

## 5. Architecture cible : six piliers

```text
Question utilisateur
  ├─ intention connue ──────────────► outil métier strict (inchangé, P1/P2)
  ├─ suivi/clarification ───────────► contexte conversationnel (P3 + correctif pending)
  └─ question imprévue (fallback)
       1. annonce d'intention (« je vais chercher X sur le snapshot Y »)
       2. search_schema(terms) ────► top N tables/colonnes + sémantique   [Pilier B]
            └─ lit les COMMENT ON versionnés                              [Pilier A]
       3. SQL sur projections typées ai_v_* (casts faits, snapshot résolu) [Pilier C]
       4. validations existantes (tokenizer, catalogue, fingerprint)       (P4, inchangé)
       5. réponse + provenance structurée                                  (P5)
       modèle : frontier sur ce chemin uniquement                          [Pilier D]
Boucle de fond : ai_usage_events → questions tombées en fallback → promotion en outil métier [Pilier F]
```

### Pilier A — Schéma auto-descriptif (`COMMENT ON` versionnés)

Le dictionnaire sémantique vit **dans la base**, sous forme de commentaires Postgres posés
par migration (donc versionnés, relisibles, revus par le PO). C'est la traduction exacte du
« schéma-as-data » d'Attio, sans aucune nouvelle infrastructure : `describe_database_tables`
remonte déjà ces champs, aujourd'hui `null`.

Exemples cibles (extraits ; la migration complète couvre les ~12 tables utiles à
l'assistant, colonnes clés en priorité) :

```sql
comment on table public.pricing_segment_purchase_grids is
  'Grilles de conditions d''achat par segment fournisseur. Une ligne = une condition '
  '(remise ou coefficient) pour un segment, avec période de validité. Se joint à '
  'pricing_supplier_segments par (segment_id, snapshot_id). Table versionnée : toujours '
  'filtrer par snapshot_id.';

comment on column public.pricing_segment_purchase_grids.remise_ha is
  'Remise d''achat en pourcentage, stockée en text à point décimal (ex: ''71.2'', '
  '''69.400000000000006''). Pour trier ou agréger : ai_to_numeric(remise_ha). '
  'Ne jamais utiliser ORDER BY sur la valeur text.';

comment on column public.pricing_supplier_segments.marque is
  'Code marque canonique en majuscules (ex: FEST, ROCK). Les noms commerciaux (FESTO, '
  'ROCKWELL) ne sont pas stockés : résoudre les alias avant de filtrer.';

comment on column public.pricing_supplier_segments.cat_fab_l is
  'Libellé long de la catégorie fabricant, casse et accents libres (ex: ''Low Voltage '
  'Drives''). Recherche textuelle : ILIKE obligatoire, échapper %, _ et \.';
```

Règles de rédaction : français, une info par phrase, chaque piège connu (type, casse,
jointure, snapshot) explicité, aucun secret ni donnée métier. Les commentaires sont du
contexte donné au modèle : ils sont rédigés par nous et versionnés, jamais alimentés par
des saisies utilisateur (pas de vecteur d'injection).

### Pilier B — Outil `search_schema` (le « Attributes searched » de CIR)

Nouvel outil du fallback qui **remplace le dump** comme premier réflexe :

- Entrée : `terms` (1–5 termes métier, ex. `["remise", "achat", "cat_fab"]`).
- Implémentation : requête sur `information_schema.columns` + `pg_description`, classée par
  `similarity()` (`pg_trgm`, déjà installé) sur nom de table, nom de colonne et texte du
  commentaire ; retour des **N meilleures colonnes** (défaut 20) groupées par table, avec
  type, nullabilité, description et clés étrangères des tables retenues.
- Sortie Zod stricte, plafond d'octets identique aux autres outils.
- `get_database_catalog` reste disponible mais rétrogradé (le prompt oriente vers
  `search_schema` d'abord) ; `describe_database_tables` inchangé pour le zoom.

Effet attendu, mesurable : contexte fallback de 27–49K tokens → **3–8K tokens**, moins de
tours (le modèle reçoit directement les bonnes colonnes documentées), moins d'inventions
de colonnes (le piège `agency_id` disparaît du champ de vision).

### Pilier C — Projections typées `ai_v_*` (la surface SQL qui ne peut pas mentir)

Des vues dédiées à l'assistant, qui suppriment des classes entières d'erreurs au lieu de
les détecter :

```sql
-- Fonction de cast robuste (immutable, schéma private)
create or replace function private.ai_to_numeric(value text)
returns numeric language sql immutable strict
as $$ select nullif(replace(btrim(value), ',', '.'), '')::numeric $$;

-- Vue « conditions d'achat du snapshot actif », typée et pré-jointe
create view public.ai_v_purchase_terms_active
with (security_invoker = on) as
select
  s.snapshot_id, s.marque, s.cat_fab, s.cat_fab_l, s.segment, s.segment_key,
  g.num_four, g.type_grill, g.priorite,
  private.ai_to_numeric(g.remise_ha)   as remise_ha_pct,
  private.ai_to_numeric(g.coef_retro)  as coef_retro_num,
  private.ai_to_numeric(g.coef_ha)     as coef_ha_num,
  private.ai_to_numeric(g.coef_majvte) as coef_majvte_num,
  g.date_debut_normalized, g.date_fin_normalized
from public.pricing_supplier_segments s
join public.pricing_segment_purchase_grids g
  on g.segment_id = s.id and g.snapshot_id = s.snapshot_id
join public.pricing_reference_snapshots snap
  on snap.id = s.snapshot_id and snap.is_active;
```

Points d'implémentation impératifs :

- **`security_invoker = on` obligatoire** : sans lui, une vue Postgres s'exécute avec les
  droits du propriétaire et contournerait les RLS. C'est le piège Supabase classique ;
  chaque vue `ai_v_*` doit le déclarer et un test d'intégration doit le prouver.
- `loadDatabaseCatalog` filtre aujourd'hui `table_type = 'BASE TABLE'` : à étendre aux vues
  `ai_v_%` pour que la validation catalogue les accepte.
- Les vues `*_active` pré-filtrent le snapshot actif → pas d'exigence `snapshot_id` ; des
  variantes non filtrées (`ai_v_purchase_terms`) gardent `snapshot_id` exposé et restent
  soumises à la règle `VERSIONED_TABLES` pour les questions historiques.
- Le prompt et les commentaires orientent le SQL libre vers `ai_v_*` d'abord ; les tables
  brutes restent accessibles (compatibilité, questions exotiques) mais documentées comme
  « préférer la vue ».
- La question de référence « top 3 CAT_FAB de FEST par remise d'achat » devient un
  `SELECT cat_fab, max(remise_ha_pct) ... GROUP BY ... ORDER BY 2 DESC LIMIT 3` trivial
  et **sémantiquement sûr**.

### Pilier D — Régime double modèle

- Chemins déterministes et bornés : modèle léger actuel (ou aucun provider) — inchangé.
- Chemin `general_sql` + synthèse des questions imprévues : **modèle frontier** (la
  campagne P6 doit en inclure un comme référence haute), avec la même politique
  (`data_collection: deny`, `zdr: true`, `require_parameters: true`, `max_price` borné).
- Justification économique mesurée en P0 : ~0,003 USD/question aujourd'hui pour des
  réponses fausses ; 0,05–0,10 USD sur les ~20 % de questions difficiles est indolore si
  l'exactitude passe les seuils. Le critère P6 reste « le modèle le moins cher qui passe
  tous les seuils bloquants » — appliqué **par régime**, pas globalement.
- `ai_model_configs` supporte déjà plusieurs modèles ; il manque uniquement le routage
  intention→modèle dans le broker (une table de correspondance, pas une refonte).

### Pilier E — Intention annoncée + provenance (raccord P5)

Avant tout outil du fallback, le modèle produit une phrase d'interprétation affichée à
l'utilisateur (« Je vais chercher les remises d'achat FEST sur le snapshot actif »), puis
la provenance P5 (outil, snapshot, filtres, SQL réel, lignes, durée) sous forme pliable.
Copie directe de l'UX Attio (« 2 tools used »), coût nul, contestabilité maximale.

### Pilier F — Boucle de promotion continue

`ai_usage_events.metadata` trace déjà `execution_mode` et les outils. Une requête
d'analyse périodique liste les questions servies par `general_sql` ; chaque motif récurrent
devient candidat à un outil métier strict (comme `aggregate_segments` l'a été pour les
comptages). C'est le mécanisme qui fait converger l'assistant vers « percutant sur tout le
domaine » : le domaine se cartographie question par question, il ne se devine pas.

## 6. Plan d'implémentation

| Étape | Contenu | Livrables | Effort estimé | Risque |
| --- | --- | --- | --- | --- |
| E1 | Dictionnaire : migration `COMMENT ON` (~12 tables, ~80 colonnes) + `private.ai_to_numeric` | 1 migration SQL, 0 code | 0,5–1 j (rédaction soignée) | Nul (aucun comportement modifié) |
| E2 | Vues `ai_v_*` (`purchase_terms[_active]`, `segments[_active]`, `diffs_enriched`) avec `security_invoker` | 1 migration + extension `loadDatabaseCatalog` aux vues `ai_v_%` + tests RLS | 1–2 j | Faible (RLS à prouver par test) |
| E3 | Outil `search_schema` + rétrogradation du dump dans le prompt | `assistantSqlTools.ts` (+ ~150 lignes), contrats Zod, tests, mesure tokens avant/après | 1–2 j | Faible |
| E4 | Routage intention→modèle (frontier sur fallback) | broker + `ai_model_configs`, politique OpenRouter inchangée | 0,5–1 j | Moyen (coût à borner par `max_price`) |
| E5 | Annonce d'intention + raccord provenance | broker + UI diagnostic (périmètre P5 existant) | inclus dans P5 | Faible |
| E6 | Requête de promotion + rituel de revue | 1 requête documentée dans le runbook | 0,25 j | Nul |

Nouveaux cas d'évaluation à ajouter à la suite P6 (tous doivent passer après E1–E4) :

1. « Quelles sont les 3 CAT_FAB de FEST avec le plus de remise d'achat ? » — exige la
   jointure grilles d'achat + cast numérique + tri correct (échec garanti aujourd'hui).
2. « Par rapport à l'ancien fichier importé, y a-t-il des écarts de plus de 20 % de remise
   en moins ? » — route `diff_analysis` (`aggregate_diffs`, `measure=remise`,
   `direction=baisse`) ; vérifier la lecture des `max_delta_pct`.
3. Recherche schéma : « où sont stockées les remises ? » — `search_schema` doit retourner
   `pricing_segment_purchase_grids`/`ai_v_purchase_terms_active` dans le top 3.
4. Tri piégé : toute requête générée qui trie une colonne financière `text` brute doit être
   soit réécrite vers la vue, soit signalée (garde-fou P4 étendu : refus de `ORDER BY` sur
   colonne text documentée numérique — règle simple ajoutée au validateur).

## 7. Mesures de succès (avant/après, sur la suite P6 rejouée)

- Tokens d'entrée p95 du fallback : 27–49K → **< 8K**.
- Tours provider p95 pour une question imprévue : 4–6 → **≤ 2–3**.
- Zéro colonne inventée exécutée (déjà un seuil P6) — attendu structurellement par E3.
- Les 4 nouveaux cas d'évaluation passent à 100 %.
- Coût par réponse **correcte** : à mesurer par régime ; le fallback frontier doit rester
  sous le coût actuel d'une conversation multi-tours ratée (~0,003–0,004 USD × répétitions).

## 8. Séquencement par rapport au plan de fiabilisation

Le plan `plan-fiabilisation-assistant-ia.md` (P3 contexte conversationnel → P4 SQL durci →
P5 preuves → P6 campagne → P7 perf → P8 QA) reste la colonne vertébrale. Recommandations :

- **E1 peut démarrer immédiatement** : migration pure, zéro impact runtime, et P4/P5 en
  bénéficient (les descriptions alimentent `describe_database_tables` sans changement de
  code). Prérequis d'aucune phase.
- **E3 doit précéder la campagne P6 finale.** Mener la campagne sur l'économie actuelle
  (dump 27–49K tokens) sélectionnerait un modèle pour un système qu'on s'apprête à
  changer ; les coûts, tours et taux d'erreur seraient tous invalidés par E3.
- **E2 s'insère naturellement dans P4** (fallback durci) : les vues sont la version
  « prévention » des validations P4 déjà livrées (détection).
- **E4 est une décision de P6**, éclairée par un candidat frontier dans la campagne.
- Le correctif « clarification en attente » (contexte conversationnel `pending_clarification`,
  diagnostiqué le 2026-07-14) reste un préalable P3-bis indépendant de ce chantier.

## 9. Risques et garde-fous

- **RLS et vues** : `security_invoker = on` systématique + test d'intégration par vue
  (deux identités, deux agences pour les tables à périmètre agence). Sans ce test, une vue
  est un contournement silencieux de RLS.
- **Extensions** : ne rien installer (`vector`, `unaccent`, `pgroonga`) sans besoin mesuré ;
  `pg_trgm` suffit au pilier B. Réévaluation uniquement sur échecs de recherche documentés.
- **Qualité du dictionnaire** : les commentaires sont du contexte modèle — français,
  factuel, versionné, relu par le PO ; jamais de texte issu de saisies utilisateur ;
  chaque migration de commentaires passe la revue comme du code.
- **Coût frontier** : `max_price` OpenRouter + provider effectif et coût réels déjà tracés
  dans `ai_usage_events` ; alerte budget existante inchangée.
- **Dérive du périmètre SQL** : les vues élargissent la surface lisible — chaque vue doit
  être justifiée par des questions réelles (pilier F), pas créée « au cas où ».

## 10. Journal

| Date | Événement |
| --- | --- |
| 2026-07-14 | Création. Audit DB (44 tables, volumes, 5 commentaires, extensions) et code (`assistantSqlTools.ts`, `assistantIntentRouting.ts`, `referenceSemantics.ts`) vérifiés. Analyse Attio (Universal Context, Ask Attio) intégrée. Aucun code ni migration livré. |
