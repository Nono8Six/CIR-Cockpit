# Refonte « Triage » — Page Référentiels CIR

> Plan d'exécution en 6 étapes indépendantes. Chaque étape contient un prompt autonome,
> conçu pour être collé dans une **nouvelle conversation sans contexte**. L'IA exécutante
> doit cocher ses checkpoints et remplir le Journal de bord (section 8) à la fin de sa session.
>
> Statut global : `EN COURS` → `TERMINÉ` après l'étape 5.

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
| D2 | ~~Tous les détails (anomalie, segment, import) s'ouvrent en Sheet latérale droite~~ **Révisé le 2026-07-05 (PO, en session étape 0)** : la Sheet droite est rejetée. Tous les détails s'ouvrent en **Dialog centré** style palette Ctrl+K ([Dialog.tsx](../frontend/src/components/ui/feedback/Dialog.tsx), overlay `bg-foreground/30 backdrop-blur-[2px]`, `rounded-xl`, `p-0`, largeur `sm:max-w-md` à `sm:max-w-lg` selon contenu) — modèle : `SegmentDetailDialog`. |
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

### Étape 0 — Shell : onglets underline + surface unique — `FAIT`

**Domaine IA** : `(frontend, ui/ux, design)` + `(frontend, logique)` léger.

**Objectif** : la page entière adopte la grammaire cible. Aucune fonctionnalité ne change, mais visuellement tout s'unifie.

**Checkpoints** :
- [x] Onglets underline sans icônes, compteur anomalies en texte, `tabItems` sans champ `icon`
- [x] Segments et Classification (vue tableau) : toolbar fusionnée dans la surface de la table (une seule bordure extérieure, hairlines internes)
- [x] `ReferenceTable` : `toolbar?: ReactNode` ajouté, `rowKey` stable obligatoire (plus de `key={index}`), headers en Inter (plus de mono), seuls clé CIR / n° ligne / compteurs restent mono ; colonnes libellés en `font-normal`
- [x] Panneau détail segment converti en **Dialog centré** style palette Ctrl+K (liste clé-valeur alignée, plus de mini-cartes ni de colonne réservée dans la grid) — décision PO en cours de session, remplace la Sheet droite prévue par D2 pour ce détail
- [x] Ligne de statut ancrée (alignements, interlignes) ; micro-label mono uppercase non ajouté (jugé non pertinent : la légende dot+texte « Snapshot actif » couvre déjà le rôle, décision au Journal)
- [x] Primitives globales (`Tabs`, `Table`, `Button`, `Input`) non modifiées sauf nécessité documentée ; privilégier des overrides locaux à la page Référentiels
- [x] `pnpm run qa:front` vert, parcours navigateur vérifié avec screenshots, Journal rempli

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

### Étape 1 — Backend : filtres multiples, export XLSX annoté, suppression du plan de correction — `FAIT`

**Domaine IA** : `(backend, logique)` principal, avec impacts `(frontend, logique)` limités aux contrats/services supprimés.

**Objectif** : le contrat API nécessaire au triage. Une seule tranche backend, un seul deploy.

