# IA Agentique — index canonique

Corpus du socle agentique de CIR Cockpit. Trois documents, aucune archive.

| Document | Rôle |
| --- | --- |
| [`stack-cible-agentique-et-comparatif-existant.md`](./stack-cible-agentique-et-comparatif-existant.md) | **Décision technique canonique** : Node 24, AI SDK 7, DBOS, et comparatif avec l'état du dépôt. |
| [`plan-refonte-agentic-first.md`](./plan-refonte-agentic-first.md) | **Plan d'exécution unique** : étapes, actifs conservés, gates et journal. |
| `README.md` | Cet index. |

## Autorité

L'architecture globale reste
[`docs/architecture-cible-cir-cockpit.md`](../architecture-cible-cir-cockpit.md) :
elle gouverne le produit entier, pas seulement l'IA. En cas d'écart, elle fixe la
cible produit, la stack cible fixe la cible technique agentique, et le plan
gouverne l'exécution.

Aucun document de ce dossier n'autorise implicitement code, dépendance,
installation, migration, commit, push ou déploiement.

## Statut courant

- ancien plan `SA-0…SA-7`, ses ADR et son audit supprimés le 2026-08-15 ;
- chantier SA-2 arrêté ; son shadow one-shot retiré du code ;
- étape 1 technique terminée ; le réalignement GitHub reste non bloquant tant
  que l'accès aux issues est en lecture seule ;
- `ReferenceWatchFacts` conservé comme actif métier sous
  `backend/src/services/pricing/references/` ;
- étape 2 technique terminée : ménage du workspace, des dépendances, de
  l'arborescence et des frontières de modules ;
- étape 3 technique : cutover Node 24, backend Deno et legacy IA retirés ;
- étape 4 close : AI SDK 7, `AgentRuntime`, vertical sourcé, idempotence liée au
  run, persistance transactionnelle et quotas wildcard sérialisés entre
  capacités ;
- migration de réservation `20260816064437_ai_watch_reservations` appliquée et
  concurrence multi-feature prouvée sur le distant ;
- clôture runtime prouvée le 2026-08-16 : prompt du vertical publié en version 2
  par la gouvernance admin existante, clé locale de chiffrement régénérée,
  service API administré redémarré, smoke Mistral réel valide et cité ;
- prochaine étape exécutable : **étape 5 — DBOS** ;
- suivi GitHub : [programme #23](https://github.com/Nono8Six/CIR-Cockpit/issues/23),
  **pas encore réaligné** — les issues #23 et #26 à #32 décrivent toujours
  l'ancien plan SA. Cet écart administratif n'empêche pas l'étape 5 ; en cas
  d'écart, ce dossier fait foi.
