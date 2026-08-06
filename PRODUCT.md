# Product

## Register

product

## Users

Trois rôles réels, définis dans `shared/schemas/admin/user.schema.ts` (`super_admin`, `agency_admin`, `tcs`) :

- **`tcs`**, le technico-commercial. Utilisateur quotidien et majoritaire. Il travaille depuis une agence, sur écran de bureau, en sessions longues et interrompues : un appel client, une recherche de référence, une saisie, un retour à l'appel. Il connaît son métier mieux que l'outil ne le connaîtra jamais.
- **`agency_admin`**, le responsable d'agence. Même quotidien que le TCS, plus le paramétrage de son périmètre et la lecture consolidée de l'activité de son équipe.
- **`super_admin`**, l'administrateur plateforme. Utilisateur rare, tâches lourdes : imports de catalogues, activation de référentiels, diagnostic, gestion des comptes et des agences.

Le travail à accomplir, commun aux trois : retrouver un tiers sans le chercher, savoir ce qui a déjà été dit, produire un prix juste et défendable, et ne rien perdre entre deux interruptions.

Contexte d'usage à retenir : poste fixe, agence éclairée, journée continue, l'outil reste ouvert huit heures. Ce n'est ni du mobile, ni de l'usage occasionnel, ni une consultation en réunion.

## Product Purpose

CIR Cockpit est la plateforme opérationnelle d'un distributeur industriel B2B. Ce n'est pas un CRM : la cible couvre les tiers et leurs interlocuteurs, le travail commercial, les opportunités, devis et commandes, un catalogue industriel de très grande taille avec sa classification interne, les tarifs fabricants, les dérogations, groupements, paliers et BFA, les imports Excel hétérogènes et récurrents, et un assistant IA transversal.

Les ordres de grandeur cadrent les choix d'interface : plus de 12 000 clients à importer, 50 à 100 fournisseurs, des centaines de milliers de références par catalogue, un historique qui peut dépasser le volume du catalogue actif. Toute décision d'affichage doit tenir à cette échelle, jamais seulement sur un jeu de démonstration.

La référence directrice est `docs/architecture-cible-cir-cockpit.md`. Elle distingue quatre niveaux de décision (`VERROUILLÉ`, `CIBLE`, `À VALIDER`, `EXISTANT`) et fait autorité sur le modèle métier.

Le succès se mesure à une chose : un TCS fait en trois gestes ce qui lui prenait un fichier Excel, un mail et un coup de téléphone.

## Brand Personality

**Instrument de précision.** Exact, sobre, silencieux.

L'outil disparaît derrière la donnée. Il n'a pas d'opinion sur lui-même, ne célèbre pas ses propres écrans, ne demande pas à être admiré. Sa qualité se lit dans ce qu'il n'affiche pas : pas de félicitations, pas d'illustrations, pas de vide décoratif.

L'émotion visée est la confiance, obtenue par la constance. Un chiffre s'affiche toujours au même endroit, avec la même graisse, aligné de la même façon. La friction tend vers zéro non pas parce que l'interface est simple, mais parce qu'elle est prévisible.

Le ton écrit suit la même ligne : français, vouvoiement systématique, phrases courtes, aucune familiarité. « Saisissez un numéro », jamais « Oups, il manque quelque chose ! ».

## Anti-references

Quatre familles explicitement rejetées. Elles sont reprises telles quelles dans les « Don't » de `DESIGN.md`.

- **ERP legacy (SAP, Sage).** Grilles grises indifférenciées, icônes de 2008, densité subie plutôt que choisie, aucune hiérarchie visuelle. CIR Cockpit est dense par décision, pas par abandon.
- **SaaS IA générique.** Dark mode avec dégradés violets, accents néon, glassmorphism, et le gabarit hero-metric (gros chiffre, petit label, stats de soutien, accent en dégradé).
- **CRM grand public (HubSpot, Salesforce).** Chrome coloré, illustrations mascottes, cartes identiques répétées à l'infini, ton commercial enjoué.
- **Dashboard Material ou Bootstrap.** Ombres portées lourdes, cartes empilées, boutons pleine largeur, palette bleu par défaut.

Les directions d'inspiration retenues à l'inverse : Ramp, Stripe, Attio, Linear, Mistral pour la densité et la finition SaaS, SmoothUI pour les micro-interactions. Direction visuelle uniquement, jamais d'assets, de marque ou de texte repris.

## Design Principles

Cinq principes stratégiques, dérivés des principes non négociables de `docs/architecture-cible-cir-cockpit.md` §4.

1. **Le calcul se montre.** Un prix, une marge ou une priorité appliquée affiche sa trace : quelle règle, quelle source, quelle date. Un montant sans explication accessible est un bug d'interface, pas un gain de place.
2. **Rien ne disparaît en silence.** L'interface parle d'archivage, de désactivation et de remplacement, jamais de suppression. Un objet retiré reste retrouvable, et l'écran le dit.
3. **L'écran ne redemande pas ce qu'il sait déjà.** Le reproche fait au formulaire d'interaction actuel (décider trop tôt du type de tiers, du type de suivi et de champs conditionnels) est un principe général : différer chaque question jusqu'à ce qu'elle soit la seule restante.
4. **La densité est un service.** Voir plus de lignes sans plisser les yeux est la fonctionnalité principale. Chaque pixel d'espacement se justifie par la lisibilité, jamais par le confort visuel d'une capture d'écran.
5. **L'IA propose, l'utilisateur tranche.** Toute action sensible préparée par l'assistant reste un brouillon explicite jusqu'à confirmation. L'interface ne laisse jamais croire qu'une écriture est faite quand elle est suggérée.

## Accessibility & Inclusion

Aucun niveau WCAG n'est engagé contractuellement. Les pratiques suivantes sont néanmoins déjà en place dans le code et ne doivent pas être cassées par régression :

- **Mouvement réduit.** `frontend/src/index.css` porte un bloc `prefers-reduced-motion: reduce` complet : le shimmer des squelettes s'arrête sans disparaître, les transitions Radix sont neutralisées sans être supprimées pour que les changements d'état restent perceptibles.
- **Contraste du texte d'alerte.** `--warning-strong` (`hsl(38 85% 31%)`) existe uniquement parce que `--warning` ne peut pas tenir 4,5:1 en texte sans virer au brun. Utiliser `--warning` pour les fonds, `--warning-strong` pour le texte.
- **Focus visible.** Tous les primitifs interactifs portent `focus-visible:ring-2 ring-ring/45 ring-offset-2`. Pas de suppression d'outline sans remplacement.
- **Parcours clavier.** Tab, Escape pour fermer un dialog, Enter pour valider. Le palette de commandes (Ctrl+K) est l'entrée de navigation privilégiée.
- **Plancher typographique.** 11px minimum pour toute chaîne visible. Les `text-[10px]` restants sont une dette identifiée, pas une autorisation.

Le thème est clair uniquement (`color-scheme: light`). Aucun dark mode n'est prévu, et ce n'est pas un oubli : l'usage cible est un poste fixe en agence éclairée, huit heures par jour.