- [x] `anomalies.list` accepte `severities?: []`, `types?: []`, `marques?: []` (arrays bornés) et les anciens scalaires `severity`/`type`/`marque` sont remplacés proprement partout
- [x] `anomalies.summary` accepte les mêmes filtres métier que `list` (hors pagination/export) et retourne les compteurs nécessaires aux facettes : groupes par type, compteurs par sévérité, par type et par marque, avec `max_severity`
- [x] Nouvelle procédure `anomalies.export` : XLSX généré (lib `xlsx` backend), une feuille par fichier source, colonnes origine + `LIGNE_SOURCE`, `ANOMALIE_TYPE`, `SEVERITE`, `COLONNES_CONCERNEES`, `MESSAGE`, `ACTION_CORRECTION`, `NOTE_EXPORT`, autofiltre actif, filtres de la requête respectés ; upload Storage + URL signée retournée
- [x] Export robuste si `details.raw_values` est absent : ligne conservée avec colonnes source vides, contexte disponible (`marque`, `cat_fab`, `cir_keys`, `object_id`) et note d'export explicite ; aucune anomalie filtrée ne disparaît silencieusement
- [x] Stockage export privé cadré : préfixe `exports/`, nom unique non devinable, URL signée 60 min, métadonnées minimales, nettoyage des exports expirés sans toucher `imports/`
- [x] Performance SQL vérifiée via Supabase MCP : comptages réels, `EXPLAIN` sur filtres `severities/types/marques/search`, décision documentée sur index expression JSONB/marque si nécessaire
- [x] Endpoints `anomalies.correctionPlan` + `anomalies.batchProposals` supprimés : router, service (`buildPricingReferenceCorrectionPlanFromRows` et dépendances), schémas partagés, miroir `shared/api/trpc.ts`, services front, tests contrats
- [x] `pricing.references.diagnose` et l'infra IA conservés intacts
- [x] Tests contrats ajoutés pour export + filtres multiples ; `pnpm run qa:back` vert
- [x] Deploy Edge Function (avec confirmation utilisateur) + `list_edge_functions` via MCP Supabase + test réel de l'export
- [x] Journal rempli

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

### Étape 2 — Anomalies : triage groupé + facettes + dialog — `FAIT`

**Domaine IA** : `(frontend, ui/ux, design)` + `(frontend, logique)` ; dépend d'un contrat `(backend, logique)` déjà livré à l'étape 1.

**Objectif** : l'onglet Anomalies refait de zéro sur le pattern « issues triage » (shadcn Tasks / Linear Inbox). Dépend de l'étape 1 (filtres multiples + export).

**Checkpoints** :
- [x] `anomaly-drilldown.tsx` (miller columns) supprimé avec ses styles ; `correction-plan-dialog.tsx` + `ai-report-synthesis.tsx` + bouton « Plan de correction » supprimés s'ils existent encore
- [x] Nouveau composant de triage : toolbar facettée (recherche + facettes Sévérité/Type/Marque multi-sélection avec compteurs issus de `anomalies.summary.facets`) dans la surface unique
- [x] Liste groupée par type : en-tête de groupe repliable (type + volume + `anomalyTypeActionLabels`), premier groupe ouvert, lignes chargées en lazy par groupe (list + `types:[...]` + facettes actives)
- [x] Ligne : dot sévérité 6 px · `L. {n}` mono · message + colonnes concernées · marque · contexte — hauteur 36 px
- [x] Clic ligne → Dialog centré : détail complet (valeurs Excel brutes, action de correction, fichier source), boutons de navigation ↑/↓, raccourcis clavier (flèches Haut/Bas ET touches `j`/`k`) pour changer d'anomalie, et **restauration du focus** sur la ligne sélectionnée lors de la fermeture du dialogue pour continuer la navigation au clavier sans interruption
- [x] Bouton « Exporter (XLSX) » dans la toolbar : mutation export avec les facettes actives, téléchargement via URL signée, état de chargement, erreurs via `handleUiError`
- [x] **Empty states distincts** : affichage vert/positif si le référentiel est 100% sain ("Aucune anomalie détectée"), ou message neutre avec bouton de réinitialisation si aucun résultat ne correspond aux filtres actifs ("Aucune anomalie ne correspond aux filtres actifs")
- [x] `pnpm run qa:front` vert, tests page adaptés, vérification navigateur, Journal rempli

**Prompt de session** :

