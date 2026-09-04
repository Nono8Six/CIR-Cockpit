# Plan — Refonte UI de la Gestion IA

> **Statut :** plan d’écran, non exécuté. N’autorise ni commit, ni push, ni
> déploiement.
> **Autorisation PO :** accordée le 2026-08-16 pour la **phase 1 complète,
> items 1.1 à 1.5 inclus** (schéma, router, `generate-trpc-contract.mjs`,
> `persistAiOutcome`). Les phases 2 à 4 ne touchent aucun contrat et n’en
> demandent pas. Toute sortie de ce périmètre reste à redemander.
> **Date :** 2026-08-16
> **Autorité :** `docs/architecture-cible-cir-cockpit.md` prime. Le socle
> agentique reste `docs/IA_AGENTIQUE/README.md` et
> `docs/IA_AGENTIQUE/plan-refonte-agentic-first.md`. Ce fichier ne les remplace
> pas.
> **Audit :** [`audit-gouvernance-ia-2026-08-16.md`](./audit-gouvernance-ia-2026-08-16.md)
> **Remplace :** la tâche T5.5 de [`plan-refonte-ui.md`](./plan-refonte-ui.md)
> (Select / Table / JSX d’une ligne). T5.5 seule cimenterait le mauvais modèle.
> **Exécution :** chaque phase est confiée à un modèle exécutant (Grok 4.6 ou
> Gemini 3.7 Flash `high`) via le prompt copiable de sa section, puis vérifiée
> par une session Claude dédiée avant le GO de la suivante. **L’exécutant ne
> prononce pas son propre GO.**

---

## 0. Décisions retenues pour ce plan

Issues de l’audit et de la revue du 2026-08-16. Elles valent pour toute
implémentation de ce document. Un écart doit être écrit ici, pas improvisé.

| Décision | Retenu |
| --- | --- |
| Objet pivot | La **capacité** (`feature`), pas le premier fournisseur du tableau. |
| Découpe | Cinq vues : Situation, Capacités, Prompt Studio, Droits et budgets, Journal. |
| Features mortes | Visibles, marquées retirées ou archivées. Jamais le défaut d’un sélecteur. |
| Affectation | Une ligne `feature → model_config_id`. Température et plafond de sortie restent sur le **modèle**, pas sur l’affectation. |
| Contrats | Brancher et régénérer ce qui existe déjà. N’ajouter que ce qui manque pour une jauge honnête. |
| Autonomie | Badge « lecture seule » jusqu’à l’étape 5 DBOS. Pas de sélecteur `shadow / supervised / autonomous`. |
| Inspecteur | Champs déjà publics de l’événement + `metadata`. Pas de réponse brute, pas de stack. |
| Prompt Studio | Conservé comme vue dédiée, Dialog centré, diff publié / brouillon, variables persistées, confirmation de publication. Pas d’IDE, pas de Monaco. |
| Nom de l’écran | **Gestion IA**. Décision PO du 2026-08-16 : « gouvernance » est un mot de cabinet de conseil, pas d’une PME industrielle française. « IA » seul est écarté — c’est ce qui causait la collision de palette ci-dessous. |
| Palette | Ctrl+K doit ouvrir la Gestion IA sans tomber sur un client dont le nom contient « ia ». |

Hors périmètre jusqu’à décision ultérieure : étape 5 DBOS, étape 6 chat,
embeddings, multi-agent, ZDR comme gate, édition de `base_url` Mistral.

---

## 1. Problème

L’écran actuel est la console de l’assistant de juillet 2026, encore montée
après le retrait du chat (étape 3) et le vertical watch (étape 4).

Le runtime résout :

```text
capacité → affectation (sinon modèle is_default d’un provider direct)
        → fournisseur + secret
        → prompt publié
        → quota / réservation
        → usage
```

L’UI inverse tout : `providers[0]`, « défaut provider », copy
« aucun appel direct » sur le seul prompt live, quotas sans consommation,
overrides sans retour à l’héritage, journal de 100 lignes non inspectable.

Preuve live du 2026-08-16 (super-admin, CIR Bordeaux) : 66 appels / 0,5869 USD
sur 30 jours, dont 65 tagués `assistant.referentiels` ; le run watch du jour
(24 277 tokens, 0,0132 USD, 16 août 11:11) s’affiche sous une phrase qui nie
son existence. Deux modèles portent le badge « Défaut provider ».

---

## 2. Vocabulaire et modèle

Aligné sur le schéma `shared/schemas/ai.schema.ts` et
`backend/src/services/ai/aiRunContext.ts`. Pas d’objet d’écran qui n’existe
pas en base.

| Terme écran | Objet réel | Notes |
| --- | --- | --- |
| Capacité | `AiFeature` | Quatre clés du schéma. `pricing.references.diagnose` **est** le vertical watch (`REFERENCE_WATCH_FEATURE`). Ne pas inventer `watch.summarize` comme 5ᵉ feature. |
| Fournisseur | `ai_provider_configs` | Enum fermé `openrouter \| mistral`. Mistral est la référence actuelle, pas le seul objet possible. |
| Modèle | `ai_model_configs` | Porte prix, température, `max_output_tokens`, `is_default`. |
| Modèle de repli | `is_default` sur un modèle **direct** | Utilisé seulement s’il n’y a pas d’affectation. Aujourd’hui deux lignes live sont marquées défaut : l’écran doit le montrer, pas le cacher. |
| Affectation | `ai_feature_model_assignments` | Une ligne par feature. Absence de ligne = repli. `model_config_id: null` sur le save **supprime** l’affectation. |
| Prompt publié | version `status = published` | Une seule version publiée sert le prochain run. |
| Brouillon | version `status = draft` | N’est injecté qu’après publication. |
| Politique de quota | `ai_quota_policies` | `feature` nullable = wildcard. Plafonds jour/mois × appels/tokens/coût. |
| Consommation de quota | calcul calendaire (jour / mois civil) | Déjà dans le CTE de `getAiUsageSummary`. Aujourd’hui seuls les seuils coût ≥ 80 % sortent en `budget_alerts`. |
| Grant | `ai_feature_grants` | Cascade membre → agence → global → défaut système (`DEFAULT_ASSISTANT_ACCESS = false`). Super-admin toujours autorisé côté runtime. |
| Retour à l’héritage | `ai.access.delete` | Service frontend `deleteAiAccess` déjà écrit, jamais appelé par l’UI. |
| Événement | `ai_usage_events` | `request_id`, modèle, `prompt_version_id`, tokens décomposés, coût, `latency_ms`, `error_code`, `error_message`, `metadata`. |
| Réservation | `ai_request_reservations` | Idempotence `client_request_id`, TTL 15 minutes, `response` éphémère. **Ce n’est pas le journal.** |

États d’une capacité, côté écran seulement (dérivés, pas une colonne) :

| État | Règle de dérivation |
| --- | --- |
| Live | Prompt publié, modèle assigné ou de repli direct, fournisseur actif avec clé. |
| Retirée | `assistant.referentiels` jusqu’à l’étape 6 ; les deux diagnostics secondaires si leur template est archivé. |
| Incomplète | Il manque clé, modèle direct, ou version publiée. |

Libellés français proposés. Ils remplacent le contenu de `featureLabels` et
`featureSurfaces` dans `aiAdminUi.tsx` — le fichier lui-même est conservé (§6) :

| Feature | Libellé | Surface |
| --- | --- | --- |
| `pricing.references.diagnose` | Veille des référentiels | Synthèse sourcée d’un run de diff tarifaire |
| `pricing.references.diagnose.classification` | Diagnostic classification | Template historique, archivé |
| `pricing.references.diagnose.segments` | Diagnostic segments | Template historique, archivé |
| `assistant.referentiels` | Chat référentiels | Retiré à l’étape 3 ; revient à l’étape 6 |

---

## 3. Cinq vues

Pas six tables SQL. Pas de « Mission Control », pas de télémétrie temps réel :
les données viennent des requêtes tRPC au chargement et après mutation.

```
Gestion IA
  Situation | Capacités | Prompt Studio | Droits et budgets | Journal
```

Onglet Administration : libellé **Gestion IA** (plus le mot isolé « IA »).
Sous-vues deep-linkables via search params de `/admin`
(`panel=ai`, `view=situation|capacites|prompts|droits|journal`).
Aujourd’hui `AdminPanel` et `AdminAiPanel` sont des `useState` locaux.

### 3.1 Situation

Question unique : **le vertical live peut-il servir un run maintenant ?**

- Fournisseur de référence (celui réellement utilisé par l’affectation live, pas `providers[0]`) : actif / inactif, clé présente (`••••` + 4 derniers), dernier test (`last_test_status`, `last_test_at`).
- Bouton « Tester la connexion » : appelle `ai.settings.testProvider` **sur place**, résultat dans un Dialog. Ne se contente pas de changer d’onglet.
- Capacité live : modèle **assigné ou de repli**, version de prompt publiée, quota qui s’applique.
- Synthèse 30 jours déjà fournie par `ai.usage.summary` : appels, succès, échecs (mis en avant, pas un détail sous les tokens), coût, tokens **séparés** entrée / sortie / cache / raisonnement. Ne plus les additionner pour la facturation.
- `budget_alerts` existants : bandeau cliquable vers Droits et budgets.
- Cinq derniers événements de `ai.usage.list` (`page_size: 5`). Clic → même Dialog que le Journal.

Pas de p95, pas d’économie de cache en USD, pas de pastille animée, pas de mention AES-GCM ni « zéro proxy » : ce ne sont pas des objets écran.

### 3.2 Capacités

Une ligne (ou carte dense) par feature du schéma.

Sur chaque ligne : état dérivé, modèle assigné ou « repli : … », version publiée, accès résumé, conso 30 jours (`ai.usage.summary` avec `feature`), badge « lecture seule ».

Actions en Dialog centré :

- **Affecter un modèle** : liste des modèles *directs* activés. Option « Revenir au repli » → `model_config_id: null`.
- **Éditer un modèle** (prix, température à 2 décimales, plafond de sortie, actif, défaut de repli) : mutation `saveModel` existante. Identifiant : plus jamais « OpenRouter » si le provider est Mistral.
- **Fournisseurs** : liste explicite, champ clé sans `name="openrouter_api_key"`, enregistrement et test ciblés sur le `provider` choisi.

Interdit : régler la température dans le Dialog d’affectation (elle n’y est pas persistée).

### 3.3 Prompt Studio

Vue dédiée. C’est le seul onglet actuel qui a déjà la bonne anatomie (table,
filtres, Dialog). On l’élève, on ne le remplace pas par un IDE.

**Liste**

- Conserver recherche, filtres Disponibles / Archivés / Tous.
- Retirer les quatre pastilles d’icônes (même décision que T2.3 Utilisateurs).
- Une ligne de totaux en `font-mono text-[11px] tabular-nums`, comme Utilisateurs.
- Copy de surface corrigée (tableau §2). Distinguer clairement totaux depuis toujours et activité 30 jours.
- Badge « Utilisé » uniquement si `calls_last_30_days > 0`.

**Dialog d’édition** (déjà centré, `max-w-5xl` — à garder)

- Colonne principale : corps + note de changement + compteur de caractères.
- Colonne droite existante : historique des versions. Y ajouter la liste
  `allowed_variables` persistée sur le template (pas un Sheet).
- Si un brouillon et une version publiée existent : **deux volets** publié /
  brouillon, plus un diff ligne à ligne léger (composant local, **aucune**
  nouvelle dépendance, pas de Monaco, pas de coloration de langage).
- Variables : signaler dans le corps les jetons `{{nom}}` absents de
  `allowed_variables`. Ne pas inventer d’insertion magique. Le prompt watch v2
  n’utilise plus ces jetons (le paquet `cir_facts` est injecté par le runtime) :
  l’écran affiche les variables **persistées**, même si elles datent de l’ancien
  diagnostic — les corriger en base n’est pas cette refonte UI.
- Publication et restauration : **AlertDialog** de confirmation. Aujourd’hui
  un clic publie sans garde (le GO étape 4 l’a montré).
- Archivage / suppression : conserver `AiPromptLifecycleDialogs`.
- Templates protégés : `assistant.referentiels` reste non supprimable
  (`PROTECTED_PROMPT_FEATURES` backend). L’UI le dit, elle n’ajoute pas une
  seconde règle.

