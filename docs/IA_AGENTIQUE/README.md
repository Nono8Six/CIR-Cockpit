# IA Agentique — index canonique

Ce dossier regroupe le corpus documentaire du Socle Agentique de CIR Cockpit.
Il constitue le point d'entrée unique pour suivre ses décisions, son plan et
son avancement.

## Ordre de lecture

1. [`plan-socle-agentique.md`](./plan-socle-agentique.md) — plan vertical-first
   canonique, décisions PO, critères de sortie et journal des preuves ;
2. [`audit-et-proposition-socle-agentique.md`](./audit-et-proposition-socle-agentique.md) —
   audit contradictoire historique du 2026-08-14, intégré à la révision du plan ;
   ses descriptions de l'ancien plan SA ne sont plus l'état canonique ;
3. [`0001-noyau-capacites-agentiques.md`](./0001-noyau-capacites-agentiques.md) —
   composition verticale sur les services typés avant tout registre ;
4. [`0002-runtime-poc-agentique-local.md`](./0002-runtime-poc-agentique-local.md) —
   runtime Deno unifié et reprise pragmatique par étapes ;
5. [`0003-routage-modeles-et-donnees-poc.md`](./0003-routage-modeles-et-donnees-poc.md) —
   routage multi-provider et politique de données du POC ;
6. [`0004-supervision-preuves-et-autonomie.md`](./0004-supervision-preuves-et-autonomie.md) —
   propositions métier durables, preuves et politique déterministe d'autonomie.

## Autorité

L'architecture globale reste
[`docs/architecture-cible-cir-cockpit.md`](../architecture-cible-cir-cockpit.md),
car elle gouverne l'ensemble du produit et pas seulement l'IA agentique. Ses
sections 10.2, 10.4, 11 et 13 portent la doctrine agentique directrice.

En cas d'écart : l'architecture globale fixe la cible, les ADR expliquent les
arbitrages et le plan gouverne l'exécution. Aucun document de ce dossier
n'autorise implicitement code, installation, migration ou déploiement.

## Statut courant

- plan révisé vertical-first après revues contradictoires Claude, Gemini et Grok ;
- arbitrages SA-0 renseignés ; seule la décision explicite `GO/NO-GO SA-1`
  reste ouverte ;
- programme GitHub [#23](https://github.com/Nono8Six/CIR-Cockpit/issues/23) et
  tickets blockers-first [#24](https://github.com/Nono8Six/CIR-Cockpit/issues/24)
  à [#32](https://github.com/Nono8Six/CIR-Cockpit/issues/32) publiés ;
- implémentation non commencée ;
- `GO SA-1` explicite requis après clôture de SA-0.
