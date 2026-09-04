# Doublons et normalisation

## Conclusion

L'analyse par empreinte ne trouve **aucun fichier suivi au contenu strictement identique**. Le ménage ne doit donc pas devenir une chasse aux noms similaires. Cinq duplications de composants méritent une extraction courte ; deux duplications de vérité doivent être normalisées sans abstraction supplémentaire. Les anciens panneaux Client/Prospect, eux, sont tous deux morts et doivent être supprimés plutôt que factorisés.

## `GM-DUP-01` — Dialogue de test d'un provider IA

**Priorité : P3 · Statut : confirmé · Verdict : extraire un petit composant.**

- Preuve : structure, états et actions parallèles dans `frontend/src/components/admin-ai/AiCapabilitiesView.tsx:937-978` et `frontend/src/components/admin-ai/AiSituationView.tsx:503-545`.
- Impact : deux correctifs à appliquer pour la même interaction d'administration et risque de divergence des messages d'erreur.
- Lot minimal : extraire le corps de dialogue et son contrat de callbacks dans `admin-ai`; conserver dans chaque vue la requête, l'autorisation et le contexte métier.
- Fichiers/tests associés : tests des deux vues et du dialogue partagé ; aucun nouveau provider abstrait.
- Gate : tests `admin-ai`, typecheck/lint, vérification clavier du dialogue et de son focus retour.
- Non-objectifs : ne pas fusionner `AiCapabilitiesView` et `AiSituationView`; ne pas créer un moteur de formulaires.

## `GM-DUP-02` — Menu d'actions Agence

**Priorité : P3 · Statut : confirmé · Verdict : partager uniquement le menu.**

- Preuve : mêmes actions et structure dans `frontend/src/components/agencies/AgenciesManagerList.tsx:137-183` et `frontend/src/components/agencies/AgencyCard.tsx:44-90`.
- Impact : risque que la liste et la carte n'exposent plus les mêmes permissions, confirmations ou libellés.
- Lot minimal : composant `AgencyActionsMenu` recevant l'agence, les capacités autorisées et des callbacks explicites.
- Fichiers/tests associés : tests de liste et carte, confirmations destructives.
- Gate : tests agences, rôle super-admin et agency-admin, typecheck/lint.
- Non-objectifs : ne pas fusionner les deux présentations ni déplacer les mutations dans le composant visuel.

## `GM-DUP-03` — Sélecteur multi-agence utilisateur

**Priorité : P3 · Statut : confirmé · Verdict : extraire le champ partagé.**

- Preuve : logique de sélection/affichage parallèle dans `frontend/src/components/UserMembershipDialog.tsx:113-176` et `frontend/src/components/user-create/UserCreateAgenciesSection.tsx:46-112`.
- Impact : validation et accessibilité peuvent diverger entre création et édition d'un utilisateur.
- Lot minimal : partager la liste de cases, les libellés et l'état vide ; garder les schémas de soumission et messages de contexte dans leurs formulaires.
- Fichiers/tests associés : tests User Create et Membership Dialog.
- Gate : tests des deux parcours, clavier, annonce des erreurs et typecheck/lint.
- Non-objectifs : ne pas unifier les formulaires création/édition complets.

## `GM-DUP-04` — État responsive et vues conservées des annuaires

**Priorité : P3 · Statut : confirmé · Verdict : petit hook commun seulement si les invariants sont identiques.**

- Preuve : handlers de responsive/vues conservées parallèles dans `frontend/src/components/client-directory/useClientDirectoryWorkspace.ts:203-313` et `frontend/src/components/admin-suppliers/useSupplierDirectoryWorkspace.ts:169-291`.
- Impact : corrections répétées sur la visibilité, les raccourcis et la restauration d'une vue.
- Lot minimal : extraire la mécanique neutre de synchronisation seulement après avoir écrit les différences Client/Fournisseur. L'URL, les filtres métier et les colonnes restent propres à chaque annuaire.
- Fichiers/tests associés : tests de raccourcis, vues sauvegardées et responsive des deux workspaces.
- Gate : tests ciblés, changement de largeur 1440/900/720, rechargement URL et absence d'action hors contexte.
- Non-objectifs : ne pas fabriquer un `GenericDirectoryWorkspace`; ne pas fusionner les pages.