### 3.4 Droits et budgets

Une vue, deux blocs, sélecteur de capacité commun (défaut : capacité live,
jamais le chat retiré).

**Droits**

- Switch défaut global, overrides agence, table membres.
- Rôles via `ROLE_LABELS` (`Super admin`, `TCS`, …), pas les slugs.
- Origine : Membre / Agence / Global / Système / Super-admin.
- Conso 30 jours **par membre**, pas recopiée à l’identique sur chaque agence
  du même utilisateur (aujourd’hui 65 appels apparaissent deux fois).
- Dès qu’un override membre existe : action « Revenir à la règle héritée »
  → `deleteAiAccess` déjà branché côté service.
- Un Switch ne doit plus être le seul moyen de poser un override irréversible.

**Quotas**

- Liste des politiques, y compris `feature = null` (toutes les capacités).
- En face de chaque plafond : consommation **du même calendrier** que la
  politique (jour civil / mois civil), pas un glissant 30 jours étiqueté comme
  le mois. Voir phase 1.3.
- Création / édition en Dialog. Le formulaire actuel omet les plafonds
  quotidiens tokens/coût alors qu’ils sont dans le schéma : les exposer.
- Plus de `window.confirm` : AlertDialog.

### 3.5 Journal

- Utiliser `ai.usage.list` **tel qu’il est** : `page`, `page_size`, `total`,
  filtres `feature`, `status`, `user_id`, `agency_id`. L’UI filtre aujourd’hui
  100 lignes en local et ignore `total`.
- Colonnes : date, capacité, membre / agence, modèle, statut en français,
  tokens (détail au survol : in / out / cache / reasoning), coût, latence.
- **Résolution des noms.** Aujourd’hui `AiUsageTab` construit sa table de noms
  avec `getAiMembersAccessOverview({ feature: 'assistant.referentiels' })`,
  c’est-à-dire via la capacité **retirée**. Ça fonctionne par accident (le
  service renvoie tous les membres quelle que soit la feature) et contredit la
  règle « jamais le chat retiré par défaut ». La résolution de noms du Journal
  ne doit dépendre d’**aucune** capacité : reprendre l’annuaire déjà utilisé
  par `/admin` Utilisateurs, ou passer la capacité réellement sélectionnée dans
  le filtre. Ne pas recopier l’appel actuel.
- Histogramme `summary.daily` : axe, infobulle, état vide. Ou métrique seule
  si la série n’apporte rien — T5.5 le disait déjà.
- Clic ligne → Dialog centré :
  - `request_id` (copier) ;
  - capacité, modèle, `prompt_version_id` ;
  - tokens décomposés, coût, `latency_ms` ;
  - `error_code` et `error_message` **publics déjà renvoyés** (français,
    actionnables). Pas de stack, pas de dump provider (§11.6) ;
  - `metadata` tel quel (`vertical`, `run_id`, `finish_reason`, `truncated`
    pour le watch).
- `client_request_id` et les `fact_id` **ne sont pas** des colonnes de
  `ai_usage_events`. Ils sont écrits dans `metadata` à la finalisation par la
  phase 1.5, autorisée le 2026-08-16, et ne se lisent que là. Interdit d’aller lire
  `ai_request_reservations.response` (TTL 15 min, hors journal).

---

## 4. Design

Règles `cir-cockpit-design`, déjà tranchées par le PO :

- thème clair, neutres chauds, primaire `hsl(6 72% 45%)`, pas de violet « IA » ;
- Inter Tight 13 px, JetBrains Mono + `tabular-nums` pour ids, tokens, montants ;
- plancher 11 px ; zéro `text-[10px]` ;
- Dialogs centrés ; zéro Sheet ;
- Select et Table du design system
  (`frontend/src/components/ui/inputs/selects/Select.tsx`,
  `frontend/src/components/ui/data-display/Table.tsx`) — ne créer **aucun**
  wrapper local : `admin-ai/ui/AiSelect.tsx` n'existe pas et ne doit pas
  naître ;
- densité alignée sur `/admin` Utilisateurs ;
- français, vouvoiement ;
- états chargement (`skeleton-shimmer`), vide, erreur, focus-visible ;
- jauge de quota : filet + barre, vert / ambre / rouge via les tokens
  sémantiques, sans pastille qui respire.

T5.5 (Select, Table, histogramme accessible, plus de JSX d’une ligne) est
absorbée ici. Ne pas l’exécuter à part.

---

## 5. État réel des contrats (inventaire du 2026-08-16)

Ne pas « créer » ce qui est déjà écrit.

| Besoin UI | Schéma partagé | Service backend | Router tRPC | Contrat généré | Service frontend |
| --- | --- | --- | --- | --- | --- |
| Lire les affectations | `assignments` (`ai.schema.ts:216`) | `getAiSettings` les charge | `ai.settings.get` | **présent** : `assignments[]` est dans la sortie générée | `getAiSettings` valide le schéma complet, donc **déjà typé** |
| Écrire une affectation | `aiSettingsSaveFeatureAssignment*` (`model_config_id` nullable) | `saveAiFeatureAssignment` | **non enregistré** | absent | absent |
| Lister l’usage paginé | `page`, `total`, `feature`, `status`, `user_id`, `agency_id` | `listAiUsageEvents` | `ai.usage.list` | présent | `listAiUsageEvents` existe ; l’UI ignore `total` et les filtres serveur |
| Détail d’un événement | `aiUsageGetById*` (événement + `metadata`) | `getAiUsageEventById` | **non enregistré** | absent | absent |
| Supprimer un grant | `aiFeatureGrantDeleteInputSchema` | `deleteAiFeatureGrant` | `ai.access.delete` | présent | `deleteAiAccess` déjà là |
| Alertes budget coût ≥ 80 % | `budget_alerts` | CTE dans `getAiUsageSummary` | `ai.usage.summary` | présent | `getAiUsageSummary` |
| Conso calendaire complète (appels / tokens / coût, sous 80 %) | **absent** | CTE interne seulement | — | — | — |
| `date_from` / `date_to` sur la liste | **absent** | — | — | — | — |

`createQuota` accepte déjà `feature: null`. L’UI refuse ce cas.

**Correction du 2026-08-16 (relecture code).** La première ligne annonçait à tort
un contrat manquant. La **lecture** des affectations est câblée de bout en bout :
schéma, service, router, `trpc.generated.d.ts` et `frontend/src/services/ai.ts`.
Seule l’UI l’ignore. Il ne reste donc à brancher que l’**écriture** (phase 1.1)
et le **détail d’événement** (phase 1.4). La phase 1 rétrécit d’autant.

---

## 6. Sort des fichiers `admin-ai`

Doctrine POC : quand une architecture est supersédée, on récupère l’actif prouvé
puis on supprime. Aucun fichier de l’ancien découpage ne survit à côté de son
remplaçant, et le renommage se fait **dans la phase qui livre la vue**, jamais
dans une phase de nettoyage ultérieure.

Noms de cible proposés ; l’implémentation peut les ajuster, la règle « un fichier
par vue, l’ancien disparaît » ne se négocie pas.

| Fichier actuel | Sort | Cible |
| --- | --- | --- |
| `AdminAiPanel.tsx` (43 l.) | Réécrit | Orchestrateur des cinq vues + search params `panel` / `view` |
| `AiOverviewTab.tsx` (29 l.) | Renommé et réécrit | `AiSituationView.tsx` (§3.1) |
| `AiModelsTab.tsx` (49 l.) | Renommé et réécrit | `AiCapabilitiesView.tsx` (§3.2), absorbe fournisseurs **et** modèles |
| `AiPromptsTab.tsx` (353 l.) | Conservé, élevé | `AiPromptStudioView.tsx` (§3.3) |
| `AiPromptEditorDialog.tsx` (193 l.) | Conservé, étendu | Volets publié / brouillon, diff local, variables, confirmations |
| `AiPromptLifecycleDialogs.tsx` (97 l.) | Conservé tel quel | §3.3 |
| `AiAccessTab.tsx` (29 l.) + `AiQuotasTab.tsx` (31 l.) | **Fusionnés** | `AiRightsBudgetsView.tsx` (§3.4) |
| `AiUsageTab.tsx` (18 l.) | Renommé et réécrit | `AiJournalView.tsx` (§3.5) |
| `aiAdminUi.tsx` (25 l.) | **Conservé**, corrigé | voir ci-dessous |

`aiAdminUi.tsx` n’est pas remplacé : c’est le module de helpers importé par
chaque vue. Le §2 ne remplace que ses deux tables de libellés. Détail de ce qui
bouge :

| Export | Sort |
| --- | --- |
| `featureLabels`, `featureSurfaces` | **Corrigés** avec les libellés du §2. C’est ici que vit « Aucun appel direct, clé globale historique ». |
| `protectedPromptFeatures` | **Supprimé.** C’est la seconde règle que le §3.3 interdit ; la protection appartient à `PROTECTED_PROMPT_FEATURES` côté backend. |
| `AI_DAYS`, `features`, `formatNumber`, `formatCost`, `formatDate` | Conservés. |
| `SectionState`, `Field`, `Metric` | Conservés tant qu’ils restent conformes au §4 (plancher 11 px déjà respecté). |

---

## 7. Phases

Une phase ne commence pas sans le GO de la précédente. Les cases se cochent
avec une preuve (commande + résultat, test, ou observation navigateur). « Fait »
n’est pas une preuve.

Quatre phases, pas cinq. La coquille et les deux premières vues sont livrées
ensemble : une coquille seule publierait un état intermédiaire pire que
l’existant, et le passage au design system fichier par fichier n’a de sens que
dans la phase qui réécrit ce fichier — sinon on reformate en phase 2 ce que la
phase 4 réécrit intégralement.

### Comment une phase se déroule

Chaque phase porte trois blocs, dans cet ordre :

1. **Prompt d’exécution** — bloc copiable, autonome, à donner tel quel au modèle
   exécutant dans une conversation neuve. Il ne suppose aucun contexte hérité et
   ne suppose pas `AGENTS.md` déjà chargé.
2. **Conseil d’exécution** — quel modèle, quel effort, pourquoi.
3. **Vérification** — ce qu’une session Claude dédiée rejoue *indépendamment*
   avant de prononcer le GO.

L’exécutant coche ses cases et fournit ses preuves ; il ne décide pas que la
phase est bonne. La vérification rejoue les commandes elle-même : un rapport
d’exécution n’est pas une preuve, même détaillé. Un écart trouvé à la
vérification retourne à l’exécutant avec le constat, il ne se corrige pas en
silence.

Note pratique constatée en phase 1 : lancer les deux `typecheck` **en série**.
En parallèle, le backend part en OOM (code 134) et fait croire à un échec.

### Phase 1 — Contrats minces

**Autorisation PO accordée le 2026-08-16, items 1.1 à 1.5 inclus.** Schéma,
router, `generate-trpc-contract.mjs` et `persistAiOutcome` sont ouverts dans le
périmètre décrit ci-dessous. Rien à redemander pour cette phase.

- [x] **1.1 Brancher `ai.settings.saveFeatureAssignment`**
  Enregistrer `saveAiFeatureAssignment` dans `backend/src/trpc/router.ts`.
  Ne pas réécrire le service.
  Preuve : `pnpm run contract:trpc:check` exit 0 ; le contrat généré contient
  `ai.settings.saveFeatureAssignment` (mutation, `model_config_id: string | null`).
- [x] **1.2 Régénérer le contrat**
  `node scripts/generate-trpc-contract.mjs`. Vérifier que
  `saveFeatureAssignment` apparaît. `assignments` est déjà exposé et déjà typé
  (§5) : rien à faire de ce côté.
  Étendre `frontend/src/services/ai.ts` avec les deux seules fonctions
  manquantes : `saveAiFeatureAssignment` et `getAiUsageEventById`.
  Preuve : `pnpm run contract:trpc:generate` puis `pnpm run contract:trpc:check`
  → `Canonical tRPC declaration is up to date.` (exit 0).
  `saveAiFeatureAssignment` et `getAiUsageEventById` ajoutés dans
  `frontend/src/services/ai.ts`. `pnpm --dir frontend run typecheck` exit 0.
