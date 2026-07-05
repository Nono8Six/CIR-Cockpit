# Refonte « Triage » — Page Référentiels CIR

> Plan d'exécution en 6 étapes indépendantes. Chaque étape contient un prompt autonome,
> conçu pour être collé dans une **nouvelle conversation sans contexte**. L'IA exécutante
> doit cocher ses checkpoints et remplir le Journal de bord (section 8) à la fin de sa session.
>
> Statut global : `EN ATTENTE` → passer à `EN COURS` dès la première session, `TERMINÉ` après l'étape 5.

---

## 1. Contexte et état des lieux

**Page cible** : `/remises/referentiels` — composant [PricingReferencesPage.tsx](../frontend/src/components/pricing-references/PricingReferencesPage.tsx) et son dossier `frontend/src/components/pricing-references/`.

**Déjà livré** (ne pas refaire, ne pas régresser) :
- Endpoints d'agrégation serveur `pricing.references.anomalies.summary` et `classification.listAll`, consommés en React Query. Plus aucun fetch multi-pages côté client.
- Onglet actif synchronisé dans l'URL (`?tab=`) : schéma dans [pricingReferentialsSearch.ts](../frontend/src/app/pricingReferentialsSearch.ts), pont dans [AppMainTabContent.tsx](../frontend/src/components/app-main/AppMainTabContent.tsx). La page reçoit `routeTab`/`onRouteTabChange` en props et reste testable sans RouterProvider.
- 4 onglets (Segments par défaut, Classification, Anomalies, Imports), ligne de statut compacte, CTA « Importer » unique en menu, tokens `surface-1`/`surface-3`, tout en `stone-*` (zéro `slate-*`).

**Ce qui reste insatisfaisant** (diagnostic validé avec le product owner) :
- Trois surfaces déconnectées (header, toolbar, table) au lieu d'une surface de travail unifiée.
- Rail d'onglets en pill noire avec icônes : daté, trois langages visuels concurrents.
- Table : trop de colonnes en mono, headers mono, texture « terminal ».
- Anomalies en miller columns : 2 clics avant de voir la première anomalie, boîtes bordées bruyantes. **À refaire de zéro.**
- Plan de correction : dialog complexe qui paraphrase du déterministe. **À supprimer**, remplacé par un export XLSX annoté.
- Imports : carte snapshot + table déconnectées. À refondre en liste chronologique.
- Vue Escalier de la classification : mêmes boîtes bordées que les anomalies. À refaire dans le langage cible.

---

## 2. Décisions actées (verrouillées — ne pas re-débattre)

| # | Décision |
|---|---|
| D1 | Anomalies : liste **groupée par type** par défaut (le type porte l'action de correction), dégroupable. Facettes multi-sélection Sévérité / Type / Marque. |
| D2 | Tous les détails (anomalie, segment, import) s'ouvrent en **Sheet latérale droite** ([Sheet.tsx](../frontend/src/components/ui/feedback/Sheet.tsx) existe déjà, `side="right"`). |
| D3 | **Plan de correction supprimé** (UI + endpoints backend `anomalies.correctionPlan` et `anomalies.batchProposals` + service + tests). Remplacé par un **export XLSX annoté et filtrable** (colonnes source + colonnes ANOMALIE_*). L'infra IA (`pricing.references.diagnose`, prompts, quotas) est **conservée côté backend** mais son UI disparaît de cette page. |
| D4 | Classification : vue Escalier refaite (colonnes hairline, une seule surface), vue Tableau conservée. |
| D5 | Onglets **underline** (texte + compteur, trait 2 px `primary`), sans icônes. |
| D6 | Corrections toujours **manuelles dans Excel** par un humain : l'app identifie, explique, exporte — elle ne corrige jamais. |

---

## 3. Direction design — la référence commune

### Références à consulter EN DÉBUT de chaque session UI
Ouvrir dans le navigateur (outils Chrome/claude-in-chrome) et regarder réellement avant de coder :
- **https://ui.shadcn.com/examples/tasks** — LE modèle : toolbar facettée (`⊕ Status`, `⊕ Priority`), table dense, mono réservé à l'ID, menu par ligne.
- **https://linear.app** (screenshots produit de la home) — listes fines, icônes d'état minuscules, master-detail, zéro carte décorative.
- **https://attio.com** — app shell clair, hairlines, header discret.
- **https://ramp.com** — crème, micro-labels mono uppercase comme signature, sérénité typographique.
- **https://mistral.ai** — brutalisme chaleureux crème + rouge : hairlines marquées, mono uppercase pour micro-labels. La palette CIR (crème + rouge brique) est quasi identique : s'en inspirer pour l'identité, pas pour la densité.

### Tokens et typo (existants — ne pas en créer d'autres)
- Fond page `--background: 48 30% 99%` (crème), primaire `--primary: 6 72% 45%` (rouge brique), neutres `stone-*`, surfaces `bg-surface-1` (posée) / `bg-surface-3` (creusée).
- `Inter Tight` pour tout. `JetBrains Mono` (`font-mono tabular-nums`) **réservé aux identifiants et compteurs** : clé CIR, n° de ligne Excel, UUID, chiffres alignés. Jamais pour des libellés ni des en-têtes.
- Graisse : `font-semibold` maximum (titres), `font-medium` (labels, valeurs importantes), `font-normal` partout ailleurs. `font-bold`/`extrabold` interdits.

### Grammaire visuelle cible (pixel-perfect)
- **Une surface par onglet** : `rounded-xl border border-stone-200/60 bg-white` unique. Toolbar, en-têtes de groupe, lignes et pagination vivent DEDANS, séparés par des hairlines `border-stone-200/60` ou `border-stone-100`. Aucun bloc flottant.
- Hauteurs : toolbar 44 px (`px-4`), ligne de table/liste 36 px (`py-2`), en-tête de groupe 32 px, onglet 36 px.
- Underline d'onglet : 2 px `bg-primary`, texte actif `text-stone-950 font-medium`, inactif `text-stone-500`, compteur en `text-stone-400 font-normal` (et `text-amber-700` pour le compteur d'anomalies > 0).
- État = **dot 6 px** (`size-1.5 rounded-full`) + texte. Ambre `bg-amber-500` (haute/moyenne/déviation), rouge `bg-red-500` (bloquante/erreur), émeraude `bg-emerald-500` (OK), stone `bg-stone-300` (neutre). Jamais d'aplat de fond coloré sur un état permanent, jamais de badge plein.
- Micro-label de section : `font-mono text-[10px] uppercase tracking-[0.08em] text-stone-400`, **un seul par vue** (signature Ramp).
- Sélection/hover de ligne : `hover:bg-stone-50`, sélection `bg-surface-1` — par le fond, jamais par des bordures d'item.
- Facettes : bouton `h-7 rounded-md border border-dashed border-stone-300 px-2.5 text-xs` avec `⊕` (icône `CirclePlus` 13 px) ; actif → bordure pleine + valeurs en mini-chips `bg-surface-3 rounded px-1.5`. Contenu = Popover + Command (`cmdk`, déjà en deps) avec checkboxes et compteurs alignés à droite en mono.

