# Plan de travail

## 2026-03-10

### Refonte du module de creation entreprise

Objectif:
- remplacer le wizard plein ecran par un flux integre au shell annuaire
- reutiliser une meme base UI pour la page routee et les dialogues existants
- ajouter des routes dediees pour la creation et la conversion prospect -> client
- conserver la logique metier et les validations existantes

Etapes:
1. extraire la logique du wizard dans un shell partage page/dialogue
2. refaire la hierarchie visuelle des 4 etapes avec des patterns alignes annuaire
3. brancher `/clients/new` et `/clients/prospects/$prospectId/convert`
4. migrer les points d'entree de l'annuaire et de la recherche vers ces routes
5. verifier avec tests cibles, navigateur local et gate QA adaptee