```markdown
# Étape 2 — Onglet Anomalies : triage groupé, facettes, dialog centré, export XLSX

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
   - `anomaly-detail-dialog.tsx` : panneau détail dans le composant existant `Dialog`
     (`components/ui/feedback/Dialog.tsx`) avec overlay `bg-foreground/30 backdrop-blur-[2px]`,
     réutilise le contenu utile de `anomaly-detail-panel.tsx` mais en liste clé-valeur hairline,
     pas en cartes. Intègre des boutons ↑/↓ et le support clavier (flèches Haut/Bas ET touches `j`/`k`)
     pour changer l'anomalie active au sein du même groupe sans fermer la modale. Gère la
     restauration du focus sur la ligne d'origine à la fermeture du dialogue pour continuer la
     navigation clavier de façon transparente.
3. Groupement par défaut : par type, ordonné par sévérité max puis volume. Facette Type active =
   les groupes non sélectionnés disparaissent. Recherche = filtre serveur (`search`) sur les
   groupes ouverts + resets de pagination.
4. **Empty states distincts** :
   - Si `totalAnomalies === 0` : Afficher l'état vert/sain "Aucune anomalie détectée" existant.
   - Si les filtres/recherche masquent tout : Afficher un état vide distinct "Aucune anomalie ne correspond aux filtres" avec un bouton pour réinitialiser les filtres.
5. **Export** : bouton `Exporter (XLSX)` (variant outline, icône Download 14px) à droite de la
   toolbar → mutation `anomalies.export` avec les facettes actives → `window.location` ou ancre
   vers `download_url` ; pending state sur le bouton ; erreurs via `handleUiError`.
6. La navigation venant de la ligne de statut du header (`severity: 'bloquante'`) doit
   présélectionner `severities: ['bloquante']`, ouvrir l'onglet Anomalies, et garder un état
   réinitialisable par l'utilisateur. Ne laisse pas un paramètre de navigation ignoré.

## Contraintes
Skills : `impeccable`, `design-taste-frontend`, `vercel-react-best-practices`, `vitest`.
Lint React Compiler strict (pas de setState dans les effets). Erreurs via pipeline AppError.
Tests : adapte `PricingReferencesPage.test.tsx` (mocks des nouvelles fonctions service,
parcours groupe → ligne → dialog) sans perdre de couverture.

## Definition of done
`pnpm run qa:front` vert. Navigateur : groupes visibles SANS clic, ouverture d'un groupe,
facettes combinables, dialog de détail avec navigation (clavier j/k/flèches et clics ↑/↓), focus restauré à la fermeture, export téléchargé et ouvert (vérifie le fichier).
Screenshots. Clôture : checkpoints étape 2 cochés dans `docs/refonte-referentiels-triage.md`,
statut `FAIT`, Journal de bord complété.
```

---

### Étape 3 — Classification : escalier hairline — `FAIT`

**Domaine IA** : `(frontend, ui/ux, design)` principal ; logique client minimale.

**Objectif** : la vue Escalier adopte le langage cible (une surface, hairlines, lignes fines).

**Checkpoints** :
- [x] `classification-drilldown.tsx` : une seule surface, 3 colonnes séparées par des hairlines verticales `border-stone-200/60` (plus de boîtes-cartes par colonne)
- [x] Items = lignes 32 px : code mono discret + libellé Inter + compteur mono à droite + chevron `text-stone-300` ; sélection = `bg-surface-1 text-stone-950`, zéro bordure d'item
- [x] Recherches de colonnes intégrées sous l'en-tête de colonne (input ghost hairline, pas de champ bordé flottant)
- [x] Détail SFA (clé CIR + copie) en pied de 3ᵉ colonne ou Sheet — cohérent avec le reste
- [x] Bascule Escalier/Tableau conservée, `SegmentedControl` intégré à la surface
- [x] `pnpm run qa:front` vert, vérification navigateur, Journal rempli

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

