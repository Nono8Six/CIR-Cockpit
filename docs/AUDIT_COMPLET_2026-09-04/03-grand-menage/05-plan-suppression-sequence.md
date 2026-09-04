# Plan de suppression séquencé

## Règle de lancement

Cet audit n'autorise aucune suppression. Chaque lot ci-dessous demande une autorisation d'implémentation séparée. Le point de départ doit être un worktree réinspecté ; les fichiers modifiés par l'utilisateur depuis le commit d'audit ne sont jamais écrasés.

## Lot 0 — Fixer la référence et les consommateurs

**But.** Éviter qu'un graphe local soit pris pour une preuve absolue.

1. relever le commit de départ et l'état du worktree ;
2. rejouer le graphe d'import et les recherches de symboles ;
3. vérifier scripts Windows, générateur tRPC, config Drizzle et consommateurs Edge/externe ;
4. lister les fichiers qui ont changé depuis `0ee15a69861f0817b459bee4d2b375e56584a590`.

**Gate.** Chaque suppression a un propriétaire de preuve et aucun candidat n'est devenu atteignable. **Arrêt :** tout consommateur dynamique ou externe non compris.

## Lot 1 — Fermer les dépendances vulnérables atteignables

**But.** Traiter le risque avant le nettoyage cosmétique.

1. monter `fflate` vers `>=0.8.3` et ajouter le cas ZIP64 malformé avec limites de ressources ;
2. remplacer les deux usages test de `xlsx`, puis retirer `xlsx@0.18.5` ;
3. monter les parents/résolutions de Hono, nanoid, browserslist, humanfs, esbuild et Babel vers leurs versions corrigées, par workspace.

**Fichiers principaux.** `backend/package.json`, `frontend/package.json`, `pnpm-lock.yaml`, parser/import Référentiels et deux tests XLSX.

**Gate.** Audit sans les 11 avis visés, tests XLSX, typecheck/lint/tests des couches, build frontend et health backend local. **Arrêt :** régression de parsing sur un classeur métier représentatif ou nécessité d'un changement majeur non prévu.

## Lot 2 — Supprimer les surfaces frontend mortes

**But.** Retirer d'abord les clusters autonomes.

Ordre recommandé :

1. formulaire Prospect et ses tests/mocks ;
2. anciens dossiers `client-detail/` et `prospect-detail/` ;
3. sections Cockpit et leur `Combobox` privé de consommateur ;
4. `PageToolbar`, `HighlightedDigits` et le couple d'archivage Client.

**Gate après chaque sous-lot.** Recherche globale des symboles, typecheck/lint frontend et tests du parcours actif correspondant. Ne cumuler les quatre sous-lots que si chacun garde un diff intelligible.

**Arrêt.** Un test runtime ou import dynamique atteint encore le composant ; un fichier comporte une modification utilisateur non liée.

## Lot 3 — Supprimer les contrats et blocs backend morts

**But.** Éliminer les chemins qui concurrencent le runtime actuel.

1. retirer `referenceProductSemantics.ts` et `aiAssistant.schema.ts`, régénérer le contrat ;
2. retirer `SnapshotRow` et le bloc `referenceImports.ts:2567-2804` ;
3. retirer l'ancien calcul de quota `aiRunContext.ts:146-280` et ses tests devenus sans objet.

**Gate.** Tests Référentiels/IA ciblés, contrat généré, typecheck/lint backend, tests de réservation concurrente et `repo:check:local`.

**Arrêt.** Le contrat généré ou l'Edge encore consommée dépend du symbole ; dans ce cas, classer la surface « compatibilité externe prouvée » au lieu d'ajouter un shim.

## Lot 4 — Rendre la gate d'intégration honnête

**But.** Un seul runner, un environnement effectivement chargé, au moins un test découvert.

1. choisir direct Vitest ou script Node ;
2. supprimer l'autre chemin et l'alias racine doublonné ;
3. charger explicitement l'environnement non secret ;
4. interdire `passWithNoTests` dans la gate canonique.

**Gate.** Échec explicite sans configuration, réussite avec nombre de tests non nul, aucune valeur sensible affichée. **Arrêt :** besoin d'un secret non disponible ; demander l'action humaine prévue au lieu de le contourner.

