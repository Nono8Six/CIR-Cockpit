# Documentation obsolète et liens

## `GM-DOC-01` — Deux autorités IA incompatibles

**Priorité : P2 · Statut : confirmé · Verdict : extraire les décisions encore vraies, puis supprimer ou condenser les deux anciens plans `ASSISTANT_IA`.**

Le document d'architecture continue de présenter `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md` comme plan actif ou gouvernant à `docs/architecture-cible-cir-cockpit.md:39`, `:779`, `:906` et `:980`. Il annonce aussi des ADR IA à `:40` alors que l'index courant explique leur suppression.

La source agentique actuelle dit l'inverse :

- `docs/IA_AGENTIQUE/README.md:24-35` enregistre le retrait du legacy IA et du backend Deno, puis la clôture des étapes 2 à 4 ;
- `docs/IA_AGENTIQUE/plan-refonte-agentic-first.md:139-151` impose que les routes assistant, outils SQL et adaptateurs historiques ne soient jamais portés vers Node.

**Impact.** Un agent ou développeur peut suivre un plan détaillé mais supersédé, réintroduire un contrat Deno ou croire que des fichiers supprimés doivent être modifiés.

**Lot minimal.** Avant suppression, relever dans les deux documents `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md` et `plan-semantique-4-chantiers.md` les seules décisions encore applicables au runtime Node : invariants métier, limites de coût, exigences de preuve et résultats historiques utiles. Les intégrer, sans journal exhaustif, dans l'architecture ou le plan agentique courant. Corriger ensuite les quatre références d'autorité ci-dessus et supprimer/ramener les anciens plans à une courte note « historique supersédé ».

**Fichiers/tests associés.** `docs/architecture-cible-cir-cockpit.md`, les deux plans `docs/ASSISTANT_IA/`, `docs/IA_AGENTIQUE/README.md`, `docs/IA_AGENTIQUE/plan-refonte-agentic-first.md` et les neuf preuves listées plus bas.

**Gate.** `pnpm run qa:docs`, recherche globale de `backend/functions/api`, `assistantBroker`, `ASSISTANT_IA` et des titres supprimés ; chaque occurrence restante doit être explicitement historique. Relecture croisée architecture/index/plan avec une seule prochaine étape.

**Non-objectifs.** Ne pas réécrire l'histoire ni supprimer une décision métier prouvée ; ne pas conserver 3 000 lignes de journal dans le corpus actif « au cas où ».

## `GM-DOC-02` — 33 références actionnables vers le backend supprimé

**Priorité : P2 · Statut : confirmé · Verdict : disparaissent avec les plans supersédés ; ne pas les réparer vers des fichiers approximatifs.**

Le scan trouve **33 références locales manquantes**, toutes dans les deux documents `ASSISTANT_IA` :

| Document | Zones contenant les références cassées | Nature |
| --- | --- | --- |
| `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md` | `:775-815`, `:934-935`, `:1609-1622`, `:1682-1687` | anciens chemins `backend/functions/api/**`, tests Deno, broker, middleware et procédures supprimés lors du cutover |
| `docs/ASSISTANT_IA/plan-semantique-4-chantiers.md` | `:103-106`, `:143-145`, `:180-182`, `:214-216`, `:280`, `:307` | composants du plan sémantique et preuves d'exécution associées au runtime supprimé |

**Impact.** Ces liens donnent une fausse précision : les numéros de ligne et chemins paraissent vérifiables mais ne mènent plus au code courant.

**Lot minimal.** Ne pas transformer les 33 chemins un par un en liens vers des équivalents Node non prouvés. Les supprimer avec le texte historique détaillé ; pour une décision conservée, remplacer la preuve par un chemin Node actuel et une ligne revérifiée.

**Gate.** Scanner les chemins entre backticks et les liens Markdown du corpus actif ; zéro référence manquante actionnable. Les URLs externes et identifiants de commit restent hors de ce contrôle.

**Non-objectifs.** Ne pas créer de fichiers placeholder sous `backend/functions/api/` pour faire passer le scan.

## `GM-DOC-03` — En-têtes qui contredisent leur propre journal

**Priorité : P2 · Statut : confirmé · Verdict : corriger l'en-tête ou clore le document, sans réécrire toutes les entrées.**

