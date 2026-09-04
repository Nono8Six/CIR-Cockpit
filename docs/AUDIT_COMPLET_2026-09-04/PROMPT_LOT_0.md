# Prompt — exécution du Lot 0 dans une nouvelle conversation

> Statut : exécuté et clôturé avec verdict GO le 4 septembre 2026. Conserver ce prompt comme historique ; ne pas le relancer.

Copier uniquement le bloc ci-dessous dans une nouvelle conversation Codex.

```text
Travaille dans C:\GitHub\CIR_Cockpit\CIR-Cockpit.

Modèle
Utilise gpt-5.6-terra avec un effort medium.

Objectif
Exécute uniquement le « Lot 0 — Isolation des vues et raccourcis » décrit dans docs/AUDIT_COMPLET_2026-09-04/LOT_0_PLAN_EXECUTION.md.

Le résultat final doit prouver qu’une vue React conservée mais inactive ne peut plus soumettre ou réinitialiser le Cockpit, avancer dans son parcours guidé, changer un canal, déplacer un focus ou traiter les raccourcis Pilotage.

État de départ
- AppMainTabContent conserve les vues visitées montées et applique seulement hidden aux sections inactives.
- useInteractionHotkeys, Dashboard et trois composants du parcours guidé Cockpit inscrivent des listeners globaux sans connaître la vue active.
- Le shell possède et affiche F1–F9 ; le Cockpit intercepte aussi F1/F2 sans les annoncer.
- La baseline ciblée actuelle est verte : 5 fichiers, 27 tests, mais elle ne couvre pas encore l’isolation inter-vues.
- Le dossier docs/AUDIT_COMPLET_2026-09-04/ est non suivi par Git et doit être préservé.

Périmètre autorisé
- Modifier uniquement les composants, hooks, types et tests frontend nécessaires à UI-01/UI-R01.
- Ajouter un simple prop obligatoire isActive depuis AppMainTabContent jusqu’aux effets globaux concernés.
- Ajouter inert aux sections inactives en plus de hidden.
- Retirer F1/F2 de useInteractionHotkeys sans touches de remplacement.
- Ajouter ou ajuster les tests ciblés capables de détecter un listener resté actif après navigation ou rerender.
- Mettre à jour le document du Lot 0 uniquement si nécessaire pour enregistrer les preuves réelles.

Décisions acquises
- Le shell reste l’unique propriétaire de F1–F9.
- Le keep-alive, les brouillons et le retour de scroll sont conservés.
- Chaque effet concerné retourne avant addEventListener lorsque isActive est faux et se nettoie lors du passage actif → inactif.
- Aucun contexte global, registre générique, nouveau framework ou paquet de hotkeys.
- Settings/beforeunload, AppLayout, useAppShortcuts et les Dialogs déjà bornés ne sont pas refactorés sans reproduction d’un défaut.
- Les services Windows/Servy sont de simples lanceurs de développement. Leur risque LocalSystem est accepté par le PO et totalement hors de ce lot.

Limites
- Ne touche pas au backend, à Windows, Servy, leurs services, comptes, ACL, processus, fichiers .env ou modes de démarrage.
- Aucun packaging backend ou frontend, artefact immuable ou travail sur la stack finale.
- Aucun Lot 1 ni « Lot 0 » du plan Grand ménage.
- Aucune migration, écriture Supabase, modification Edge, déploiement ou publication distante.
- Aucun stage, commit, push, PR, stash, reset ou nettoyage du worktree.
- N’élargis pas l’inventaire au-delà des listeners globaux des vues keep-alive.

Sources à relire
- docs/AUDIT_COMPLET_2026-09-04/LOT_0_PLAN_EXECUTION.md
- docs/AUDIT_COMPLET_2026-09-04/PLAN_PRIORISE.md, section Lot 0 — Stop immédiat
- docs/AUDIT_COMPLET_2026-09-04/02-ui-ux-design/02-parcours-et-etats.md, UI-01
- docs/AUDIT_COMPLET_2026-09-04/02-ui-ux-design/06-refactorings-frontend-cibles.md, UI-R01
- docs/testing.md

Preuves de fin
- AppMainTabContent conserve les vues visitées, mais chaque section inactive porte hidden et inert.
- useInteractionHotkeys, Dashboard, CockpitGuidedStepSwitch, CockpitSupplierLookup et CockpitGuidedDetailsQuestion n’inscrivent aucun effet global lorsque leur surface est inactive.
- Un rerender actif → inactif prouve le cleanup.
- Ctrl/Cmd+Entrée, Ctrl/Cmd+N et T/E/C/V agissent uniquement dans le Cockpit actif.
- /, flèches, Entrée/O, Retour arrière et Suppr agissent uniquement dans Pilotage actif.
- Après visite Cockpit → Pilotage → Tâches, aucun raccourci des deux vues masquées ne produit d’effet.
- F1/F2 produisent uniquement la navigation shell attendue selon les droits.
- Aucun élément masqué ne reçoit le focus.
- Keep-alive, brouillons et retour de scroll restent inchangés.
- Les tests ciblés passent, puis pnpm --dir frontend run typecheck passe.
- Le diff final ne contient aucun changement hors périmètre.

Exécution
Applique AGENTS.md déjà chargé. Utilise d’abord cir-cockpit-agent-router, puis uniquement les fichiers et skills nécessaires. Vérifie le worktree, implémente le correctif minimal, exécute les preuves ciblées et va jusqu’au résultat sans questionnaire tant qu’aucune décision réellement bloquante n’apparaît.

Termine par le verdict GO ou NO-GO, les fichiers modifiés, les tests et le typecheck réellement exécutés, ainsi que toute réserve réelle.

Arrêt strict
Après le verdict Lot 0, arrête-toi. Ne commence aucun Lot 1, travail backend, Windows, Servy, migration, déploiement, commit ou push.
```

## Conseil d’exécution

- **Modèle :** `gpt-5.6-terra`
- **Effort :** `medium`
- **Tâche :** nouvelle tâche
- **Pourquoi :** le plan frontend est borné, sans décision d’architecture ouverte, et ses tests ciblés peuvent détecter une implémentation incorrecte.