### Interdits absolus
Icônes dans les onglets · pill noire · mono en en-tête de colonne · badges pleins colorés répétés · boîtes bordées comme items de liste · bordures latérales colorées épaisses · gradient text · uppercase-tracking généralisé · `console.error`/`toast.error`/`throw new Error` directs (pipeline `createAppError`/`handleUiError` obligatoire) · données mockées · TODO.

---

## 4. Protocole commun (à inclure dans chaque session)

1. Lire `AGENTS.md` à la racine et invoquer les skills requis avant de coder (`impeccable`, `design-taste-frontend`, `vercel-react-best-practices` pour l'UI ; `supabase-postgres-best-practices`, `trpc-type-safety` pour le backend ; `cir-error-handling` si le système d'erreurs est touché).
2. Dev server déjà lancé sur `http://localhost:3000` (ne pas le relancer). Vérifier chaque changement visuellement dans le navigateur, screenshots à l'appui.
3. Lint strict `--max-warnings 0` avec règles React Compiler : pas de `setState` synchrone dans un effet (resets dans les handlers, ajustement d'état pendant le rendu).
4. QA par impact : `pnpm run qa:front` (frontend), `pnpm run qa:back` (backend). Une étape n'est PAS terminée si une gate échoue.
5. Avant toute édition : `git status --short`. Le worktree est partagé ; ne jamais revert un changement que la session n'a pas écrit, ne pas embarquer de fichiers hors étape, et signaler dans le Journal si l'étape démarre sur une base déjà sale.
6. **Clôture de session obligatoire** : cocher les checkpoints de l'étape dans ce fichier, remplir le Journal de bord (section 8) — date, étape, ce qui a été fait, écarts vs plan, gates passées, captures réalisées — et mettre à jour le statut de l'étape (`À FAIRE` → `FAIT`).

---

## 5. Les étapes

### Légende de routage IA

| Domaine | À confier à |
|---|---|
| `(backend, logique)` | IA orientée contrats API, Supabase, Deno, Zod, SQL, stockage, tests backend |
| `(frontend, ui/ux, design)` | IA orientée React, composants visibles, ergonomie, accessibilité, polish visuel |
| `(frontend, logique)` | IA orientée état client, React Query, mutations, navigation, tests Vitest |
| `(qa, audit)` | IA orientée validation, régression, accessibilité, preuves de livraison |

### Étape 0 — Shell : onglets underline + surface unique — `À FAIRE`

**Domaine IA** : `(frontend, ui/ux, design)` + `(frontend, logique)` léger.

**Objectif** : la page entière adopte la grammaire cible. Aucune fonctionnalité ne change, mais visuellement tout s'unifie.

**Checkpoints** :
- [ ] Onglets underline sans icônes, compteur anomalies en texte, `tabItems` sans champ `icon`
- [ ] Segments et Classification (vue tableau) : toolbar fusionnée dans la surface de la table (une seule bordure extérieure, hairlines internes)
- [ ] `ReferenceTable` : `toolbar?: ReactNode` ajouté, `rowKey` stable obligatoire (plus de `key={index}`), headers en Inter (plus de mono), seuls clé CIR / n° ligne / compteurs restent mono ; colonnes libellés en `font-normal`
- [ ] Panneau détail segment converti en **Sheet** droite (liste clé-valeur alignée, plus de mini-cartes ni de colonne réservée dans la grid)
- [ ] Ligne de statut ancrée (alignements, interlignes) et micro-label mono uppercase appliqué à sa légende si pertinent
- [ ] Primitives globales (`Tabs`, `Table`, `Button`, `Input`) non modifiées sauf nécessité documentée ; privilégier des overrides locaux à la page Référentiels
- [ ] `pnpm run qa:front` vert, parcours navigateur vérifié avec screenshots, Journal rempli

**Prompt de session** :

```markdown
# Étape 0 — Shell de la page Référentiels CIR : onglets underline + surface unique

Repo : `C:\GitHub\CIR_Cockpit\CIR-Cockpit` (React 19, Vite, Tailwind v4, TanStack Query/Router, tRPC).
Lis d'abord `AGENTS.md` (racine) et respecte-le. Puis lis ATTENTIVEMENT
`docs/refonte-referentiels-triage.md` : sections 1-4 (contexte, décisions, direction design,
protocole) et l'étape 0. C'est ta spécification. Le dev server tourne sur http://localhost:3000.

Avant de coder : ouvre dans le navigateur https://ui.shadcn.com/examples/tasks et https://linear.app,
observe la relation toolbar/table (une surface, hairlines) et les onglets texte. C'est la cible.

## Travail

1. **Onglets underline** dans `frontend/src/components/pricing-references/PricingReferencesPage.tsx` :
   remplace le TabsList pill par un rail transparent bord inférieur hairline ; TabsTrigger = texte
   `text-xs`, actif `text-stone-950 font-medium` + underline 2px `bg-primary` (pseudo-élément ou
   border-bottom, aligné sur la hairline du rail), inactif `text-stone-500`. Supprime les icônes
   (champ `icon` de `tabItems` et import des icônes). Compteur anomalies : texte
   `text-amber-700 font-mono text-[11px]` à côté du label, plus de badge pilule.
2. **Surface unique** pour Segments et Classification (vue tableau) : la toolbar de filtres entre
   DANS le conteneur de `ReferenceTable` (prop `toolbar?: ReactNode` rendue au-dessus du Table,
   séparée par une hairline `border-b border-stone-200/60`, padding `px-4`, hauteur ~44px).
   Ajoute aussi une prop `rowKey` obligatoire pour les lignes interactives/triées/paginées :
   plus de `key={index}`. Plus aucun élément flottant entre les onglets et la table.
3. **ReferenceTable** (`components/table/reference-table.tsx`) : en-têtes de colonnes en Inter
   `text-[11px] font-medium text-stone-500` (vérifie qu'aucun `font-mono` ne vient des
   `className` de colonnes dans la page) ; dans les définitions de colonnes de la page, retire
   le mono partout SAUF clé CIR, n° de ligne, ID numérique et compteurs. Libellés en `font-normal`.
4. **Détail segment en Sheet** : remplace le panneau latéral inline (`SegmentDetailPanel` +
   grid conditionnelle) par le composant existant `frontend/src/components/ui/feedback/Sheet.tsx`
   (`side="right"`, largeur `sm:max-w-md`). Contenu : en-tête (marque · cat_fab + segment_key mono),
   puis liste clé-valeur alignée (dt `text-stone-500 text-xs` / dd `text-xs font-medium`, rangées
   séparées par hairlines `border-stone-100`) — PAS de mini-cartes. La grid Segments redevient
   pleine largeur en permanence.
5. Vérifie la ligne de statut du header : alignement baseline avec le titre, espacements réguliers.

## Contraintes
- Skills à invoquer avant de coder : `impeccable`, `design-taste-frontend`, `vercel-react-best-practices`.
- Interdits et cotes pixel : section 3 du plan. Lint `--max-warnings 0` (règles React Compiler).
- Ne modifie pas les primitives UI globales (`ui/navigation/Tabs.tsx`, `ui/data-display/Table.tsx`,
  `ui/inputs/basic/Button.tsx`, etc.) pour obtenir un rendu propre à cette page. Utilise d'abord
  des classes locales ou des composants de `pricing-references/`. Si une primitive globale doit
  vraiment changer, documente le blast radius dans le Journal et adapte les tests globaux impactés.
- Mets à jour les tests impactés (`PricingReferencesPage.test.tsx` : plus de panneau inline,
  Sheet avec role="dialog").

## Definition of done
`pnpm run qa:front` vert. Vérification navigateur des 4 onglets (screenshots) : une seule
surface par onglet, onglets underline, sheet segment fonctionnelle. Puis clôture : coche les
checkpoints de l'étape 0 dans `docs/refonte-referentiels-triage.md`, passe son statut à `FAIT`
et ajoute une entrée détaillée au Journal de bord (section 8) : date, actions, écarts, gates, captures.
```

---

### Étape 1 — Backend : filtres multiples, export XLSX annoté, suppression du plan de correction — `À FAIRE`

**Domaine IA** : `(backend, logique)` principal, avec impacts `(frontend, logique)` limités aux contrats/services supprimés.

**Objectif** : le contrat API nécessaire au triage. Une seule tranche backend, un seul deploy.

**Checkpoints** :
- [ ] `anomalies.list` accepte `severities?: []`, `types?: []`, `marques?: []` (arrays bornés) et les anciens scalaires `severity`/`type`/`marque` sont remplacés proprement partout
- [ ] `anomalies.summary` accepte les mêmes filtres métier que `list` (hors pagination/export) et retourne les compteurs nécessaires aux facettes : groupes par type, compteurs par sévérité, par type et par marque, avec `max_severity`
- [ ] Nouvelle procédure `anomalies.export` : XLSX généré (lib `xlsx` backend), une feuille par fichier source, colonnes origine + `LIGNE_SOURCE`, `ANOMALIE_TYPE`, `SEVERITE`, `COLONNES_CONCERNEES`, `MESSAGE`, `ACTION_CORRECTION`, `NOTE_EXPORT`, autofiltre actif, filtres de la requête respectés ; upload Storage + URL signée retournée
- [ ] Export robuste si `details.raw_values` est absent : ligne conservée avec colonnes source vides, contexte disponible (`marque`, `cat_fab`, `cir_keys`, `object_id`) et note d'export explicite ; aucune anomalie filtrée ne disparaît silencieusement
- [ ] Stockage export privé cadré : préfixe `exports/`, nom unique non devinable, URL signée 60 min, métadonnées minimales, nettoyage des exports expirés sans toucher `imports/`
- [ ] Performance SQL vérifiée via Supabase MCP : comptages réels, `EXPLAIN` sur filtres `severities/types/marques/search`, décision documentée sur index expression JSONB/marque si nécessaire
- [ ] Endpoints `anomalies.correctionPlan` + `anomalies.batchProposals` supprimés : router, service (`buildPricingReferenceCorrectionPlanFromRows` et dépendances), schémas partagés, miroir `shared/api/trpc.ts`, services front, tests contrats
- [ ] `pricing.references.diagnose` et l'infra IA conservés intacts
- [ ] Tests contrats ajoutés pour export + filtres multiples ; `pnpm run qa:back` vert
- [ ] Deploy Edge Function (avec confirmation utilisateur) + `list_edge_functions` via MCP Supabase + test réel de l'export
- [ ] Journal rempli

**Prompt de session** :

```markdown
# Étape 1 — Backend triage : filtres multiples, export XLSX annoté, suppression plan de correction

Repo : `C:\GitHub\CIR_Cockpit\CIR-Cockpit`.
Lis `AGENTS.md` puis `docs/refonte-referentiels-triage.md` (sections 1-4 + étape 1 = ta spec).
Backend = Edge Function Deno/Supabase, source `backend/functions/api/`, projet Supabase
`rbjtrcorlezvocayluok` (MCP Supabase disponible pour vérifier tables/logs — PAS de stack locale).

Fichiers pivots :
- Service : `backend/functions/api/services/pricing/references/referenceImports.ts`
- Router : `backend/functions/api/trpc/router.ts` (+ tests `pricingReferenceContracts_test.ts`)
- Schémas partagés : `shared/schemas/pricing/references.schema.ts` (Zod strict in/out, messages sans accents)
- Miroir de types front : `shared/api/trpc.ts` (à maintenir en phase avec le router sinon le front ne compile pas)
- Services front : `frontend/src/services/pricingReferences.ts` + `frontend/src/services/query/queryKeys.ts`

## Travail

1. **Filtres multiples** :
   - `pricingReferenceAnomaliesListInputSchema` : `severities`, `types`, `marques` en
     `z.array(...).max(20)` optionnels. Remplace proprement les scalaires `severity`/`type`/`marque`
     partout (front compris) plutôt que de garder deux formes publiques.
   - `pricingReferenceAnomaliesSummaryGetInputSchema` : mêmes filtres métier que `list`
     (`import_id`, `snapshot_id`, `search`, `severities`, `types`, `marques`), sans pagination.
   - Réponse `summary` attendue : `total`, `groups_by_type` (type, count, max_severity,
     action label si disponible), `facets.severities`, `facets.types`, `facets.marques`
     (value/label/count/max_severity). Les compteurs doivent rester utiles quand une facette est
     déjà sélectionnée : applique les autres facettes actives, mais ne zéroïse pas la facette
     elle-même.
   - SQL : `in` / `= any` ; pour `marques`, réutilise `anomalyMarqueSql()`.
   - Avant de figer la requête, vérifie via Supabase MCP les volumes réels et un `EXPLAIN` sur un
     filtre combiné `types + marques + search`. Si le filtre marque force un scan coûteux, ajoute
     une décision explicite : migration d'index expression/généré maintenant, ou justification
     documentée dans le Journal si le volume actuel permet d'attendre.
2. **`anomalies.export`** (mutation, procédure `authedProcedure`) :
   - Input = mêmes filtres que list (sans pagination) + `import_id`/`snapshot_id` optionnels.
   - Reconstruit les lignes source depuis `details.raw_values` quand il existe ; une feuille
     par `file_kind` (les colonnes diffèrent) ; colonnes d'origine dans l'ordre canonique des
     constantes partagées (`PRICING_REFERENCE_CLASSIFICATION_COLUMNS`,
     `PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS`) puis colonnes d'annotation
     `LIGNE_SOURCE`, `ANOMALIE_TYPE`, `SEVERITE`, `COLONNES_CONCERNEES`, `MESSAGE`,
     `ACTION_CORRECTION`, `NOTE_EXPORT` (libellés français depuis les mappings partagés — crée-les
     dans `shared/schemas` si nécessaires au front ET au back, sinon backend seulement).
   - Si `details.raw_values` est absent, conserve quand même l'anomalie exportée : colonnes source
     vides, `LIGNE_SOURCE`, message, type, sévérité et `NOTE_EXPORT` indiquant clairement que les
     valeurs source brutes sont absentes ; recopie dans la note le contexte disponible
     (`marque`, `cat_fab`, `cir_keys`, `object_id`) sans inventer de donnée.
   - Génération avec `xlsx` (déjà dans `backend/deno.json`), `!autofilter` sur la plage de chaque
     feuille. Upload dans le bucket privé `pricing-reference-sources` sous
     `exports/{snapshot_or_import}/{request_id}.xlsx` via `getSupabaseAdmin()` (ne pas exposer le
     bucket en public), puis URL signée de téléchargement (60 min) retournée :
     `{ ok, request_id, download_url, expires_at, filename, row_count }`.
   - Avant ou après l'upload, nettoie uniquement les anciens objets `exports/` expirés selon une
     règle simple et documentée (ex. > 7 jours). Ne jamais supprimer ni lister agressivement le
     préfixe `imports/`.
   - Borne de sécurité : refuser > 50 000 anomalies (httpError 413, message français).
3. **Suppression du plan de correction** : retire du router `correctionPlan` et `batchProposals`,
   supprime dans le service tout le code devenu mort (build du plan, proposals, helpers, types),
   les schémas Zod associés, leur écho dans `shared/api/trpc.ts`, les fonctions front
   (`getPricingReferenceCorrectionPlan`, `getPricingReferenceBatchCorrectionProposals`, leurs
   queryKeys) et les tests contrats correspondants. NE TOUCHE PAS à `pricing.references.diagnose`
   ni à l'infra IA. Si `correction-plan-dialog.tsx` / `ai-report-synthesis.tsx` deviennent
   inutilisés ET que l'étape 2 n'est pas passée, supprime-les avec leurs tests (le front doit compiler).
4. **Tests contrats** : nouveaux cas pour filtres multiples (arrays bornés, rejet > 20) et export
   (input strict, réponse stricte), suppression des cas plan de correction.

## Validation et déploiement
- `pnpm run qa:back` PUIS `pnpm run qa:front` (le front partage les schémas et les services supprimés) — les deux verts.
- Demande la confirmation de l'utilisateur, puis :
  `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt`
- Vérifie via MCP Supabase `list_edge_functions` (version incrémentée, ACTIVE) et teste l'export
  en conditions réelles (appel depuis le front ou curl authentifié) : le fichier doit s'ouvrir
  dans Excel avec l'autofiltre actif.

## Clôture
Coche les checkpoints de l'étape 1 dans `docs/refonte-referentiels-triage.md`, statut `FAIT`,
entrée complète au Journal de bord (section 8) : endpoints ajoutés/supprimés, version déployée,
résultat du test d'export.
```

---

### Étape 2 — Anomalies : triage groupé + facettes + sheet — `À FAIRE`

**Domaine IA** : `(frontend, ui/ux, design)` + `(frontend, logique)` ; dépend d'un contrat `(backend, logique)` déjà livré à l'étape 1.

**Objectif** : l'onglet Anomalies refait de zéro sur le pattern « issues triage » (shadcn Tasks / Linear Inbox). Dépend de l'étape 1 (filtres multiples + export).

**Checkpoints** :
- [ ] `anomaly-drilldown.tsx` (miller columns) supprimé avec ses styles ; `correction-plan-dialog.tsx` + `ai-report-synthesis.tsx` + bouton « Plan de correction » supprimés s'ils existent encore
- [ ] Nouveau composant de triage : toolbar facettée (recherche + facettes Sévérité/Type/Marque multi-sélection avec compteurs issus de `anomalies.summary.facets`) dans la surface unique
- [ ] Liste groupée par type : en-tête de groupe repliable (type + volume + `anomalyTypeActionLabels`), premier groupe ouvert, lignes chargées en lazy par groupe (list + `types:[...]` + facettes actives)
- [ ] Ligne : dot sévérité 6 px · `L. {n}` mono · message + colonnes concernées · marque · contexte — hauteur 36 px
- [ ] Clic ligne → Sheet droite : détail complet (valeurs Excel brutes, action de correction, fichier source), navigation ↑/↓ entre anomalies du groupe
- [ ] Bouton « Exporter (XLSX) » dans la toolbar : mutation export avec les facettes actives, téléchargement via URL signée, état de chargement, erreurs via `handleUiError`
- [ ] Empty state sain (« Aucune anomalie ») et état filtré vide distincts
- [ ] `pnpm run qa:front` vert, tests page adaptés, vérification navigateur, Journal rempli

**Prompt de session** :

```markdown
# Étape 2 — Onglet Anomalies : triage groupé, facettes, sheet, export XLSX

Repo : `C:\GitHub\CIR_Cockpit\CIR-Cockpit`. Lis `AGENTS.md` puis
`docs/refonte-referentiels-triage.md` sections 1-4 + étape 2 (ta spec exacte, cotes comprises).
Prérequis : l'étape 1 (backend) est FAITE — `anomalies.list` accepte `severities/types/marques`
en arrays, `anomalies.summary` expose `groups_by_type` + `facets`, et `anomalies.export` existe.
Vérifie-le dans `shared/api/trpc.ts` et `shared/schemas/pricing/references.schema.ts` avant de
commencer ; si absent, STOP et signale-le.

Avant de coder, ouvre https://ui.shadcn.com/examples/tasks dans le navigateur : la toolbar
facettée (boutons ⊕ en pointillés, valeurs en mini-chips, Popover+Command avec compteurs) et la
densité de table sont la référence exacte. Regarde aussi l'Inbox sur https://linear.app pour les
en-têtes de groupes.

## Travail

1. Supprime `components/anomalies/anomaly-drilldown.tsx` et toute trace du plan de correction
   dans la page (bouton, dialog, imports) si l'étape 1 ne l'a pas déjà fait.
2. Crée le triage dans `components/anomalies/` (petits fichiers, one-function-per-file comme le
   reste du dossier) :
   - `anomalies-triage.tsx` : orchestrateur. Données : `anomalies.summary` (React Query, clé
     existante) pour `groups_by_type` et `facets` ; état local des facettes (`severities`,
     `types`, `marques`, `search`). Ne reconstruis pas les groupes côté client à partir de pages
     de `anomalies.list`.
   - `faceted-filter.tsx` : bouton facette générique (dashed + ⊕ + label ; actif : bordure pleine
     + chips des valeurs + croix de reset) ouvrant Popover + Command (`cmdk` est déjà dans les
     deps ; regarde `frontend/src/components/ui/` pour Popover/Command existants avant d'en créer).
     Options avec checkbox, label, compteur mono aligné à droite.
   - `anomaly-group.tsx` : section de groupe — en-tête 32px repliable (chevron, type en
     `font-medium`, compteur mono, action de correction en `text-stone-500` tronquée), lignes
     chargées par `anomalies.list` (`types: [type]` + facettes) UNIQUEMENT à l'ouverture
     (useQuery `enabled`), 100 premières + note si tronqué.
   - `anomaly-row.tsx` : ligne 36px — dot sévérité 6px (ambre/rouge selon sévérité, mapping
     section 3), `L. {source_row_number}` en mono `text-stone-500`, message `text-stone-950`
     + colonnes concernées en `text-stone-400`, marque, contexte tronqué à droite.
   - `anomaly-sheet.tsx` : détail dans `ui/feedback/Sheet.tsx` (`side="right"`, `sm:max-w-lg`) —
     réutilise le contenu utile de `anomaly-detail-panel.tsx` (valeurs brutes, action) mais en
     liste clé-valeur hairline, pas en cartes ; boutons ↑/↓ pour naviguer dans le groupe.
3. Groupement par défaut : par type, ordonné par sévérité max puis volume. Facette Type active =
   les groupes non sélectionnés disparaissent. Recherche = filtre serveur (`search`) sur les
   groupes ouverts + resets de pagination.
4. **Export** : bouton `Exporter (XLSX)` (variant outline, icône Download 14px) à droite de la
   toolbar → mutation `anomalies.export` avec les facettes actives → `window.location` ou ancre
   vers `download_url` ; pending state sur le bouton ; erreurs via `handleUiError`.
5. La navigation venant de la ligne de statut du header (`severity: 'bloquante'`) doit
   présélectionner `severities: ['bloquante']`, ouvrir l'onglet Anomalies, et garder un état
   réinitialisable par l'utilisateur. Ne laisse pas un paramètre de navigation ignoré.

## Contraintes
Skills : `impeccable`, `design-taste-frontend`, `vercel-react-best-practices`, `vitest`.
Lint React Compiler strict (pas de setState dans les effets). Erreurs via pipeline AppError.
Tests : adapte `PricingReferencesPage.test.tsx` (mocks des nouvelles fonctions service,
parcours groupe → ligne → sheet) sans perdre de couverture.

## Definition of done
`pnpm run qa:front` vert. Navigateur : groupes visibles SANS clic, ouverture d'un groupe,
facettes combinables, sheet avec navigation, export téléchargé et ouvert (vérifie le fichier).
Screenshots. Clôture : checkpoints étape 2 cochés dans `docs/refonte-referentiels-triage.md`,
statut `FAIT`, Journal de bord complété.
```

---

### Étape 3 — Classification : escalier hairline — `À FAIRE`

**Domaine IA** : `(frontend, ui/ux, design)` principal ; logique client minimale.

**Objectif** : la vue Escalier adopte le langage cible (une surface, hairlines, lignes fines).

**Checkpoints** :
- [ ] `classification-drilldown.tsx` : une seule surface, 3 colonnes séparées par des hairlines verticales `border-stone-200/60` (plus de boîtes-cartes par colonne)
- [ ] Items = lignes 32 px : code mono discret + libellé Inter + compteur mono à droite + chevron `text-stone-300` ; sélection = `bg-surface-1 text-stone-950`, zéro bordure d'item
- [ ] Recherches de colonnes intégrées sous l'en-tête de colonne (input ghost hairline, pas de champ bordé flottant)
- [ ] Détail SFA (clé CIR + copie) en pied de 3ᵉ colonne ou Sheet — cohérent avec le reste
- [ ] Bascule Escalier/Tableau conservée, `SegmentedControl` intégré à la surface
- [ ] `pnpm run qa:front` vert, vérification navigateur, Journal rempli

**Prompt de session** :

```markdown
# Étape 3 — Vue Escalier de la classification : colonnes hairline

Repo : `C:\GitHub\CIR_Cockpit\CIR-Cockpit`. Lis `AGENTS.md` puis
`docs/refonte-referentiels-triage.md` sections 1-4 + étape 3. Le composant :
`frontend/src/components/pricing-references/components/classification/classification-drilldown.tsx`
(données déjà en React Query via `classification.listAll` — ne touche pas au data flow).

Références : le panneau latéral de https://linear.app (listes fines, sélection par fond) et les
colonnes du Finder macOS pour le modèle mental. Les étapes 0 et 2 ont déjà posé la grammaire
(surface unique, hairlines, lignes 32-36px) : ta seule mission est d'aligner cette vue dessus.

## Travail
1. Conteneur : UNE surface `rounded-xl border border-stone-200/60 bg-white`, grid 3 colonnes
   avec séparateurs `border-r border-stone-200/60` (le 3ᵉ sans bordure droite). Supprime les
   boîtes par colonne, les paddings de cartes, les shadows.
2. En-tête de colonne : micro-label mono uppercase 10px (`MÉGA-FAMILLES`, `FAMILLES`,
   `SOUS-FAMILLES`) + compteur mono, hauteur 36px, hairline en dessous ; recherche en input
   ghost (fond transparent, hairline basse au focus) sous l'en-tête.
3. Item : ligne 32px `px-3` — code (`01`) en mono `text-stone-400 text-[11px]`, libellé Inter
   `text-xs`, compteur mono à droite `text-stone-400`, chevron 14px `text-stone-300`.
   Hover `bg-stone-50`, sélection `bg-surface-1` + libellé `font-medium text-stone-950`.
   AUCUNE bordure d'item, aucun badge.
4. Détail de la sous-famille sélectionnée (clé CIR + bouton copie) : bandeau discret en pied de
   3ᵉ colonne (hairline haute, clé en mono, bouton ghost copie avec feedback), OU Sheet si le
   contenu le justifie — choisis le plus sobre et justifie dans le Journal.
5. La bascule Vue escalier / Vue tableau reste ; rends-la solidaire de la surface (dans une
   barre d'outils hairline commune, pas flottante au-dessus).

## Contraintes et clôture
Skills `impeccable` + `vercel-react-best-practices`. Lint strict. `pnpm run qa:front` vert.
Vérifie au navigateur : navigation 3 niveaux, recherches, copie de clé, bascule tableau.
Screenshots avant/après. Coche les checkpoints étape 3 dans `docs/refonte-referentiels-triage.md`,
statut `FAIT`, Journal de bord complété.
```

---

### Étape 4 — Imports : liste chronologique + sheet détail — `À FAIRE`

**Domaine IA** : `(frontend, ui/ux, design)` + `(frontend, logique)`.

**Objectif** : l'onglet Imports devient une liste d'événements type « payouts Stripe ».

**Checkpoints** :
- [ ] Une seule surface : section `ACTIF` (micro-label mono) avec la ligne du snapshot actif, puis `HISTORIQUE` — la carte snapshot ajoutée précédemment disparaît
- [ ] Ligne d'import 40 px : dot statut 6 px · « Import du {date} » `font-medium` · fichiers importés en méta grise (noms réels via détail) · compteurs mono alignés à droite (classification / segments / anomalies) · erreur éventuelle en rouge tronquée
- [ ] Filtre statut (Tous/OK/Erreurs) intégré à la toolbar de la surface
- [ ] Clic ligne → Sheet : détail complet via `imports.get` (fichiers avec nom/taille/lignes, statut mapping, rapport santé, UUID copiable) — la sélection d'import pour filtrer les autres onglets reste possible depuis la sheet (« Voir cet import » qui pose `selectedImportId`)
- [ ] Le badge « Import sélectionné » du header offre un moyen de revenir au snapshot actif (croix de reset)
- [ ] `pnpm run qa:front` vert, vérification navigateur, Journal rempli

**Prompt de session** :

```markdown
# Étape 4 — Onglet Imports : liste chronologique + sheet de détail

Repo : `C:\GitHub\CIR_Cockpit\CIR-Cockpit`. Lis `AGENTS.md` puis
`docs/refonte-referentiels-triage.md` sections 1-4 + étape 4. Fichiers :
`PricingReferencesPage.tsx` (bloc imports), `components/imports/import-rows.tsx` (à refondre),
service `imports.get` déjà exposé (`getPricingReferenceImport` + `pricingReferenceImportKey`).

Référence : la liste des payouts du dashboard Stripe (cherche « stripe dashboard payouts » en
images si besoin) et https://ui.shadcn.com/examples/tasks pour la densité. Grammaire : sections
1-4 du plan (surface unique, dots, mono réservé aux chiffres/UUID, micro-labels mono uppercase).

## Travail
1. Remplace la carte snapshot + table actuelles par UNE surface :
   - Toolbar hairline : titre implicite (pas de « Historique des imports » en gros), filtre
     statut (SegmentedControl existant) à droite.
   - Section `ACTIF` : micro-label mono 10px, puis LA ligne du snapshot actif (fond `bg-surface-1`
     léger) — même anatomie que les autres lignes.
   - Section `HISTORIQUE` : micro-label, puis les autres imports, pagination existante en pied.
2. Anatomie d'une ligne (40px, `px-4`) : dot statut (mapping section 3) + libellé statut
   `text-[11px] text-stone-500` · « Import du {formatDateTime} » `text-xs font-medium` ·
   compteurs alignés à droite en mono 11px (3 colonnes fixes : classification, segments,
   anomalies — anomalies en `text-amber-700` si > 0) · message d'erreur rouge tronqué si présent.
   L'UUID ne s'affiche PLUS dans la ligne (il vit dans la sheet).
3. Sheet détail (`ui/feedback/Sheet.tsx`, `sm:max-w-lg`) au clic : charge `imports.get` —
   en-tête (statut + date), fichiers (nom, taille, lignes, statut mapping) en liste hairline,
   compteurs, UUID en mono avec bouton copie, et action « Consulter cet import » qui pose
   `selectedImportId` (le badge du header passe à « Import sélectionné »).
4. Ajoute une croix de reset sur le badge « Import sélectionné » du header pour revenir au
   snapshot actif (`selectedImportId = null`).

## Contraintes et clôture
Skills `impeccable` + `vercel-react-best-practices` + `vitest`. Lint strict, erreurs via pipeline.
Tests : adapte les assertions imports de `PricingReferencesPage.test.tsx` (sections ACTIF/HISTORIQUE,
sheet). `pnpm run qa:front` vert. Navigateur : liste, filtre, sheet, sélection d'import,
reset badge — screenshots. Coche l'étape 4 dans `docs/refonte-referentiels-triage.md`,
statut `FAIT`, Journal complété.
```

---

### Étape 5 — Polish final + audit — `À FAIRE`

**Domaine IA** : `(frontend, ui/ux, design)` + `(qa, audit)`.

**Objectif** : passe finale pixel-perfect et audit croisé de toute la page.

**Checkpoints** :
- [ ] Audit `web-design-guidelines` (a11y, focus, contrastes) passé sur la page entière et écarts corrigés
- [ ] Cohérence inter-onglets vérifiée au pixel : hauteurs de toolbar/lignes, hairlines, paddings, dots, casse des labels
- [ ] Debounce 300 ms sur toutes les recherches serveur (segments, classification, anomalies)
- [ ] États de chargement : skeletons alignés sur les structures finales (pas de layout shift), navigations d'onglets fluides
- [ ] `pnpm run qa:front` vert + parcours navigateur COMPLET des 4 onglets avec captures avant/après archivées dans le Journal
- [ ] Statut global du document passé à `TERMINÉ`

**Prompt de session** :

```markdown
# Étape 5 — Polish final et audit de la page Référentiels CIR

Repo : `C:\GitHub\CIR_Cockpit\CIR-Cockpit`. Lis `AGENTS.md` puis
`docs/refonte-referentiels-triage.md` EN ENTIER — vérifie dans le Journal de bord que les
étapes 0 à 4 sont `FAIT` (sinon STOP : signale ce qui manque). Dev server : http://localhost:3000.

## Travail
1. Invoque le skill `web-design-guidelines` et audite `/remises/referentiels` (les 4 onglets,
   les 3 sheets, les facettes) : focus visibles, navigation clavier complète (onglets, lignes,
   groupes repliables, facettes), contrastes AA (attention aux text-stone-400/500 sur crème),
   aria (tablist, dialog, aria-expanded des groupes). Corrige tout écart.
2. Passe pixel-perfect transversale, au navigateur avec mesures (inspecteur) :
   - toolbars toutes à la même hauteur, hairlines toutes en `stone-200/60`, lignes 36px
     (40px imports), en-têtes de groupe 32px, paddings horizontaux `px-4` constants ;
   - un SEUL micro-label mono uppercase par vue ; mono nulle part ailleurs que identifiants
     et compteurs ; aucun `font-bold`.
3. Ajoute un debounce 300ms sur les recherches qui déclenchent des requêtes serveur
   (hook réutilisable, pas de setState-in-effect — attention aux règles React Compiler).
4. Skeletons : mêmes hauteurs/structures que les états chargés (zéro layout shift mesurable).
5. Parcours complet au navigateur avec screenshots de chaque onglet + une sheet ouverte +
   les facettes actives + l'export téléchargé.

## Clôture
`pnpm run qa:front` vert. Coche les checkpoints étape 5, passe le statut GLOBAL du document à
`TERMINÉ`, et rédige l'entrée finale du Journal de bord : synthèse de la refonte, liste des
écarts résiduels éventuels, suggestions hors périmètre (à ne PAS implémenter).
```

---

## 6. Dépendances entre étapes

```
Étape 0 [frontend, ui/ux, design] ──────────────┐
                                                 ├──> Étape 2 [frontend logique + ui/ux] ──┐
Étape 1 [backend, logique + deploy] ─────────────┘                                         ├──> Étape 5 [qa, audit + design]
Étape 3 [frontend, ui/ux, design] — après 0 ───────────────────────────────────────────────┤
Étape 4 [frontend logique + ui/ux] — après 0 ──────────────────────────────────────────────┘
```
0 et 1 sont parallélisables. 3 et 4 peuvent passer avant ou après 2.

## 7. Garde-fous globaux

- Jamais deux étapes dans la même session : une session = une étape = une entrée de Journal.
- Toute déviation du plan (impossibilité technique, meilleure idée) : la NOTER dans le Journal et la signaler à l'utilisateur, ne pas improviser silencieusement au-delà du périmètre de l'étape.
- Le backend ne se déploie qu'à l'étape 1, avec confirmation explicite de l'utilisateur.
- Si `qa:front`/`qa:back` échoue pour une raison étrangère à l'étape (flaky, préexistant), le documenter dans le Journal au lieu de « réparer » hors périmètre.

---

## 8. Journal de bord

> Chaque session ajoute une entrée EN HAUT de cette section, au format :
>
> ```
> ### [AAAA-MM-JJ] Étape N — <titre> — <statut final>
> - Réalisé : …
> - Écarts vs plan : … (ou « aucun »)
> - Gates : qa:front ✅/❌, qa:back ✅/❌ (si applicable), deploy vN (si applicable)
> - Vérification navigateur : … (captures, parcours testés)
> - Reste à faire / alertes pour la suite : …
> ```

*(aucune entrée pour l'instant)*