### [2026-07-05] Étape 3 — Vue Escalier de la classification : colonnes hairline — `FAIT`
- Réalisé :
  - Base toujours sale (étapes 0-2 non commitées) : conservée, aucun revert. Data flow React Query (`classification.listAll`) intact.
  - `classification-drilldown.tsx` réécrit dans la grammaire cible : UNE surface `rounded-xl border-stone-200/60 bg-white`, grid 3 colonnes séparées par hairlines `md:border-r border-stone-200/60` (3ᵉ sans bordure droite, `border-b` en mobile empilé) — plus de boîtes-cartes, paddings de cartes ni shadows.
  - En-têtes de colonnes 36 px : micro-label mono uppercase 10 px (`MÉGA-FAMILLES` / `FAMILLES` / `SOUS-FAMILLES`) + compteur mono à droite, hairline en dessous ; recherches ghost (input transparent `h-8`, hairline basse `stone-100` → `stone-300` au focus-within) sous chaque en-tête, `aria-label` explicites.
  - Items 32 px `px-3` : code mono `text-[11px] text-stone-400` (largeur fixe `w-8` pour l'alignement), libellé Inter `text-xs`, compteur mono à droite (`familyCount`/`subfamilyCount`, clé CIR mono pour les sous-familles — feuille sans chevron), chevron 14 px `text-stone-300` ; hover `bg-stone-50`, sélection `bg-surface-1` + libellé `font-medium text-stone-950` ; zéro bordure d'item, zéro badge (Badge et Sparkles supprimés).
  - Détail SFA : **bandeau en pied de 3ᵉ colonne** retenu (hairline haute, libellé `text-stone-500`, clé CIR mono, bouton ghost « Copier la clé CIR » avec feedback « Copié » + check émeraude 2 s). La Sheet a été écartée : une clé + un bouton ne justifient pas un panneau, et la D2 révisée proscrit de toute façon les Sheets latérales — le bandeau est l'option la plus sobre et garde la clé visible pendant la navigation.
  - Bascule Vue escalier / Vue tableau solidaire de la surface : `ClassificationDrillDown` accepte `toolbar?: ReactNode` (même pattern que `ReferenceTable`), la page passe le `SegmentedControl` dedans ; total `X clés` mono à droite de la toolbar, cohérent avec la vue tableau. Plus d'élément flottant au-dessus.
  - Bandeau de troncature intégré à la surface (hairline, `bg-amber-50/60`, `role="status"`) au lieu de la boîte ambre flottante ; états loading (skeleton aligné sur la structure finale : toolbar + 3 colonnes hairline, rangées 32 px) et erreur rendus DANS la surface — la bascule reste donc accessible pendant chargement/erreur (amélioration vs avant où l'état d'erreur avalait tout).
- Écarts vs plan :
  - Trois micro-labels mono uppercase dans la vue (un par colonne) : demandé explicitement par l'étape 3, prime sur la règle générale « un seul micro-label par vue » de la section 3.
  - Test `warns when the classification drilldown is capped` ajusté : le total apparaît désormais aussi dans la toolbar (`5 001 clés`), l'assertion est scopée sur le `role="status"` du bandeau de troncature.
- Gates : `pnpm run qa:front` ✅ (repo check, typecheck, eslint `--max-warnings 0`, 143 fichiers / 628 tests, error-compliance) ; qa:back non applicable.
- Vérification navigateur (localhost:3000, screenshots avant/après pris en session) : navigation 3 niveaux HYDRAULIQUE → COMPOSANTS (36) → POMPES PISTONS avec sélection par fond ; recherche colonne « pompes » → 5 sous-familles ; bandeau pied de colonne (POMPES PISTONS / `3_30_40`) + copie avec feedback « Copié » vérifié ; bascule tableau → escalier OK avec le toggle dans la toolbar des deux vues ; compteurs d'en-têtes réactifs aux filtres.
- Reste à faire / alertes pour la suite : l'étape 4 (imports) reste la dernière vue hors grammaire ; debounce des recherches et skeletons transverses à l'étape 5 (les recherches escalier sont client-side, pas de requête serveur déclenchée).

### [2026-07-05] Étape 2 — Anomalies : triage groupé, facettes, dialog centré, export XLSX — `FAIT`
- Réalisé :
  - Base de départ déjà sale avant édition (fichiers des étapes 0-1 non commités) : conservée, aucun revert.
  - Références consultées au navigateur avant code : ui.shadcn.com/examples/tasks (toolbar facettée ⊕, Popover+Command avec compteurs, densité) et linear.app (listes fines, en-têtes de groupes).
  - Nouveaux composants `components/anomalies/` (one-function-per-file) : `anomalies-triage.tsx` (orchestrateur : `anomalies.summary` en React Query pour `groups_by_type` + `facets`, état local `severities/types/marques/search`, groupes triés sévérité max puis volume, facette Type = masquage des groupes non sélectionnés, recherche = filtre serveur passé à summary + list + export) ; `faceted-filter.tsx` (bouton dashed + ⊕, actif = bordure pleine + chips `bg-surface-3` + croix de reset en bouton séparé accessible, Popover + Command avec checkboxes, dots sévérité et compteurs mono) ; `anomaly-group.tsx` (en-tête 32 px repliable avec chevron/dot/type `font-medium`/compteur mono/action tronquée, lignes chargées par `anomalies.list` `types:[type]` + facettes UNIQUEMENT à l'ouverture via `enabled`, 100 premières + note de troncature) ; `anomaly-row.tsx` (36 px : dot 6 px, `L. {n}` mono, message + colonnes concernées, marque, contexte tronqué) ; `anomaly-detail-dialog.tsx` (Dialog centré Ctrl+K `sm:max-w-lg`, overlay `bg-foreground/30 backdrop-blur-[2px]`, liste clé-valeur hairline — plus de cartes —, boutons ↑/↓, raccourcis flèches ET `j`/`k`, footer position `x / y` + hint, restauration du focus via `onCloseAutoFocus` sur la ligne de la dernière anomalie consultée).
  - `anomaly-drilldown.tsx` et `anomaly-detail-panel.tsx` supprimés (le contenu utile du panel vit dans le dialog) ; `anomaly-utils.ts` enrichi (`anomalySeverityDotClassName` mapping section 3 : rouge = bloquante, ambre = haute/moyenne, stone = faible ; `anomalySeverityRank`) et l'ancien mapping badges `anomalySeverityToneClassName` retiré.
  - Navigation depuis la ligne de statut : `handleQuickNavigate` pose un `AnomalySeverityPreset` ({ id incrémental, severities }) ; le triage l'applique par ajustement d'état pendant le rendu (pattern React sanctionné, zéro setState-in-effect) ; clic « bloquantes » → facette `Bloquante` présélectionnée et réinitialisable, clic total anomalies → facettes sévérité vidées.
  - Empty states distincts : sain (vert, `CircleCheck`, « Aucune anomalie détectée ») vs filtré (« Aucune anomalie ne correspond aux filtres » + bouton « Réinitialiser les filtres »).
  - Export : bouton `Exporter (XLSX)` outline + Download 14 px à droite de la toolbar, mutation `anomalies.export` avec les facettes actives, ancre vers `download_url`, pending state, erreurs via `handleUiError`, succès via `notifySuccess`.
  - Corrections en passant (constatées au navigateur) : raccourcis clavier déplacés au niveau document pendant l'ouverture du dialog (un bouton nav désactivé qui avait le focus rendait les touches muettes) ; `getAnomalyLineContext` retombe sur `details.marque`/`details.cat_fab` (les anomalies de liaison n'ont pas de `raw_values`) — la marque s'affiche désormais dans les lignes et le détail de ces anomalies.
  - Tests `PricingReferencesPage.test.tsx` réécrits pour le triage : groupes sans clic + premier ouvert + lazy `types:[...]`, dialog avec navigation j/k/flèches/boutons, focus restauré à la fermeture, repli de groupe, combinaison de facettes propagée à summary/list, export (ancre stubée) + notifySuccess, présélection bloquante depuis le header + empty state filtré + reset, empty state sain. Mocks résumés/list enrichis (2 anomalies, summary conditionnel).
- Écarts vs plan :
  - La restauration du focus vise la ligne de la **dernière anomalie consultée** (après navigation j/k), pas la ligne d'origine stricte : c'est ce qui permet de « continuer la navigation clavier sans interruption » comme demandé par le même checkpoint.
  - `@tanstack/react-virtual` n'est plus utilisé par le frontend après suppression du drilldown (dépendance conservée, hors périmètre de l'étape).
