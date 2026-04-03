# Migration `/clients` vers fiche full page cockpit

Source de verite runtime :
- la route active `/clients` rend `ClientDirectoryPage`
- la stack legacy `ClientsPanel` a ete supprimee du repo
- le drawer demi-page actuel sur la vraie stack `client-directory` est considere comme une experimentation a abandonner
- la cible produit devient une fiche client/prospect full page, plus adaptee a une entite CRM riche

## Objectif

Transformer `/clients` en workflow CRM robuste et evolutif :

- `/clients` reste une liste dense et scannable
- un clic sur une ligne ouvre une fiche full page canonique
- le retour vers la liste conserve les filtres/recherche/pagination
- la fiche detail devient un vrai dashboard client/prospect, structure et extensible
- chaque etape est executee dans l ordre, avec arret obligatoire et verification complete avant de passer a la suivante

## Repartition stricte des roles

- Gemini :
  - design pur
  - UI/UX
  - polish visuel
  - motion si explicitement demande dans une etape dediee
- Codex :
  - logique
  - routing
  - transport et preservation de la search state
  - prev/next
  - extraction technique de composants si necessaire
  - tests
  - QA
  - fact-check complet de tout ce que Gemini annonce

## Regle d execution obligatoire

Aucune etape ne peut etre consideree terminee tant que :
- Gemini a rendu sa reponse si l etape lui appartient
- Codex a verifie le code reel point par point
- les checks techniques requis ont passe
- la verification runtime a ete faite
- le markdown a ete mis a jour honnetement

Si Gemini affirme quelque chose qui n est pas vrai dans le code ou dans le runtime :
- on stoppe
- Codex corrige la realite technique
- Codex corrige le markdown
- on ne passe pas a l etape suivante

---

# Etat actuel confirme avant lancement de cette nouvelle feuille de route

## Phase 1 precedente

- l experience drawer/master-detail desktop a ete implementee sur la vraie stack
- cette direction est maintenant remise en cause pour raison UX produit
- le split casse la lisibilite de la liste et contraint la croissance de la fiche

## Phase 2

- [x] Phase 2A - Surface smart pills
- [x] Phase 2B - Logique smart pills / URL / orchestration
- [x] Phase 2C - Polish visuel final

## Phase 3

- [x] Data grid haute densite

## Phase 4

- [ ] Experience mobile en cartes

## Decision produit actualisee

- la prochaine priorite n est plus la Phase 4
- la priorite devient une migration de la fiche detail vers le mode full page
- le drawer master-detail est abandonne comme direction principale

---

# Nouvelle feuille de route ordonnee

## Etape 1A - Rollback architecture vers fiche full page canonique

### Responsable

- Codex uniquement

### Objectif

Supprimer le drawer comme parcours principal et revenir a une navigation full page canonique pour les fiches clients/prospects, tout en preservant l etat de liste dans l URL.

### Changements attendus

- suppression des routes drawer overlay
- suppression des route masks
- suppression du composant `ClientDirectoryDrawerRoute`
- suppression du branchement desktop drawer dans `ClientDirectoryPage`
- navigation toujours directe vers :
  - `/clients/$clientNumber`
  - `/clients/prospects/$prospectId`
- ajout de `validateSearch: validateDirectorySearch` sur les routes detail canoniques
- transmission de la `search` courante lors du clic depuis la liste vers la fiche detail
- maintien d un fallback robuste au retour vers `/clients`

### Regles UX

- l utilisateur doit toujours pouvoir revenir a sa liste filtree
- aucun comportement drawer ne doit subsister
- le comportement mobile/tablette reste full page

### Verification obligatoire avant cloture de 1A

- typecheck
- lint
- tests cibles `client-directory`
- build
- verification navigateur :
  - clic ligne -> fiche full page
  - retour -> liste avec filtres preserves
  - acces direct bookmark -> fiche OK
  - mobile/tablette -> fiche full page OK

### Statut

- [x] Faite
- Verification terminee par Codex le 2026-03-28 :
  - routes drawer et masks supprimes
  - navigation liste -> fiche full page canonique avec `search` preservee
  - retour navigateur -> liste filtree verifie
  - acces direct `/clients/116277` -> fiche OK avec search validee par defaut
  - `pnpm run qa` passe apres injection explicite de `deno` dans le `PATH` de la session

### Arret obligatoire

Ne pas passer a 1B tant que 1A n est pas codee, testee et verifiee.

---

## Etape 1B - Navigation relative prev/next dans la fiche full page

### Responsable

- Codex uniquement

### Objectif

Ajouter une navigation relative robuste `precedent / suivant` dans la fiche full page, sans reintroduire de split view.

### Decision verrouillee

Le `prev/next` est limite a la page filtree courante.
Il ne tente pas de naviguer sur tout le dataset global.

### Changements attendus

