# Lot 0 — Isolation des vues et raccourcis

## 1. Résultat attendu

Le Lot 0 est fermé lorsqu’une vue React conservée mais inactive ne peut plus :

- soumettre ou réinitialiser une saisie ;
- avancer dans le parcours guidé Cockpit ;
- changer un canal ;
- déplacer un focus ;
- ouvrir, sélectionner ou préparer l’archivage d’un élément Pilotage.

Le shell reste l’unique propriétaire des raccourcis globaux de navigation et le comportement de la vue active reste inchangé.

**État du plan : TERMINÉ — GO le 4 septembre 2026.**

## 2. Décision de périmètre

Les services Windows `CIR-Cockpit` et `CIR-Cockpit-API` sont uniquement des lanceurs de développement local. Ils ne constituent pas la stack finale.

Le PO a choisi le 4 septembre 2026 :

- de conserver cet environnement tel quel ;
- d’accepter le risque local `LocalSystem` en connaissance de cause ;
- de sortir Windows, Servy, les ACL, les artefacts et le packaging backend du Lot 0 et de la roadmap produit.

Le constat reste documenté dans `BE-P0-01`, mais il ne fait partie ni de l’implémentation ni des critères de GO du présent lot.

Ce plan couvre uniquement **UI-01** et **UI-R01**. Il ne couvre pas le « Lot 0 » du plan de suppression de l’Étape 3.

## 3. État de départ prouvé

### 3.1 Conservation des vues

`AppMainTabContent` :

- conserve les onglets visités dans `KEEP_ALIVE_TABS` ;
- laisse leurs composants montés ;
- applique `hidden` à la section inactive ;
- ne transmet pas l’état actif aux composants conservés.

`hidden` masque le DOM rendu, mais ne désabonne pas un listener enregistré sur `window` ou `document`.

### 3.2 Effets globaux à isoler

| Propriétaire | Touches | Effet |
| --- | --- | --- |
| `useInteractionHotkeys` | Ctrl/Cmd+Entrée | soumission du formulaire Cockpit |
| `useInteractionHotkeys` | Ctrl/Cmd+N | nouvelle saisie / reset |
| `useInteractionHotkeys` | T/E/C/V | changement de canal |
| `Dashboard` | `/` | focus recherche |
| `Dashboard` | flèches | déplacement dans la table |
| `Dashboard` | Entrée/O | ouverture d’une ligne |
| `Dashboard` | Retour arrière/Suppr | préparation de l’archivage |
| `CockpitGuidedStepSwitch` | Ctrl/Cmd+Entrée en capture | progression guidée |
| `CockpitSupplierLookup` | Ctrl/Cmd+Entrée en capture | validation fournisseur |
| `CockpitGuidedDetailsQuestion` | keydown/keyup | état visuel du raccourci |

### 3.3 Collision F1/F2

- le shell expose F1 = Clients et F2 = Fournisseurs dans la navigation ;
- `useInteractionHotkeys` utilise aussi F1/F2 pour focaliser des champs Cockpit ;
- les actions Cockpit F1/F2 ne sont pas annoncées dans l’interface.

UI-R01 tranche : le shell reste propriétaire exclusif de F1–F9.

### 3.4 Effets globaux à conserver

Ces effets ne doivent pas être refactorés sans reproduction d’un défaut :

- `useAppShortcuts` : Ctrl/Cmd+K et F1–F9, appartenant au shell ;
- `AppLayout` : Ctrl/Cmd+B et Ctrl/Cmd+Backslash, appartenant au shell ;
- `Settings` : `beforeunload` lorsque le brouillon Paramètres est sale, même si l’onglet est masqué ;
- Dialogs Référentiels : listeners bornés à un Dialog ouvert ;
- listeners responsive des Outlets démontés, qui possèdent déjà leur cleanup.

### 3.5 Baseline de tests

La commande ciblée suivante était verte avant implémentation :

```powershell
pnpm --dir frontend run test:run --fileParallelism=false src/app/__tests__/useAppShortcuts.test.tsx src/components/app-main/__tests__/AppMainTabContent.test.tsx src/hooks/__tests__/useInteractionHotkeys.test.tsx src/components/cockpit/guided/__tests__/CockpitGuidedStepSwitch.test.tsx src/components/cockpit/guided/__tests__/CockpitSupplierLookup.test.tsx
```

Résultat observé : 5 fichiers, 27 tests réussis. Cette baseline ne prouve pas encore l’isolation inter-vues.