## Lot 5 — Réaligner la documentation active

**But.** Une seule architecture et un seul plan agentique actuels.

1. extraire les décisions encore valides des deux plans `ASSISTANT_IA` ;
2. corriger les autorités dans `architecture-cible-cir-cockpit.md` ;
3. supprimer ou condenser les plans supersédés et leurs 33 références cassées ;
4. supprimer/déplacer les neuf preuves CP-C1/CP-C2 après note historique ;
5. corriger les cinq en-têtes contradictoires et arbitrer les deux tests E2E ignorés.

**Gate.** `qa:docs`, zéro chemin actionnable manquant, une seule prochaine étape, toutes les preuves historiques étiquetées comme non courantes.

**Arrêt.** Une décision métier n'existe que dans le document à supprimer ; l'extraire et la faire valider avant suppression.

## Lot 6 — Réduire les APIs de surface

**But.** Traiter les exports et codes catalogue sans casser un consommateur externe.

1. retirer d'abord seulement `export` lorsque la fonction reste utilisée localement ;
2. supprimer les symboles réellement sans usage avec leurs tests exclusifs ;
3. traiter les codes d'erreur par familles ;
4. décider séparément la normalisation `RATE_LIMIT` / `RATE_LIMITED` ;
5. statuer sur `backend/drizzle/relations.ts` après preuve Drizzle.

**Gate.** Contrat tRPC régénéré, conformité erreurs, tests mappers et couche, recherche dans logs/Edge/clients. **Arrêt :** code observé dans des réponses ou journaux récents.

## Lot 7 — Normaliser deux vérités, puis extraire cinq duplications utiles

**But.** Réduire les divergences actives, pas maximiser le partage.

Ordre :

1. corriger la projection SQL du responsable Tâche afin de choisir `display_name` **ou** prénom + nom, avec un test qui interdit le nom doublé (`GM-DUP-06`) ;
2. retirer de `App` les callbacks no-op dont `AppLayout` est déjà propriétaire, sans retirer les actions Compte/Menu (`GM-DEAD-10` / `GM-DUP-07`) ;
3. au contact du prochain changement seulement, extraire les cinq petites duplications de composants : dialogue provider IA, menu Agence, sélecteur multi-agence, petit hook annuaire, navigation Référentiels.

**Gate.** Tests des deux consommateurs avant/après, clavier et typecheck/lint. **Règle d'arrêt :** si l'extraction réclame des branches propres à chaque page, garder les deux implémentations.

## Lot 8 — Maintenance opportuniste

**But.** Finir sans ouvrir une refonte de stack.

1. mises à jour même-majeur restantes par workspace ;
2. un chantier distinct par montée majeure réellement utile ;
3. `pnpm dedupe` dans un diff lockfile isolé ;
4. manifeste de provenance des huit classeurs seulement si demandé par le métier.

**Gate.** Installation figée et plus petit gate proportionné. **Non-objectif :** zéro dépendance en retard à tout prix.

## Matrice de fin

| Résultat exigé | Preuve minimale |
| --- | --- |
| Surface morte retirée | zéro import/symbole, test du parcours actif vert |
| Dépendance retirée | zéro chemin dans `pnpm why`, lockfile cohérent, audit |
| Contrat réduit | génération reproductible et conformité erreurs |
| Documentation nettoyée | zéro référence actionnable cassée, autorité unique |
| Preuve historique retirée | verdict utile conservé et clairement daté |
| Duplication extraite | deux consommateurs verts, API partagée plus petite que les copies |
| Fichier conservé | motif explicite : runtime, tooling, historique immuable, provenance ou usage conditionnel |

## Ce qui reste volontairement intact

- les 143 migrations ;
- les types générés tRPC/Supabase ;
- les huit classeurs métier aux empreintes distinctes ;
- les scripts Servy/Codex et `.impeccable` ;
- `deterministicRuntime` et les helpers d'intégration atteignables ;
- les skips réellement conditionnels ;
- les exemples de chemins des skills ;
- l'Edge Function distante tant que ses consommateurs et son trafic ne sont pas résorbés.
