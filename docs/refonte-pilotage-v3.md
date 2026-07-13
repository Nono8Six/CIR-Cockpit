# Refonte Pilotage V3 — Affaires, tags, suiveurs & Ma journée

> Rédigé le 2026-07-12 après brainstorm PO. Ce document est la **source de vérité** du chantier Pilotage V3.
> Maquettes validées : https://claude.ai/code/artifact/902059be-fc7b-4cec-814b-19427bfe9e39 (V3)
> et https://claude.ai/code/artifact/1be8c8c8-5ab3-4565-b555-5140dfb71918 (audit initial).
>
> **Workflow d'exécution** : 1 phase = 1 conversation IA vierge (prompt fourni en fin de phase)
> = checkpoints vérifiés par Arnaud = 1 commit & push (décidé par Arnaud, jamais par l'IA).
> Les phases se font **strictement dans l'ordre**. Chaque phase indique son périmètre
> (backend / frontend / transverse), sa difficulté (choix du modèle IA), et si un
> déploiement Supabase est requis.

---

## 1. Objectif produit et modèle validé (PO, 2026-07-12)

### 1.1 Le problème

À l'échelle réelle (150-200 affaires > 600 € simultanées, dizaines de milliers de clients,
plusieurs commerciaux par agence), le kanban en colonnes et la liste plate sont illisibles.
Le Pilotage actuel charge en outre **toutes** les interactions de l'agence avec un plafond
codé à 200 (`DEFAULT_AGENCY_INTERACTIONS_LIMIT`, `backend/functions/api/services/entities/interactions/dataInteractions.ts`)
et filtre côté navigateur : le modèle technique casse avant même le design.

### 1.2 Les trois systèmes du modèle V3