- Gates : `pnpm run qa:front` ✅ (repo check, typecheck, eslint `--max-warnings 0`, 143 fichiers / 628 tests, error-compliance) ; qa:back non applicable (aucun fichier backend touché).
- Vérification navigateur (localhost:3000, screenshots pris en session) : 4 groupes visibles SANS clic triés sévérité/volume, premier ouvert ; ouverture « Grille achat incomplete » (101) → 100 lignes + note de troncature ; facette Sévérité (Popover+Command, compteurs 3/600) → sélection « Haute » → 3 anomalies, chips + croix + Réinitialiser ; dialog détail (liste hairline, VALEURS EXCEL BRUTES, cir_keys en conflit visibles) ; navigation `j`/`k` 1/2 ↔ 2/2 avec boutons désactivés aux bornes ; Escape → focus revenu sur la ligne (vérifié via activeElement) ; export facetté téléchargé et fichier contrôlé (`anomalies-referentiel-…xlsx`, signature ZIP valide, feuille « Segments grilles », autofiltre `A1:AF4`, 7 colonnes d'annotation, 3 lignes filtrées COVA/REXR) ; clic « 0 bloquantes » au header → onglet Anomalies + facette Bloquante + empty state filtré + reset OK ; recherche serveur « ambigue » → 2 anomalies, un seul groupe.
- Reste à faire / alertes pour la suite : étape 3 (escalier classification) et étape 4 (imports) reprennent la grammaire posée ici ; le debounce 300 ms sur la recherche anomalies (comme segments/classification) est prévu à l'étape 5 ; dépendance `@tanstack/react-virtual` désormais orpheline à retirer lors d'un nettoyage deps.

### [2026-07-05] Étape 1 — Backend : filtres multiples, export XLSX annoté, suppression plan de correction — `FAIT`
- Réalisé :
  - Base de départ déjà sale avant édition : `docs/refonte-referentiels-triage.md`, plusieurs fichiers `frontend/src/components/pricing-references/*` de l'étape 0, suppression de `segment-detail-panel.tsx` et ajout de `segment-detail-dialog.tsx`. Ces changements ont été conservés et non revert.
  - Contrats Zod partagés : `anomalies.list`, `anomalies.summary` et `anomalies.export` utilisent désormais les filtres métier stricts `search`, `severities`, `types`, `marques` (arrays bornés à 20) avec rejet des anciens scalaires `severity`/`type`/`marque`. La réponse `summary` publie `groups_by_type` et `facets.{severities,types,marques}` avec `count` et `max_severity`.
  - Backend `referenceImports.ts` : requêtes SQL mutualisées pour filtres multi-valeurs, facettes non auto-zérotées, export XLSX `xlsx` borné à 50 000 anomalies, une feuille par fichier source, colonnes source canoniques + annotations, `!autofilter`, fallback explicite si `details.raw_values` est absent, upload privé dans `pricing-reference-sources/exports/{scope}/{request_id}.xlsx`, URL signée 60 min, nettoyage limité au préfixe `exports/` sur objets > 7 jours.
  - Routes supprimées : `pricing.references.anomalies.correctionPlan` et `pricing.references.anomalies.batchProposals` retirées du router backend, du miroir `shared/api/trpc.ts`, du service frontend, des query keys et des tests contrats. Le builder `buildPricingReferenceCorrectionPlanFromRows` et ses dépendances ont été supprimés. `pricing.references.diagnose` et l'infra IA n'ont pas été modifiés.
  - Front logique minimal : `AnomalyDrillDown` consomme les nouveaux champs `groups_by_type/facets`, appelle `list` avec `marques/types`, expose un bouton `Exporter XLSX` branché sur `anomalies.export`, et supprime le bouton/dialog plan de correction. `correction-plan-dialog.tsx` supprimé.
  - UI IA visible devenue orpheline supprimée : `ai-report-synthesis.tsx` et son test retirés. Le service `diagnosePricingReference`, la procédure `pricing.references.diagnose` et l'infra IA backend restent intacts.
  - Tests : contrats backend ajoutés pour arrays bornés, rejet des scalaires legacy, réponse `summary` stricte, input/response `export` stricts ; test frontend mis à jour pour vérifier l'absence du plan et la présence de l'export.
- Écarts vs plan :
  - Déploiement exécuté après confirmation utilisateur explicite dans la suite de session.
  - L'UX Anomalies n'est pas refondue en triage groupé/facettes multi-sélection : c'est le périmètre de l'étape 2. Le miller columns existant est seulement rendu compatible avec le nouveau contrat.
  - Décision performance : volumes réels faibles/modérés (`pricing_reference_anomalies` = 1 809 lignes). `EXPLAIN` sur filtres combinés `types + marques + search` utilise l'index snapshot/type et exécute en ~0,965 ms ; pas d'index expression marque ajouté maintenant. À réévaluer si les volumes montent fortement ou si la facette marque devient lente.
- Gates : `pnpm run qa:back` ✅ (repo check, backend lint, `deno check`, 246 tests passés / 0 échec / 8 ignorés) ; `pnpm run qa:front` ✅ (repo check, typecheck, eslint, 143 fichiers de tests / 624 tests passés, error-compliance) ; `pnpm run qa:docs` ✅ ; gate final `pnpm run qa` ✅ (coverage, build, backend, intégration).
- Déploiement : `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt` ✅ ; MCP Supabase `list_edge_functions` ✅ : `api` ACTIVE, version 102, `verify_jwt=false`, import map `source/deno.json`, hash `cc47cd0626a6a006d70c61c003fe6c6c833e4477abd736d80b16b0a84344c686`.
- Vérification navigateur/runtime : navigateur non applicable pour cette tranche backend/logique ; aucune capture prise. Vérifications Supabase MCP effectuées : volumes tables, distribution anomalies par type/sévérité/marque, `EXPLAIN` filtre combiné. Probe runtime export authentifié ✅ : `anomalies.export` HTTP 200, XLSX `anomalies-referentiel-439c15dc-156a-4fc6-a5e2-415a93b9bbc7-c7f68449-a000-46eb-b8d8-650fdfbf9573.xlsx`, 603 lignes, MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, 777 044 octets, signature ZIP valide. Preflight CORS export ✅ : `OPTIONS 200`, origin `http://localhost:3000`, méthodes `GET, POST, OPTIONS`.
- Reste à faire / alertes pour la suite : l'étape 2 peut remplacer le drilldown anomalies par le vrai triage facetté et réutiliser le contrat `summary/list/export` déployé.

### [2026-07-05] Étape 0 — Shell : onglets underline + surface unique — `FAIT`
- Réalisé :
  - Onglets underline dans `PricingReferencesPage.tsx` : rail transparent `h-9` avec hairline basse `border-stone-200/60`, triggers texte `text-xs` (actif `text-stone-950 font-medium` + underline 2 px `bg-primary` via pseudo-élément `after:` posé sur la hairline, inactif `text-stone-500`), icônes supprimées (`tabItems` sans champ `icon`), compteur anomalies en `text-amber-700 font-mono text-[11px]` sans pilule.
  - `ReferenceTable` (`components/table/reference-table.tsx`) : nouvelle surface unique `rounded-xl border-stone-200/60 bg-white`, prop `toolbar?: ReactNode` rendue au-dessus du Table (hairline `border-b border-stone-200/60`, `px-4`, `min-h-11` ≈ 44 px), prop `rowKey` obligatoire (plus de `key={index}`), en-têtes Inter `text-[11px] font-medium normal-case text-stone-500` (override local du `uppercase font-semibold` de la primitive Table), lignes 36 px (`h-9 py-2`), hover `bg-stone-50`, hairlines `stone-100`, gouttières `first:pl-4 last:pr-4`.
  - `sort-button.tsx` : `font-medium normal-case`, alignement `px-0` sur la colonne, flèche accolée au label.
  - Colonnes de la page : mono retiré de Mega/Fam/SFA/Cat fab/Segment ; mono conservé uniquement sur Clé CIR, ID numérique et compteur Grilles ; libellés en `font-normal` (défaut cellule) ; `font-semibold` retiré de la clé CIR (→ `font-medium`).
  - Toolbars Segments et Classification (vue tableau) fusionnées dans la surface via la prop `toolbar` ; la bascule Vue escalier/Vue tableau vit dans la toolbar en vue tableau (elle reste au-dessus en vue escalier, à intégrer à l'étape 3) ; plus aucun élément flottant entre les onglets et la table ; grid Segments pleine largeur en permanence.
  - Détail segment : `segment-detail-panel.tsx` supprimé, remplacé par `segment-detail-dialog.tsx` (`SegmentDetailDialog`) — Dialog centré style palette Ctrl+K (mêmes overlay/ombre que `AppSearchOverlay`), en-tête marque · cat_fab + `segment_key` mono, liste clé-valeur alignée séparée par hairlines `border-stone-100`, valeurs mono réservées à ID numérique / Clé CIR / compteur.
  - Header : badge pilule « Snapshot actif » (aplat emerald-50, interdit §3) converti en dot 6 px + texte `text-[11px] text-stone-500`, aligné baseline avec le titre.
  - `pagination-bar.tsx` : `font-bold` (interdit) → `font-medium` sur le label « Lignes : ».
  - Tests : nouveau test « segment detail dialog » (row → `role="dialog"` → contenu → fermeture) dans `PricingReferencesPage.test.tsx` ; aucun test ne référençait le panneau inline.
- Écarts vs plan :
  - **D2 révisée par le PO en cours de session** : la Sheet latérale droite (implémentée puis montrée au navigateur) a été rejetée ; le détail segment s'ouvre en Dialog centré façon Ctrl+K. La décision D2 du plan a été amendée : les étapes 2 (détail anomalie) et 4 (détail import) doivent utiliser le même Dialog centré, pas de Sheet.
  - Micro-label mono uppercase non appliqué à la légende du header : la ligne dot+texte « Snapshot actif » remplit déjà ce rôle, et la règle « un seul micro-label par vue » est réservée aux vues (ex. ACTIF/HISTORIQUE à l'étape 4).
  - `Sheet.tsx` finalement non utilisé par cette page (aucune modification apportée à la primitive).
- Gates : `pnpm run qa:front` ✅ (typecheck, eslint `--max-warnings 0`, 144 fichiers / 625 tests, error-compliance) ; qa:back non applicable.
- Vérification navigateur (localhost:3000, screenshots pris en session) : Segments (surface unique + toolbar interne + dialog détail centré ouvert/fermé), Classification vue tableau (bascule + filtres dans la toolbar de la surface), Anomalies (rail underline + compteur amber ; contenu miller columns inchangé, périmètre étape 2), Imports (rail underline ; contenu inchangé, périmètre étape 4). Références consultées avant code : ui.shadcn.com/examples/tasks et linear.app.
- Reste à faire / alertes pour la suite : étapes 1-5 ; l'étape 2 et l'étape 4 doivent suivre la D2 révisée (Dialog centré) ; la bascule escalier/tableau reste flottante en vue escalier jusqu'à l'étape 3 ; le bouton « Plan de correction » et le drilldown anomalies restent en place jusqu'aux étapes 1-2.