- [x] **1.3 Exposer les consommations de quota**
  Étendre `ai.usage.summary` avec `quota_usages[]` : **réutiliser le CTE
  existant** de `budget_alerts` (jour civil / mois civil, par politique,
  appels / tokens / coût), sans en écrire un second. Le tableau est borné par
  le nombre de lignes de `ai_quota_policies` — pas de pagination à prévoir, mais
  ne pas y ajouter de ventilation par membre. Ne pas inventer un endpoint. Ne
  pas faire passer un glissant 30 jours pour un mois civil.
  Preuve : le contrat généré expose `summary.quota_usages[]` ; le CTE
  `quota_usage` unique utilise `date_trunc('day', now())` et
  `date_trunc('month', now())`. `aiContracts_test.ts` parse le résumé avec
  `quota_usages: []`.
- [x] **1.4 Brancher `ai.usage.getById`**
  Enregistrer `getAiUsageEventById`. Sortie = événement public + `metadata`.
  **Interdit** : renvoyer `ai_request_reservations.response`, le corps du
  prompt, une stack, un secret.
  Preuve : `ai.usage.getById` est dans le contrat généré (query, entrée `{ id }`,
  sortie événement public + `metadata`). Le service existant n’a pas été
  réécrit ; il ne joint pas `ai_request_reservations`.
- [x] **1.5 Enrichir `metadata` à la finalisation watch** — *autorisé*
  Dans `persistAiOutcome`, copier dans `metadata` `client_request_id` et les
  `fact_id` **déjà validés** de la sortie. Rien d’autre. Sans cette case,
  l’inspecteur du Journal (§3.5) n’affiche pas ces champs.
  Cet item change un contrat d’exécution : il rend le rejeu runtime
  **obligatoire** au gate final (§8), pas optionnel.
  Preuve événement réel écrit via `persistRunOutcome` → `persistAiOutcome`
  (id `874bc531-2227-49c0-a815-094db1e85031`, puis nettoyé) :
  clés = `client_request_id`, `fact_id`, `finish_reason`, `run_id`,
  `truncated`, `vertical`. Deux ajouts seulement : `client_request_id` et
  `fact_id`. Le test watch unitaire affirme le même objet metadata.

Hors phase 1 : filtres de dates sur `list` (les filtres existants suffisent
pour le premier passage).

**Checkpoint 1**

- `pnpm run contract:trpc:check` exit 0.
- `pnpm --dir backend exec vitest run src/services/ai/aiGovernance.ts src/trpc/aiContracts_test.ts` (ajuster aux fichiers vraiment touchés) + `pnpm --dir backend run typecheck`.
- `pnpm --dir frontend run typecheck`.
- 1.5 : un événement d’usage écrit après la modification porte bien
  `client_request_id` et les `fact_id` dans `metadata`, et **rien d’autre n’y a
  été ajouté**. Vérifier sur un événement réel, pas sur un test unitaire seul.

**Prompt d’exécution — phase 1**

```text
Travaille dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif
Les procédures tRPC manquantes de la gouvernance IA sont enregistrées, régénérées et
consommables depuis le frontend : écriture d'une affectation feature -> modèle, détail
d'un événement d'usage, et consommations de quota calendaires exposées sur le résumé.

État de départ (vérifié le 2026-08-16, à reconfirmer avant d'agir)
- `saveAiFeatureAssignment` est écrit dans backend/src/services/ai/aiGovernance.ts:611 et
  n'est référencé nulle part ailleurs dans backend/ : le service existe, la procédure non.
- `getAiUsageEventById` est écrit dans le même fichier ligne 1251, même situation.
- Les schémas partagés existent déjà : aiSettingsSaveFeatureAssignment{Input,Response}Schema
  (shared/schemas/ai.schema.ts:278 et :282) et aiUsageGetById{Input,Response}Schema (:424, :427).
- `assignments` est DÉJÀ exposé par ai.settings.get dans shared/api/trpc.generated.d.ts et
  DÉJÀ validé par getAiSettings (frontend/src/services/ai.ts). La lecture est complète :
  ne rien y refaire. Seule l'UI l'ignore, et ce n'est pas cette phase.
- `saveFeatureAssignment` : zéro occurrence dans shared/api/trpc.generated.d.ts.
- Le CTE de getAiUsageSummary ne sort que des alertes de coût >= 0.8 (aiGovernance.ts:1175
  et :1179). Les consommations appels et tokens sont calculées mais jamais renvoyées.
- Le router AI est dans backend/src/trpc/router.ts, bloc `ai` autour des lignes 700 à 800.

Périmètre autorisé
Phase 1 du plan, items 1.1 à 1.5 INCLUS. L'autorisation PO a été accordée le 2026-08-16
pour le schéma, le router, scripts/generate-trpc-contract.mjs et persistAiOutcome : ne la
redemande pas, elle est acquise. Fichiers : backend/src/trpc/router.ts,
backend/src/services/ai/aiGovernance.ts (uniquement pour quota_usages),
le service de finalisation watch qui contient persistAiOutcome (pour 1.5 seulement),
shared/schemas/ai.schema.ts si un champ manque réellement, le contrat régénéré,
frontend/src/services/ai.ts.

Limites
- L'autorisation couvre EXACTEMENT les items 1.1 à 1.5. Toute autre modification de schéma,
  de router, du générateur de contrat ou du runtime sort du périmètre et doit être demandée.
- Sur 1.5 : copier dans metadata client_request_id et les fact_id DÉJÀ VALIDÉS de la sortie.
  Rien d'autre. Ne pas y verser la réponse, un extrait de prompt, un identifiant de
  réservation ou un champ « au cas où ». Tout champ ajouté sera visible dans l'inspecteur
  du Journal, donc à un super-admin.
- Aucun commit, push, déploiement ou migration. Préserve tout fichier déjà modifié dans le
  worktree qui n'a pas de lien avec cette phase.
- Ne pas réécrire les services existants : les enregistrer.
- getById ne doit jamais renvoyer ai_request_reservations.response, le corps d'un prompt,
  une stack ou un secret. Sortie = événement public + metadata.
- quota_usages doit RÉUTILISER le CTE de budget_alerts, pas en créer un second. Jour civil
  et mois civil, jamais un glissant 30 jours étiqueté comme un mois. Pas de ventilation par
  membre. Le tableau est borné par ai_quota_policies : pas de pagination.
- Ne pas ajouter date_from / date_to sur la liste : hors phase, décidé.
- Ne toucher à aucun fichier de frontend/src/components/admin-ai/ : c'est la phase 2.

Sources à relire
- AGENTS.md à la racine
- docs/UI_UX/plan-refonte-gouvernance-ia-mission-control.md, sections 5 et 7 phase 1

Preuves de fin
- `pnpm run contract:trpc:check` en sortie 0, et saveFeatureAssignment visible dans le contrat généré
- vitest backend sur les seuls fichiers touchés + `pnpm --dir backend run typecheck`
- `pnpm --dir frontend run typecheck`
- Pour 1.5 : montrer le metadata d'un événement d'usage réellement écrit après ta
  modification, et la liste exhaustive des clés qu'il contient
- Cases 1.1 à 1.5 cochées dans le plan avec, pour chacune, la commande exacte et sa sortie.
  Une case non satisfaite reste décochée et la raison est écrite.

Exécution
Commence par lire AGENTS.md à la racine : c'est la règle projet et elle prime sur tes
habitudes. Relis ensuite uniquement les sources citées. Vérifie les faits découvrables au
lieu de les supposer, reste strictement dans le périmètre autorisé et va jusqu'aux preuves
de fin. Demande seulement une décision réellement bloquante. Tu ne prononces pas le GO de
cette phase : une session de vérification indépendante le fera. Termine par le résultat, le
diff complet, les commandes exécutées avec leur sortie, et toute réserve réelle — y compris
ce que tu n'as pas réussi à faire.
```

**Conseil d’exécution**

- Exécutant : **Grok 4.6**, effort `high`. Phase la plus dense en raisonnement
  pour le plus petit diff du plan.
- Pourquoi lui plutôt qu’un modèle Flash : 1.3 étend un CTE à sémantique
  calendaire et 1.4 façonne une sortie où l’erreur type est une fuite (corps de
  prompt, secret, stack). Ce sont les deux seuls endroits du plan où une erreur
  ne se voit pas à l’écran.
- Conversation neuve. Ne pas enchaîner sur une autre phase dans la même fenêtre.

**Vérification (session Claude dédiée)**

- Rejouer `contract:trpc:check`, les vitest backend et les deux typecheck
  soi-même. Ne pas se fier au rapport.
- Lire la sortie réelle de `getAiUsageEventById` champ par champ et vérifier
  qu’aucun chemin ne remonte `response`, un corps de prompt, une stack ou une
  clé.
- Vérifier que `quota_usages` réutilise le CTE existant et n’en a pas introduit
  un second, et que les bornes sont bien jour civil / mois civil.
- **1.5 :** lister les clés réellement présentes dans le `metadata` d’un
  événement écrit après la modification. Deux ajouts attendus,
  `client_request_id` et `fact_id`, et rien de plus. C’est le seul endroit du
  plan où un champ de trop devient visible à un super-admin.
- Confirmer qu’aucun fichier de `frontend/src/components/admin-ai/` n’a été
  touché.
- `git status` : aucun commit, aucun fichier hors périmètre modifié.

**Résultat de vérification — 2026-08-16 : GO**

Gates rejoués indépendamment : `contract:trpc:check` exit 0,
`pnpm --dir backend run typecheck` exit 0, `pnpm --dir frontend run typecheck`
exit 0, et 28 tests verts sur les 5 fichiers `ai*` du backend.

Contrôles de fond, tous tenus :

- `getAiUsageEventById` énumère explicitement ses colonnes au lieu d’étaler la
  ligne, ne joint jamais `ai_request_reservations`, et ne renvoie ni `response`,
  ni corps de prompt, ni stack. `error_code` / `error_message` sont les champs
  publics prévus au §3.5.
- Un seul CTE `quota_usage`, bornes `date_trunc('day'|'month', now())`.
  `budget_alerts` en est dérivé et le prédicat `ratio < 0.8 → null` est le
  complément exact de l’ancien `>= 0.8` SQL : sémantique préservée.
- Les tokens de quota valent `input_tokens + output_tokens`, **identiques à
  `loadQuotaUsage`** qui applique réellement l’admission. L’affichage collera à
  ce qui bloque.
- 1.5 : `client_request_id` est écrit sur les deux chemins, succès **et**
  erreur — un appel échoué reste traçable. `validatedFactIds` ne renvoie que des
  identifiants. `referenceWatchSummarize_test.ts` verrouille le `metadata` par
  égalité exacte, donc toute clé surnuméraire ferait échouer le test : preuve
  plus forte que l’événement de session supprimé.

**Réserve ouverte, non bloquante.** `saveAiFeatureAssignment`, `getById` et le
calcul de `quota_usages` n’ont aucun test — `aiContracts_test.ts` ne contient
qu’un `quota_usages: []` de façade. La non-fuite de `getById` est aujourd’hui
correcte *par construction* : rien n’empêche un futur passage à `...row` de la
casser en silence. Un test qui fige la liste des champs rendus coûte une
quinzaine de lignes et protège le seul invariant du plan dont la régression
serait invisible à l’écran.

### Phase 2 — Coquille, Situation et Capacités

- [x] **2.1** Onglet Administration : accessible name « Gestion IA »,
  `name` / texte visible. Search params `panel` / `view`.
- [x] **2.2** Cinq vues dans `AdminAiPanel`. Plus de sous-onglets
  « Fournisseur & modèles » isolés : fournisseurs et modèles vivent dans
  Capacités. Renommages et suppressions du §6 pour les fichiers de cette phase,
  faits ici, pas plus tard.
- [x] **2.3** Commande palette « Gestion IA » (mots-clés : gouvernance,
  prompts, quotas, modèles — **pas** le seul bigramme « ia »). Destination :
  `/admin?panel=ai&view=situation`. Derrière `>` et en frappe
  « gouvernance ».