## 4. Décisions d’implémentation

1. Utiliser un simple prop obligatoire `isActive: boolean`.
2. Le transmettre depuis `AppMainTabContent` au Cockpit et au Dashboard.
3. Le propager uniquement jusqu’aux composants Cockpit qui inscrivent un listener global.
4. Retourner avant `addEventListener` lorsque `isActive === false`.
5. Inclure `isActive` dans les dépendances de l’effet afin que le changement de vue exécute réellement le cleanup.
6. Ajouter `inert={!isActive}` aux sections keep-alive en plus de `hidden={!isActive}`.
7. Retirer les branches F1/F2 de `useInteractionHotkeys` sans touches de remplacement.
8. Conserver le keep-alive, les brouillons et le retour de scroll.
9. Ne créer ni contexte global, ni registre de raccourcis, ni nouveau hook générique sans nécessité de testabilité démontrée.
10. Ne modifier aucun listener déjà correctement borné à un propriétaire global ou à un Dialog ouvert.

## 5. Séquence d’exécution

### Phase 1 — Revalider la borne

1. Vérifier `git status --short` et préserver tout changement non lié.
2. Relire UI-01 et UI-R01.
3. Rechercher de façon bornée les `addEventListener` sous les vues keep-alive.
4. Comparer la liste réelle à la section 3.2.
5. Si un autre listener métier caché est découvert, l’ajouter au même contrat `isActive` ; ne pas transformer cette vérification en audit général du frontend.

### Phase 2 — Poser le contrat d’activation

1. Dans `AppMainTabContent`, conserver le calcul `const isActive = activeTab === tab`.
2. Ajouter `inert={!isActive}` à chaque section inactive.
3. Passer `isActive` à `CockpitForm` et `Dashboard`.
4. Ajouter le prop aux types existants plutôt que créer une nouvelle abstraction partagée.

### Phase 3 — Isoler le Cockpit

1. Propager `isActive` :
   - de `CockpitForm` vers `useCockpitFormController` ;
   - vers `useInteractionHotkeys` ;
   - à travers le parcours guidé jusqu’aux trois composants qui écoutent `window`.
2. Dans chaque effet, ne pas inscrire le listener lorsque le Cockpit est inactif.
3. Prouver le cleanup lors d’un passage actif → inactif.
4. Supprimer F1/F2 de `useInteractionHotkeys`.
5. Ne pas modifier Ctrl/Cmd+Entrée, Ctrl/Cmd+N ou T/E/C/V lorsque le Cockpit est actif.

### Phase 4 — Isoler le Pilotage

1. Ajouter `isActive` aux props du Dashboard.
2. Ne pas inscrire son listener clavier lorsque Pilotage est inactif.
3. Conserver les gardes existants sur les champs éditables, Dialogs et menus.
4. Ne pas extraire un nouveau hook si le composant reste testable proprement ; extraire seulement le listener local si cela réduit réellement la complexité du test.

### Phase 5 — Ajouter les preuves

Mettre à jour ou ajouter les tests ciblés suivants :

- `AppMainTabContent.test.tsx` :
  - visite Cockpit → Pilotage → Tâches ;
  - vues déjà visitées toujours montées ;
  - vue active sans `hidden`/`inert` ;
  - vues inactives avec `hidden` et `inert` ;
- `useInteractionHotkeys.test.tsx` :
  - actif : comportement actuel conservé ;
  - inactif : aucune action et aucun `preventDefault` métier ;
  - rerender actif → inactif : listener retiré ;
  - F1/F2 jamais interceptés ;
- tests `CockpitGuidedStepSwitch` et `CockpitSupplierLookup` :
  - Ctrl/Cmd+Entrée agit uniquement lorsque `isActive` ;
- test ciblé du Dashboard :
  - `/`, flèches, Entrée/O et Retour arrière/Suppr agissent seulement lorsque Pilotage est actif ;
- `useAppShortcuts.test.tsx` :
  - F1/F2 continuent à déclencher uniquement la navigation attendue selon les droits.

## 6. Matrice d’acceptation