- la fiche detail reutilise la `search` validee de la route courante
- la fiche appelle `useDirectoryPage(search)` pour connaitre les lignes de la page filtree courante
- si l entite affichee existe dans cette page :
  - afficher les controles `precedent` / `suivant`
  - naviguer vers l entite adjacente en conservant la `search`
- si l entite n existe pas dans les lignes courantes :
  - masquer ou desactiver `precedent` / `suivant`
- aucun backend supplementaire
- aucune API custom pour adjacency globale

### Regles UX

- le `prev/next` ne doit jamais mentir
- si le contexte de liste n existe pas, il n y a pas de navigation relative
- le retour liste reste plus important que le `prev/next`

### Verification obligatoire avant cloture de 1B

- tests unitaires/integration pour prev/next
- verification runtime :
  - filtre liste -> ouvre fiche -> suivant/precedent coherents
  - acces direct -> pas de faux prev/next
  - la `search` reste preservee sur navigation relative

### Statut

- [x] Faite

### Validation reelle

- logique prev/next implemente sur la fiche full page canonique
- tests unitaires client-directory verts
- Playwright /clients verts : `clients-p05.spec.ts`, `client-crud-complete.spec.ts`
- `pnpm --dir frontend run typecheck` PASS
- `pnpm --dir frontend run lint` PASS
- `pnpm --dir frontend run build` PASS
- `pnpm run qa` PASS
- anomalie separee identifiee hors perimetre 1B : la recherche rapide globale depuis `/cockpit` ne navigue pas encore de maniere fiable vers une fiche client dans `search.spec.ts`

### Arret obligatoire

Ne pas passer a 1C tant que 1B n est pas codee, testee et verifiee.

---

## Etape 1C - Design structurel full page par Gemini

### Responsable

- Gemini d abord
- puis verification complete par Codex

### Objectif

Transformer la fiche en vrai dashboard client/prospect full page, plus lisible, plus stable, plus premium, sans toucher a la logique.

### Contraintes strictes pour Gemini

Gemini ne touche pas :
- au routing
- a TanStack Router
- a `onSearchPatch`
- aux hooks metier/data
- aux tests
- au backend
- a la logique `prev/next`
- au retour liste
- a toute resurrection du drawer

### Resultat design attendu

- header de fiche beaucoup plus clair
- hierarchie visuelle premium
- structure 70/30 ou 2/3 - 1/3
- colonne principale = travail
- colonne secondaire = contexte durable
- actions majeures bien visibles
- design dense, B2B, sobre
- pas de style marketing
- pas d effet gros blocs generiques

### Prompt a envoyer a Gemini

```text
Salut Gemini,

Tu travailles uniquement sur l UI/UX de la vraie stack `client-directory`.

Contexte reel :
- le drawer demi-page a ete retire
- `/clients` ouvre maintenant une fiche full page canonique
- le retour liste, la search state et la navigation relative prev/next sont deja branches par Codex
- tu ne touches ni au routing, ni a TanStack Router, ni aux hooks metier, ni aux tests, ni au backend

Perimetre autorise :
- frontend/src/components/client-directory/ClientDirectoryDetailPage.tsx
- frontend/src/components/client-directory/ClientDirectoryRecordDetails.tsx
- composants UI internes `client-directory` si necessaire
- refactor_clients_design.md

Objectif :
- transformer la fiche en dashboard client full page B2B
- header sticky intelligent
- grille 70/30 ou 2/3-1/3
- colonne gauche = travail
- colonne droite = contexte durable
- hierarchie visuelle nette, dense, sobre, premium
- etats vides designes, sans langage marketing

Interdictions :
- ne pas changer la logique prev/next
- ne pas changer le retour liste
- ne pas modifier les hooks/data fetching
- ne pas reintroduire de drawer
- ne pas declarer une etape finie sans l avoir reellement terminee

Livrable attendu :
- fichiers modifies
- changements visuels exacts
- ce que tu as volontairement laisse inchange
- mise a jour honnete de refactor_clients_design.md
```

### Verification obligatoire apres la reponse Gemini

Codex doit verifier :
- que Gemini a modifie les bons fichiers
- que le code compile
- que les tests requis passent
- que le header sticky existe vraiment si annonce
- que la grille 70/30 existe vraiment si annonce
- que les claims de design correspondent au code et au runtime
- que le markdown n est pas trompeur

### Checks obligatoires apres Gemini

- `pnpm --dir frontend run typecheck`
- `pnpm --dir frontend run lint`
- tests cibles `client-directory`
- `pnpm --dir frontend run build`
- verification runtime Chrome DevTools sur `/clients`

### Statut

- [ ] A faire

### Arret obligatoire

Ne pas passer a 1D tant que la reponse Gemini n a pas ete verifiee et nettoyee par Codex.

---

## Etape 1D - Motion et polish final par Gemini

### Responsable

- Gemini d abord
- puis verification complete par Codex

### Objectif

Ajouter uniquement le polish motion final si la base full page est deja stable.