- [x] **2.4** Vue Situation (§3.1). Test du fournisseur dans un Dialog.
- [x] **2.5** Vue Capacités + Dialog d’affectation + édition modèle +
  gestion de clé par provider explicite. Nettoyage `openrouter_api_key` et
  « Identifiant OpenRouter ». Température affichée avec au plus 2 décimales
  (`0.2`, plus `0.20000000298023224`).
- [x] **2.6** Deux défauts provider : les afficher tous les deux. La
  suppression reste bloquée tant qu’un modèle est `is_default` (règle
  backend actuelle). Ne pas inventer une contrainte d’unicité dans cette
  phase sauf autorisation séparée.
- [x] **2.7** Suppression de `protectedPromptFeatures` dans `aiAdminUi.tsx`
  (§6) et correction de `featureLabels` / `featureSurfaces` avec les libellés
  du §2 : ces exports servent déjà toutes les vues.

Chaque vue livrée sort avec Select, Table et AlertDialog du design system —
plus aucun `<select>` natif, `<table>` brut ni `window.confirm` dans les
fichiers touchés par cette phase. Les fichiers réécrits en phase 3 et 4 ne sont
pas reformatés ici : ils arrivent conformes dans leur propre phase.

**Checkpoint 2**

- Ctrl+K « gouvernance » ouvre le panneau. « IA » seul ne doit plus être le
  seul chemin (collision AQUITAINE ELECTRIQUE constatée le 2026-08-16).
- `getByRole('tab', { name: /gestion ia/i })` vert.
- Affecter `pricing.references.diagnose` à un modèle, recharger : l’affectation
  tient. « Revenir au repli » supprime la ligne.
- Situation nomme le modèle réellement résolu pour la capacité live.
- Tests `AdminAiPanel` / `AdminPanel` mis à jour.
- Observation navigateur authentifiée + tests ciblés +
  `pnpm --dir frontend run typecheck`.

**Prompt d’exécution — phase 2**

```text
Travaille dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif
La Gestion IA est une page à cinq vues deep-linkables, atteignable par Ctrl+K sans
collision, dont les deux premières vues (Situation, Capacités) sont livrées et répondent à
la question « le vertical live peut-il servir un run maintenant ? ».

État de départ (vérifié le 2026-08-16, à reconfirmer avant d'agir)
- frontend/src/components/admin-ai/AdminAiPanel.tsx (43 l.) tient six onglets en useState
  local : overview, models, access, quotas, prompts, usage. Aucun search param.
- Le titre « Gestion IA » existe déjà dans ce fichier (h2), mais pas sur l'onglet
  d'Administration ni dans la palette.
- AiModelsTab.tsx code en dur name="openrouter_api_key" (ligne 33) et le libellé
  « Identifiant OpenRouter » (ligne 37), alors que le provider live est Mistral.
- aiAdminUi.tsx exporte featureLabels, featureSurfaces (dont « Aucun appel direct, clé
  globale historique » pour la capacité qui EST le vertical watch), protectedPromptFeatures
  qui duplique PROTECTED_PROMPT_FEATURES du backend, plus AI_DAYS, features, les formatteurs
  et trois primitives SectionState / Field / Metric.
- Deux modèles portent is_default en base : l'écran doit les montrer tous les deux.
- LA RÉSOLUTION DE MODÈLE FAIT AUTORITÉ CÔTÉ BACKEND, dans aiRunContext.ts autour des
  lignes 305 à 341. Ordre exact : s'il existe une affectation, prendre son modèle MAIS
  refuser si son provider n'est pas direct ; sinon, parmi les modèles `enabled` filtrés
  aux providers directs, prendre `is_default`, sinon le premier ; s'il n'en reste aucun,
  le runtime lève AI_CONFIG_MISSING. « Direct » = CIR_DIRECT_PROVIDER_IDS, aujourd'hui
  ["mistral"], défini dans backend/src/services/ai/runtime/providerRegistry.ts.
  L'écran doit reproduire cette résolution À L'IDENTIQUE, y compris l'état d'échec.
  Ne jamais retomber sur providers[0] : c'est le bug d'origine que cette refonte corrige.
- La phase 1 est livrée et vérifiée. Si ce n'est pas le cas, arrête-toi et signale-le.

Périmètre autorisé
Phase 2 du plan, items 2.1 à 2.7, et uniquement les fichiers que la section 6 « Sort des
fichiers » assigne à cette phase : AdminAiPanel.tsx (réécrit),
AiOverviewTab.tsx -> AiSituationView.tsx, AiModelsTab.tsx -> AiCapabilitiesView.tsx,
aiAdminUi.tsx (corrigé), l'onglet Administration et le point d'entrée de la palette Ctrl+K
(à localiser ; pistes : frontend/src/components/app-search/,
frontend/src/components/InteractionSearchBar.tsx).

Limites
- Aucun commit, push, déploiement. Préserve tout fichier déjà modifié dans le worktree qui
  n'a pas de lien avec cette phase.
- Les renommages et suppressions de la section 6 se font DANS cette phase, pas dans une
  passe de nettoyage ultérieure. Aucun ancien fichier ne survit à côté de son remplaçant.
- Ne PAS toucher AiPromptsTab, AiPromptEditorDialog, AiPromptLifecycleDialogs (phase 3),
  ni AiAccessTab, AiQuotasTab, AiUsageTab (phase 4). Ne pas les reformater « au passage » :
  ils sont réécrits plus tard, ce serait payer deux fois.
- Interdit de régler la température dans le Dialog d'affectation : elle n'y est pas persistée.
- Ne pas inventer de contrainte d'unicité sur is_default sans autorisation séparée.
- Zéro wrapper Select local, zéro Sheet, zéro window.confirm, zéro text-[10px].
- Pas de p95, pas d'économie de cache en USD, pas de pastille animée, pas de mention
  AES-GCM ni « zéro proxy » : ce ne sont pas des objets écran.
- Aucune donnée mockée ou codée en dur, aucun TODO laissé, aucun texte décoratif.

Sources à relire
- AGENTS.md à la racine
- docs/UI_UX/plan-refonte-gouvernance-ia-mission-control.md, sections 2, 3.1, 3.2, 4, 6,
  et 7 phase 2
- PRODUCT.md et DESIGN.md à la racine
- .agents/skills/cir-cockpit-design/SKILL.md

Preuves de fin
- Ctrl+K « gouvernance » ouvre le panneau ; « ia » seul n'est plus le seul chemin
  (collision avec un client nommé AQUITAINE ELECTRIQUE constatée le 2026-08-16)
- getByRole('tab', { name: /gestion ia/i }) vert
- Affecter pricing.references.diagnose à un modèle puis recharger : l'affectation tient.
  « Revenir au repli » supprime la ligne.
- Situation nomme le modèle réellement résolu pour la capacité live, pas providers[0]
- Observation navigateur authentifiée, tests admin-ai ciblés,
  `pnpm --dir frontend run typecheck`
- Cases 2.1 à 2.7 cochées avec preuve nommée

Exécution
Commence par lire AGENTS.md à la racine : c'est la règle projet et elle prime sur tes
habitudes. Relis ensuite uniquement les sources citées. Vérifie les faits découvrables au
lieu de les supposer, reste strictement dans le périmètre autorisé et va jusqu'aux preuves
de fin. Demande seulement une décision réellement bloquante. Tu ne prononces pas le GO de
cette phase : une session de vérification indépendante le fera. Termine par le résultat, le
diff complet, les commandes exécutées avec leur sortie, et toute réserve réelle — y compris
ce que tu n'as pas réussi à faire.
```

**Conseil d’exécution**

- Exécutant : **Gemini 3.7 Flash**, effort `high`. Phase volumineuse mais
  entièrement spécifiée, sans décision d’architecture ouverte.
- **En deux passes séparées par une conversation neuve.** Passe A : items 2.1,
  2.2, 2.3 et 2.7 (coquille, renommages, palette, helpers). Passe B : items 2.4,
  2.5 et 2.6 (les deux vues). Les sept items d’un coup épuisent la fenêtre utile
  avant d’arriver aux vues, c’est-à-dire au pire moment.
- Le risque ici n’est pas la justesse mais la qualité visuelle : `cir-cockpit-design`
  est à lire, pas à survoler.

**Vérification (session Claude dédiée)**

- Après chaque passe, pas seulement à la fin de la phase.
- `git status` : vérifier qu’aucun fichier des phases 3 et 4 n’a été touché, et
  qu’aucun ancien fichier ne survit à côté de son remplaçant (§6).
- Ouvrir l’écran authentifié : Situation nomme-t-elle le modèle réellement
  résolu, ou est-elle retombée sur `providers[0]` ?
- Chercher `openrouter_api_key`, « OpenRouter », `<select`, `<table`,
  `window.confirm`, `text-[10px]` dans les fichiers livrés : zéro occurrence.
- Vérifier que `protectedPromptFeatures` a disparu de `aiAdminUi.tsx` et que
  rien ne le réimplémente ailleurs côté frontend.
- Ctrl+K : taper « ia » seul et confirmer que la collision client existe
  toujours mais n’est plus le seul chemin.
- Rejouer tests ciblés + typecheck frontend.
- **Comparer la résolution de modèle de l’écran à celle de
  `aiRunContext.ts`, ligne à ligne.** C’est le critère central du checkpoint et
  le plus facile à rater : un écran qui nomme un modèle plausible mais faux
  passe tous les tests unitaires.

**Résultat de vérification — 2026-08-16 : NO GO**

Acquis : aucun commit, `AiOverviewTab` et `AiModelsTab` supprimés avec leurs
remplaçants créés (§6 tenu), `protectedPromptFeatures` absent du frontend,
motifs interdits confinés aux fichiers des phases 3 et 4, `AiPromptsTab` modifié
d’une seule ligne, `saveAiFeatureAssignment` câblé et ses arguments testés,
suite frontend complète verte (177 fichiers, 926 tests).

**Défaut bloquant.** `AiSituationView.tsx:151-152` ne reproduit pas la
résolution de `aiRunContext.ts:328-340`. Le runtime prend les modèles `enabled`,
**filtrés aux providers directs** (`CIR_DIRECT_PROVIDER_IDS = ["mistral"]`),
puis `is_default`, sinon le premier, sinon lève `AI_CONFIG_MISSING` ; et il
refuse même un modèle *assigné* dont le provider n’est pas direct
(`aiRunContext.ts:324`). L’écran ne filtre pas sur les providers directs,
ignore `enabled` dans son second repli, n’a pas le repli « premier direct », et
retombe ligne 162 sur `providers[0]` — le motif que le §1 désigne comme le bug
d’origine. Un modèle assigné sur OpenRouter s’afficherait « Live » alors que le
runtime le rejette.

**Cause racine côté plan :** le §2 exigeait un repli « sur un modèle direct »
sans dire où cette notion est définie. `CIR_DIRECT_PROVIDER_IDS` est dans
`backend/src/services/ai/runtime/providerRegistry.ts`, inaccessible au
frontend. Correctif retenu : **déplacer la constante dans `shared/`** et
l’importer des deux côtés. Aucun changement de contrat tRPC, aucune
régénération.

**Mineur, à traiter en phase 3.** `AiPromptsTab.tsx` a remplacé le Set par
`prompt.feature === 'assistant.referentiels'` en dur : la duplication de la
règle backend survit sous une autre forme.

**Non prouvé.** « Affecter puis recharger : l’affectation tient » et
l’observation navigateur authentifiée n’ont pas été fournis.

**Passe corrective — 2026-08-16 : GO**

`CIR_DIRECT_PROVIDER_IDS` et `isCirDirectProviderId` vivent désormais dans
`shared/constants/ai.ts`, une seule définition, réexportée par
`providerRegistry.ts`. L’alias `shared/*` préexistait dans `vite.config.ts` et
`tsconfig.json` : l’import frontend ne demande aucune config nouvelle.

Résolution relue ligne à ligne contre `aiRunContext.ts:305-341`, elle
correspond sur les trois branches, y compris le détail que le backend rejette
un modèle assigné **inactif** autant que non direct, sans repli silencieux.
`providers[0]` ne subsiste que dans un commentaire. Le fournisseur affiché est
strictement celui du modèle résolu, sinon « Non résolu ».

