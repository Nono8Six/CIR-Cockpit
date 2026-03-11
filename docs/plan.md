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

## 2026-03-11

### Nettoyage structurel du repo

Objectif:
- retirer les artefacts et fichiers orphelins encore suivis par Git
- normaliser le naming des dossiers/docs hors zone source de verite
- reduire la surface des gros modules front actifs sans changer les contrats metier

Etapes:
1. deplacer les audits historiques sous `docs/audit/` et le plan de refactor sous `docs/plan/`
2. supprimer les fichiers sans consommateurs runtime/tests et durcir `.gitignore`
3. renommer les dossiers front hors convention (`ClientList`, `ProspectList`) vers du `kebab-case`
4. decouper les hotspots `ClientDetailPanel` et `useClientsPanelState` en sous-modules internes
5. verifier avec tests cibles puis gate `pnpm run qa`
