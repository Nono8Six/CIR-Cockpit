# Cahier métier Tarification CIR

> **Statut :** matière métier de travail, conservée pour les futurs ateliers Produit/Prix
>
> **Autorité :** `docs/architecture-cible-cir-cockpit.md` prévaut pour le modèle, l’architecture et l’ordre des briques. Le code, les migrations et Supabase décrivent l’état réel. Ce cahier ne constitue ni un plan d’exécution ni une spécification technique validée.
>
> **Nettoyage :** 2026-07-17

## Documents conservés

### Métier

1. [Contexte et enjeux](./METIER/01-contexte-enjeux.md)
2. [Hiérarchie produit](./METIER/02-hierarchie-produit.md)
3. [Logique de tarification](./METIER/03-logique-tarification.md)
4. [Rôles et workflows](./METIER/04-roles-workflows.md)
5. [Écrans utilisateur](./METIER/05-ecrans-utilisateur.md)
6. [Prix marché, dérogations et BFA](./METIER/06-ecrans-prix-derogations.md)
7. [Règles métier](./METIER/07-regles-metier.md)
8. [Décisions et questions historiques](./DECISIONS/decisions-et-questions.md)

## Règles d’utilisation

- Les besoins terrain, exemples et contraintes opérationnelles restent des entrées précieuses.
- Les anciens schémas, cascades figées, modèles IA, budgets, calendriers et découpages en phases ne sont plus normatifs.
- Toute nouvelle brique Produit/Prix commence par réconcilier le besoin concerné avec les décisions ouvertes de l’architecture directrice.
- L’IA est traitée exclusivement dans `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md`.
- La stack réelle est décrite dans `docs/stack.md`.
- Aucun fichier de ce cahier n’autorise une migration ou un import de données réelles à lui seul.

## Sources conservées hors cahier

Les classeurs Excel, fichiers de classification, arbre de familles et présentation de contexte placés dans `docs/LOGIQUE_REMISE_CIR/` sont des sources métier brutes. Ils ne fixent pas l’architecture et doivent être versionnés, validés et importés par les pipelines prévus avant usage applicatif.

`Présentation_contexte.txt` est conservé dans son encodage d’origine comme matériau historique uniquement. Son contenu n’est ni normatif ni une source de vérité actuelle.