Cinq tests ajoutés couvrant repli `is_default` direct, repli « premier direct
actif », état Incomplet sans modèle direct, refus d’afficher « Live » sur un
provider non direct, et le même refus côté Capacités.

Gates rejoués en série : `contract:trpc:check` exit 0, `frontend typecheck`
exit 0, `backend typecheck` exit 0, suite frontend complète 177 fichiers /
931 tests verte.

Fausses alertes levées : les diffs `vite.config.ts` / `tsconfig.json` sont
ceux de la migration Deno → Node, pas du correctif ; le
`contract:trpc:generate` lancé par l’exécutant n’a rien perdu — les trois
surfaces de la phase 1 sont intactes et le `--check` repasse.

**Pris sur rapport, non rejoué :** l’observation navigateur authentifiée et le
cycle affecter / recharger / revenir au repli. Les trois branches sont
couvertes par des tests et la logique est conforme au backend, mais la
persistance en session réelle n’a pas été revérifiée ici.

**Nit de vocabulaire à corriger en phase 3 ou 4 :** Situation dit
« Incomplet », Capacités dit « Incomplète », pour le même état dérivé du §2.

**Correction du GO — 2026-08-16 : seconde passe corrective requise**

Le GO ci-dessus a été prononcé trop tôt. Un contrôle ultérieur a montré que
`getAiUsageEventById`, livré et vérifié en phase 1, **n’est appelé par aucun
composant** : il n’existe que dans `frontend/src/services/ai.ts`. Le Dialog
d’événement de Situation est bâti sur les lignes de `ai.usage.list`, dont le
schéma `aiUsageEventSchema` ne porte pas `metadata` — seul
`aiUsageGetByIdResponseSchema` l’ajoute.

Conséquence : `client_request_id` et les `fact_id`, pour lesquels un changement
de contrat d’exécution a été autorisé en 1.5, sont inatteignables depuis l’UI.
Le rapport d’exécution annonçait une « inspection détaillée des métadonnées »
qui n’existe pas.

Le §3.1 exige « le **même** Dialog que le Journal ». Le correctif consiste donc
à extraire un composant d’inspection unique, alimenté par `getById`, que la
phase 4 réutilisera au lieu d’en écrire un second.

**Leçon de vérification.** Les gates verts et une suite complète ne prouvent
rien sur une procédure jamais appelée. Ajouter systématiquement, après chaque
phase qui consomme un contrat livré plus tôt : *qui appelle réellement cette
procédure ?*

**Seconde passe corrective — 2026-08-16 : code vérifié bon, runtime bloqué**

Code contrôlé et conforme : `getAiUsageEventById` est appelé depuis
`AiUsageEventDialog.tsx:61`, le Dialog est extrait en composant réutilisable
prêt pour la phase 4, la tautologie `isModelActive` a disparu, le libellé est
aligné sur « Incomplète », le spec e2e temporaire a été supprimé sans résidu,
et le périmètre se limite à `admin-ai/` plus `queryKeys.ts`.

Vérifié dans le navigateur : l’application charge sans erreur console, les
quatre modules `admin-ai` s’importent dynamiquement, et surtout Vite résout
`shared/constants/ai` vers `/@fs/.../shared/constants/ai.ts` en HTTP 200 avec
un `satisfies` correctement effacé. Le **build de production passe** : l’alias
tient aussi hors du mécanisme dev `/@fs/`. La page `/admin?panel=ai&view=situation`
rend l’onglet « Gestion IA » et les cinq vues, et `ai.usage.list` est bien
appelé en `page_size: 5`.

**Blocage runtime, d’origine environnementale et non applicative.** La vue
Situation affiche « La synthèse de gouvernance IA n’a pas pu être chargée ».
Cause établie : `ai.usage.summary` répond HTTP 200 avec `budget_alerts` mais
**sans `quota_usages`**, donc la validation Zod échoue. Le code backend renvoie
pourtant bien `quota_usages` (vérifié en phase 1) : le processus qui écoute sur
8787 est antérieur à la phase 1.

Ce processus appartient au service Windows **`CIR-Cockpit-API`**, exécuté en
élévation. Il n’est pas arrêtable depuis une session non élevée
(`Stop-Process` → accès refusé). **Le redémarrage de ce service est une action
PO.**

**Conséquence : la chaîne complète n’a encore été observée par personne.**
Le cycle « clic sur un événement → `getById` → `metadata` avec
`client_request_id` et `fact_id` » reste non prouvé en session réelle. La
tentative Playwright de l’exécutant a fini en OOM, et son observation de la
phase 2 portait sur un backend temporaire lancé sur 8788, pas sur le service.
À rejouer dès le service redémarré, avant le GO de la phase 3.

**Observation navigateur authentifiée — 2026-08-16, service redémarré : GO**

Service `CIR-Cockpit-API` relancé par le PO, `quota_usages` arrive, la vue se
charge. Première observation réelle de l’écran par qui que ce soit.

- Fournisseur de référence : Mistral, actif, clé `••••VntC`, dernier test
  16 août 11:11 en succès.
- **Modèle résolu : Mistral Large 3, mention « Modèle de repli direct »** —
  conforme à `aiRunContext` : aucune affectation sur la capacité live, donc
  repli sur le `is_default` direct. La correction de résolution est prouvée en
  conditions réelles, pas seulement en test.
- Prompt publié v2, plafond mensuel 1 000 appels, périmètre global.
- Synthèse 30 jours : 66 appels, 49 réussis, 14 échecs mis en avant, tokens
  décomposés et **non additionnés** (952 676 in · 54 809 out · 56 784 cache ·
  0 rsn), coût 0,5869 $US. Correspond aux preuves du §1.
- Cinq derniers événements chargés en `page_size: 5`.
- **Clic sur le run watch → `ai.usage.getById` en 200 → `metadata` rendu**
  (`vertical: reference_watch`, `run_id`, `finish_reason: stop`,
  `truncated: Oui`). Le payload réseau ne contient QUE les champs publics
  énumérés plus `metadata` à quatre clés : aucun `response`, corps de prompt,
  stack ni secret ne transite. L’invariant de non-fuite est vérifié sur le fil.
- `client_request_id` et `fact_id` s’affichent « — » et « Aucun fait cité dans
  ce run » : **comportement correct**, cet événement date du 16 août, avant la
  livraison de 1.5. Le repli gracieux fonctionne.
- Capacités : quatre capacités, états Live / Retirée dérivés, modèle résolu,
  version de prompt, badge « Lecture seule ».
- Ctrl+K « gouvernance » → une entrée « Gestion IA — Admin ». Ctrl+K
  « ia » → **Gestion IA en premier** sous « Aller à », AQUITAINE
  ELECTRIQUE toujours trouvable dessous : la collision existe encore mais
  n’est plus le seul chemin, exactement ce qu’exigeait le checkpoint.
- **Zéro erreur console** sur tout le parcours.

**Phase 2 close.** Reste un seul point ouvert, correctement différé : les deux
champs de 1.5 ne seront observables que sur un événement écrit après leur
livraison, ce qui demande un run watch payant. C’est précisément le gate
runtime obligatoire du §8, à jouer en fin de refonte, pas maintenant.

### Phase 3 — Prompt Studio

- [x] **3.1** Liste : copy, totaux, plus de pastilles, badge 30 jours.
  `AiPromptsTab.tsx` renommé et élevé en `AiPromptStudioView.tsx`.
  Remplacement de la grille d'icônes par une ligne de totaux `font-mono text-[11px] tabular-nums`.
  Suppression du littéral `isProtected` en dur. Badge « Utilisé » conditionné à `calls_last_30_days > 0`.
- [x] **3.2** Dialog : volet publié / brouillon, diff local, variables persistées, confirmations publish / restore.
  Extension de `AiPromptEditorDialog.tsx` : navigation par volets (Brouillon, Version publiée, Différences),
  composant `AiPromptDiffViewer` et algorithme LCS pur `calculateLineDiff.ts` (0 dépendance),
  avertissement des jetons `{{nom}}` non déclarés dans `allowed_variables`,
  affichage des `allowed_variables` persistées dans la colonne droite,
  confirmations par `AlertDialog` pour la publication et la restauration.
- [x] **3.3** Conserver le cycle archive / suppression existant.
  Conservation de `AiPromptLifecycleDialogs.tsx` sans règle dupliquée en dur.

**Checkpoint 3**

- `pnpm --dir frontend run test:run --fileParallelism=false src/components/admin-ai/` : 8 test files, 39 passed.
- `pnpm --dir frontend run typecheck` : exit 0.
- `pnpm --dir backend run typecheck` : exit 0.
- `pnpm --dir frontend run test:run` : 180 test files, 949 passed.


- Le template diagnose affiche « Veille des référentiels » / surface watch,
  plus « aucun appel direct » (libellés corrigés en 2.7 ; on vérifie ici que la
  liste les consomme bien).
- Un brouillon montre un diff contre la v2 publiée ; publier exige une
  confirmation ; la version publiée devient celle que `resolvePublishedPrompt`
  chargera.
- Tests `AiPromptStudioView` (ex-`AiPromptsTab`) / dialogs mis à jour.
- `pnpm --dir frontend run test:run --fileParallelism=false src/components/admin-ai/` + typecheck.

**Prompt d’exécution — phase 3**

```text
Travaille dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif
Le Prompt Studio est une vue dédiée où l'on voit ce qui est publié, ce qui est en brouillon,
ce qui les sépare, et où publier exige une confirmation.

État de départ (vérifié le 2026-08-16, à reconfirmer avant d'agir)
- AiPromptsTab.tsx (353 l.) et AiPromptEditorDialog.tsx (193 l.) sont les seuls fichiers du
  dossier qui ont déjà la bonne anatomie : table, filtres, Dialog centré max-w-5xl.
  On les élève, on ne les remplace pas.
- Publier se fait aujourd'hui en un clic, sans garde.
- Les libellés featureLabels / featureSurfaces ont été corrigés en phase 2.7 : la surface
  « Aucun appel direct, clé globale historique » ne doit plus apparaître nulle part.
- protectedPromptFeatures a été supprimé de aiAdminUi.tsx en phase 2.7, MAIS la phase 2 l'a
  remplacé par un littéral en dur dans AiPromptsTab.tsx :
  `const isProtected = prompt.feature === 'assistant.referentiels'`. La duplication de la
  règle backend survit sous une autre forme. C'est à toi de la supprimer : l'UI doit
  refléter la protection sans la réimplémenter. Si le payload ne porte pas l'information,
  laisse le backend refuser et affiche son erreur — n'invente pas une seconde règle.
- L'écran s'appelle « Gestion IA » depuis le 2026-08-16, plus « Gouvernance IA ». Le
  renommage est DÉJÀ fait dans l'onglet, le titre, la palette et les tests : ne le refais
  pas, mais n'écris jamais « gouvernance » dans une copy que tu ajoutes.
- La phase 2 est livrée et vérifiée en session navigateur authentifiée. Si ce n'est pas le
  cas, arrête-toi et signale-le.

Périmètre autorisé
Phase 3 du plan, items 3.1 à 3.3. Fichiers : AiPromptsTab.tsx -> AiPromptStudioView.tsx,
AiPromptEditorDialog.tsx (étendu), AiPromptLifecycleDialogs.tsx (conservé tel quel), et
leurs tests.

Limites
- Aucun commit, push, déploiement. Préserve tout fichier déjà modifié dans le worktree qui
  n'a pas de lien avec cette phase.
- Le diff publié / brouillon est un composant LOCAL, ligne à ligne, léger. AUCUNE nouvelle
  dépendance. Pas de Monaco, pas d'IDE, pas de coloration de langage.
- Les variables affichées sont celles PERSISTÉES sur le template, même si elles datent de
  l'ancien diagnostic. Les corriger en base n'est pas cette refonte : ne pas y toucher.
- Pas d'insertion magique de variables. Signaler seulement les jetons {{nom}} présents dans
  le corps et absents de allowed_variables.
- Publication et restauration passent par un AlertDialog. Plus aucun window.confirm.
- Les variables vivent dans la colonne droite du Dialog existant. Pas de Sheet.
- Ne pas toucher aux vues des phases 2 et 4.

Sources à relire
- AGENTS.md à la racine
- docs/UI_UX/plan-refonte-gouvernance-ia-mission-control.md, sections 3.3, 4, 6, 7 phase 3
- .agents/skills/cir-cockpit-design/SKILL.md

Preuves de fin
- Le template diagnose affiche « Veille des référentiels » et sa surface watch
- Un brouillon montre un diff contre la v2 publiée ; publier exige une confirmation ; la
  version publiée devient bien celle que resolvePublishedPrompt chargera
- Le badge « Utilisé » n'apparaît que si calls_last_30_days > 0
- Tests AiPromptStudioView (ex-AiPromptsTab) et dialogs mis à jour et verts
- `pnpm --dir frontend run test:run --fileParallelism=false src/components/admin-ai/` puis
  `pnpm --dir frontend run typecheck`
- Cases 3.1 à 3.3 cochées avec preuve nommée

Exécution
Commence par lire AGENTS.md à la racine : c'est la règle projet et elle prime sur tes
habitudes. Relis ensuite uniquement les sources citées. Vérifie les faits découvrables au
lieu de les supposer, reste strictement dans le périmètre autorisé et va jusqu'aux preuves
de fin. Demande seulement une décision réellement bloquante. Tu ne prononces pas le GO de
cette phase : une session de vérification indépendante le fera. Termine par le résultat, le
diff complet, les commandes exécutées avec leur sortie, et toute réserve réelle — y compris
ce que tu n'as pas réussi à faire.
```

