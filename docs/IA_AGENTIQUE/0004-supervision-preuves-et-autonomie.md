# ADR 0004 — Propositions supervisées, preuves et autonomie déterministe

| Métadonnée | Valeur |
| --- | --- |
| Statut | Accepté pour le POC |
| Date | 2026-08-14 |
| Autorité | `docs/architecture-cible-cir-cockpit.md` |
| Corpus | `docs/IA_AGENTIQUE/README.md` |

## Contexte

Une réservation de requête IA répond à des préoccupations techniques : quota,
coût, idempotence et résultat d'appel. Chaque proposition supervisée porte une
décision métier durable, ses preuves, son approbation ou son refus et l'effet
éventuellement exécuté. Confondre les deux rendrait leur cycle de vie illisible.

L'auto-évaluation d'un modèle n'est pas une autorité fiable pour décider une
mutation. Le dépôt CompAI CRM confirme un motif pertinent : les outils déclarent
ce qu'ils ont observé et sa provenance ; une preuve insuffisante devient une
suggestion humaine, sans score de confiance fourni par le modèle.

## Décision

SA-3 modélise zéro à plusieurs propositions métier dédiées par exécution. Leur
nom physique et leur migration ne sont pas figés par cet ADR, mais leur contrat
doit au minimum distinguer :

- le type de proposition et une charge utile bornée ;
- les faits observés, sources et données manquantes ;
- la version et la clé métier d'idempotence ;
- la décision `proposed`, `approved` ou `rejected` ;
- l'expiration comme date et l'effet créé comme référence, sans figer deux états
  supplémentaires ;
- l'auteur de la décision et les dates utiles.

Une proposition de tâche peut viser une tâche interne ou liée à un Tier. Chaque
proposition possède sa propre décision et sa propre clé d'idempotence ; une
approbation crée au plus une tâche.

L'approbation et le refus sont des commandes tRPC distinctes. Identité, droits,
agence, version et politique sont réévalués lors de l'exécution. Un protocole de
framework, notamment l'approbation d'outil AI SDK, peut servir d'enveloppe de
transport ; PostgreSQL et les services CIR restent l'autorité durable.

Le passage `shadow` → `supervised` → `autonomous` dépend d'une matrice
déterministe : type d'action, impact, droits, données, bornes métier et résultats
d'évaluation. Aucun score de confiance auto-attribué par le modèle ne peut
autoriser une action.

Les instructions métier versionnées en Markdown, comme les skills de CompAI,
restent une piste d'évaluation. Elles ne remplacent pas automatiquement les
templates administrables, leur historique ni la gouvernance déjà présents.

## Conséquences

- Une proposition survit à la requête qui l'a produite et reste explicable.
- Une ambiguïté ou une preuve faible conduit à la supervision, pas à une valeur
  inventée.
- Les réservations IA restent techniques et ne deviennent pas un workflow caché.
- La politique d'autonomie est testable sans demander au modèle de se juger.
- Une capacité générique `record_fact` n'est pas ajoutée au tracer bullet tant
  qu'un second cas métier réel ne la justifie pas.

## Alternatives écartées

- **Utiliser `ai_request_reservations` comme proposition :** cycles de vie et
  responsabilités incompatibles.
- **Faire confiance à un score LLM :** signal non calibré contrôlé par l'acteur
  qui demande l'autorisation.
- **Créer un ledger agentique universel :** moteur de workflow prématuré.
- **Remplacer immédiatement les prompts administrables par des skills Git :**
  perte de fonctionnalités sans preuve de parité.

## Sources primaires

- [CompAI CRM — doctrine de preuve et suggestions humaines](https://github.com/trycompai/crm#what-this-is)
- [AI SDK — outils et approbations](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
