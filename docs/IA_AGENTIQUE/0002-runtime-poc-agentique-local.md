# ADR 0002 — Runtime Deno unifié et reprise par étapes du POC

| Métadonnée | Valeur |
| --- | --- |
| Statut | Accepté pour le POC |
| Date | 2026-08-14 |
| Autorité | `docs/architecture-cible-cir-cockpit.md` |
| Corpus | `docs/IA_AGENTIQUE/README.md` |

## Contexte

Le premier parcours agentique enchaîne des opérations courtes : calcul d'un
diff déterministe, synthèse, proposition, approbation ultérieure et création
idempotente d'une tâche. Il n'attend pas plusieurs heures dans un processus et
n'exécute aucune action externe.

Le backend Deno sait déjà appeler un modèle, exécuter des outils, appliquer RLS
et réserver une requête idempotente. Le POC est personnel, gratuit et accepte
une disponibilité limitée. Un processus Node, Workflow SDK, Postgres World et
`graphile-worker` ajouteraient un second runtime avant qu'un besoin de workflow
long soit prouvé.

## Décision

Le POC reste dans l'Edge Function Deno `api`. Chaque invocation est bornée,
idempotente et termine sans sommeil durable :

1. une requête manuelle relit un run de diff déjà calculé ;
2. une requête shadow produit une synthèse et une proposition ;
3. si une approbation est nécessaire, l'état utile est persisté puis la requête
   se termine ;
4. l'approbation déclenche une nouvelle commande tRPC ;
5. chaque commande approuvée crée au plus une tâche grâce à une clé métier stable.

Une interruption rejoue l'étape incomplète ; elle ne tente pas de reprendre au
milieu d'un appel modèle. Les effets métier et leur transition d'état partagent
une transaction lorsque PostgreSQL le permet. Toute étape non transactionnelle
reste sans effet externe et rejouable.

`ai_request_reservations` reste le registre technique des réservations, quotas,
coûts et appels idempotents. Il ne porte pas une décision métier supervisée.
SA-3 modélise donc une proposition dédiée avec preuves, cycle de vie, version
optimiste et clé métier, sans créer de ledger de workflow générique.

Le déclenchement est manuel jusqu'à preuve du parcours. SA-4 commence ensuite
par le chemin direct `pg_cron` → `pg_net` → Edge Function, avec secret dans
Vault. `pgmq` n'est ajouté que si des pertes, recouvrements ou besoins de
visibilité mesurés justifient une queue. Il reste une queue passive, pas le
mécanisme de réveil. Un moteur durable est rouvert comme décision seulement si
un cas réel exige attente longue, coordination multi-service ou reprise de
nombreuses étapes.

## Conséquences

- Un seul runtime, une seule identité applicative et aucun Docker.
- L'approbation est naturellement durable car elle sépare deux requêtes.
- La proposition métier et la réservation technique ne partagent pas leur
  cycle de vie.
- La reprise signifie « rejouer une étape idempotente », pas reconstituer une
  pile d'exécution.
- Les limites Edge Free — durée, CPU, mémoire et taille — sont mesurées sur le
  parcours réel avant autonomie.
- Une architecture de production plus durable reste possible sans être payée
  par le POC.

## Alternatives écartées

- **Workflow SDK/Postgres World dès le POC :** exploitation et connexions
  disproportionnées au premier parcours.
- **Processus Node adjacent :** aucune responsabilité ne justifie encore ce
  déploiement supplémentaire.
- **Ledger `agent_runs/steps` universel :** réimplémente trop tôt leases,
  concurrence, retries et versionnement d'un moteur de workflow.
- **Une requête Edge longue avec attente d'approbation :** incompatible avec un
  runtime borné ; l'approbation devient une nouvelle commande.
- **`pgmq` au premier déclenchement :** aucune queue n'est nécessaire avant
  observation d'un besoin de livraison ou de reprise ; `pg_cron`, `pg_net` et
  Vault suffisent au premier essai périodique.