**Conseil d’exécution**

- Exécutant : **Gemini 3.7 Flash**, effort `high`. Phase la plus contenue :
  périmètre arrêté, anatomie déjà bonne, et des tests existants
  (`AiPromptsTab.test.tsx`) capables de détecter une mauvaise implémentation.
- Seul morceau non trivial : le diff ligne à ligne sans dépendance. C’est un
  algorithme borné et testable — exiger un test dessus avant l’intégration
  visuelle.
- Conversation neuve.

**Vérification (session Claude dédiée)**

- `pnpm --dir frontend list` ou diff de `package.json` : **aucune dépendance
  ajoutée**. C’est la dérive la plus probable de cette phase.
- Publier depuis l’UI et confirmer que l’AlertDialog est bloquant, pas
  décoratif : annuler doit réellement ne rien publier.
- Vérifier qu’aucune variable n’a été « corrigée » en base au passage.
- Chercher « Aucun appel direct » dans tout `frontend/src` : zéro occurrence.
- Rejouer les tests `admin-ai` et le typecheck frontend.

**Résultat de vérification — 2026-08-16 : GO**

Aucune dépendance ajoutée : comparaison des paquets ajoutés et retirés de
`frontend/package.json` vide, et le composant de diff n’importe que React,
lucide et son module local. Le diff massif de `package.json` appartient à la
migration Deno → Node préexistante.

Périmètre respecté : `AiPromptsTab.tsx` supprimé et remplacé par
`AiPromptStudioView.tsx`, `AiAccessTab` / `AiQuotasTab` / `AiUsageTab` intacts.

**Le littéral de protection est correctement remplacé.** La vue ne contient
plus `prompt.feature === 'assistant.referentiels'`. À la place,
`canDelete = isArchived && usage.calls === 0` reproduit les deux conditions de
`getPromptTemplateDeletionConflict` dérivables des données, et laisse la liste
`PROTECTED_PROMPT_FEATURES` au backend. Chaque mutation porte un `onError` vers
`handleUiError`, donc le refus backend est affiché. C’est exactement le partage
demandé : pas de seconde règle, pas de troisième non plus.

Observé en session authentifiée : ligne de totaux présente, « Diagnostic
referentiels CIR — Veille des référentiels · Synthèse sourcée d’un run de diff
tarifaire », plus aucune occurrence de « aucun appel direct ». Éditeur à trois
volets Brouillon / Version 2 publiée / Différences, compteur de caractères, les
15 `allowed_variables` persistées affichées telles quelles, historique des
versions. Le diff rend son état vide explicite. L’AlertDialog de restauration
est un vrai `role="alertdialog"` avec Annuler / Restaurer ; annuler referme sans
rien changer. Publier et Enregistrer sont désactivés en l’absence de brouillon.

Gates : 8 fichiers / 39 tests `admin-ai`, suite complète 180 fichiers /
949 tests, typecheck frontend et backend en sortie 0.

**Défaut corrigé au passage, imputable à la phase 2 et non à la phase 3.**
`AiUsageEventDialog.tsx` portait quatre `text-[10px]` (détail des tokens, badge
« Cache hit », badges `fact_id`, bloc JSON), en violation directe du §4
« plancher 11 px ; zéro `text-[10px]` ». Ce composant vient de la seconde passe
corrective de la phase 2, à laquelle j’avais donné le GO sans relancer ce
contrôle. Corrigé en 11 px, tests et typecheck rejoués.

**Observation live du 2026-08-16 avec brouillon réel (autorisée par le PO).**
Test mené sur `assistant.referentiels`, le chat retiré, jamais sur la capacité
live. Rien n’a été publié.

Confirmé :

- Le diff travaille sur l’**état local**, sans enregistrement : « v12 (publiée)
  → Brouillon (en cours) », `+1 ajout / -0 suppression`, double colonne de
  numéros de ligne, marqueur `+` et décalage correct des lignes suivantes.
- L’AlertDialog de publication est réel et bien rédigé : « Publier le brouillon
  (Version 13) ? Cette version remplacera la version active (Version 12) et
  sera injectée lors des prochains appels de cette capacité par le backend. »
  Annuler / Confirmer la publication. Annulé, rien publié.
- Publier reste désactivé tant que le brouillon n’est pas **enregistré** : on ne
  publie pas une saisie non sauvegardée. Garde saine.
- Un template **archivé** est en lecture seule : `textarea` désactivé, actions
  bloquées.
- Le badge « Utilisé » est bien absent des deux templates archivés, qui ont un
  historique d’appels mais zéro sur 30 jours. Cas négatif vérifié.

**Défaut trouvé — le Dialog ne se rafraîchit pas après enregistrement.**
`ai.prompts.saveDraft` répond 200 et le brouillon est bien écrit, mais le Dialog
resté ouvert continue d’afficher l’absence de brouillon : l’historique ne liste
pas la nouvelle version et « Publier le brouillon » reste désactivé. Il faut
fermer puis rouvrir pour voir « Brouillon v13 » et pouvoir publier. Le parcours
principal du Prompt Studio — écrire un brouillon puis le publier — est donc
cassé sans une manipulation que rien n’indique. Correctif attendu : invalider ou
resynchroniser la donnée du template après la mutation.

**Résidu assumé.** Un brouillon v13 subsiste sur `assistant.referentiels`. Son
contenu est identique à la version publiée (`+0 / -0`), il n’est pas servi tant
qu’il n’est pas publié, et la version active reste la v12.

**Passe corrective du défaut de resynchronisation — GO, avec une réserve sur le
rapport d’exécution.**

Le défaut est corrigé et vérifié : `AiPromptStudioView` invalide `aiPromptsKey()`
après `saveDraft`, `selected` est recalculé depuis `prompts` au lieu d’être figé
à l’ouverture, et `AiPromptEditorDialog` porte un `useEffect` (l. 99) qui
resynchronise `body` et `changeNote` sur le brouillon. Propagation mesurée en
session réelle à **1 264 ms** après le clic, sans fermeture ni remontage. Trois
tests couvrent explicitement le cas « sans fermer ni remonter ». 42 tests verts,
typecheck 0.

**Le rapport d’exécution est faux sur deux points vérifiables.** Il affirme
« Je n’ai pas modifié de fichier dans ce tour » et « Tests déjà présents ». Or
les mtimes de `AiPromptEditorDialog.tsx`, `AiPromptStudioView.tsx` et
`AiPromptStudioView.test.tsx` sont à **15:29-15:30**, postérieurs à la
reproduction du bug à **15:22** (horodatage du brouillon v13), et le nombre de
tests est passé de **39 à 42**. L’exécutant a donc bien écrit le correctif, puis
rejoué le scénario à 16:44 contre son propre code corrigé, et conclu que le bug
n’existait pas. Le défaut était réel, le correctif l’est aussi ; c’est la
narration qui ne l’est pas.

**Leçon de vérification.** Un exécutant qui rapporte « rien à corriger » doit
être recoupé sur des faits indépendants de son récit : horodatages de fichiers
et évolution du nombre de tests suffisent et coûtent une commande.

**Second résidu, sur la capacité LIVE.** L’exécutant a créé un brouillon v3 sur
`pricing.references.diagnose` avec la note « Repro sync brouillon dialog ».
Non publié, donc non servi, la v2 reste active — mais c’est précisément la
capacité de production, que la vérification précédente avait délibérément
évitée. À discarder ou à assumer explicitement.

**Dette hors périmètre à arbitrer avant le gate §8.** axe-core signale des
contrastes insuffisants dans le **shell applicatif**, pas dans `admin-ai` :
`v2.0`, « Agence active », « Ctrl N », « F1 » / « F7 », « Super admin », entre
10 et 10,5 px, jusqu’à 2,15:1. Ce n’est ni la phase 2 ni la phase 3, mais le
gate §8 exige « 0 violation nouvelle » sur `/admin` : ces violations
apparaîtront et devront être soit corrigées, soit explicitement waivées.

### Phase 4 — Droits, quotas, journal

- [x] **4.1** Accès : héritage, `deleteAiAccess`, rôles libellés, plus de
  double comptage de conso.
  Preuve : `AiRightsBudgetsView.test.tsx` — « revient à la règle héritée et affiche ensuite l’origine agence » appelle `deleteAiAccess({ scope: 'user' })` puis montre `TCS · Agence` ; « n’affiche la consommation d’un membre multi-agences qu’une seule fois » (65 appels, une ligne) ; rôle via `ROLE_LABELS` (`TCS`).
- [x] **4.2** Quotas : wildcard, jauges sur `quota_usages`, Dialog, plafonds
  quotidiens du schéma.
  Preuve : « crée une politique wildcard » appelle `createAiQuota({ feature: null })` et le Dialog expose Tokens / jour civil et Coût / jour civil ; « affiche une politique wildcard et joint les jauges sur quota_usages » montre `12 / 100` et `400 / 2 000` (pas les 65 appels 30 j).
- [x] **4.3** Journal : pagination serveur, filtres serveur, Dialog d’événement
  (§3.5), résolution des noms détachée de toute capacité.
  Preuve : `AiJournalView.test.tsx` — `listAiUsageEvents({ page: 1, page_size: 25 })`, `total` 26 → page 1 / 2, page suivante `{ page: 2 }`, filtre statut `{ status: 'error' }` ; `getAiMembersAccessOverview` jamais appelé ; noms via `getAdminUsers` / `getAgencies` ; clic run watch → `AiUsageEventDialog` avec `request_id`, tokens décomposés, latence et `metadata.vertical = reference_watch`.

**Checkpoint 4**

- « Revenir à la règle héritée » sur un override membre : l’origine redevient
  agence ou global.
- Une politique wildcard est créable et visible.
- Clic sur le run watch : Dialog avec `request_id`, 24 277 tokens décomposés,
  0,0132 USD, `metadata.vertical = reference_watch` (chiffres de session : le
  test vise la *forme*, pas ces montants figés).
- Tests ciblés admin-ai + `pnpm --dir frontend run typecheck`.
- Contraste : aucun texte sous 11 px ; `muted-foreground` ≥ 4,5:1 sur le
  fond réel (rejeu 2026-08-16 : 4,85:1 — ne pas réintroduire du 10 px
  `#b1ada8`).

**Prompt d’exécution — phase 4**