| Document | Contradiction | Décision minimale |
| --- | --- | --- |
| `docs/UI_UX/plan-refonte-gouvernance-ia-mission-control.md:3` | « plan non exécuté » alors que `:1305` et `:1431` déclarent les quatre phases livrées | passer le statut à « exécuté, réserves restantes » et lister seulement les réserves encore ouvertes |
| `docs/UI_UX/plan-refonte-ui.md:12-17` | tableau d'état du 26 juillet resté en tête | ajouter un statut courant synthétique ou marquer tout le document historique |
| `docs/UI_UX/plan-refonte-ui.md:3273-3280` | T5.5 cible des composants IA supprimés/remplacés | supprimer la tâche ou la rebaser uniquement sur les composants actuels après audit UI |
| `docs/PLAN/plan-brique-3-taches-relances.md:7` | « implémentation non commencée » | aligner sur la clôture déclarée à `:923-928` |
| `docs/PLAN/plan-consolidation-tiers-activites.md:5` | « Brique 3 non commencée » | remplacer par un statut historique daté ; renvoyer au plan Brique 3 clos |

**Impact.** La première page, souvent seule lue par un agent, donne la mauvaise instruction malgré un journal final correct.

**Lot minimal.** Corriger les cinq en-têtes et supprimer les tâches portant sur des fichiers inexistants. Garder le journal comme preuve datée si sa valeur dépasse son coût de lecture.

**Gate.** Recherche des marqueurs `non commencée`, `non exécuté`, `prochaine étape`, revue par rapport au code et au runtime actuels, puis `qa:docs`.

## `GM-DOC-04` — Neuf preuves runtime historiques lourdes

**Priorité : P3 · Statut : confirmé · Verdict : supprimer avec le plan sémantique ou déplacer dans une archive explicitement non canonique après extraction du verdict.**

Les neuf fichiers, environ 223 421 octets au total, ne sont référencés que depuis `docs/ASSISTANT_IA/plan-semantique-4-chantiers.md:260,283,287-288` :

1. `frontend/e2e-proof-cp-c1/01-debitmetres.json` ;
2. `frontend/e2e-proof-cp-c1/01-debitmetres.png` ;
3. `frontend/e2e-proof-cp-c1/02-verins.json` ;
4. `frontend/e2e-proof-cp-c1/02-verins.png` ;
5. `frontend/e2e-proof-cp-c1/03-variateur.json` ;
6. `frontend/e2e-proof-cp-c1/03-variateur.png` ;
7. `frontend/e2e-proof-cp-c2/fastpaths-flagon.json` ;
8. `frontend/e2e-proof-cp-c2/servomoteurs-flagoff-rollback.json` ;
9. `frontend/e2e-proof-cp-c2/servomoteurs-flagon-qualified.json`.

**Impact.** Ils prouvent un ancien runtime Deno et des flags retirés ; dans `frontend/`, ils ressemblent à des fixtures E2E actives alors qu'aucun test courant ne les consomme.

**Lot minimal.** Extraire dans une note historique courte : date, runtime/version, question, résultat, verdict et raison de supersession. Puis supprimer les neuf fichiers avec le plan, ou les déplacer sous un dossier d'archives exclu des sources actives si une obligation de conservation est confirmée.

**Gate.** Recherche de chaque nom, aucun test/config ne le consomme ; les faits conservés ont une source datée et portent la mention « ne prouve pas le runtime courant ».

**Non-objectifs.** Ne pas utiliser ces captures comme preuve du backend Node actuel ; ne pas recréer les anciens parcours uniquement pour garder les screenshots valides.

## `GM-DOC-05` — Références conditionnelles à conserver

**Priorité : conservation · Statut : faux positifs confirmés · Verdict : conserver.**

Les trois liens exemples de `.agents/skills/domain-modeling/CONTEXT-FORMAT.md:43-45` pointent vers des chemins fictifs volontairement pédagogiques (`ordering`, `billing`, `fulfillment`). Ils ne sont pas des liens documentaires opérationnels. Leur contexte doit les faire reconnaître comme exemples, pas les supprimer.

De même, les références conditionnelles dans les skills d'agent, les skips explicitement conditionnés à un environnement et les chemins historiques clairement étiquetés ne sont pas cassés au seul motif que la cible n'existe pas dans le checkout courant.

## `GM-DOC-06` — Skips E2E permanents

**Priorité : P2 · Statut : confirmé · Verdict : réparer ou supprimer les corps, pas conserver des tests décoratifs.**

`frontend/e2e/interactions-cockpit.spec.ts:203` et `:218` ignorent durablement deux tests sans condition d'environnement démontrable.

**Impact.** La suite semble couvrir des comportements qu'elle n'exécute jamais.

**Lot minimal.** Vérifier si le parcours existe encore : s'il existe, réparer fixture/sélecteur puis retirer le skip ; s'il a été remplacé, supprimer le test et mettre à jour le plan de couverture.

**Gate.** Le fichier rapporte des tests exécutés ou ne contient plus les scénarios obsolètes ; aucun `skip` permanent sans motif/issue datée.

**Non-objectifs.** Ne pas rendre obligatoire un test réseau conditionnel ; les skips conditionnels réels restent légitimes.
