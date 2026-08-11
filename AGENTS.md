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
- Modifier le minimum utile, préférer un fichier existant et ne pas ajouter fonctionnalité, refactor, documentation ou fichier non demandé.
- Zéro donnée mockée ou hardcodée, TODO non résolu ou texte décoratif dans le code livré.
- Pour Zod/API ou le système d'erreurs, charger le skill CIR correspondant et appliquer les implémentations canoniques existantes.
- Frontend : imports via `@/*`, pas d'import circulaire.
- Ne jamais exposer, copier, journaliser ou persister secrets, tokens, clés, mots de passe ou valeurs sensibles d'environnement.

## Routage et validation

- Une disponibilité ne justifie jamais le chargement d'un skill. Le routeur est l'unique table de routage détaillée.
- Utiliser `cir-cockpit-handoff-prompt` pour préparer la reprise d'un plan ou une nouvelle tâche sans recopier le contexte permanent.
- Avant toute livraison, utiliser `cir-cockpit-qa-validation` pour choisir le plus petit gate défendable ; lire le runbook complet seulement pour une gate finale.