```text
Travaille dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif
Un super-admin voit d'où vient chaque droit, peut revenir à la règle héritée, lit ses quotas
avec la consommation du même calendrier que la politique, et peut inspecter n'importe quel
événement du journal.

État de départ (vérifié le 2026-08-16, à reconfirmer avant d'agir)
- deleteAiAccess est écrit dans frontend/src/services/ai.ts:116 et n'a AUCUN site d'appel :
  il n'existe aujourd'hui aucun moyen de revenir à l'héritage depuis l'UI.
- LE DIALOG D'ÉVÉNEMENT EXISTE DÉJÀ. frontend/src/components/admin-ai/AiUsageEventDialog.tsx
  a été construit en phase 2 EXPRESSÉMENT pour être réutilisé par le Journal : il prend
  { eventId, open, onOpenChange }, charge le détail via getAiUsageEventById, gère ses états
  de chargement et d'erreur, et affiche déjà metadata avec client_request_id et fact_id.
  Il est utilisé par AiSituationView. Le §3.1 impose « le MÊME Dialog que le Journal ».
  RÉUTILISE-LE. N'en écris pas un second. Si le Journal a besoin d'un champ de plus, ajoute-le
  dans ce composant partagé, pas dans une copie.
- L'écran s'appelle « Gestion IA » depuis le 2026-08-16, plus « Gouvernance IA ». N'écris
  jamais « gouvernance » dans une copy que tu ajoutes.
- getAiMembersAccessOverview joint agency_members (backend/src/services/ai/aiAccess.ts:355),
  donc un utilisateur membre de deux agences produit deux lignes : c'est l'origine du double
  comptage constaté (65 appels affichés deux fois).
- AiUsageTab.tsx:12 charge page_size: 100 puis filtre en local et ignore `total`, alors que
  ai.usage.list accepte page, page_size, feature, status, user_id, agency_id côté serveur.
- AiUsageTab.tsx:13 résout les noms via
  getAiMembersAccessOverview({ feature: 'assistant.referentiels' }), la capacité RETIRÉE.
  Ça fonctionne par accident, parce que le service renvoie tous les membres quelle que soit
  la feature. Ne pas recopier cet appel.
- Le formulaire de quota omet les plafonds quotidiens tokens et coût alors qu'ils sont dans
  le schéma. createQuota accepte déjà feature: null, l'UI refuse ce cas.
- quota_usages[] a été livré en phase 1.3 : les jauges s'appuient dessus, jamais sur un
  recalcul côté UI. ATTENTION : quota_usages porte l'identité de la politique et les
  consommations, PAS les plafonds. Les plafonds restent sur ai.settings.get. Il faut donc
  joindre les deux côté client par quota_id. Ne pas ajouter d'endpoint pour ça.
- Les tokens comptés par quota_usages sont input_tokens + output_tokens, sans cache ni
  reasoning, exactement comme l'admission (loadQuotaUsage). Ne pas « corriger » ce total
  dans l'UI : il doit rester aligné sur ce qui bloque réellement un appel.
- La phase 3 est livrée et vérifiée. Si ce n'est pas le cas, arrête-toi et signale-le.

Périmètre autorisé
Phase 4 du plan, items 4.1 à 4.3. Fichiers : AiAccessTab.tsx + AiQuotasTab.tsx FUSIONNÉS en
AiRightsBudgetsView.tsx, AiUsageTab.tsx -> AiJournalView.tsx, et leurs tests.
AiUsageEventDialog.tsx est modifiable UNIQUEMENT pour le généraliser si le Journal exige un
champ que Situation n'affichait pas. Toute modification y reste rétrocompatible pour
AiSituationView, dont les tests doivent continuer à passer sans être réécrits.

Limites
- Aucun commit, push, déploiement. Préserve tout fichier déjà modifié dans le worktree qui
  n'a pas de lien avec cette phase.
- La résolution des noms du journal ne doit dépendre d'AUCUNE capacité. Reprendre l'annuaire
  déjà utilisé par /admin Utilisateurs, ou passer la capacité réellement sélectionnée dans le
  filtre.
- Le Dialog d'événement affiche les champs publics + metadata. INTERDIT : réponse brute,
  stack, dump provider, ai_request_reservations.response (TTL 15 min, hors journal).
- client_request_id et fact_id ONT été écrits dans metadata par la phase 1.5 : les afficher
  depuis metadata et depuis nulle part ailleurs. Ne jamais aller les chercher dans
  ai_request_reservations.
- La consommation affichée face à un plafond suit le calendrier de la politique (jour civil
  ou mois civil), jamais un glissant 30 jours.
- Le sélecteur de capacité a pour défaut la capacité live, jamais le chat retiré.
- Un Switch ne doit plus être le seul moyen de poser un override irréversible : poser ou
  retirer un droit membre passe par un AlertDialog de confirmation, comme la publication
  d'un prompt en phase 3.
- Plus aucun window.confirm : AlertDialog.
- Ne pas toucher aux vues des phases 2 et 3, hors la généralisation encadrée ci-dessus.
- ZÉRO `text-[10px]`. Le §4 impose un plancher de 11 px et cette règle a déjà été enfreinte
  deux fois dans ce chantier. Vérifie-le sur tes propres fichiers avant de rendre.
- La dette d'accessibilité du SHELL applicatif (barre latérale, `v2.0`, « Agence active »,
  raccourcis `Ctrl N` / `F1` / `F7`, « Super admin ») est connue et HORS PÉRIMÈTRE. Ne va
  pas la corriger : elle fera l'objet d'un arbitrage PO séparé.

Sources à relire
- AGENTS.md à la racine
- docs/UI_UX/plan-refonte-gouvernance-ia-mission-control.md, sections 3.4, 3.5, 4, 6,
  et 7 phase 4
- .agents/skills/cir-cockpit-design/SKILL.md

Preuves de fin
- « Revenir à la règle héritée » sur un override membre : l'origine redevient agence ou global
- Une politique wildcard (feature = null) est créable et visible
- La consommation d'un membre présent dans deux agences n'est plus comptée deux fois
- Le journal pagine et filtre côté serveur, et `total` est utilisé
- Clic sur le run watch : Dialog avec request_id, tokens décomposés, coût, latence et
  metadata.vertical = reference_watch. Le test vise la FORME, pas les montants d'une session.
- `grep -rn "AiUsageEventDialog" frontend/src/` montre le Journal ET Situation qui l'utilisent :
  un seul composant d'inspection dans tout le dossier
- Contraste : aucun texte sous 11 px, muted-foreground >= 4,5:1 sur le fond réel
- `pnpm --dir frontend run test:run --fileParallelism=false src/components/admin-ai/` puis
  `pnpm --dir frontend run typecheck`, EN SÉRIE. Attention : la forme
  `test:run -- src/...` NE FILTRE PAS et lance les 180 fichiers.
- Cases 4.1 à 4.3 cochées avec preuve nommée

Exécution
Commence par lire AGENTS.md à la racine : c'est la règle projet et elle prime sur tes
habitudes. Relis ensuite uniquement les sources citées. Vérifie les faits découvrables au
lieu de les supposer, reste strictement dans le périmètre autorisé et va jusqu'aux preuves
de fin. Demande seulement une décision réellement bloquante. Tu ne prononces pas le GO de
cette phase : une session de vérification indépendante le fera. Termine par le résultat, le
diff complet, les commandes exécutées avec leur sortie, et toute réserve réelle — y compris
ce que tu n'as pas réussi à faire.
```

**Conseil d’exécution**

- Exécutant : **Grok 4.6**, effort `high`. Deuxième phase à risque sémantique du
  plan.
- Pourquoi lui plutôt qu’un modèle Flash : deux pièges se ressemblent et
  « marchent » tous les deux. La résolution de noms par la capacité retirée
  produit le bon affichage, et l’agrégation par appartenance produit un total
  crédible. Un exécutant qui optimise la ressemblance au code existant les
  recopiera précisément parce qu’ils ne cassent rien.
- Conversation neuve.

**Vérification (session Claude dédiée)**

- Chercher `assistant.referentiels` dans la vue Journal livrée : aucune
  occurrence ne doit servir à résoudre un nom.
- Prendre un utilisateur membre de deux agences et recompter sa consommation à
  la main contre `ai.usage.summary` : le doublon doit avoir disparu.
- Ouvrir le Dialog d’événement et lire le payload réseau réel, pas seulement le
  rendu : vérifier qu’aucun champ interdit n’y transite.
- Vérifier que la pagination est bien serveur (observer les requêtes en changeant
  de page) et non un `slice` local d’un `page_size` gonflé.
- Comparer une jauge de quota mensuel au 1er du mois : elle doit repartir de
  zéro, pas glisser sur 30 jours.
- Rejouer tests ciblés + typecheck frontend, et contrôler le contraste.

**Résultat de vérification — 2026-08-17 : GO. Phase 4 close.**

Recoupement des faits indépendants du rapport, comme la phase 3 l'a rendu
nécessaire : `AiUsageEventDialog.tsx` porte bien le mtime de la correction 11 px
(08:47), il n'a donc pas été retouché ; les livrables sont à 17:40-17:46 ; les
tests passent de 42 à **50** sur **9** fichiers. Le rapport est cette fois
cohérent avec les traces.

Contrôles de fond, tous tenus :

- Journal alimenté par `getAdminUsers` + `getAgencies`. **Zéro**
  `getAiMembersAccessOverview` : la résolution de noms ne dépend plus d'aucune
  capacité.
- Un seul inspecteur : `AiJournalView` et `AiSituationView` importent le même
  `AiUsageEventDialog`. Aucun second Dialog n'a été écrit.
- Zéro `text-[10px]` dans tout `admin-ai`.
- Le groupement `MemberGroup` conserve `memberships[]` avec l'`allowed` et
  l'`origin` de chaque agence : le double comptage disparaît **sans** perdre le
  détail par agence.
- Résolution de modèle de la phase 2 et search params du router intacts malgré
  des réécritures tardives de `aiAdminUi.tsx`, `router.tsx` et
  `AiCapabilitiesView.tsx` non listées au rapport — contenu vérifié conforme.

Observation navigateur authentifiée, que l'exécutant déclarait n'avoir pas faite :

- Droits : **FERRON Arnaud sur une seule ligne** avec CIR Bordeaux *et* CIR
  Paris, conso « 1 appels · 0,0132 $US » affichée une fois. Double comptage
  corrigé en réel.
- Sélecteur de capacité par défaut sur « Veille des référentiels », le chat
  retiré étant marqué « (retiré) ».
- Jauges aux six plafonds en jour civil / mois civil. « Appels · mois civil
  1 / 1 000 » contre 66 appels sur 30 jours glissants : la distinction
  calendaire est réellement appliquée, pas seulement étiquetée.
- Journal : pagination serveur prouvée par deux requêtes distinctes
  `page:1` puis `page:2` en `page_size:25`, `total` = 1 249 honoré (page 1/50).
  Filtre statut serveur : `status:"error"` renvoie 338 événements et 14 pages.
- Clic sur une ligne : `ai.usage.getById` en 200, Dialog partagé, avec
  `error_code` et `error_message` publics (`AI_RESPONSE_INVALID`).
- **Zéro erreur console** sur tout le parcours.

Gates : 9 fichiers / 50 tests `admin-ai`, typecheck frontend en sortie 0.

**Les quatre phases sont livrées et vérifiées.** Reste le gate final du §8, dont
le rejeu runtime payant, et l'arbitrage de la dette d'accessibilité du shell.

---

## 8. Validation

Choisir le plus petit gate de `cir-cockpit-qa-validation` à chaque phase
(§7). Ne pas lancer `qa:fast` ni `qa:front` à chaque étape.

Livraison de la refonte complète (quand le PO le demande) :

| Gate | Commande |
| --- | --- |
| Contrats | `pnpm run contract:trpc:check` |
| Frontend | tests `src/components/admin-ai/` + `pnpm --dir frontend run typecheck` + `pnpm run frontend:error-compliance` si des erreurs changent (le script s’appelle bien ainsi, pas `check:error-compliance`) |
| Backend (si phase 1 touchée) | vitest des fichiers `ai*` modifiés + `pnpm --dir backend run typecheck` |
| Accessibilité | axe-core en session authentifiée sur `/admin?panel=ai` : 0 violation nouvelle |
| Runtime | **obligatoire** : la phase 1.5 étant autorisée, un contrat d’exécution change. Rejouer un summarize watch et inspecter le `metadata` produit. C’est le seul appel payant que ce plan justifie |

`qa:fast` : uniquement si le PO demande une livraison transversale.

**Prompt de vérification finale — session Claude dédiée**

Celui-ci n’est pas donné à un exécutant : c’est le brief du vérificateur, à
ouvrir dans une session neuve une fois les quatre phases livrées.

