# AGENTS.md

Guide operationnel court pour CIR Cockpit. Les documents canoniques et les preuves actuelles priment sur toute mémoire ou skill.

## Source et portée

- Les documents canoniques et les preuves actuelles priment sur la mémoire et les skills ; ne jamais trancher silencieusement un point `A VALIDER`.
- Pour tout travail non trivial, charger `cir-cockpit-agent-router`, puis seulement les fichiers, skills, MCP et validations qu'il sélectionne.
- Lire les fichiers directement concernés ; pour un document lourd, lire sa structure puis les sections utiles. Ne pas explorer tout le dépôt si le périmètre est clair.
- Ne pas lire `CLAUDE.md` par défaut : c'est l'adaptateur Claude Code de ces règles.
- `.mcp.json` est local et ignoré par Git : vérifier les MCP réellement exposés avant de s'y fier.

## Règles de travail

- Préserver le worktree sale ; ne jamais revert, stash, reset, nettoyer, stage, commit, push, déployer, migrer ou publier hors autorisation courante.
- Hors refonte explicitement approuvée, modifier le minimum utile, préférer un fichier existant et ne pas ajouter fonctionnalité, refactor, documentation ou fichier non demandé.
- Zéro donnée mockée ou hardcodée, TODO non résolu ou texte décoratif dans le code livré.
- Pour Zod/API ou le système d'erreurs, charger le skill CIR correspondant et appliquer les implémentations canoniques existantes.
- Frontend : imports via `@/*`, pas d'import circulaire.
- Ne jamais exposer, copier, journaliser ou persister secrets, tokens, clés, mots de passe ou valeurs sensibles d'environnement.

## Doctrine POC et refonte

- CIR Cockpit est un POC personnel pré-production, pas une organisation multi-équipe. Partir du besoin prouvé et choisir l'architecture finale la plus simple qui le couvre ; ne pas importer de mécanismes d'entreprise pour des consommateurs, volumes ou risques hypothétiques.
- Lorsqu'une architecture est supersédée, arrêter de la perfectionner. Récupérer ses actifs métier prouvés, puis supprimer franchement le code, les dépendances et les documents remplacés.
- Une refonte approuvée autorise la coupe franche : réorganiser, déplacer, réécrire et supprimer dans son périmètre. La taille minimale du diff n'est alors pas un objectif ; la simplicité du résultat final l'est.
- Git constitue le filet de récupération du POC. Ne créer dual-run, dual-write, feature flag, shim de compatibilité ou mécanisme de rollback que si un consommateur actuel prouvé l'exige ou si le PO le demande.
- Préférer une implémentation canonique unique. Éviter les runtimes, adapters et chemins temporaires conçus seulement pour faire cohabiter l'ancien et le nouveau.
- Mettre à niveau les dépendances par ensembles cohérents et supprimer celles devenues inutiles ; ne pas conserver une ancienne version pour une compatibilité hypothétique.
- Validation POC : un test ciblé par invariant modifié, puis le typecheck de la couche, constitue la boucle normale. Ajouter un autre test uniquement pour un risque distinct directement voisin ; réserver suites complètes, matrices, builds et preuves répétées aux gates finales ou à un risque concret.

## Routage et validation

- Une disponibilité ne justifie jamais le chargement d'un skill. Le routeur est l'unique table de routage détaillée.
- Utiliser `cir-cockpit-handoff-prompt` pour préparer la reprise d'un plan ou une nouvelle tâche sans recopier le contexte permanent.
- Avant toute livraison, utiliser `cir-cockpit-qa-validation` pour choisir le plus petit gate défendable ; lire le runbook complet seulement pour une gate finale.