| Vue active après historique de navigation | Entrée | Résultat attendu |
| --- | --- | --- |
| Cockpit | Ctrl/Cmd+Entrée | une seule soumission autorisée |
| Cockpit | Ctrl/Cmd+N | un seul reset si autorisé |
| Cockpit | T/E/C/V hors champ | un seul changement de canal |
| Cockpit | F1/F2 | navigation shell uniquement |
| Pilotage | `/`, flèches | focus/navigation Pilotage uniquement |
| Pilotage | Entrée/O | ouverture Pilotage uniquement |
| Pilotage | Retour arrière/Suppr | demande Pilotage uniquement |
| Tâches après visite Cockpit + Pilotage | raccourcis Cockpit/Pilotage | aucun effet caché |
| toute vue | F1–F9 | un seul traitement par le shell |
| toute vue inactive | focus | aucun élément masqué ne reçoit le focus |

Le test doit espionner les callbacks métier, pas seulement l’existence des attributs DOM.

## 7. Fichiers probablement concernés

### Production

- `frontend/src/components/app-main/AppMainTabContent.tsx` ;
- `frontend/src/components/CockpitForm.tsx` ;
- `frontend/src/components/cockpit/CockpitForm.types.ts` ;
- `frontend/src/hooks/cockpit/useCockpitFormController.ts` ;
- `frontend/src/hooks/interactions/handlers/useInteractionHotkeys.ts` ;
- `frontend/src/components/Dashboard.tsx` ;
- `frontend/src/components/cockpit/guided/CockpitGuidedEntry.tsx` ;
- `frontend/src/components/cockpit/guided/CockpitGuidedStepSwitch.tsx` ;
- `frontend/src/components/cockpit/guided/CockpitGuidedSearchQuestion.tsx` ;
- `frontend/src/components/cockpit/guided/CockpitSupplierLookup.tsx` ;
- `frontend/src/components/cockpit/guided/CockpitGuidedDetailsQuestion.tsx`.

### Tests

- `frontend/src/components/app-main/__tests__/AppMainTabContent.test.tsx` ;
- `frontend/src/hooks/__tests__/useInteractionHotkeys.test.tsx` ;
- `frontend/src/app/__tests__/useAppShortcuts.test.tsx` ;
- tests existants du parcours guidé ;
- un test Dashboard ciblé si aucun test existant ne couvre l’effet.

Cette liste borne l’exploration ; elle n’oblige pas à modifier chaque fichier.

## 8. Validation proportionnée

Boucle de travail :

```powershell
pnpm --dir frontend run test:run --fileParallelism=false src/app/__tests__/useAppShortcuts.test.tsx src/components/app-main/__tests__/AppMainTabContent.test.tsx src/hooks/__tests__/useInteractionHotkeys.test.tsx src/components/cockpit/guided/__tests__/CockpitGuidedStepSwitch.test.tsx src/components/cockpit/guided/__tests__/CockpitSupplierLookup.test.tsx <test-dashboard-ciblé>
pnpm --dir frontend run typecheck
```

Avant livraison, appliquer `cir-cockpit-qa-validation` : test ciblé qui prouve le comportement, puis typecheck frontend. Aucun E2E, build général ou navigateur automatisé n’est requis sans échec ou demande explicite.

## 9. Conditions de sortie

### GO Lot 0

- tous les effets métier recensés sont absents lorsque leur vue est inactive ;
- `hidden` et `inert` sont présents sur les sections inactives ;
- F1–F9 appartiennent uniquement au shell ;
- le comportement actif, le keep-alive, les brouillons et le scroll sont conservés ;
- tests ciblés et typecheck frontend sont verts ;
- aucun fichier hors périmètre n’a été modifié.

### NO-GO

Le Lot 0 reste ouvert si une vue inactive traite encore une touche, si F1/F2 ont deux propriétaires, si le cleanup n’est pas prouvé ou si le correctif casse l’état conservé.

## 10. Arrêt strict

Après le verdict :

- ne pas commencer le Lot 1 ;
- ne modifier ni backend, ni Windows, ni Servy, ni ACL, ni `.env` ;
- ne lancer ni migration, ni déploiement ;
- ne pas commit/push ;
- restituer le diff, les tests réellement exécutés et toute réserve réelle.

## 11. Clôture constatée

Verdict : **GO Lot 0**.

- les gardes `isActive`, le cleanup, `hidden` + `inert` et la propriété shell de F1–F9 sont présents ;
- une preuve transversale co-monte les hooks de production puis exécute Cockpit → Pilotage → Tâches ;
- la revue finale n'a relevé aucun défaut bloquant restant ;
- gate finale : 6 fichiers ciblés, 37 tests réussis ;
- `pnpm --dir frontend run typecheck` réussi ;
- aucun travail backend, Windows, Servy, Supabase, Edge, migration ou déploiement n'a été réalisé.