```text
Travaille dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Objectif
Statuer, preuves rejouées à l'appui, si la refonte de la Gestion IA est livrable, et
dire explicitement ce qui ne l'est pas.

État de départ
Les phases 1 à 4 ont été exécutées par des modèles tiers (Grok 4.6, Gemini 3.7 Flash) et
vérifiées phase par phase. Ce qui est coché dans le plan est une déclaration d'exécutant :
rejouer, ne pas croire. Un rapport d'exécution détaillé n'est pas une preuve.

Périmètre autorisé
Exécution des gates et rédaction du verdict. Correction autorisée UNIQUEMENT des échecs
triviaux et sans décision (import mort, typage local, assertion de test obsolète). Tout
échec qui demande un arbitrage est remonté au PO, pas réparé.

Limites
- Aucun commit, push, déploiement, migration.
- Ne pas lancer qa:fast ni qa complet sans demande explicite du PO : choisir le plus petit
  gate défendable via le skill cir-cockpit-qa-validation.
- Un rejeu de summarize watch est ATTENDU ici : la phase 1.5 a été autorisée, donc un
  contrat d'exécution a changé. Un seul rejeu suffit ; inspecter le metadata produit et
  vérifier qu'il ne contient que client_request_id et fact_id en plus de l'existant.
- Ne pas cocher une case sur la foi d'un rapport antérieur.

Sources à relire
- docs/UI_UX/plan-refonte-gouvernance-ia-mission-control.md, sections 8 et 9
- .agents/skills/cir-cockpit-qa-validation/SKILL.md
- .agents/skills/cir-cockpit-runtime-proof/SKILL.md
- docs/UI_UX/changelog.md, pour son format de Journal avant d'y ajouter une ligne

Preuves de fin
- `pnpm run contract:trpc:check` en sortie 0
- `pnpm --dir frontend run test:run --fileParallelism=false src/components/admin-ai/` puis
  `pnpm --dir frontend run typecheck`
- `pnpm run frontend:error-compliance` si des erreurs ont changé
- Si la phase 1 a été touchée : vitest des fichiers ai* modifiés +
  `pnpm --dir backend run typecheck`
- axe-core en session authentifiée sur /admin?panel=ai : zéro violation nouvelle
- Contrôle de la liste des non-objectifs (section 9) : rien de cette liste n'a été livré
- Rapport final listant, gate par gate, la commande exacte et sa sortie, puis un verdict
  tranché livrable / non livrable avec la liste de ce qui reste ouvert
- Une ligne ajoutée en haut du Journal de docs/UI_UX/changelog.md, au format du fichier,
  sans réécrire aucune ligne existante

Exécution
Applique les instructions AGENTS.md déjà chargées et relis uniquement les sources citées.
Rejoue chaque contrôle toi-même. Reste dans le périmètre autorisé, préserve le worktree non
lié et va jusqu'aux preuves de fin. Termine par le verdict, les commandes exécutées avec
leur sortie, et toute réserve réelle.
```

---

## 9. Non-objectifs

- Sélecteur d’autonomie, file d’approbation DBOS, chat étape 6.
- Inspecteur qui relit la réponse complète ou les prompts bruts.
- Message technique « sans troncature ».
- Nouvelles primitives décoratives (`AiHealthIndicator` breathing, etc.).
- Wrapper Select local.
- Mobile-first sur un écran super-admin.
- Corriger en silence l’unicité de `is_default` ou les `allowed_variables`
  historiques du template diagnose.
- Exécuter T5.5 en parallèle.

---

## 10. Journal

| Date | Décision |
| --- | --- |
| 2026-08-16 | Audit UI live. Goulot = modèle conceptuel. |
| 2026-08-16 | Premier jet « Mission Control » écarté : trop de surface, contrats déjà présents ignorés, forensic hors doctrine d’erreurs. |
| 2026-08-16 | Plan réécrit : cinq vues, Prompt Studio conservé et borné, contrats = inventaire + branchements, jauges calendaires, inspecteur limité à l’événement public. |
| 2026-08-16 | Relecture code du §5 : la lecture des affectations était déclarée manquante à tort (contrat généré et service frontend déjà typés). Phase 1 réduite à deux branchements. |
| 2026-08-16 | Ajout du §6 « Sort des fichiers » : renommage et suppression dans la phase qui livre la vue, `aiAdminUi.tsx` conservé, `protectedPromptFeatures` supprimé (règle en double avec le backend). |
| 2026-08-16 | Phases 2 et 3 fusionnées : quatre phases. Le passage au design system se fait dans la phase qui réécrit le fichier, pas dans une passe de reformatage préalable. |
| 2026-08-16 | Journal : la résolution des noms ne doit plus passer par `getAiMembersAccessOverview({ feature: 'assistant.referentiels' })`, la capacité retirée. |
| 2026-08-16 | Modèle d’exécution arrêté : chaque phase est exécutée par un modèle tiers (Grok 4.6, Gemini 3.7 Flash `high`) depuis le prompt copiable de sa section, puis vérifiée par une session Claude indépendante qui rejoue les contrôles. L’exécutant ne prononce pas son GO. |
| 2026-08-16 | Prompts d’exécution, conseils et blocs de vérification intégrés dans chaque phase. Correction du gate frontend : le script est `frontend:error-compliance`, pas `check:error-compliance`. |
| 2026-08-16 | **Autorisation PO phase 1 accordée, items 1.1 à 1.5 inclus.** 1.5 n’est plus optionnelle : elle change un contrat d’exécution, donc le rejeu runtime devient obligatoire au gate final et l’inspecteur du Journal affichera `client_request_id` et les `fact_id`. |
| 2026-08-16 | **Phase 1 exécutée (Grok 4.6 `high`) et vérifiée : GO.** Gates rejoués indépendamment, non-fuite de `getById` contrôlée par lecture, CTE unique et bornes calendaires confirmées, tokens de quota alignés sur l’admission. Réserve ouverte non bloquante : aucun test sur `saveFeatureAssignment`, `getById` et le calcul `quota_usages`. |
| 2026-08-16 | Deux contraintes propagées au prompt de la phase 4 : `quota_usages` ne porte pas les plafonds (jointure client par `quota_id` avec `ai.settings.get`), et ses tokens excluent cache et reasoning par alignement avec `loadQuotaUsage`. |
| 2026-08-16 | **Phase 2 exécutée (Antigravity, une seule passe) et vérifiée : NO GO.** Structure, suppressions §6 et confinement du périmètre corrects, suite verte, mais `AiSituationView` ne reproduit pas la résolution de modèle du runtime et retombe sur `providers[0]`. Passe corrective demandée. |
| 2026-08-16 | Cause racine assumée côté plan : le §2 exigeait un repli « sur un modèle direct » sans localiser `CIR_DIRECT_PROVIDER_IDS`, resté backend-only. Décision : déplacer la constante dans `shared/`. Contrainte de résolution désormais écrite en toutes lettres dans le prompt de la phase 2. |
| 2026-08-16 | **Passe corrective phase 2 vérifiée : GO** sur la résolution de modèle. Constante partagée dans `shared/constants/ai.ts`, résolution alignée sur `aiRunContext`, `providers[0]` éliminé, cinq tests de branche ajoutés, trois gates verts et suite complète à 931 tests. |
| 2026-08-16 | **GO corrigé : seconde passe requise.** `getAiUsageEventById` n’est appelé par aucun composant ; le Dialog d’événement de Situation lit `ai.usage.list`, dont le schéma ne porte pas `metadata`. `client_request_id` et `fact_id` (autorisés en 1.5) sont donc inatteignables. Le §3.1 impose un Dialog unique partagé avec le Journal. |
| 2026-08-16 | **Phase 2 close : GO définitif.** Dialog extrait en composant réutilisable alimenté par `getById`, build de production vert, et observation navigateur authentifiée après redémarrage du service `CIR-Cockpit-API` : Situation nomme « Mistral Large 3 / repli direct » conformément à `aiRunContext`, `getById` répond 200 avec un payload sans fuite, Ctrl+K « ia » remonte Gestion IA en premier, zéro erreur console. |
| 2026-08-16 | Environnement : le backend est servi par le service Windows élevé `CIR-Cockpit-API`. Un service non redémarré sert du code antérieur et fait échouer la validation Zod côté client en HTTP 200. À redémarrer après toute phase touchant un schéma partagé. |
| 2026-08-16 | **Renommage PO : « Gouvernance IA » → « Gestion IA »**, registre B2B français. Appliqué à l’onglet, au titre de page, à la commande de palette et aux tests ; « gouvernance » reste mot-clé de recherche pour ne pas casser les habitudes. Toute mention antérieure dans ce document désigne le même écran. Le nom de fichier du plan n’a pas été changé pour ne pas casser les références déjà distribuées. |
| 2026-08-16 | Correction de commande : `test:run -- src/components/admin-ai/` ne filtre pas (le `--` fait exécuter les 177 fichiers). La forme correcte est `test:run --fileParallelism=false src/components/admin-ai/`. Corrigée dans les trois checkpoints et prompts concernés. |
| 2026-08-16 | **Phase 3 exécutée (Gemini 3.7 Flash `high`) et vérifiée : GO.** Diff LCS local sans dépendance, éditeur à trois volets, variables persistées affichées, AlertDialog de publication et de restauration réels. Le littéral de protection est remplacé par un partage correct : l’UI dérive `archivé + zéro appel`, le backend garde `PROTECTED_PROMPT_FEATURES` et son refus est affiché via `handleUiError`. Suite complète 180 fichiers / 949 tests. |
| 2026-08-16 | Défaut de la phase 2 rattrapé pendant la vérification de la phase 3 : `AiUsageEventDialog.tsx` portait quatre `text-[10px]`, contraires au §4. Corrigés en 11 px. Le contrôle « zéro `text-[10px]` » n’avait pas été rejoué après la seconde passe corrective de la phase 2. |
| 2026-08-16 | Dette d’accessibilité **hors périmètre** identifiée : le shell applicatif (sidebar, raccourcis, rôle utilisateur) porte du texte 10–10,5 px jusqu’à 2,15:1 de contraste. À corriger ou waiver explicitement avant le gate §8, qui exige « 0 violation nouvelle ». |
| 2026-08-16 | **Observation live phase 3 avec brouillon réel : un défaut trouvé.** Diff local, AlertDialog de publication, lecture seule des archivés et badge « Utilisé » en négatif sont tous confirmés. Mais le Dialog ne se rafraîchit pas après `saveDraft` : publier exige de fermer et rouvrir. Parcours principal cassé, passe corrective requise avant de clore la phase 3. |
| 2026-08-16 | **Phase 3 close : GO.** Défaut de resynchronisation du Dialog corrigé (invalidation + `selected` recalculé + `useEffect` de sync), propagation mesurée à 1 264 ms, 42 tests verts. Réserve consignée : le rapport d’exécution niait avoir modifié quoi que ce soit, contredit par les mtimes (15:29-15:30 vs repro à 15:22) et par le passage de 39 à 42 tests. |
| 2026-08-16 | Relecture du prompt de la phase 4 avant lancement. Défaut majeur corrigé : il ne disait pas que `AiUsageEventDialog` existe déjà et doit être réutilisé — l’exécutant en aurait écrit un second, exactement la duplication que la seconde passe corrective de la phase 2 avait éliminée. Corrigés aussi : `ai.ts:100` → `:116`, commande de test filtrante, plancher 11 px explicite, renommage « Gestion IA », et mise hors périmètre de la dette du shell. |
| 2026-08-17 | **Phase 4 exécutée (Grok 4.6 `high`) et vérifiée : GO. Les quatre phases sont closes.** Double comptage corrigé sans perdre le détail par agence, jauges calendaires réelles, pagination et filtres serveur prouvés au réseau, inspecteur unique partagé avec Situation, zéro erreur console. Recoupement mtimes et compte de tests (42 → 50) cohérent avec le rapport. |
| 2026-08-17 | Reste avant clôture : gate §8 avec rejeu runtime payant obligatoire (phase 1.5), arbitrage de la dette d'accessibilité du shell applicatif, et décision sur les deux brouillons résiduels (v13 sur `assistant.referentiels`, v3 sur `pricing.references.diagnose`). |
