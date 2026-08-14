# ADR 0003 — Routage multi-provider sans framework imposé

| Métadonnée | Valeur |
| --- | --- |
| Statut | Accepté pour le POC ; gate production requis |
| Date | 2026-08-14 |
| Autorité | `docs/architecture-cible-cir-cockpit.md` |
| Corpus | `docs/IA_AGENTIQUE/README.md` |

## Contexte

Le POC doit pouvoir comparer des modèles sans lier le métier à Mistral, OpenAI
ou un framework. CIR Cockpit possède déjà un adaptateur Mistral, une boucle
d'outils et une gouvernance des providers, modèles, quotas, coûts et usages.

Ajouter AI SDK uniquement parce qu'il est actuel dupliquerait ces mécanismes
avant de prouver un gain. À l'inverse, coder chaque provider dans le broker
empêcherait la convergence recherchée.

## Décision

Une petite interface provider-neutral appartient au plan d'exécution IA. Le
provider et le modèle sont choisis par configuration existante ; les capacités
métier et le moteur de diff n'en dépendent pas.

Le tracer bullet utilise le chemin Mistral déjà éprouvé et une sortie structurée
validée par Zod. Aucun spike AI SDK n'est obligatoire tant qu'un seul appel
modèle suffit.

AI SDK Core peut faire l'objet d'un spike Deno court si une boucle, un second
provider ou du plumbing réellement dupliqué apparaît. Il n'est retenu que s'il
supprime du code, conserve la gouvernance CIR, passe `deno check` dans le bundle
`api` et n'impose ni Gateway ni hébergement tiers. Ses approbations et sa
télémétrie ne remplacent ni la proposition durable, ni l'autorisation, ni les
quotas, coûts et traces CIR. Aucun framework agentique ou de workflow n'est un
prérequis.

Chaque exécution enregistre provider, modèle, configuration, coût, tokens,
durée et politique de données déclarée. Pendant le POC personnel, cette
politique informe sans bloquer globalement le modèle. Avant toute donnée de
production, un gate revalide contrat, entraînement, rétention, résidence, ZDR,
logs et outils tiers.

## Conséquences

- Mistral reste le défaut actuel sans devenir une dépendance du domaine.
- Le multi-provider est une propriété de l'interface, pas le motif d'une grosse
  dépendance immédiate.
- Un changement de bibliothèque d'orchestration ne modifie aucune capacité.
- L'absence de besoin concret vaut absence de spike et de dépendance.
- Prompts et réponses brutes restent conservés au plus 7 jours ; traces
  techniques expurgées 30 jours ; preuves métier selon leur objet.

## Alternatives écartées

- **AI SDK rendu obligatoire par le plan :** spike sans problème concret à
  résoudre.
- **Provider unique dans le domaine :** verrouillage et migration future.
- **Framework agentique complet :** abstraction inutile pour un seul agent et
  trois capacités.
- **ZDR comme gate global du POC :** incompatible avec le périmètre exploratoire
  et non uniforme entre providers.