1. **Portefeuille d'affaires curé** — une affaire entre au portefeuille si :
   - son montant ≥ **seuil paramétrable** (600 € par défaut ; réglable pour tout CIR, surcharge possible par agence), **ou**
   - elle est **suivie manuellement** (★ « Suivre l'affaire », ouvert à tous les utilisateurs).
   - Sortie : passage en Gagnée/Perdue (reste visible 30 jours dans le groupe Clôturées).
2. **Tags d'affaire** — libellés colorés libres (« Cobots », « Export », « Grands comptes »…),
   plusieurs par affaire, triables et filtrables, gérés dans Paramètres (portée agence ou tout CIR).
3. **Suiveurs multiples** — chaque affaire a des suiveurs (le créateur l'est automatiquement) ;
   n'importe qui peut s'ajouter/se retirer ou ajouter/retirer quelqu'un. Les suiveurs définissent
   « **Mes** affaires » et « **Ma** journée ».

### 1.3 Les deux écrans

- **Affaires** (remplace « Pipeline ») : table dense **groupée par étape** (sections repliables
  avec compte + somme €), vues sauvegardées, filtres (tag, étape, suiveur, montant), tri,
  pagination serveur. Pas de kanban.
- **Ma journée** : **Top 10 priorisé** (les 10 prochaines actions, chacune disant *pourquoi*),
  bloc « Réalisé hier » (devis de la veille + montants), bloc « Cette semaine » (échéances),
  mode **Triage** séquentiel au clavier pour dépiler un backlog.

### 1.4 Décisions par défaut (modifiables si Arnaud le demande en cours de route)

| Sujet | Décision |
| --- | --- |
| Nom de l'onglet | « Affaires » (vocabulaire PO) ; l'action ★ s'appelle « Suivre l'affaire » |
| Pondération Top 10 | 1) relances en retard (plus ancien d'abord, départagé par montant desc) → 2) échéances du jour (heure asc) → 3) devis envoyés la veille (montant desc) |
| Création de tags | Ouverte à tous à la volée (popover « + Créer »), gestion/archivage dans Paramètres |
| Couleurs de tags | Palette fermée de 7 couleurs (voir §2.2) — pas de color picker libre |
| Vue par défaut d'Affaires | « Mes affaires » (celles dont je suis suiveur) |

---

## 2. Design system Pilotage V3 — spécification chirurgicale

Cette section est **normative** pour les phases 3, 4 et 5. Les classes citées sont des
classes Tailwind du repo (tokens dans `frontend/src/index.css` et `tailwind.config.cjs`).
Référence d'anatomie : la page Référentiels CIR (`PricingReferencesPage.tsx`) — titre,
ligne de statut, onglets soulignés, toolbar, grille dense.

### 2.1 Fondations

- **Typo** : base 13px Inter Tight. Chiffres, montants, dates, compteurs : `font-mono tabular-nums`.
- **Grille 4 px** : tous les paddings/margins multiples de 4. Hauteur de ligne de table : **32-36 px**.
- **Élévation par surface** (`bg-card` sur `bg-ground`, `border-border` vs `border-border-subtle`),
  jamais d'ombre lourde (`shadow-soft` uniquement), jamais de gradient.
- **Montants** : format `fr-FR` EUR sans décimales (`formatPipelineAmount` existant) ;
  absence = `—` en `text-muted-foreground/60`, jamais `0 €`.
- **Dates courtes** : `Intl.DateTimeFormat('fr-FR', { weekday:'short', day:'numeric', month:'short' })`
  → « ven. 18 juil. ». Retards en relatif : « En retard · 14 j ». Jamais de « J+n » ni de « 18/07/2026 » dans les listes.

### 2.2 Composants transverses (à créer une fois, réutiliser partout)

**`AffaireTag`** — chip de tag :
`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold` +
pastille `size-1.5 rounded-full bg-current`. Couleurs (palette fermée, clé stockée en base) :
`red, blue, violet, teal, amber, green, stone` → chaque clé mappe un couple
`text-… / bg-…/10` défini dans un unique fichier `affaireTagPalette.ts`. Exemple rendu :
`<span class="text-[#2456C7] bg-[#2456C7]/10 …">● Cobots</span>` (via la palette, pas de hex inline).

**`FollowerAvatars`** — pile d'avatars :
`AvatarInitials` existant en 18 px, chevauchement `-ml-1.5`, bordure `ring-2 ring-card`,
l'utilisateur courant en `bg-primary/10 text-primary`, max 3 visibles puis `+N`.
Clic → popover suiveurs (§2.3). Tooltip = noms complets.

**`WhyPill`** — la raison d'être dans le Top 10 :
`rounded-full px-2 py-0.5 text-[10px] font-semibold`. Variantes exhaustives :
| Raison | Libellé exact | Couleurs |
| --- | --- | --- |
| Relance en retard | `Relance en retard · {n} j` | `text-destructive bg-destructive/10` |
| Échéance du jour | `Rappel aujourd'hui {HH:mm}` | `text-warning-foreground bg-warning/15` |
| Devis de la veille | `Devis envoyé hier` | palette tag `blue` |

**`FollowStar`** — étoile de suivi :
bouton icône 24 px, `Star` lucide ; suivi = `fill-warning text-warning`, non suivi =
`text-muted-foreground/40 hover:text-warning`. `aria-label` : « Suivre l'affaire {nom} » /
« Ne plus suivre {nom} ». Optimiste (toggle immédiat, rollback si erreur).
Une affaire ≥ seuil affiche l'étoile pleine **grisée** avec tooltip
« Suivie automatiquement (≥ {seuil} €) » — non désactivable par l'étoile.

### 2.3 Popovers (jamais de Sheet — règle PO : tout détail en Dialog centré, les pickers en Popover)

**Picker de tags** : recherche en tête, liste des tags (chip + compteur d'usage), coche sur
ceux assignés, dernière ligne `+ Créer « {saisie} »` en `text-primary` si la saisie ne matche
rien. Création instantanée avec couleur auto-attribuée (rotation de la palette), portée = agence courante.

**Popover suiveurs** : liste (avatar + nom + badge `· créateur`), bouton « retirer » au survol,
champ « Ajouter un suiveur… » avec autocomplete sur les membres de l'agence.

### 2.4 États obligatoires (aucune vue ne part en prod sans les six)

1. **Chargement** : `skeleton-shimmer` sur 6 lignes fantômes (jamais de spinner plein écran).
2. **Vide** : icône dans un rond `bg-success/10` ou `bg-muted`, titre 13px semibold, sous-titre
   12px muted, éventuel CTA. Microcopy exacte :
   - Affaires (vue Mes affaires vide) : « Aucune affaire suivie » / « Suivez une affaire (★) ou attendez qu'un devis dépasse {seuil} €. »
   - Top 10 vide : « Tout est à jour » / « Aucune relance en attente ni dossier à planifier. »
   - Groupe replié : compteur + somme restent visibles dans l'en-tête.
3. **Erreur** : bloc centré message français + bouton « Recharger » (pattern data-error existant).
4. **Hover** : lignes `hover:bg-surface-1`, actions révélées `sm:opacity-0 group-hover:opacity-100`
   (toujours visibles sur mobile, focusables au clavier via `group-focus-within`).
5. **Focus** : `focus-visible:ring-1 ring-primary/40` sur tout élément interactif.
6. **Ligne active (clavier)** : `border-l-2 border-l-primary bg-primary/[0.04]`.

### 2.5 Clavier

`/` recherche · `V` cycle d'onglets · `↑/↓` navigation lignes · `Entrée`/`O` ouvrir ·
`Suppr` supprimer (confirm) · mode Triage : `F` fait, `R` reporter (+2 j), `J/K` ou `←/→`
précédent/suivant, `Échap` quitter. Tout raccourci désactivé quand un champ/dialog a le focus.

### 2.6 Interdits

Pas de Sheet latérale. Pas de texte anglais ni de libellés sans accents. Pas de données
mockées ni de boutons « (Simulation) ». Pas de kanban. Pas de gradient/ombres lourdes.
Pas de « J+n » à l'écran. Pas de spinner bloquant.

---

## 3. État des lieux technique (vérifié 2026-07-12)

### 3.1 Déjà en place — à réutiliser, pas à refaire

| Brique | Où | Usage V3 |
| --- | --- | --- |
| Champs affaire : `stage`, `amount`, `quote_sent_at`, `lost_reason`, `stage_changed_at` | migration `20260710145910`, api v115 déployée | Base du portefeuille |
| Relance auto J+7 au passage `quote_sent`, actions Fait/+2 j/+1 sem, événements `stage_change`/`amount_change` | `useDashboardState.tsx` | Conservés tels quels |
| Vues sauvegardées | `directory_saved_views` (+ `DirectorySavedViewsBar`) | Étendre au type `affaires` |
| Grille dense (colonnes, densité, pagination) | `pricing-references/components/segments/*` | Modèle de la table Affaires |
| Header de page + onglets soulignés | `DashboardPageHeader.tsx` | Conserver, brancher sur stats serveur |
| Dialog centré détail + composer (statut, rappel, montant, note) | `DashboardDetailsOverlay` / `InteractionDetails*` | Ajouter tags + suiveurs |
| Système erreurs, rate-limit, accès agence | `createAppError`, `ensureAgencyAccess`, `ensureDataRateLimit` | Obligatoires sur toute nouvelle action |

### 3.2 À remplacer

- Chargement global (cap 200) + filtrage client du Pilotage → **requêtes serveur par vue** (phase 1).
- `buildMyDayView` / `buildPipelineBoard` côté client → deviennent des projections des réponses serveur
  (le tri/groupage lourd part en SQL).

### 3.3 Pièges connus (chaque prompt d'exécution les rappelle)

1. **`hydrateTimeline.ts`** garde une liste locale des types d'événements timeline : tout nouveau
   type doit être ajouté à **trois** endroits (`types.ts` union, `shared/schemas/system/data.schema.ts`
   z.enum, `hydrateTimeline.ts` array), sinon « Impossible de charger les données ».
2. **`amount`** : le driver Postgres renvoie les `numeric` en string → coercition déjà en place
   dans `interactionRowSchema` (`api-responses.ts`). Reproduire ce pattern pour toute nouvelle réponse.
3. **`shared/api/trpc.ts`** est un **miroir manuel** du routeur : toute nouvelle procédure doit y être répercutée.
4. **Migrations** : fichier dans `backend/migrations/`, application via **Supabase MCP `apply_migration`**,
   puis **renommer le fichier local** avec la version distante attribuée (parité `repo:check`).
   Jamais de `supabase db push`.
5. **`reminder_at`** : formats mixtes (timestamptz vs datetime-local) — normalisation en cours dans
   un chantier séparé ; ne pas toucher `buildInteractionEvents`/`useInteractionDetailsState` pour ça.
6. **Chantier parallèle ASSISTANT_IA** : ne jamais modifier `backend/functions/api/services/ai/*`,
   `docs/ASSISTANT_IA/*`, ni les fichiers `ai*` du schéma. Un deploy de l'Edge Function embarque
   tout le worktree : vérifier `git status` et signaler tout fichier inattendu avant deploy.

---

## 4. Découpage en phases

| Phase | Périmètre | Difficulté | Deploy Supabase | Dépend de |
| --- | --- | --- | --- | --- |
| 0 — Fondations données | Backend (DB + contrats) | Standard+ | Migration oui, deploy api non | — |
| 1 — API serveur du Pilotage | Backend (Edge Function) | **Élevée** | Deploy api oui | 0 |
| 2 — Services & hooks frontend | Frontend | Standard | Non | 1 |
| 3 — Onglet Affaires | Frontend (UI) | **Élevée** | Non | 2 |
| 4 — Ma journée V3 | Frontend (UI) | **Élevée** | Non | 2 (3 conseillé) |
| 5 — Paramètres : tags & seuils | Frontend + backend léger | Standard | Deploy api si actions ajoutées | 0, 1 |
| 6 — Historique, nettoyage, E2E, QA final | Transverse | Standard | Non | 3, 4, 5 |

**Règles d'exécution communes** (valables pour tous les prompts) :

- Lire `AGENTS.md` et invoquer les skills repo pertinents avant de coder
  (`cir-cockpit-agent-router`, puis `cir-cockpit-api-contracts` / `cir-cockpit-design` /
  `drizzle-orm` / `vitest` / `supabase-postgres-best-practices` selon le périmètre).
- Respecter le worktree : ne jamais reverter des modifications non faites par soi ;
  signaler tout fichier modifié inattendu.
- Gates : `pnpm run qa:front` (frontend), `deno lint/check/test` ciblés + `pnpm run qa:back`
  (backend), `pnpm run qa:fast` (transverse).
- **S'ARRÊTER après les checkpoints** : présenter les preuves, ne pas commit/push.
  Arnaud valide puis décide du commit.

---

## Phase 0 — Fondations données : tags, suiveurs, suivi manuel, seuil

> **Périmètre : BACKEND (DB, miroirs de types, contrats partagés)**
> **Difficulté : STANDARD+ (modèle standard correct, raisonnement soigné sur le SQL/RLS)**
> **Déploiement Supabase : migration OUI (via MCP) — pas de deploy de l'Edge Function**

### Spécification

Migration additive unique `pilotage_v3_foundations` :

```sql
-- 1. Tags d'affaire (portée agence, ou tout CIR si agency_id null)
create table public.affaire_tags (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade, -- null = tout CIR
  label text not null check (char_length(label) between 1 and 40),
  color text not null check (color in ('red','blue','violet','teal','amber','green','stone')),
  archived_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index affaire_tags_label_unique
  on public.affaire_tags (coalesce(agency_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(label))
  where archived_at is null;

-- 2. Liaison affaire <-> tags (interactions.id est de type text)
create table public.interaction_tag_links (
  interaction_id text not null references public.interactions(id) on delete cascade,
  tag_id uuid not null references public.affaire_tags(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (interaction_id, tag_id)
);
create index interaction_tag_links_tag_idx on public.interaction_tag_links (tag_id);

-- 3. Suiveurs
create table public.interaction_followers (
  interaction_id text not null references public.interactions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (interaction_id, user_id)
);
create index interaction_followers_user_idx on public.interaction_followers (user_id);

-- 4. Suivi manuel de l'affaire (l'etoile)
alter table public.interactions
  add column if not exists tracked_at timestamptz,
  add column if not exists tracked_by uuid references public.profiles(id);

-- 5. Seuil du portefeuille (ligne agency_id null = valeur globale CIR)
create table public.pilotage_settings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid unique references public.agencies(id) on delete cascade,
  tracked_amount_threshold numeric(12,2) not null check (tracked_amount_threshold >= 0),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.pilotage_settings (agency_id, tracked_amount_threshold) values (null, 600);

-- 6. Index de requetage du portefeuille
create index if not exists idx_interactions_agency_amount on public.interactions (agency_id, amount) where amount is not null;
create index if not exists idx_interactions_agency_reminder on public.interactions (agency_id, reminder_at) where reminder_at is not null;

-- 7. Backfill : le createur suit ses dossiers ouverts
insert into public.interaction_followers (interaction_id, user_id)
select id, created_by from public.interactions where status_is_terminal = false
on conflict do nothing;
```

- **RLS** : activer + `force` sur les 3 nouvelles tables, politiques calquées sur une table
  métier existante du repo (lecture/écriture membres de l'agence, `authenticated`), vérifiées
  par `get_advisors` (aucun nouveau WARN toléré hors waivers connus).
- Triggers `updated_at` : réutiliser la fonction de trigger existante du repo.
- **Miroirs** : `shared/supabase.types.ts` (Row/Insert/Update des 3 tables + 2 colonnes interactions),
  `backend/drizzle/schema.ts` (mêmes conventions `$type<>` que les tables voisines).
- **Contrats partagés** : `shared/schemas/pilotage/affaires.schema.ts` — zod pour :
  `affaireTagColorSchema` (enum des 7), payloads tags CRUD, follow/unfollow, track/untrack,
  settings get/set, tous `.strict()`, messages français.

### Checkpoints (à présenter à Arnaud avant tout commit)

1. `supabase migration list` : la nouvelle version distante apparaît ; le fichier local est renommé à cette version ; `pnpm run repo:check` passe.
2. SQL de preuve (via MCP `execute_sql`) : `select count(*) from interaction_followers` > 0 (backfill) ; `select tracked_amount_threshold from pilotage_settings where agency_id is null` = 600.
3. `get_advisors` (security) : aucun nouveau lint par rapport à l'état antérieur.
4. `deno check --config backend/deno.json supabase/functions/api/index.ts` et `pnpm --dir frontend run typecheck` verts (miroirs cohérents).
5. `pnpm run qa:back` vert.

### Prompt d'exécution (conversation vierge)

```
Tu travailles dans le repo CIR Cockpit (C:\GitHub\CIR_Cockpit\CIR-Cockpit). Lis d'abord
AGENTS.md, puis docs/refonte-pilotage-v3.md en ENTIER (c'est la source de vérité), en
particulier §1 (modèle), §3.3 (pièges) et la Phase 0. Invoque les skills
cir-cockpit-agent-router, supabase-postgres-best-practices et drizzle-orm avant de coder.

Mission — Phase 0 uniquement : créer les fondations de données du Pilotage V3.
1. Écris la migration `pilotage_v3_foundations` EXACTEMENT selon la spec §Phase 0 du plan
   (tables affaire_tags / interaction_tag_links / interaction_followers, colonnes
   tracked_at/tracked_by sur interactions, table pilotage_settings avec seed global 600 €,
   index, backfill des suiveurs, RLS + force RLS + politiques calquées sur une table métier
   existante, triggers updated_at réutilisant la fonction du repo).
2. Applique-la via Supabase MCP apply_migration (JAMAIS db push), puis renomme le fichier
   local backend/migrations/ avec la version distante attribuée (parité repo:check).
3. Mets à jour les miroirs : shared/supabase.types.ts (ordre alphabétique des clés) et
   backend/drizzle/schema.ts (conventions $type<> des tables voisines ; interactions.id est TEXT).
4. Crée shared/schemas/pilotage/affaires.schema.ts : zod .strict(), messages en français,
   enum de couleurs ('red','blue','violet','teal','amber','green','stone'), payloads tags
   CRUD / follow / track / settings.
5. Vérifie avec get_advisors (security) qu'aucun nouveau lint n'apparaît.

Contraintes : ne touche à AUCUN fichier ai*/ASSISTANT_IA (chantier parallèle). Ne déploie
PAS l'Edge Function. Pas de code mort ni de TODO. Si un fichier du worktree semble modifié
par ailleurs, signale-le sans le reverter.

Validation avant de rendre la main : les 5 checkpoints de la Phase 0 du plan, avec preuves
(sorties de commandes, résultats SQL). Ensuite STOP : ne commit pas, ne push pas —
présente un récapitulatif et attends la validation d'Arnaud.
```

---

## Phase 1 — API serveur du Pilotage : requêtes par vue

> **Périmètre : BACKEND (Edge Function api, contrats tRPC)**
> **Difficulté : ÉLEVÉE — modèle high-end, raisonnement au maximum (agrégations SQL, contrats, sécurité)**
> **Déploiement Supabase : deploy Edge Function `api` OUI (+ probes post-deploy)**

### Spécification

Nouveau domaine tRPC `data.affaires` (sous-routeur dédié, service
`backend/functions/api/services/entities/affaires/`), toutes actions `authedProcedure`
avec `ensureAgencyAccess` + `ensureDataRateLimit`. **Définition SQL du portefeuille** :

```sql
-- seuil effectif = surcharge agence sinon global sinon 600
amount >= seuil_effectif OR tracked_at IS NOT NULL
```

Actions :

| Action | Entrée (zod .strict()) | Sortie |
| --- | --- | --- |
| `affaires_list` | agency_id, search?, stages?[], tag_ids?[], follower_id?, min_amount?, only_followed_by_me?, group_by ('stage'\|'tag'\|'none'), sort {by: 'amount'\|'next_reminder'\|'last_action'\|'stage_age', dir}, limit (≤100), offset | rows (affaires + tags[] + followers[] agrégés), groups [{key, label, count, total_amount}] calculés SQL (count/somme par groupe SUR TOUT le filtre, pas sur la page), total_count, total_amount |
| `affaires_myday` | agency_id | top: max 10 items {interaction, reason: 'overdue'\|'due_today'\|'quote_yesterday', reason_value}, queue_count, yesterday: {rows, total_amount}, week: [{day_label, reminder_count, total_amount}], header: {open_count, portfolio_count, portfolio_amount, overdue_count, due_today_count, won_30d, lost_30d} |
| `follow` / `unfollow` | interaction_id, user_id (défaut = soi) | followers à jour |
| `track` / `untrack` | interaction_id | affaire à jour (tracked_at/tracked_by) |
| `tags_list` | agency_id | tags actifs (agence + globaux) + usage_count |
| `tags_create` | agency_id, label, color? (auto-rotation sinon) | tag créé (tout utilisateur authentifié) |
| `tags_archive` | tag_id | ok (admin/superAdmin) |
| `tag_assign` / `tag_unassign` | interaction_id, tag_id | tags de l'affaire |
| `settings_get` | agency_id | {global_threshold, agency_threshold?, effective_threshold} |
| `settings_set` | scope ('global'\|'agency'), agency_id?, threshold | à jour (global = superAdmin ; agency = admin de l'agence) |

Priorisation `affaires_myday.top` (ORDER BY SQL, pas en JS) — ne concerne que les dossiers
**dont l'appelant est suiveur**, non terminés :
1. `reminder_at < now()` → tri `reminder_at ASC`, départage `amount DESC NULLS LAST` ;
2. `reminder_at` aujourd'hui (>= now) → tri `reminder_at ASC` ;
3. `quote_sent_at` = hier → tri `amount DESC NULLS LAST`.
`yesterday` = devis envoyés hier (tous suiveurs confondus de l'agence ? NON : ceux de l'appelant).
`week` = rappels J+1..J+7 de l'appelant, agrégés par jour.

Obligations : réponses validées par schémas dans `shared/schemas/system/api-responses.ts`
(coercition numeric→number comme `interactionRowSchema`), **miroir `shared/api/trpc.ts`**,
tests Deno (unitaires sur les requêtes buildées + `payloadContracts_test.ts` étendu),
`list_by_agency` existant **inchangé** (les autres onglets en dépendent).

Déploiement : `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt`
puis probes : `list_edge_functions` (entrypoint wrapper + verify_jwt=false), appel réel d'une
route `data.affaires` (pas de 404), preflight CORS.

### Checkpoints

1. `deno test` ciblé affaires + payloadContracts : verts ; `pnpm run qa:back` vert.
2. Probe runtime (curl ou navigateur) : `affaires_list` renvoie groups avec counts/sommes exacts vérifiés contre un `execute_sql` de contrôle.
3. `affaires_myday` : le top respecte l'ordre spécifié sur les données réelles (preuve : réponse JSON commentée).
4. `shared/api/trpc.ts` à jour ; `pnpm --dir frontend run typecheck` vert.
5. Edge Function version incrémentée, `verify_jwt=false`, aucun fichier du chantier ASSISTANT_IA modifié (`git status` en preuve).

### Prompt d'exécution (conversation vierge)

```
Repo CIR Cockpit (C:\GitHub\CIR_Cockpit\CIR-Cockpit). Lis AGENTS.md puis
docs/refonte-pilotage-v3.md en ENTIER — exécute la Phase 1 uniquement. Invoque
cir-cockpit-agent-router, cir-cockpit-api-contracts, drizzle-orm et
supabase-postgres-best-practices avant de coder. La Phase 0 est déjà en base.

Mission : créer le domaine tRPC data.affaires (service backend/functions/api/services/entities/affaires/)
avec TOUTES les actions du tableau de la Phase 1 du plan : affaires_list (filtres + group_by
+ tri + pagination + agrégats par groupe calculés en SQL sur tout le filtre), affaires_myday
(top 10 priorisé selon l'ordre EXACT du plan, réalisé hier, semaine, stats d'en-tête),
follow/unfollow, track/untrack, tags (list/create/archive/assign/unassign), settings
(get/set avec hiérarchie global CIR → agence et droits superAdmin/admin).

Exigences non négociables : authedProcedure + ensureAgencyAccess + ensureDataRateLimit sur
tout ; zod .strict() partagés (étendre shared/schemas/pilotage/affaires.schema.ts) ; réponses
validées dans api-responses.ts avec coercition numeric→number (copier le pattern
interactionRowSchema) ; MIROIR MANUEL shared/api/trpc.ts à répercuter ; list_by_agency
existant INCHANGÉ ; httpError/messages français ; tests Deno unitaires + extension de
payloadContracts_test.ts.

Déploiement : deno check du graphe complet + suite deno verte AVANT deploy ; vérifie
git status et signale tout fichier hors périmètre (chantier ASSISTANT_IA notamment) ;
puis `supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api
--import-map deno.json --no-verify-jwt` ; probes post-deploy (list_edge_functions,
route data.affaires réelle, preflight CORS).

Rends les 5 checkpoints de la Phase 1 avec preuves, puis STOP : pas de commit/push,
attends la validation d'Arnaud.
```

---

## Phase 2 — Services RPC & hooks frontend

> **Périmètre : FRONTEND (services, React Query — pas d'UI)**
> **Difficulté : STANDARD**
> **Déploiement Supabase : NON**

### Spécification

- `frontend/src/services/affaires/` : un fichier par action (convention repo), via `invokeTrpc`
  + safeParse des réponses partagées. Erreurs via `handleUiError`.
- `frontend/src/services/query/queryKeys.ts` : clés `affairesList(agencyId, params)`,
  `affairesMyDay(agencyId)`, `affaireTags(agencyId)`, `pilotageSettings(agencyId)`.
- Hooks `frontend/src/hooks/affaires/` : `useAffairesList` (keepPreviousData, pagination),
  `useMyDay`, `useAffaireTags`, mutations (follow, track, tag assign, settings) avec
  invalidations ciblées + optimisme sur follow/track/tag (rollback on error).
- `useRealtimeInteractions` : étendre l'invalidation aux nouvelles clés quand une interaction change.
- **Aucun changement d'UI** dans cette phase.

### Checkpoints

1. Tests Vitest des services (fixtures de réponses réelles) + hooks critiques : verts.
2. `pnpm run qa:front` vert.
3. Preuve d'appel réel : un test manuel dans la console réseau (ou petit script) montrant `affaires_list` consommé et parsé sans erreur.

### Prompt d'exécution (conversation vierge)

```
Repo CIR Cockpit. Lis AGENTS.md puis docs/refonte-pilotage-v3.md (Phase 2 uniquement ;
Phases 0-1 livrées : le domaine tRPC data.affaires est déployé). Invoque
cir-cockpit-agent-router, cir-cockpit-api-contracts, vercel-react-best-practices et vitest.

Mission : couche d'accès frontend SANS UI. Services frontend/src/services/affaires/
(un fichier par action, invokeTrpc + safeParse des schémas partagés, handleUiError),
clés dans services/query/queryKeys.ts, hooks frontend/src/hooks/affaires/
(useAffairesList avec keepPreviousData et pagination, useMyDay, useAffaireTags,
mutations follow/track/tag/settings avec updates optimistes + rollback + invalidations
ciblées). Étends useRealtimeInteractions pour invalider les nouvelles clés.
Tests Vitest sur services et hooks (fixtures = réponses JSON réelles de la Phase 1).

Interdits : modifier l'UI du dashboard, toucher aux chantiers parallèles, any, console.error.
Gates : pnpm run qa:front. Rends les 3 checkpoints de la Phase 2 avec preuves, puis STOP —
pas de commit, validation Arnaud d'abord.
```

---

## Phase 3 — Onglet « Affaires » : table dense groupée, vues, tags, suiveurs

> **Périmètre : FRONTEND (UI majeure)**
> **Difficulté : ÉLEVÉE — modèle high-end, raisonnement au maximum (craft UI, la barre est la page Référentiels)**
> **Déploiement Supabase : NON**

### Spécification (maquette B — normative, avec §2 du plan)

Renommer l'onglet « Pipeline » → **« Affaires »** (compteur = portefeuille). Structure :

1. **Toolbar** : recherche (`sm:max-w-xs`) · filtres en Popover (`Tag`, `Étape`, `Suiveur`,
   `Montant ≥`) matérialisés en chips retirables quand actifs · à droite le total de la vue :
   `158 affaires · 704 300 €` (mono, mis à jour par la réponse serveur).
2. **Vues sauvegardées** (rangée de chips sous la toolbar) : `Mes affaires` (défaut),
   `Toutes`, puis les vues utilisateur (réutiliser `directory_saved_views` avec un
   `view_kind: 'affaires'` — état sérialisé = filtres + group_by + tri), chip `+ Enregistrer la vue`
   (Dialog centré : nom + défaut). Compteurs par chip fournis par le serveur si peu coûteux, sinon omis.
3. **Table groupée** : par groupe une carte `rounded-xl border bg-card` — en-tête
   `bg-wire` : caret repli, nom d'étape (11px, 750, uppercase), `count` mono, somme € alignée
   droite (12px, bold). Repli persisté en localStorage. Lignes (grid, 32-36px) :
   `[★ 22px] [Affaire 1.25fr : client semibold 11.5px + sujet 10px muted] [Tags .9fr] [Montant 6rem droite mono] [Prochaine relance 7.5rem : WhyPill si retard, sinon date courte] [Dernière action 6.5rem relative («il y a 16 j»)] [Suiveurs 4.2rem] [⋯ 24px]`.
   Menu ⋯ : Ouvrir, Changer d'étape (sous-menu), Gagnée, Perdue… (dialog motif existant),
   Tags…, Suiveurs…, Supprimer. Clic ligne = Dialog détail. `↑/↓` + Entrée au clavier.
4. **Pagination serveur** : bouton « Charger 50 de plus » par groupe déplié (ou global selon group_by),
   états chargement = 6 lignes skeleton.
5. **Dialog détail** : ajouter rangée tags (chips + bouton `+`) et pile suiveurs dans l'en-tête,
   branchées sur les popovers §2.3.
6. Group_by commutable Étape (défaut) / Tag / Aucun (Suiveur en v2 si simple).
7. Header de page : compteur de l'onglet Affaires = `portfolio_count` serveur ; la ligne de
   stats du header consomme `affaires_myday.header`.
8. Supprimer l'ancien `DashboardPipeline` + colonnes kanban et leur code mort une fois la table branchée.

Tous les états §2.4, tous les composants §2.2/§2.3, microcopy française exacte.

### Checkpoints

1. Navigateur : la table groupée s'affiche avec les données réelles, sommes par groupe = contrôle SQL (`execute_sql`), repli/dépli persistant, « Charger plus » fonctionne.
2. ★ suivi, tags (assignation + création à la volée), suiveurs (ajout/retrait) : chaque action persiste (recharger la page pour prouver), avec update optimiste visible.
3. Vues sauvegardées : créer « Cobots », recharger, la vue restaure filtres + compteur.
4. États : vide (vue sans résultat), chargement (skeletons), erreur (déconnecter le réseau) — captures.
5. Clavier : ↑/↓/Entrée + `/` + `V`. Console navigateur vide. `pnpm run qa:front` vert (tests composants inclus).

### Prompt d'exécution (conversation vierge)

```
Repo CIR Cockpit. Lis AGENTS.md puis docs/refonte-pilotage-v3.md EN ENTIER — §1, §2
(design system NORMATIF), §3.3 (pièges) et Phase 3. Regarde les maquettes
https://claude.ai/code/artifact/902059be-fc7b-4cec-814b-19427bfe9e39 (maquette B) et la
page Référentiels CIR en local (http://localhost:3000/remises/referentiels, identifiants
E2E dans frontend/.env.e2e) : c'est la barre de qualité. Invoque cir-cockpit-agent-router,
cir-cockpit-design, vercel-react-best-practices, vercel-composition-patterns et vitest.
Phases 0-2 livrées : hooks useAffairesList/useAffaireTags/mutations disponibles.

Mission : remplacer l'onglet Pipeline par l'onglet « Affaires » selon la spec Phase 3 :
table dense groupée par étape (cartes repliables avec compte + somme €), toolbar filtres
+ total de vue, rangée de vues sauvegardées (réutiliser directory_saved_views avec
view_kind 'affaires'), composants transverses AffaireTag / FollowerAvatars / FollowStar /
WhyPill (spec §2.2 exacte), popovers tags et suiveurs (§2.3), menu ⋯ par ligne, ajout
tags+suiveurs au Dialog détail, pagination serveur « Charger 50 de plus », group_by
Étape/Tag/Aucun. Supprime ensuite DashboardPipeline et le code kanban mort.

Exigences : grille 4px, lignes 32-36px, mono tabular-nums pour tout chiffre, les SIX états
de §2.4 avec la microcopy exacte, clavier §2.5, interdits §2.6 (jamais de Sheet, jamais de
J+n, français accentué partout). Tests Vitest des nouveaux composants + mise à jour des
tests/E2E impactés. Gate : pnpm run qa:front, puis vérification navigateur complète
(connexion réelle, actions persistées, console vide).

Rends les 5 checkpoints de la Phase 3 avec captures d'écran, puis STOP — pas de commit,
validation Arnaud d'abord.
```

---

## Phase 4 — « Ma journée » V3 : Top 10, Réalisé hier, Cette semaine, mode Triage

> **Périmètre : FRONTEND (UI majeure)**
> **Difficulté : ÉLEVÉE — modèle high-end, raisonnement au maximum**
> **Déploiement Supabase : NON**

### Spécification (maquette A — normative, avec §2 du plan)

1. **Top 10** (`useMyDay`) : carte unique `rounded-xl border divide-y`. Ligne (grid ~32px) :
   `[rang mono 11px, rouge si retard] [client semibold 12px + contact 10px] [sujet + tags] [WhyPill] [montant mono 12px droite, — si absent] [suiveurs] [actions hover : ✓ Fait · +2 j · Ouvrir]`.
   En-tête : « À traiter maintenant — tes 10 prochaines actions, sur {queue_count} en file » +
   boutons `⏵ Mode triage` et lien « Voir toute la file ({n}) ».
   Actions branchées sur les handlers existants (handleCompleteReminder / handlePostponeReminder).
2. **« Voir toute la file »** : bascule vers la liste groupée existante (4 groupes) — conservée
   comme niveau secondaire, alimentée serveur.
3. **Réalisé hier / Cette semaine** : deux cartes 50/50 (`day-card` maquette) — hier : devis
   envoyés la veille (client — sujet, montant), total dans l'en-tête ; semaine : une ligne par
   jour (« mer. — 3 relances planifiées · 22 100 € »). Liens vers Historique / file filtrée.
4. **Mode Triage** : Dialog centré `max-w-3xl` (JAMAIS plein écran ni Sheet) — une affaire à la
   fois : en-tête (client, montant, tags, WhyPill), 3 derniers événements timeline, actions
   `F` Fait · `R` +2 j · `O` Ouvrir le détail complet · `J/K` naviguer · `Échap` quitter,
   barre de progression « 4 / 27 », état final « File traitée 🎉 » sobre (texte, pas d'emoji —
   « File traitée. Belle séance. »).
5. Ma journée reste l'onglet par défaut ; son compteur = retards + aujourd'hui (rouge si retard).

### Checkpoints

1. Navigateur : Top 10 ordonné exactement selon la règle (§Phase 1) — preuve croisée avec la réponse JSON ; les WhyPills correspondent aux 3 variantes.
2. « Réalisé hier » affiche les devis de la veille avec somme juste (contrôle SQL).
3. Mode Triage : parcours complet au clavier d'au moins 3 affaires réelles (Fait/reporter), avec persistance vérifiée après rechargement.
4. Actions rapides du Top 10 : ✓ Fait retire la ligne et le rang 11 remonte.
5. États vide/chargement/erreur conformes §2.4 ; console vide ; `pnpm run qa:front` vert.

### Prompt d'exécution (conversation vierge)

```
Repo CIR Cockpit. Lis AGENTS.md puis docs/refonte-pilotage-v3.md EN ENTIER — §2 est
NORMATIF, Phase 4 est ta mission. Maquette A :
https://claude.ai/code/artifact/902059be-fc7b-4cec-814b-19427bfe9e39. Invoque
cir-cockpit-agent-router, cir-cockpit-design, vercel-react-best-practices et vitest.
Phases 0-3 livrées (hook useMyDay disponible, onglet Affaires en place).

Mission : reconstruire l'onglet « Ma journée » : Top 10 priorisé serveur (rangs, WhyPills
aux 3 variantes exactes du §2.2, montants mono, suiveurs, actions hover ✓ Fait/+2 j/Ouvrir
branchées sur les handlers existants), lien « Voir toute la file » vers la liste groupée
existante conservée en niveau 2, cartes « Réalisé hier » (devis de la veille + somme) et
« Cette semaine » (échéances par jour), et mode Triage en Dialog CENTRÉ max-w-3xl
(une affaire à la fois, clavier F/R/O/J/K/Échap, progression n/total, fin de file sobre).

Exigences : les SIX états §2.4, microcopy française exacte du plan, clavier §2.5 sans
conflit avec les raccourcis globaux, interdits §2.6. Tests Vitest (Top 10 rendu + triage
navigation) + E2E impactés. Gate : pnpm run qa:front + vérification navigateur réelle
(actions persistées, console vide).

Rends les 5 checkpoints de la Phase 4 avec captures, puis STOP — validation Arnaud avant commit.
```

---

## Phase 5 — Paramètres : gestion des tags & hiérarchie des seuils

> **Périmètre : FRONTEND (+ compléments backend mineurs si une action manque)**
> **Difficulté : STANDARD**
> **Déploiement Supabase : deploy api UNIQUEMENT si une action backend est ajoutée**

### Spécification

Nouvelle section « Pilotage » dans `/settings` (même anatomie que les sections existantes) :

1. **Tags d'affaires** : table (chip couleur + libellé, portée « Agence » / « Tout CIR »,
   nombre d'affaires, créé par, date) ; création (Dialog : libellé, couleur parmi les 7,
   portée — « Tout CIR » réservé superAdmin) ; renommage inline ; archivage avec confirm
   (« Le tag sera retiré des filtres ; les affaires déjà taguées le conservent en lecture. ») ;
   pas de fusion en v1.
2. **Seuil du portefeuille** : carte hiérarchique — ligne « Tout CIR » (éditable superAdmin),
   puis chaque agence avec « hérite ({valeur} €) » ou valeur surchargée + bouton
   « Revenir à l'héritage ». Admin d'agence : ne voit/édite que la sienne. Aide contextuelle :
   « Toute affaire dont le montant atteint ce seuil entre automatiquement au portefeuille.
   Le suivi manuel (★) reste possible sous le seuil. »
3. Modifier un seuil invalide les caches Affaires/Ma journée.

### Checkpoints

1. Créer un tag agence + un tag global (superAdmin), le voir apparaître dans le picker côté Affaires sans recharger.
2. Archiver un tag : il disparaît des filtres/picker, reste affiché sur une affaire taguée.
3. Surcharger le seuil d'une agence à 1 000 € : une affaire à 800 € non suivie sort du portefeuille (preuve avant/après) ; « Revenir à l'héritage » la fait revenir.
4. Droits : un admin d'agence ne peut pas éditer le seuil global (UI + refus backend prouvé).
5. `pnpm run qa:front` vert (+ `qa:back` et deploy + probes si backend touché).

### Prompt d'exécution (conversation vierge)

```
Repo CIR Cockpit. Lis AGENTS.md puis docs/refonte-pilotage-v3.md (§2 normatif, Phase 5 =
ta mission ; Phases 0-4 livrées). Invoque cir-cockpit-agent-router, cir-cockpit-design,
et cir-cockpit-api-contracts si tu dois compléter une action backend.

Mission : section « Pilotage » dans /settings, même anatomie que les sections existantes :
(1) gestion des tags d'affaires (table, création en Dialog centré avec palette fermée de 7
couleurs et portée Agence/Tout CIR — global réservé superAdmin, renommage, archivage avec
confirmation, compteur d'usage) ; (2) hiérarchie des seuils du portefeuille (Tout CIR
éditable superAdmin, surcharge par agence avec « hérite » / « Revenir à l'héritage »,
admin d'agence limité à la sienne) ; (3) invalidation des caches Affaires/Ma journée après
modification. Si une action backend manque, ajoute-la selon les patterns de la Phase 1
(zod strict partagé, miroir shared/api/trpc.ts, tests Deno, deploy + probes).

Gate : pnpm run qa:front (+ qa:back et deploy si backend touché). Rends les 5 checkpoints
de la Phase 5 avec preuves, puis STOP — validation Arnaud avant commit.
```

---

## Phase 6 — Historique serveur, nettoyage, E2E, QA final

> **Périmètre : TRANSVERSE (frontend + backend léger + docs)**
> **Difficulté : STANDARD**
> **Déploiement Supabase : NON (sauf correctif découvert)**

### Spécification

1. **Historique** : passer la liste en pagination/filtre serveur (action dédiée ou extension
   `list_by_agency` avec période + pagination), footer « Affichage 1-50 sur N » comme les
   Référentiels ; badge statut, recherche et filtres de période conservés.
2. **Nettoyage** : supprimer les chemins morts du Pilotage client-side (l'ancien
   `filterInteractionsByViewMode` pour les vues migrées serveur, utilitaires devenus inutiles),
   vérifier qu'aucun autre onglet ne casse (cockpit « interactions récentes » notamment).
3. **E2E** : réécrire `dashboard-p06.spec.ts` pour le parcours V3 (Ma journée Top 10 → Affaires
   table → suivre/taguer → Historique), vérifier `interactions-cockpit.spec.ts`.
4. **QA final** : lire `docs/qa-runbook.md`, dérouler `pnpm run qa` complet + probes conditionnelles.
5. **Docs** : cocher ce plan (changelog par phase en bas de ce fichier), mettre à jour
   `docs/plan.md` si pertinent.

### Checkpoints

1. Historique paginé serveur : 1 000+ lignes simulées ne dégradent pas le temps de chargement (preuve réseau).
2. `rg` de contrôle : plus aucune référence aux utilitaires supprimés ; `knip`/imports morts absents des fichiers touchés.
3. `RUN_E2E=1 pnpm --dir frontend run test:e2e` : specs dashboard vertes (ou liste des skips justifiés).
4. `pnpm run qa` COMPLET vert, `repo:check` vert.
5. Changelog de phases complété dans ce document.

### Prompt d'exécution (conversation vierge)

```
Repo CIR Cockpit. Lis AGENTS.md, docs/qa-runbook.md, puis docs/refonte-pilotage-v3.md
(Phase 6 = ta mission ; Phases 0-5 livrées). Invoque cir-cockpit-agent-router,
cir-cockpit-qa-validation et playwright-cli.

Mission de clôture : (1) passer l'onglet Historique en pagination + filtres serveur
(pattern des Référentiels, footer « Affichage 1-50 sur N ») ; (2) supprimer le code
client-side mort du Pilotage en vérifiant qu'aucun autre écran n'en dépend ;
(3) réécrire frontend/e2e/dashboard-p06.spec.ts pour le parcours V3 complet (Ma journée
Top 10 → Affaires : suivre ★, taguer, filtrer par vue → Historique paginé) et vérifier
interactions-cockpit.spec.ts ; (4) dérouler le gate FINAL : pnpm run qa complet + E2E
(RUN_E2E=1) + probes du runbook ; (5) compléter le changelog des phases en bas de
docs/refonte-pilotage-v3.md.

Rends les 5 checkpoints de la Phase 6 avec preuves, puis STOP — validation Arnaud avant
commit & push final.
```

---

## 5. Suites possibles (hors plan, à décider plus tard)

- Vue « board » optionnelle sur une vue Affaires déjà filtrée (< 30 cartes), façon Attio.
- Briefing IA en tête de Ma journée (le chantier ASSISTANT_IA fournira le socle).
- Fusion de tags, tags par famille produit, group_by Suiveur.
- Notifications (relance en retard depuis n jours → cloche du header).

## 6. Changelog des phases (à compléter à la fin de chaque phase)

| Phase | Date | Exécutant | Commit | Notes |
| --- | --- | --- | --- | --- |
| 0 | — | — | — | — |
| 1 | — | — | — | — |
| 2 | — | — | — | — |
| 3 | — | — | — | — |
| 4 | — | — | — | — |
| 5 | — | — | — | — |
| 6 | — | — | — | — |
