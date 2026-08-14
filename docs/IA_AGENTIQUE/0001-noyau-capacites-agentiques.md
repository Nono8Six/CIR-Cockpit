# ADR 0001 — Composition verticale avant registre de capacités

| Métadonnée | Valeur |
| --- | --- |
| Statut | Accepté pour le Socle Agentique simplifié |
| Date | 2026-08-14 |
| Autorité | `docs/architecture-cible-cir-cockpit.md` |
| Corpus | `docs/IA_AGENTIQUE/README.md` |

## Contexte

CIR Cockpit expose déjà les mêmes services métier typés par tRPC et par les
outils propres à l'assistant. Pour les référentiels, les deux appelants importent
directement les fonctions de diff, d'agrégation et d'import. La règle métier ne
se trouve donc pas dans les adaptateurs.

Le POC n'a toutefois qu'un backend Deno réel. Ajouter un runtime Node, un port
HTTP interne et des grants signés créerait des interfaces de transport sans
second déploiement justifié.

## Décision

Le premier vertical compose directement les services typés existants dans le
backend Deno. Il n'ajoute ni `invokeCapability(context, name, input)`, ni
registre par chaîne, ni déplacement artificiel dans `shared/`.

Le contrat initial est spécifique au parcours : une projection
`ReferenceWatchFacts` construit un résultat borné et sourcé à partir d'un run de
diff déjà calculé. Une interface de capacité ou un registre ne sera extrait que
si un second parcours réel démontre une composition dupliquée ou si un nouvel
adaptateur externe doit appeler la même commande.

Deux familles restent distinctes :

- une **requête** retourne un résultat borné et sourcé sans effet métier ;
- une **commande** ajoute clé d'idempotence, risque et règle d'approbation.

Les services métier existants restent responsables de validation, identité,
agence, autorisation, transaction et erreurs. Le composite vertical ajoute
uniquement bornage, sélection des faits et provenance. `shared/` ne reçoit un
schéma que lorsqu'un consommateur réel hors backend l'exige.

Les descriptions destinées au modèle et leur conversion en outils appartiennent
à l'adaptateur IA. Le modèle choisit une capacité bornée, jamais une requête SQL
générale. L'outil SQL de lecture existant reste un chemin transitoire : aucune
nouvelle capacité agentique ne l'utilise, puis ses usages sont migrés et retirés
seulement après parité prouvée.

## Conséquences

- Le premier livrable utile est un paquet de faits, pas un dispatcher.
- Aucun transport, secret inter-processus ou sérialisation réseau n'est ajouté.
- Les tests appellent la projection verticale et les services réels qu'elle
  compose.
- Une abstraction partagée reste possible après preuve de deux besoins communs.

## Alternatives écartées

- **SQL ou Supabase MCP offert au modèle :** surface trop large et règles métier
  contournables.
- **Node → HTTP → Deno pour le POC :** interface et sécurité sans second runtime
  nécessaire.
- **Déplacement des implémentations dans `shared/` :** mélange les contrats
  portables avec des modules dépendants de Deno, de l'identité et des
  transactions.
- **Dispatcher par nom dès le premier vertical :** ajoute une indirection moins
  typée alors que les services sont déjà partagés par imports directs.
- **Réécriture immédiate de tous les outils :** risque de régression sans preuve
  de parité.