## `GM-DUP-05` — Navigation précédent/suivant Référentiels

**Priorité : P3 · Statut : confirmé · Verdict : hook local borné.**

- Preuve : navigation et bornes voisines répétées dans `frontend/src/components/pricing-references/components/anomalies/anomaly-detail-dialog.tsx:115+` et `frontend/src/components/pricing-references/components/changes/change-detail-dialog.tsx:131+`.
- Impact : comportement de bord ou raccourcis différents pour deux inspecteurs comparables.
- Lot minimal : hook privé prenant une liste d'identifiants et l'identifiant courant ; laisser rendu, requêtes et vocabulaire dans chaque dialogue.
- Fichiers/tests associés : tests des dialogues Anomalie et Changement, cas premier/dernier/élément supprimé.
- Gate : tests Référentiels ciblés, typecheck/lint, navigation clavier.
- Non-objectifs : ne pas fusionner les modèles Anomalie et Changement.

## `GM-DUP-06` — Le nom du responsable concatène deux représentations complètes

**Priorité : P2 · Statut : confirmé par code et navigateur · Verdict : normaliser la projection SQL.**

- Preuve : `backend/src/services/tasks/taskService.ts:1806` construit `responsible_name` avec `concat_ws(' ', display_name, first_name, last_name)`. Lorsque `display_name` contient déjà le nom complet, l'écran Tâches affiche par exemple le même prénom/nom deux fois. D'autres lectures utilisent déjà la règle correcte « `display_name`, sinon prénom + nom » (`backend/src/services/ai/aiAccess.ts:134`).
- Impact : la personne responsable devient plus difficile à identifier et l'utilisateur peut croire à deux affectations ou à une donnée de profil corrompue.
- Correction minimale : employer `coalesce(nullif(trim(display_name), ''), nullif(trim(concat_ws(' ', first_name, last_name)), ''))` dans la projection et le filtre associé. Extraire un helper SQL seulement si plusieurs lectures actives doivent être corrigées ensemble.
- Gate : test backend avec profil possédant les trois champs, test de recherche sur le nom et contrôle visuel d'une ligne Tâche ; le libellé complet apparaît une seule fois.
- Non-objectifs : ne pas migrer les profils ni recalculer `display_name` dans ce lot.

## `GM-DUP-07` — Les callbacks no-op du shell doublent une responsabilité d'`AppLayout`

**Priorité : P3 · Statut : confirmé · Verdict : simplifier le type de propriété.**

Ce doublon de responsabilité est détaillé dans [`GM-DEAD-10`](01-code-mort-surfaces-fantomes.md#gm-dead-10--deux-callbacks-obligatoires-ne-font-rien-avant-dêtre-écrasés-par-le-shell). `App` ne doit pas déclarer des actions vides que `AppLayout` remplace toujours ; le propriétaire de l'état fournit directement le handler réel.

## Duplications à ne pas abstraire

| Surface | Verdict | Motif |
| --- | --- | --- |
| Dossiers morts `client-detail/` et `prospect-detail/` | **Supprimer** | Factoriser deux implémentations inaccessibles créerait du code neuf sans utilisateur. |
| Huit classeurs `.xlsx`/`.xlsm` | **Conserver** | Leurs empreintes sont toutes distinctes ; versions `v11q` et `v11t` ne sont pas des copies identiques. |
| 143 migrations | **Conserver** | Une migration peut répéter du DDL pour corriger l'historique ; elle est immuable après application. |
| `shared/api/trpc.generated.d.ts` et `shared/supabase.types.ts` | **Conserver** | Volumineux mais produits par une source/générateur canonique. |
| `RATE_LIMIT` et `RATE_LIMITED` | **Décision de contrat** | Les deux sont actifs ; ce n'est pas un cas de code mort. |

## Règle d'arrêt

Une extraction est justifiée seulement si elle retire une divergence active et reste plus petite que les deux implémentations. Dès qu'elle exige des options booléennes spécifiques aux pages, conserver la duplication locale : le gain ne compense plus la nouvelle indirection.