### Decision verrouillee

Le motion est best-effort :
- on le garde seulement s il est stable
- aucune animation ne doit degrader la lisibilite, les performances ou l accessibilite
- si shared layout cree du flicker, du jump scroll ou une regression, on l abandonne

### Travail attendu

- skeletons contextuels qui imitent la structure finale
- transitions sobres
- shared layout animation seulement si techniquement propre
- respect du reduced motion
- polish final des actions, badges et header sticky

### Prompt a envoyer a Gemini

```text
Salut Gemini,

La structure full page est deja en place et validee.
Tu fais uniquement le polish motion/UI final sur `client-directory`.

Objectif :
- shared layout / continuite visuelle liste -> fiche uniquement si c est stable
- skeletons contextuels qui imitent la structure finale
- micro-etats premium des badges/actions
- polish visuel final du header sticky et du prev/next

Contraintes :
- reduced motion respecte
- si le shared layout cree du flicker, du scroll jump ou une regression, tu le retires et tu gardes seulement les skeletons + transitions sobres
- aucune logique router/search/data
- aucune modification de tests

Rappel Motion :
- si tu utilises `layoutId`, namespace via `LayoutGroup id`
- ne fais pas de magie globale fragile

Livrable attendu :
- fichiers modifies
- ce qui a ete reellement anime
- ce qui a ete volontairement laisse sobre
- mise a jour honnete de refactor_clients_design.md
```

### Verification obligatoire apres la reponse Gemini

Codex doit verifier :
- que les animations annoncees existent reellement
- qu il n y a pas de flicker visible
- qu il n y a pas de scroll jump
- que `prefers-reduced-motion` reste respecte
- que la fiche reste lisible et performante
- que Gemini n a pas touche a la logique
- que le markdown reste honnete

### Checks obligatoires apres Gemini

- `pnpm --dir frontend run typecheck`
- `pnpm --dir frontend run lint`
- tests cibles `client-directory`
- `pnpm --dir frontend run build`
- verification runtime Chrome DevTools sur `/clients`

### Statut

- [ ] A faire

### Arret obligatoire

Ne pas cloturer la migration tant que la verification complete n est pas passee.

---

# Plan de verification Codex obligatoire apres chaque passage Gemini

## A appliquer systematiquement

Apres chaque reponse Gemini, Codex doit :

1. Lire exactement les fichiers qu il dit avoir modifies
2. Comparer son discours aux classes, composants et comportements reels
3. Lancer les checks techniques adaptes
4. Verifier le runtime dans le navigateur
5. Corriger les ecarts techniques si necessaire
6. Corriger le markdown si Gemini a sur-vendu son avancement
7. Rendre un verdict explicite :
   - vrai
   - partiellement vrai
   - faux
   - bloque

## Grille de controle minimale

- les bons fichiers ont ete modifies
- aucune stack supprimee n a ete reintroduite
- aucune logique interdite n a ete changee
- le build passe
- les tests passent
- le rendu visible correspond vraiment a la description
- le markdown dit la verite

---

# Tests et scenarios obligatoires

## Tests a ajuster ou ajouter

- `ClientDirectoryPage.test.tsx`
  - retirer toute attente drawer
  - verifier la navigation full page canonique
  - verifier la propagation de la `search`
- `ClientDirectoryDetailPage.test.tsx`
  - verifier le bouton retour
  - verifier le fallback vers `/clients`
  - verifier `precedent/suivant` avec contexte de liste
  - verifier l absence de prev/next sans contexte exploitable
- supprimer les tests lies au drawer
- ajouter les assertions necessaires pour la nouvelle fiche full page si la structure change

## Verification runtime manuelle obligatoire

- filtre liste -> clic ligne -> fiche full page
- retour -> liste filtree identique
- acces direct bookmark -> fiche OK
- prev/next sur page filtree courante
- prospect -> conversion
- mobile/tablette -> full page stable
- header sticky si annonce
- skeletons contextuels si annonces
- aucune regression evidente de performance ou accessibilite

---

# Statut global de la feuille de route

## Migration full page detail

- [x] Etape 1A - Rollback architecture full page canonique
- [x] Etape 1B - Navigation relative prev/next
- [ ] Etape 1C - Design structurel full page Gemini + verification Codex
- [ ] Etape 1D - Motion / polish final Gemini + verification Codex

## Anciennes phases `/clients`

- [x] Phase 2A - Smart pills UI
- [x] Phase 2B - Smart pills logique
- [x] Phase 2C - Polish visuel final des filtres
- [x] Phase 3 - Data grid haute densite
- [ ] Phase 4 - Experience mobile en cartes

---

# Regle finale de cloture

La migration n est consideree terminee que si :
- 1A, 1B, 1C et 1D sont honnetement cochees
- chaque etape Gemini a ete verifiee par Codex
- `pnpm run qa` a passe au gate final
- le markdown reflete exactement l etat reel du produit
