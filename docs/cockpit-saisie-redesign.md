# Redesign de la page "Saisie" (`/cockpit`)

> Design spec pour le redesign complet de la page de saisie d'interaction.
> Statut : **proposé** — décisions prises en brainstorm, implémentation à planifier.
> Dernière mise a jour : 2026-04-19.

---

## 1. Executive summary

La page **Saisie** (`/cockpit`) est la page la plus sollicitée du produit : un TCS y enchaîne 20 à 50 saisies par jour. L'implémentation actuelle a trois défauts structurels :

1. **Espace mort** : l'écran initial laisse 70 % de la surface vide en attendant le choix du canal.
2. **Champs requis cachés** : `contact_service`, `status_id` et `interaction_type` sont requis par le schéma Zod mais planqués derrière `+ Ajouter un champ`, ce qui fait échouer le submit sans avertissement clair.
3. **Modèle métier tronqué** : seuls 2 des 5 types de tiers supportés (`Client`, `Prospect`) sont exposés dans l'UI. Les 3 autres (`Fournisseur`, `Interne CIR`, `Sollicitation`) n'ont pas de chemin de saisie visible.

Le redesign conserve les contrats de données et le flow en 3 étapes, mais le recompose autour d'un persona ancre **TCS temps réel, clavier-only** avec :

- Des écrans **denses** et **jamais vides**.
- Les champs requis **visibles en dur**.
- Les 5 types de tiers **explicitement sélectionnables** via pills.
- Un contexte droit **adaptatif** selon le type de tiers.

---

## 2. Contexte et motivation

### 2.1 État actuel

L'implémentation actuelle (voir `frontend/src/components/CockpitForm.tsx` et sous-composants `frontend/src/components/cockpit/**`) fonctionne en stepper à révélation progressive :

1. **Étape 1** : 4 tuiles géantes (`Téléphone`, `Email`, `Comptoir`, `Visite`), pas d'autre contenu.
2. **Étape 2** : input de recherche "Avec qui" avec résultats clients/prospects mélangés.
3. **Étape 3** : formulaire principal avec sujet + chips inline + panneau contexte client à droite.

### 2.2 Observations

| Observation | Conséquence |
|---|---|
| Écran 1 est 70 % vide | Un TCS ouvre la page 50 fois/jour, l'espace est gaspillé |
| Service + Statut + Type requis mais cachés | Submit échoue sans feedback clair, le TCS perd du temps à chercher les bons champs |
| 5 types de tiers dans le schéma, 2 seulement visibles | Les cas `Fournisseur`, `Interne CIR`, `Sollicitation` n'ont pas de chemin de saisie, ce qui force des contournements (mauvais type saisi par dépit, notes textuelles) |
| Stepper force 3 clics d'init par saisie | 50 × 3 = 150 clics/jour juste pour amorcer |
| Aucune reprise rapide | Les brouillons et les dernières saisies ne sont pas visibles, il faut naviguer |

### 2.3 Objectif

Remettre la page au niveau d'un **outil pro d'opérateur** (comparables : Linear pour les issues, Superhuman pour l'email), où la vitesse et la découvrabilité clavier priment sur l'aération visuelle.

---

## 3. Persona et principes

### 3.1 Persona ancre

**TCS temps réel**
- Fait **20 à 50 saisies par jour**.
- Enregistre **pendant** ou **juste après** l'appel/visite.
- Les mains sont souvent déjà sur le clavier (post-appel casque).
- Tolère une densité d'information élevée.
- Attend un feedback immédiat (pas de page de confirmation, pas de modale bloquante).

### 3.2 Principes directeurs

| Principe | Conséquence design |
|---|---|
| **Vitesse > confort** | Densité élevée, pas d'aération superflue, raccourcis clavier dominants |
| **Clavier first (zero-mouse)** | Chaque action doit avoir une touche. La souris est l'exception, pas la règle |
| **Jamais d'écran vide** | Si la page est ouverte, elle doit offrir quelque chose à faire ou à lire |
| **Les champs requis sont visibles** | Pas de piège au submit. Les required apparaissent en dur, pas cachés derrière un `+` |
| **Chaque type de tiers a son chemin** | Les 5 types du schéma métier ont une UX dédiée (même pattern, variantes contextuelles) |
| **Un seul layout, 3 états** | Les 3 étapes partagent le même chrome (pills canal + header statut + footer raccourcis), seule la zone centrale change |

### 3.3 Scope device

- **Desktop** (≥ 1280 px) : cible principale.
- **Tablette paysage** (≥ 1024 px) : supportée, le panneau contexte droit se replie.
- **Mobile / tablette portrait** (< 1024 px) : **hors scope** de ce redesign (itération ultérieure si besoin terrain).

---

## 4. Chrome global (toutes les étapes)

Tous les écrans partagent la même structure de chrome :

```
┌──────────────────────────────────────────────────────────────┐
│ Saisie en cours · non enregistré                INT-xxxxxx   │ ← Header statut dynamique
├──────────────────────────────────────────────────────────────┤
│ [☎ T]  [✉ E]  [🏪 C]  [🚗 V]                                 │ ← Pills canal (persistantes)
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    [zone centrale variable]                  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ T tél · E email · C comptoir · V visite                      │ ← Légende raccourcis
│ ⌘K chercher · ⌘↵ enregistrer · ⌘N nouvelle · ? aide          │
└──────────────────────────────────────────────────────────────┘
```

### 4.1 Header statut dynamique

Remplace le titre statique `NOUVELLE INTERACTION` + numéro `INT-001247` figé par un indicateur de cycle de vie :

| État | Texte | Couleur |
|---|---|---|
| Page ouverte, rien tapé | `Saisie en cours · non enregistré` | gris (`text-muted-foreground`) |
| Draft auto-sauvegardé | `Brouillon sauvegardé · 14:32` | bleu (`text-info`) |
| Erreur de sauvegarde draft | `Brouillon hors ligne · nouvelle tentative dans 10s` | orange (`text-warning`) |
| Interaction persistée | `Enregistré · INT-001247` | vert (`text-success`) |

Le numéro `INT-xxxxxx` n'apparaît qu'**après** l'enregistrement serveur (il est alloué côté DB).

### 4.2 Pills canal persistants

Les 4 pills `[T][E][C][V]` restent visibles sur **toutes les étapes**. Caractéristiques :

- Hauteur compacte : `h-7` (28 px), pas de tuile géante.
- Pill actif : fond `bg-primary`, texte `text-primary-foreground`.
- Pill inactif : fond `bg-card`, bordure `border-border`.
- **1 touche pour basculer** : `T`, `E`, `C`, `V`. Fonctionne même pendant la saisie du sujet (global shortcut, avec `preventDefault` si focus hors textarea).
- Si on bascule après avoir saisi des infos, aucun champ n'est perdu — le canal est juste mis à jour.

### 4.3 Légende raccourcis (footer)

Permanente, discrète, police `text-xs` grise. Elle sert de cheat sheet visible en continu. Deux lignes max.

---

## 5. Écran 1 — État d'entrée (avant choix du canal)

### 5.1 Objectif

La page n'est **jamais vide**. Dès qu'un TCS ouvre `/cockpit`, il a accès à :
1. La **reprise de brouillon** en cours (important : les drafts ne doivent jamais être perdus).
2. Les **5 dernières saisies** pour clonage rapide ou relance.

### 5.2 Mockup

```
┌──────────────────────────────────────────────────────────────┐
│ Saisie en cours · non enregistré                             │
│ [☎ T]  [✉ E]  [🏪 C]  [🚗 V]       ↩ choisir un canal        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  BROUILLONS (2)                                              │
│    Morel Établissements · devis pompe         il y a 14 min  │
│    SKF France · dispo roulement SKF-6303      il y a 2 h     │
│                                                              │
│  5 DERNIÈRES SAISIES                                         │
│    ☎ SEA Aquitaine   · SAV pneu crevé         il y a 40 min  │
│    ✉ Dubourg Ind.    · commande DEV-0412      il y a 1 h     │
│    🏪 PONTAC Thierry · visite comptoir        il y a 2 h     │
│    ☎ Morel Ét.       · relance devis          ce matin 09:15 │
│    ✉ SKF France      · dispo référence        hier 17:22     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ T tél · E email · C comptoir · V visite                      │
│ ⌘K chercher · ⌘↵ enregistrer · ⌘N nouvelle · ? aide          │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Interactions

| Action | Résultat |
|---|---|
| Presser `T` / `E` / `C` / `V` | Canal sélectionné, passage écran 2 (focus auto sur la recherche) |
| Cliquer un brouillon | Ouvre la saisie avec l'état du draft restauré |
| `↑` / `↓` pour naviguer dans la liste | Focus sur l'entrée, `↩` pour ouvrir |
| Cliquer une saisie récente | Ouvre une **nouvelle** saisie pré-remplie avec le même tiers (pas de réédition de l'existante) |
| `⌘K` | Ouvre la search globale (hors page saisie) |

### 5.4 Sources de données

- Brouillons : `services/interactions/getInteractionDraft.ts` étendu pour lister tous les drafts du TCS courant (aujourd'hui stocke un seul draft — à généraliser si besoin).
- Dernières saisies : `services/interactions/getInteractions.ts` avec `limit: 5`, tri `created_at DESC`, filtre `created_by = user.id`.

---

## 6. Écran 2 — Avec qui (choix du tiers)

### 6.1 Objectif

Permettre au TCS de sélectionner **n'importe lequel des 5 types de tiers** (Client / Prospect / Fournisseur / Interne CIR / Sollicitation), avec l'UX adaptée à chaque type.

### 6.2 Mockup (pill Client actif, cas majoritaire)

```
┌──────────────────────────────────────────────────────────────┐
│ Brouillon sauvegardé · 14:32                                 │
│ [☎ T*] [✉ E]  [🏪 C]  [🚗 V]                                 │
├──────────────────────────────────────────────────────────────┤
│  AVEC QUI                                                    │
│                                                              │
│  [Tout] [Client*] [Prospect] [Fournisseur] [Interne] [Sollic.│
│                                                              │
│  🔍 Nom, n° client, ville…                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SA  SEA Aquitaine                      3 dossiers  → │  │
│  │      116277 · Gradignan · 33                          │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  MÉ  Morel Établissements               2 dossiers    │  │
│  │      104522 · Talence · 33                            │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │  DI  Dubourg Industries                 5 dossiers    │  │
│  │      125334 · Bordeaux · 33                           │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ ↑↓ naviguer · ↩ choisir · ⌫ retour · esc annuler             │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Comportement par pill

| Pill | Source | Résultat | Pas-de-résultat |
|---|---|---|---|
| **Tout** | Union Clients + Prospects + Fournisseurs | Chaque ligne porte son badge type | Message + boutons créer des 3 types |
| **Client** | `entities WHERE entity_type='client'` | Nom + n° + ville + nb dossiers ouverts | Message + bouton `+ Nouveau client` |
| **Prospect** | `entities WHERE entity_type='prospect'` | Nom + identifiant P-xxxx + ville | Message + bouton `+ Nouveau prospect` |
| **Fournisseur** | `entities WHERE entity_type='fournisseur'` | Nom + ville + tags fournis | Message + bouton `+ Nouveau fournisseur` |
| **Interne CIR** | Membres de l'agence active (`profiles WHERE agency_id=X`) | Nom + rôle (TCS/admin), étoile sur l'utilisateur courant | Saisie libre acceptée (texte brut) |
| **Sollicitation** | Lookup inverse sur `contact_phone` dans historique | Si numéro vu → résumé (dernière interaction, nb total). Sinon création minimale. | Champ tél vide, Entrée ouvre saisie avec juste le numéro |

### 6.4 Variante pill Sollicitation

```
┌──────────────────────────────────────────────────────────────┐
│  [Tout] [Client] [Prospect] [Fournisseur] [Interne] [Sollic*]│
│                                                              │
│  📞 APPEL ANONYME                                            │
│                                                              │
│  Numéro appelant   ┌────────────────────────────────┐        │
│                    │ 06 xx xx xx xx                 │ ↩      │
│                    └────────────────────────────────┘        │
│                                                              │
│  Nom (optionnel)   ┌────────────────────────────────┐        │
│                    │ M. Durand                      │        │
│                    └────────────────────────────────┘        │
│                                                              │
│  ℹ Si le numéro a déjà appelé, l'historique s'affichera.     │
└──────────────────────────────────────────────────────────────┘
```

### 6.5 Variante pill Interne CIR

```
┌──────────────────────────────────────────────────────────────┐
│  [Tout] [Client] [Prospect] [Fournisseur] [Interne*] [Sollic]│
│                                                              │
│  🔍 Collègue…                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ⭐ Arnaud Ferron (vous)                     TCS       │  │
│  │     Mémo perso / note interne                          │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │     Marie Dupont                             TCS       │  │
│  │     Paul Martin                              ADMIN     │  │
│  │     Julie Léger                              TCS       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Fallback : si vous tapez un nom hors liste (ex "Siège"),    │
│  la saisie libre est acceptée.                               │
└──────────────────────────────────────────────────────────────┘
```

### 6.6 Création inline (modale)

Quand le TCS clique `+ Nouveau prospect` (ou `+ Nouveau fournisseur` / `+ Nouveau client`), on ouvre une **modale centrée** avec les champs minimaux requis par le schéma Zod du type choisi. La modale se ferme sur succès et **injecte** le tiers dans la saisie courante (pas de recherche à refaire).

```
┌──────────────────────────────────────────────────────────┐
│ Nouveau prospect                               [× esc]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Raison sociale *     ┌────────────────────────────┐     │
│                       │                            │     │
│                       └────────────────────────────┘     │
│                                                          │
│  Ville *              ┌────────────────────────────┐     │
│                       │                            │     │
│                       └────────────────────────────┘     │
│                                                          │
│  Contact prénom *     Contact nom *                      │
│  ┌───────────────┐   ┌────────────────┐                  │
│  │               │   │                │                  │
│  └───────────────┘   └────────────────┘                  │
│                                                          │
│  Téléphone            ┌────────────────────────────┐     │
│                       │                            │     │
│                       └────────────────────────────┘     │
│                                                          │
│  Email                ┌────────────────────────────┐     │
│                       │                            │     │
│                       └────────────────────────────┘     │
│                                                          │
│                       [Annuler]   [Créer et continuer]   │
└──────────────────────────────────────────────────────────┘
```

**Règles de validation par type (rappel du schéma existant)** :

| Type | Champs requis |
|---|---|
| Client | entity_id + contact_id (existe déjà en base) |
| Prospect | raison sociale, ville, prénom, nom, tel OU email |
| Fournisseur | raison sociale, prénom, nom, **fonction**, tel OU email |
| Interne CIR | nom uniquement |
| Sollicitation | numéro de tel (uniquement) |

---

## 7. Écran 3 — Saisie complète

### 7.1 Layout bi-colonne

```
┌────────────────────────────────────────────┬─────────────────────┐
│ Brouillon sauvegardé · 14:32               │                     │
│ [☎ T*] [✉ E] [🏪 C] [🚗 V]                 │ ┌─────────────────┐ │
├────────────────────────────────────────────┤ │ CONTEXTE TIERS  │ │
│                                            │ │ (colonne droite │ │
│ SA  SEA Aquitaine · 116277      [modifier] │ │ adaptative — voir│ │
│                                            │ │ section 8)      │ │
│ ┌──────────────────────────────────────┐   │ │                 │ │
│ │ Service  ▾ │ Type  ▾ │ Statut  ▾    │   │ │                 │ │
│ │ Maintenance│ Devis   │ En cours     │   │ │                 │ │
│ └──────────────────────────────────────┘   │ │                 │ │
│                                            │ │                 │ │
│ SUJET                                      │ │                 │ │
│ ┌──────────────────────────────────────┐   │ │                 │ │
│ │ Décrivez en une phrase…              │   │ │                 │ │
│ └──────────────────────────────────────┘   │ │                 │ │
│                                            │ │                 │ │
│ NOTES / DÉTAILS TECHNIQUES                 │ │                 │ │
│ ┌──────────────────────────────────────┐   │ │                 │ │
│ │                                      │   │ │                 │ │
│ │                                      │   │ │                 │ │
│ │                                      │   │ │                 │ │
│ └──────────────────────────────────────┘   │ │                 │ │
│                                            │ │                 │ │
│ [📅 Rappel] [🏷 Tags produits] [🔖 Ref cde]│ │                 │ │
│ [+ ajouter un champ]                       │ │                 │ │
│                                            │ │                 │ │
│                  [Effacer][Brouillon]      │ └─────────────────┘ │
│                          [✓ Enregistrer ⌘↵]│                     │
├────────────────────────────────────────────┴─────────────────────┤
│ Tab suivant · Shift+Tab précédent · ⌘↵ enregistrer · ? aide       │
└───────────────────────────────────────────────────────────────────┘
```

### 7.2 Structure de la colonne gauche

Ordre de haut en bas :

1. **Ligne tiers sélectionné** (compacte, 1 ligne) : avatar + raison sociale + ID + bouton `[modifier]` (revient à l'écran 2).
2. **Rangée 3 selects visibles en dur** : Service · Type d'interaction · Statut. Ces 3 sont **requis** donc exposés d'emblée.
3. **Sujet** : 1 ligne, `input`. Placeholder `Décrivez en une phrase…`.
4. **Notes** : `textarea` permanent, 4-6 lignes visibles. Auto-expand possible jusqu'à 10-12 lignes max avant scroll interne.
5. **Chips permanents** (3) : `Rappel`, `Tags produits`, `Référence devis/commande`.
6. **Bouton `+ ajouter un champ`** : ouvre un menu avec les optionnels moins fréquents (`Pièce jointe`, `Contact alternatif`, `Ordre de travail`, etc.).
7. **Champs variables** : apparaissent automatiquement selon le type du tiers (cf. section 7.5).
8. **Actions** : `[Effacer]` · `[Brouillon]` · `[✓ Enregistrer (⌘↵)]`.

### 7.3 Chips permanents

Les 3 chips permanents sont **tous optionnels** mais fréquemment utilisés. Cliquer (ou touche dédiée) déploie un mini-form inline.

| Chip | Contenu déployé | Stockage | Raccourci |
|---|---|---|---|
| `📅 Rappel` | Date + heure, boutons rapides "Demain 9h", "Vendredi 14h", "Dans 1h" | `reminder_at` (ISO) | `⌘R` |
| `🏷 Tags produits` | Multi-select avec autocomplete des mega-families de l'agence | `mega_families` (array) | `⌘T` |
| `🔖 Ref devis/commande` | Input texte (ex: DEV-2026-0408) | `order_ref` | `⌘.` |

### 7.4 Menu `+ ajouter un champ`

Liste des optionnels moins fréquents, accessibles via `⌘/` :

- Pièce jointe (upload fichier)
- Contact alternatif (si le contact principal ne suffit pas)
- Ordre de travail (tiers chantier)
- Lieu (adresse ad-hoc si différent du siège)
- Montant estimé

Ces champs restent persistés dans le draft une fois ajoutés. Ils ne disparaissent pas si on change de canal.

### 7.5 Champs variables selon type de tiers

Le formulaire révèle automatiquement les champs requis par type. Source : `addSharedInteractionRules` dans `shared/schemas/interaction.schema.ts`.

| Type tiers | Champs additionnels révélés | Position |
|---|---|---|
| **Client** | aucun (entity_id + contact_id déjà fournis via écran 2) | — |
| **Prospect** | `company_city` (requis) | Entre ligne tiers et rangée 3-selects |
| **Fournisseur** | `contact_position` (fonction, requis) | Entre ligne tiers et rangée 3-selects |
| **Interne CIR** | aucun (minimal) | — |
| **Sollicitation** | `contact_phone` déjà saisi en écran 2, mais visible readonly avec bouton modifier | Ligne tiers |

Règles additionnelles sur `contact_phone` / `contact_email` :

- Client et Fournisseur : tel OU email requis.
- Prospect : tel OU email requis + ville requise.
- Sollicitation : tel requis.
- Interne CIR : tous optionnels.

---

## 8. Panneau contexte droit (adaptatif par type de tiers)

### 8.1 Principe

**Même pattern visuel** pour tous les types (identité en haut, mini-stats, timeline en bas), mais **données adaptées** au type sélectionné.

### 8.2 Variante Client

```
┌────────────────────────┐
│ SA  SEA Aquitaine      │
│     116277 · Gradignan │
├────────────────────────┤
│                        │
│  CA 12M    84 320€ +12%│
│  Dossiers  3 ouverts   │
│                        │
├────────────────────────┤
│  INTERACTIONS RÉCENTES │
│  ✉ Devis DEV-0408 16av │
│  ☎ Appel pièce    14av │
│  🏪 Visite comptoir 12av│
│  ✉ SAV Serrage    8 av │
└────────────────────────┘
```

### 8.3 Variante Prospect

```
┌────────────────────────┐
│ PT  PONTAC Thierry     │
│     P-4422 · Bordeaux  │
├────────────────────────┤
│                        │
│  Créé le       03/03/26│
│  Statut conv.  À relanc│
│  Score         ★★☆☆☆   │
│                        │
├────────────────────────┤
│  CONTACTS PRÉCÉDENTS   │
│  ☎ Appel initial  03av │
│  ✉ Devis envoyé   05av │
│  ☎ Relance        12av │
└────────────────────────┘
```

### 8.4 Variante Fournisseur

```
┌────────────────────────┐
│ SK  SKF France         │
│     F-0342 · Lyon      │
├────────────────────────┤
│                        │
│  Tags fournis          │
│   [roulements]         │
│   [joints] [SKF]       │
│                        │
│  Délai moyen   4.2 j   │
│  Commandes 12M  18     │
│                        │
├────────────────────────┤
│  COMMANDES RÉCENTES    │
│  📦 CMD-0412      15av │
│  📦 CMD-0389       3av │
│  📦 CMD-0371   28 mars │
└────────────────────────┘
```

### 8.5 Variante Interne CIR

```
┌────────────────────────┐
│ MD  Marie Dupont       │
│     TCS · Bordeaux     │
├────────────────────────┤
│                        │
│  Membre depuis 12/23   │
│  Dossiers actifs  12   │
│                        │
├────────────────────────┤
│  DERNIERS ÉCHANGES     │
│  ☎ Transmis SAV   13av │
│  💬 Note dossier  08av │
│  ☎ Info produit    1av │
└────────────────────────┘
```

### 8.6 Variante Sollicitation

```
┌────────────────────────┐
│ 📞  06 xx xx xx xx     │
│     M. Durand (déclaré)│
├────────────────────────┤
│                        │
│  Appels précédents  3  │
│  Dernier appel  28/3   │
│                        │
├────────────────────────┤
│  HISTORIQUE NUMÉRO     │
│  ☎ Dispo pièce   28 mar│
│  ☎ Tarif pompe   22 mar│
│  ☎ Contact 1er    5 mar│
│                        │
│  ℹ Si reconnu comme    │
│   prospect ou client,  │
│   [lier le tiers]      │
└────────────────────────┘
```

### 8.7 Responsive : sous 1024 px

La colonne droite se replie derrière un bouton `ℹ Contexte` qui ouvre un drawer latéral. Cette décision reste à valider en test terrain sur tablette.

---

## 9. Raccourcis clavier

Table exhaustive des raccourcis. À exposer dans l'aide `?` et dans la légende footer (sous-ensemble).

| Raccourci | Contexte | Action |
|---|---|---|
| `T` | Toute étape | Choisir canal Téléphone |
| `E` | Toute étape | Choisir canal Email |
| `C` | Toute étape | Choisir canal Comptoir |
| `V` | Toute étape | Choisir canal Visite |
| `⌘N` | Toute étape | Nouvelle saisie (reset ou au-dessus de la courante) |
| `⌘K` | Toute étape | Ouvrir la search globale |
| `↩` | Écran 1 (focus item) | Ouvrir brouillon / cloner saisie |
| `↑` `↓` | Écran 1, écran 2 résultats | Naviguer dans la liste |
| `⌫` | Écran 2 | Retour écran 1 si input vide |
| `esc` | Écran 2, 3 | Annuler / retour étape précédente |
| `Tab` / `Shift+Tab` | Écran 3 | Champ suivant / précédent |
| `⌘R` | Écran 3 | Ouvrir/éditer chip Rappel |
| `⌘T` | Écran 3 | Ouvrir/éditer chip Tags |
| `⌘.` | Écran 3 | Ouvrir/éditer chip Ref devis |
| `⌘/` | Écran 3 | Ouvrir menu `+ ajouter un champ` |
| `⌘↵` | Écran 3 | Enregistrer |
| `⌘S` | Écran 3 | Forcer sauvegarde brouillon |
| `?` | Toute étape | Afficher aide complète des raccourcis (modale) |

---

## 10. Feedback et états

### 10.1 Auto-save du brouillon

- Déclenché au `blur` de chaque champ ou toutes les 3 secondes si le draft est dirty.
- Met à jour le **header statut** (gris → bleu "Brouillon sauvegardé · HH:MM").
- En cas d'échec réseau : header devient orange "Brouillon hors ligne · nouvelle tentative dans 10s", avec retry exponentiel.

### 10.2 Validation

- Erreurs affichées en **bordure rouge + message inline** sous le champ concerné.
- Pas de toast global d'erreur (le status header suffit).
- Le bouton `Enregistrer` reste **cliquable** (pas de bouton grisé), mais le clic sur un formulaire invalide déclenche un focus auto sur le premier champ en erreur.

### 10.3 Après `Enregistrer` réussi

La saisie **reste affichée** en mode **lecture** :

- Tous les champs deviennent readonly avec un visuel atomisé (fond `bg-muted/50`, pas de bordures interactives).
- Le header devient vert `Enregistré · INT-001247`.
- Le footer action change : `[Effacer]` `[Brouillon]` `[Enregistrer]` → `[+ Nouvelle saisie (⌘N)]` `[Ajouter un événement]`.
- La saisie reste modifiable via un bouton `[Éditer]` discret en haut à droite.

Cette décision privilégie la **sécurité** (le TCS peut vérifier ce qu'il a saisi) sur la vitesse pure. Le raccourci `⌘N` compense pour les enchaînements rapides.

---

## 11. Accessibilité

- **Focus visible** : ring `ring-2 ring-ring/30 ring-offset-2` sur tous les éléments interactifs.
- **Ordre Tab logique** : canal pills → (si actif) tiers → rangée 3-selects → sujet → notes → chips → actions.
- **ARIA live regions** pour le status header (annonce les changements aux screen readers).
- **ARIA labels** sur les pills canal (avec le nom complet : "Canal Téléphone, raccourci T").
- **Contraste** : tous les textes en dur respectent WCAG AA. Le statut vert `text-success` doit être vérifié sur fond `bg-card`.
- **Reduced motion** : les transitions de status et l'apparition des champs variables respectent `prefers-reduced-motion`.

---

## 12. Cartographie des fichiers

### 12.1 Composants existants à réécrire / restructurer

| Fichier | Changement |
|---|---|
| `frontend/src/components/CockpitForm.tsx` | Orchestrateur : réduire à un switch sur `stepperState`, déléguer aux panes |
| `frontend/src/components/cockpit/CockpitFormHeader.tsx` | Nouveau contenu : status dynamique + pills canal |
| `frontend/src/components/cockpit/CockpitFormLeftPane.tsx` | Restructuration complète selon section 7 |
| `frontend/src/components/cockpit/CockpitFormRightPane.tsx` | Devient dispatch vers variantes de `CockpitContextPanel` |
| `frontend/src/components/cockpit/left/CockpitChannelSection.tsx` | Passer en pills persistants compacts (supprimer la version `Combobox` mobile) |
| `frontend/src/components/cockpit/left/CockpitSearchSection.tsx` | Ajouter pills type de tiers + adaptation par pill |
| `frontend/src/components/cockpit/left/CockpitInteractionTypeSection.tsx` | Intégrer dans la rangée 3-selects (avec service + statut) |
| `frontend/src/components/cockpit/left/CockpitServiceSection.tsx` | Idem (rangée 3-selects) |
| `frontend/src/components/cockpit/right/CockpitStatusControl.tsx` | Idem (rangée 3-selects) |
| `frontend/src/components/cockpit/right/CockpitReminderControl.tsx` | Devient chip permanent (pas dans colonne droite) |
| `frontend/src/components/cockpit/right/CockpitFooterSection.tsx` | Réduire à 3 chips permanents + menu `+` |
| `frontend/src/components/InteractionStepper.tsx` | Simplifier : 3 états mais chrome persistant |

### 12.2 Nouveaux composants à créer

| Fichier | Rôle |
|---|---|
| `CockpitStatusHeader.tsx` | Header statut dynamique (gris/bleu/vert) |
| `CockpitEntryRecents.tsx` | Zone "Brouillons + 5 dernières" de l'écran 1 |
| `CockpitShortcutLegend.tsx` | Légende footer permanente |
| `CockpitEntityTypePills.tsx` | Pills [Tout][Client]…[Sollicitation] écran 2 |
| `CockpitSolicitationSearch.tsx` | Variante écran 2 avec lookup tél inverse |
| `CockpitInternalSearch.tsx` | Variante écran 2 liste agence + fallback libre |
| `CockpitEntityCreateModal.tsx` | Modale création inline (prospect/fournisseur/client) |
| `CockpitMetaRow.tsx` | Rangée 3 selects (Service / Type / Statut) |
| `CockpitVariableFields.tsx` | Rendu des champs variables selon type de tiers |
| `CockpitContextPanel.tsx` | Orchestrateur contexte droit |
| `CockpitContextPanelClient.tsx` | Variante Client |
| `CockpitContextPanelProspect.tsx` | Variante Prospect |
| `CockpitContextPanelSupplier.tsx` | Variante Fournisseur |
| `CockpitContextPanelInternal.tsx` | Variante Interne CIR |
| `CockpitContextPanelSolicitation.tsx` | Variante Sollicitation |
| `CockpitReadonlyView.tsx` | Mode lecture post-enregistrement |

### 12.3 Hooks / services existants à réutiliser

- `useInteractionStepper.ts` — **conserver** la logique 3 états.
- `useInteractionFormState.ts` + `useInteractionHandlers.ts` — logique RHF existante.
- `useInteractionDraft.ts` — source du status header dynamique (flag `isSavingDraft`, `lastSavedAt`).
- `services/interactions/saveInteraction.ts` — inchangé.
- `services/interactions/getInteractionDraft.ts` — étendre pour lister N brouillons (écran 1).
- `services/interactions/getInteractions.ts` — déjà OK pour la liste des récentes.
- `schemas/interactionSchema.ts` + `shared/schemas/interaction.schema.ts` — **inchangés**.

---

## 13. Ordre d'implémentation recommandé

Approche **incrémentale**, chaque étape mergeable indépendamment.

1. **Étape A — Chrome persistant** (1-2 jours)
   - `CockpitStatusHeader` + `CockpitShortcutLegend` + pills canal persistants.
   - Aucun changement de logique, juste le chrome visible sur toutes les étapes.
   - QA : le header transitionne bien gris → bleu → vert ; les raccourcis T/E/C/V fonctionnent sur toutes les étapes.

2. **Étape B — Écran 1 jamais vide** (2-3 jours)
   - `CockpitEntryRecents` avec brouillons et dernières saisies.
   - Étendre `getInteractionDraft.ts` si besoin pour lister tous les drafts.
   - QA : ouverture de page montre la zone utile, clic sur brouillon restaure l'état.

3. **Étape C — Champs requis en dur** (1-2 jours)
   - `CockpitMetaRow` intégrant Service + Type + Statut.
   - Retirer ces champs du menu `+`.
   - QA : submit sans service/statut impossible, feedback clair.

4. **Étape D — Pills type de tiers** (2-3 jours)
   - `CockpitEntityTypePills` écran 2, avec adaptation par pill pour Client / Prospect / Fournisseur / Tout.
   - QA : chaque pill filtre correctement, badges type visibles dans Tout.

5. **Étape E — Variantes écran 2** (2-3 jours)
   - `CockpitInternalSearch` + `CockpitSolicitationSearch`.
   - QA : les 2 nouveaux types ont un chemin de saisie complet.

6. **Étape F — Création inline** (1-2 jours)
   - Itération 1 terminée : création inline prospect via `EntityOnboardingDialog` verrouillé en mode prospect.
   - Itération 2 restante : fournisseur, après extension du contrat d'onboarding/API.
   - QA : création prospect/fournisseur renvoie bien à la saisie en cours.

7. **Étape G — Contexte droit adaptatif** (3-4 jours)
   - Les 5 variantes `CockpitContextPanel*`.
   - Peut nécessiter de nouveaux endpoints backend pour certaines stats (CA 12M fournisseur, score conversion prospect).
   - QA : chaque type affiche le bon contexte.

8. **Étape H — Mode lecture post-save** (1-2 jours)
   - `CockpitReadonlyView` + transitions.
   - QA : enregistrer ne perd pas la saisie, `⌘N` repart bien sur une nouvelle.

9. **Étape I — Polish + a11y** (2 jours)
   - ARIA live, focus ring audit, reduced motion, responsive tablette.

**Total estimé** : 3 à 4 semaines de dev solo, potentiellement moins en parallèle.

---

## 14. Vérification (DoD)

Avant merge, tests **manuels navigateur** obligatoires :

1. **Écran 1 vide** : `/cockpit` ne montre aucune zone blanche, Brouillons + Récentes visibles.
2. **Flow clavier pur** : `T` → recherche focus auto → tape "sea" → `↓↓↩` → focus sujet → remplit → `⌘↵` → status vert.
3. **Pills type** : cycler les 6 pills, vérifier adaptation (Sollicitation = champ tél ; Interne = liste collègues + fallback libre).
4. **Création inline** : pill Prospect, taper "testcorp", `+ Nouveau prospect`, remplir, tiers injecté.
5. **Champs variables** : sélectionner Client / Prospect / Fournisseur successivement, vérifier apparition Ville / Fonction.
6. **Contexte droit par type** : confirmer les 5 variantes.
7. **Mode lecture post-save** : enregistrer, vérifier atomisation, cliquer `+ Nouvelle saisie`, enchaînement propre.
8. **Auto-save** : taper partiellement, attendre 3s, vérifier header bleu "Brouillon sauvegardé".
9. **Tablette 1024 px** : redimensionner, panneau contexte se replie proprement.
10. **Accessibilité** : parcours Tab complet sans souris, lecteur d'écran annonce le status header.
11. **Tests auto** :
    - `cd frontend && npx vitest run` (tests existants doivent passer, nouveaux tests pour les nouveaux composants).
    - `deno test --allow-env --no-check --config backend/deno.json backend/functions/api` (aucune modif back a priori).
12. **QA gate** : `pnpm run qa` vert avant merge.

---

## 15. Hors scope

- Navigation shell (sidebar gauche, topbar) — inchangée.
- Pages Pilotage / Clients / Admin / Paramètres — inchangées.
- Schéma DB / migrations — aucun changement, uniquement UI.
- Mobile < 1024 px — itération ultérieure si besoin terrain.
- Mode "Quick entry" / command palette plein-écran — écarté (trop ambitieux pour l'usage terrain actuel).
- Multi-saisie simultanée (plusieurs brouillons ouverts en onglets) — hors scope.
- OCR pièces jointes / auto-extraction de données — hors scope.
- Intégration téléphonie (détection automatique du numéro entrant) — hors scope.

---

## 16. Questions ouvertes (à décider avant implémentation)

- **Scoring prospect** (variante contexte droit) : la stat "score conversion" existe-t-elle déjà en DB ou faut-il la calculer ?
- **CA 12M fournisseur** : quelle source ? table `purchase_orders` ? extraction pure des interactions ?
- **Lookup tél inverse Sollicitation** : requête SQL à définir (index sur `contact_phone` nécessaire ?).
- **Liste des membres agence** : endpoint existant à réutiliser ou nouveau RPC à créer ?
- **Mode lecture** : cliquer dans un champ atomisé doit-il redevenir editable, ou seulement le bouton `[Éditer]` global ?
- **`+ ajouter un champ`** : liste exhaustive des optionnels à confirmer avec les TCS terrain.

---

## 17. Journal d'implémentation

Registre chronologique de chaque changement appliqué au code dans le cadre du redesign. Chaque entrée = un commit logique (pas forcément un `git commit`), avec fichiers touchés et but.

### 2026-04-19 — Étape A : Chrome persistant

**Objectif** : poser le chrome commun aux 3 écrans (header statut dynamique, pills canal persistants, légende raccourcis footer) sans toucher à la logique existante. Doit être mergeable seul sans régression fonctionnelle.

#### A1 — CockpitStatusHeader (statut dynamique)

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/hooks/useInteractionDraft.ts` : export du type `DraftStatus` (`'idle' | 'saving' | 'saved' | 'error'`) et expose `draftStatus` + `lastSavedAt`. Les transitions `saving → saved` sont wrappées dans `startTransition` pour batcher `setDraftId` + `setDraftStatus` + `setLastSavedAt`. `clearDraft` et le cas `!hasDraftContent` remettent à `idle` / `null`.
  - `frontend/src/hooks/useCockpitFormController.ts` : propage `draftStatus` et `lastSavedAt` dans l'objet de retour du controller.
  - `frontend/src/components/cockpit/CockpitFormHeader.tsx` : réécrit autour d'un résolveur `resolveStatus()` qui mappe chaque `DraftStatus` vers un `{ label, tone }`. Rend un point coloré (`Circle` lucide) + libellé (`role="status" aria-live="polite"`) à gauche, `Prêt à enregistrer` conditionnel + badge raccourci `⌘↵` à droite. Les `data-testid` (`cockpit-form-header`, `cockpit-header-status`, `cockpit-header-actions`) sont conservés pour la compat des tests.
  - `frontend/src/components/CockpitForm.tsx` : destructure `draftStatus` et `lastSavedAt` du controller, les passe à `<CockpitFormHeader>`.
- **Mapping des statuts** :
  - `idle` → `Saisie en cours · non enregistré` (ton `muted`).
  - `saving` → `Sauvegarde du brouillon…` (ton `info`).
  - `saved` → `Brouillon sauvegardé · HH:MM` (ton `info`).
  - `error` → `Sauvegarde brouillon indisponible` (ton `warning`).
- **Validation** : `pnpm run typecheck` → PASS. Tests et lint à regrouper dans A4.

#### A2 — CockpitShortcutLegend (légende footer permanente)

_Terminé._

- **Fichiers créés** :
  - `frontend/src/components/cockpit/CockpitShortcutLegend.tsx` : nouveau composant présentant la cheat sheet clavier sur deux groupes (canaux + actions). Utilise `getPlatformShortcutLabel()` pour rendre `⌘K / Ctrl K` selon la plateforme. Chaque raccourci est rendu dans un `<kbd>` stylisé sur le même design que le badge déjà présent dans le header. `data-testid="cockpit-shortcut-legend"` + sous-testids (`…-channels`, `…-actions`) pour les tests à venir.
- **Fichiers modifiés** :
  - `frontend/src/components/CockpitForm.tsx` : import de `CockpitShortcutLegend` et montage juste après la balise `</form>` (donc après la sticky submit bar), de sorte que la légende reste visible en permanence au bas du shell sans être affectée par le scroll interne du formulaire.
- **Contenu de la légende** :
  - Ligne 1 (canaux) : `T tél · E email · C comptoir · V visite`.
  - Ligne 2 (actions) : `⌘K chercher · ⌘↵ enregistrer · ⌘N nouvelle · ? aide`.
  - Sur `sm+`, les deux groupes sont sur la même ligne séparés par une barre verticale `|`.
- **Validation** : `pnpm run typecheck` → PASS. Les raccourcis eux-mêmes ne sont pas encore branchés (uniquement l'affichage) — les hotkeys `T/E/C/V` et `⌘N` seront câblés dans A3 et plus tard dans l'étape B.

#### A3 — Pills canal persistantes (lift vers le chrome)

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/components/CockpitForm.tsx` : import de `CockpitChannelSection` et montage dans une nouvelle barre de chrome `data-testid="cockpit-channel-bar"` placée entre le header statut et la rangée du stepper. Les cinq props nécessaires (`labelStyle`, `errors`, `setValue`, `channel`, `channelButtonRef`) sont repris directement depuis `leftPaneProps`, sans duplication dans le controller.
  - `frontend/src/components/cockpit/CockpitFormLeftPane.tsx` : suppression de l'import et du rendu de `CockpitChannelSection` (la section n'a plus qu'un seul point de montage, au niveau shell).
  - `frontend/src/components/__tests__/CockpitForm.a11y.test.tsx` : ajout des mocks `CockpitShortcutLegend` et `CockpitChannelSection` pour garder le test d'a11y isolé des dépendances profondes (le mock `useCockpitFormController` ne fournit qu'un `leftPaneProps` vide, il ne peut pas alimenter le vrai composant canal).
- **Effet visuel** : les 4 pills `Téléphone / Email / Comptoir / Visite` restent visibles sur les 3 écrans, quel que soit l'état du stepper. L'étape "Canal" reste comptabilisée par `useInteractionStepper` via la même valeur de formulaire, aucun changement de logique de gating.
- **Validation** :
  - `pnpm run typecheck` → PASS.
  - `npx vitest run` → 110 fichiers / 405 tests PASS.
  - `pnpm run lint` → PASS (max-warnings=0).
- **À suivre (hors A3)** :
  - Rendu compact dédié (hauteur `h-7`, lettre de raccourci visible sur chaque pill) — reporté à l'étape B.
  - Hotkeys globaux `T/E/C/V` (actifs même pendant la saisie du sujet, avec `preventDefault` hors textarea) — reporté à l'étape B.
  - Migration des steppers 5-étapes vers le 3-étapes du plan (Canal / Avec qui / Saisie) — hors étape A.

### 2026-04-19 — Étape B : Hotkeys canal + pills compactes

**Objectif** : brancher les raccourcis clavier du chrome persistant (T/E/C/V pour basculer le canal, ⌘N pour nouvelle saisie) et rendre la lettre du raccourci visible sur chaque pill, sans changement de logique métier.

#### B1 — Hotkeys T/E/C/V + ⌘N

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/hooks/useInteractionHotkeys.ts` : extension du hook avec `setValue` et `onReset`. Nouvelle table `CHANNEL_HOTKEYS` (`t→Téléphone`, `e→Email`, `c→Comptoir`, `v→Visite`). Helper `isEditableTarget()` qui exclut les `INPUT`, `TEXTAREA`, `SELECT` et les éléments `contenteditable` de la capture des lettres isolées. Ajout du raccourci `⌘N` / `Ctrl+N` qui appelle `onReset`. `Ctrl+Enter` est conservé (étendu à `metaKey` pour macOS) et les F1/F2 existants sont inchangés.
  - `frontend/src/hooks/useCockpitFormController.ts` : passe désormais `setValue: form.setValue` et `onReset: handleReset` à `useInteractionHotkeys`.
- **Comportement** :
  - Dans un champ texte (sujet, notes, recherche…) : `T/E/C/V` sont tapés normalement, aucune bascule de canal.
  - Hors champ texte (focus sur un bouton, dans le body) : `T/E/C/V` basculent le canal avec `preventDefault`.
  - `⌘N` / `Ctrl+N` réinitialise le formulaire via `handleReset` (même chemin que le bouton `Réinitialiser`) — `preventDefault` empêche l'ouverture d'une nouvelle fenêtre navigateur.

#### B2 — Pills canal compactes avec lettre

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/components/cockpit/left/CockpitChannelSection.tsx` : chaque entrée `CHANNEL_OPTIONS` porte maintenant une `letter` (`T/E/C/V`). Chaque `ToggleGroupItem` rend icône + libellé + `<kbd>` avec la lettre, harmonisé sur le style des badges du header et de la légende. `aria-label` explicite (`Canal Téléphone, raccourci T`) pour les lecteurs d'écran — le libellé est énoncé en une fois sans être contaminé par le badge. Conteneur externe passé de `space-y-2` à `space-y-1.5` pour une barre de chrome plus compacte.
- **Visuel** :
  - Les 4 pills gardent la hauteur `h-7`.
  - Badge lettre : `border-border/70 bg-muted/70 text-muted-foreground` (inactif) et variante blanche discrète (`border-white/40 bg-white/15 text-white`) quand la pill est `data-[state=on]`.

#### B3 — Validation Étape B

_Terminé._

- `pnpm run typecheck` → PASS.
- `pnpm run lint` → PASS (max-warnings=0).
- `npx vitest run` → 110 fichiers / 405 tests PASS.
- **Limitations connues** :
  - `⌘N` fait un reset brut (supprime aussi le brouillon côté serveur via `handleReset → clearDraft('reset')`). Le mode lecture post-save n'existe pas encore, donc `⌘N` depuis ce mode-là sera conçu dans une étape ultérieure.
  - Les raccourcis lettres ne sont pas interceptés si un champ Combobox est ouvert (les primitives Radix capturent déjà les touches via `role="combobox"`), ce qui est le comportement attendu.
  - Pas encore de rendu post-save (interaction verrouillée + bouton `+ Nouvelle saisie`) — à traiter en Étape C ou plus tard.

### 2026-04-19 — Étape H : Mode lecture post-save

**Objectif** : remplacer le reset automatique après submit par un mode lecture atomisé (interaction verrouillée, visible en clair, bouton `+ Nouvelle saisie` focusé). Aligner le header statut sur la fin du cycle (`Enregistré · INT-xxxxxx` en vert). Conserver `⌘N` comme raccourci pour repartir.

#### H1 — Capture de l'interaction sauvegardée + vue lecture

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/hooks/useInteractionSubmit.ts` : ajoute le paramètre `onSaveSuccess: (interaction) => void`, appelé entre `onSave()` et `handleReset()`. Conserve le `handleReset` existant pour vider le formulaire RHF et supprimer le brouillon serveur — la copie de l'interaction sauvegardée vit maintenant dans le state du controller.
  - `frontend/src/hooks/useCockpitFormController.ts` : import `useState` + `useCallback`, nouveau state `lastSavedInteraction: InteractionDraft | null`, passe `setLastSavedInteraction` comme `onSaveSuccess` au hook de submit. Nouveau `onStartNewEntry = () => { setLastSavedInteraction(null); handleReset(); }` exposé dans le retour du controller.
  - `frontend/src/hooks/__tests__/useInteractionSubmit.test.tsx` : ajout de `onSaveSuccess: vi.fn()` sur les 3 cas de test (signature de `UseInteractionSubmitParams`).
- **Fichiers créés** :
  - `frontend/src/components/cockpit/CockpitReadonlyView.tsx` : vue atomisée de l'interaction enregistrée. Rend un bandeau de confirmation (`CheckCircle2`, `text-success`), une grille 2x4 de `AtomField` (Canal/Type tiers/Société/Contact + Service/Type/Statut/Rappel), un bloc Sujet, un bloc Notes conditionnel, une ligne `Ref.` + tags produits, et un bouton primary `+ Nouvelle saisie` avec badge `⌘N`. Le bouton est auto-focus à l'apparition pour enchaîner au clavier. Les libellés de statut sont résolus via `AgencyConfig.statuses`, les dates de rappel formatées en `fr-FR`.
- **Câblage dans `CockpitForm.tsx`** :
  - Destructure `lastSavedInteraction` et `onStartNewEntry` du controller.
  - Rend conditionnellement `<CockpitReadonlyView>` **à la place** du bloc `<form>` (stepper + panes + sticky submit bar) quand une interaction vient d'être sauvegardée. La `CockpitShortcutLegend` reste en bas de shell dans les deux modes.
  - La barre de chrome "pills canal" n'est visible qu'en mode saisie — en mode lecture elle disparaît avec le reste du formulaire (il n'y a plus de canal à basculer tant qu'on n'a pas relancé une nouvelle saisie).

#### H2 — Header submit state + ⌘N pour nouvelle saisie

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/components/cockpit/CockpitFormHeader.tsx` : nouveau prop optionnel `savedInteractionId: string | null`. `resolveStatus()` priorise `savedInteractionId` → libellé vert `Enregistré · INT-ABCDEF` (6 premiers caractères hex de l'UUID, uppercased via `formatInteractionReference`). La zone actions bascule du `⌘↵ + Prêt à enregistrer` vers `⌘N + Prêt pour la suivante` quand on est en mode submitted.
  - `frontend/src/components/CockpitForm.tsx` : passe `savedInteractionId={lastSavedInteraction?.id ?? null}` au header.
  - `frontend/src/hooks/useCockpitFormController.ts` : le hook `useInteractionHotkeys` reçoit désormais `onReset: onStartNewEntry` (au lieu de `handleReset`). Conséquence : `⌘N` / `Ctrl+N` efface d'abord `lastSavedInteraction` avant de remettre le formulaire à zéro, ce qui fait sortir du mode lecture.
- **Flux utilisateur complet** :
  1. TCS remplit le formulaire, `⌘↵` → `onSave` réussit.
  2. `handleReset` vide le formulaire + supprime le brouillon serveur.
  3. `lastSavedInteraction` est posé → header passe en vert `Enregistré · INT-xxxxxx`, readonly view rendue avec bouton `+ Nouvelle saisie` auto-focus.
  4. Le TCS appuie sur `Entrée` (focus sur le bouton) ou tape `⌘N` → `onStartNewEntry` → `lastSavedInteraction = null` + `handleReset()`.
  5. Retour en mode saisie vierge.

#### H3 — Validation Étape H

_Terminé._

- `pnpm run typecheck` → PASS (correction de `CockpitReadonlyView` pour accepter `status_id` / `reminder_at` nullable + ajout de `onSaveSuccess: vi.fn()` dans les tests de submit).
- `pnpm run lint` → PASS (max-warnings=0).
- `npx vitest run` → 110 fichiers / 405 tests PASS.
- **Limitations connues** :
  - Les champs `InteractionDraft` affichés (company_name, subject, contact_name…) sont ceux passés à `onSave` par le frontend. Si le backend normalise (casing, trim, enrichissement), le readonly pourrait diverger du `INT-xxxxxx` effectivement persisté. À revoir quand `onSave` retournera l'entité serveur plutôt que `boolean`.
  - Le numéro `INT-ABCDEF` reste un formatage local (6 premiers caractères de l'UUID). Un vrai numéro métier côté DB (`interaction_number` séquentiel) serait plus lisible mais demande une migration — hors scope.
  - Le rappel est rendu en `toLocaleString('fr-FR')` brut — on pourra harmoniser avec `formatRelativeTime` si besoin.

### 2026-04-19 — Étape B (itération 1) : Écran 1 jamais vide — dernières saisies

**Objectif** : offrir une valeur immédiate à l'ouverture de `/cockpit` quand le TCS n'a encore rien saisi, en affichant les 5 dernières interactions de l'utilisateur courant. Clic = clone du tiers (pré-sélection entity + canal). L'aspect "brouillons listés" du design (§5.2) nécessiterait d'étendre `getInteractionDraft` côté service (actuellement un seul draft par user/agence) et sera traité dans une itération ultérieure.

#### B1 — Hook `useRecentOwnInteractions`

_Terminé._

- **Fichiers créés** :
  - `frontend/src/hooks/useRecentOwnInteractions.ts` : hook pur qui, à partir de la liste `interactions` déjà en cache (via `useInteractions` + `useAppQueries`), filtre par `created_by === userId`, trie `created_at` desc et renvoie un top N (défaut 5). Aucun nouvel appel réseau : réutilise la query existante.
  - `frontend/src/hooks/__tests__/useRecentOwnInteractions.test.tsx` : 3 tests (userId null → vide, filtre + tri, limite).
- **Validation ciblée** : typecheck PASS, 3 nouveaux tests PASS.

#### B2 — Composant `CockpitEntryRecents`

_Terminé._

- **Fichiers créés** :
  - `frontend/src/components/cockpit/CockpitEntryRecents.tsx` : liste verticale compacte (max 5). Chaque ligne = bouton `type="button"` (keyboard-focusable) avec icône canal (Phone/Mail/Store/Car selon `interaction.channel`), titre (company_name ou contact_name fallback), sujet tronqué (caché < sm) et temps relatif via `formatRelativeTime`. `aria-label` descriptif par ligne ; `focus-visible` ring sur `primary`.
  - La résolution entité se fait via un `Map(entities)` construit sur l'index `entitySearchIndex.entities` ; si l'interaction référence un `entity_id` absent de l'index (ex. entité archivée), `entity` passé au callback est `null` — le parent décide (ici `handleSelectRecent` tolère `null`).
- **Scope pragmatique** : pas de rendu des "brouillons" (pluriel). Le design §5.2 les liste mais le schéma actuel `interaction_drafts` ne stocke qu'un draft par (user, agence, form_type). Itération 2 si besoin terrain.
- **Validation ciblée** : typecheck PASS, lint PASS (après retrait du `role="list"` redondant ESLint).

#### B3 — Câblage dans le shell `CockpitForm`

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/components/cockpit/CockpitForm.types.ts` : nouveau prop optionnel `interactions?: Interaction[]`.
  - `frontend/src/components/app-main/AppMainTabContent.tsx` : passe `interactions={interactions}` (déjà chargé par `useAppQueries`) à `<CockpitForm>`.
  - `frontend/src/hooks/useInteractionHandlers.ts` : ajoute `handleSelectRecent(interaction, entity)` qui appelle `setValue('channel', interaction.channel, { shouldDirty, shouldValidate })` puis `handleSelectEntity(entity)`. Zero impact sur les autres handlers.
  - `frontend/src/hooks/useCockpitFormController.ts` : accepte le prop `interactions`, calcule `recentOwnInteractions = useRecentOwnInteractions(interactions, userId)`, dérive `showEntryRecents = !selectedEntity && !hasDraftContent && recentOwnInteractions.length > 0`. Retourne `recentOwnInteractions`, `onSelectRecent`, `showEntryRecents`, `searchIndexEntities` dans l'objet exposé.
  - `frontend/src/components/CockpitForm.tsx` : destructure les nouveaux champs et rend `<CockpitEntryRecents>` dans une bande dédiée (bordure inférieure, fond `surface-1/40`) **entre le stepper et la grille 2-colonnes**, conditionnellement à `showEntryRecents`. Ne s'affiche jamais en mode lecture (car le `<form>` entier est masqué par `lastSavedInteraction`).
- **Comportement** :
  - Écran vierge avec ≥ 1 interaction du TCS → bande visible, 5 boutons cliquables.
  - Le TCS choisit un canal au clavier (`T/E/C/V`) ou clique une ligne → la bande disparaît dès que `selectedEntity` est posé ou que le draft a du contenu.
  - Un clic sur une ligne recent : **clone** le tiers (sélectionne l'entity correspondante si présente dans l'index + positionne le canal) sans réutiliser les autres champs (pas de duplication automatique du sujet/status).
- **Validation globale Étape B (itération 1)** :
  - `pnpm run typecheck` → PASS.
  - `pnpm run lint` → PASS (max-warnings=0).
  - `npx vitest run` → **111 fichiers / 408 tests PASS**.
- **Limitations connues** :
  - Pas encore de navigation clavier dédiée (`↑/↓`) dans la liste — les boutons restent atteignables via `Tab` standard.
  - Les "brouillons listés" du design ne sont pas rendus (voir B2). L'auto-restauration du draft unique reste gérée par `useInteractionDraft` comme avant.
  - La bande s'affiche uniquement quand `hasDraftContent === false`. Un brouillon auto-restauré ouvrira donc le formulaire pré-rempli sans afficher les récentes — cohérent avec le principe "une chose à la fois".

### 2026-04-20 — Étape D (itération 1) : Polish des pills type de tiers

**Objectif** : aligner la section "Relation" existante sur le vocabulaire du design (§6 "Avec qui") sans refactor structurel. Le rendu par `CockpitRelationSection` est déjà un `ToggleGroup` de pills — l'itération 1 se concentre sur le vocabulaire, les icônes et les placeholders. La création d'un composant dédié `CockpitEntityTypePills` avec pill "Tout" et variantes de recherche (Interne / Sollicitation) reste planifiée pour les étapes D itération 2 et E.

#### D1 — Libellés + icônes

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/components/cockpit/left/CockpitRelationSection.tsx` :
    - Titre du groupe : `Relation` → `Type de tiers` (matches design §6 et §7.2).
    - Placeholder combobox mobile : `Selectionner une relation` → `Selectionner un type de tiers`.
    - Placeholder recherche combobox : `Rechercher une relation...` → `Rechercher un type de tiers...`.
    - Libellé empty state : `Aucune relation trouvee.` → `Aucun type de tiers trouve.`.
    - Icône `Interne (CIR)` : `Building2` (identique à Client) → `Users` (lucide) — différencie visuellement le membre d'équipe du compte client.
- **Validation** : `pnpm run typecheck` → PASS ; `pnpm run lint` → PASS (max-warnings=0) ; `npx vitest run` → **111 fichiers / 408 tests PASS**.
- **Limitations connues** :
  - Pas encore de pill `[Tout]` (design §6.2) — demande de définir une sémantique "multi-type" côté search (retour mixte + badge par ligne). Reporté en D itération 2 quand la recherche saura filtrer sur un sous-ensemble d'`entity_type`.
  - Pas encore de variantes dédiées Interne / Sollicitation (liste de collègues, lookup tél inverse) : objet d'Étape E.
  - Les libellés des pills proviennent du `config.entities` par agence (ex. `Prospect / Particulier`). Le design référence `Prospect` + `Sollic.` tronqués ; l'alignement éditorial (renommage des labels agence) est un acte de configuration produit, pas un changement UI — hors scope de ce redesign.

### 2026-04-20 — Étape I (itération 1) : Navigation clavier roving-tabindex sur `CockpitEntryRecents`

**Objectif** : compléter la bande "Dernières saisies" posée en Étape B avec le raccourci clavier spécifié en §5.3 (`↑` / `↓` pour naviguer dans la liste, `↩` pour ouvrir). Aujourd'hui les 5 boutons étaient tous dans l'ordre `Tab`, ce qui polluait la séquence clavier. Objectif : un seul arrêt `Tab` sur la liste, navigation interne au clavier.

#### I1 — Roving tabindex dans `CockpitEntryRecents`

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/components/cockpit/CockpitEntryRecents.tsx` : introduction d'un state `activeIndex` et d'une `ref` tableau sur les boutons. Chaque bouton reçoit `tabIndex={isActive ? 0 : -1}`, garantissant un seul point d'entrée `Tab` sur la liste. Handler `onKeyDown` intercepte `ArrowDown` / `ArrowUp` (wrap autour des extrémités), `Home` (premier) et `End` (dernier), chaque branche `preventDefault()` pour que le scroll de page ne soit pas déclenché. `onFocus` synchronise `activeIndex` pour que la focus visuelle reste cohérente après un `Tab` venu d'ailleurs. `onClick` positionne aussi `activeIndex` avant d'appeler `onSelectRecent`, utile si l'utilisateur mélange souris et clavier. Un garde-fou `safeActiveIndex = Math.min(activeIndex, length - 1)` protège le cas où la liste raccourcit après un re-render (ex. ajout d'une nouvelle saisie qui fait sortir la plus ancienne).
- **Fichiers créés** :
  - `frontend/src/components/cockpit/__tests__/CockpitEntryRecents.test.tsx` : 5 cas (`render null quand vide`, `roving tabindex initial`, `ArrowDown/Up avec wrap`, `Home/End`, `onClick → onSelectRecent`). Les appels synchrones `button.focus()` sont wrappés dans `act()` pour éviter les warnings React, la navigation clavier passe par `userEvent.keyboard({ArrowDown})`.
- **Comportement** :
  - À l'ouverture, `Tab` amène sur la première ligne (seule à `tabIndex=0`). `Tab` suivant passe hors de la liste (vers le reste de la page), au lieu de cycler dans les 5 boutons.
  - `↓` / `↑` depuis la liste focus l'élément suivant / précédent avec wrap. `Home` / `End` focus premier / dernier.
  - `Entrée` / `Espace` sur le bouton focalisé déclenche `onSelectRecent` (comportement natif `<button>`), ce qui **clone** le tiers (pré-sélection entity + canal) exactement comme le clic — aucune modification du chemin de callback.
- **Validation** :
  - `pnpm run typecheck` → PASS.
  - `pnpm run lint` → PASS (max-warnings=0).
  - `npx vitest run` → **112 fichiers / 413 tests PASS** (5 nouveaux tests).
- **Limitations connues** :
  - Pas de `role="listbox"` + `aria-activedescendant` : on reste sur une liste de `<button>` standard avec roving tabindex, car chaque item est lui-même interactif. Cohérent avec les bonnes pratiques ARIA Authoring Practices pour les toolbars / menubars, moins intrusif pour les lecteurs d'écran que de transformer `<ul>` en listbox.
  - Pas encore de raccourci global pour **sauter directement** à la bande récents (ex. `G R`). Peut venir dans une itération ultérieure si demande terrain.
  - `Esc` ne fait rien de spécial sur la liste — la liste disparaît dès qu'un canal est choisi ou qu'un brouillon a du contenu, donc l'annulation métier est déjà couverte par le flux existant.

### 2026-04-20 — Étape D (itération 2) : Pill `Tout` + badge type dans la recherche

**Objectif** : rendre la sémantique `Tout` du design (§6.2) fonctionnelle sans toucher au schéma Zod ni ajouter de nouveau filtre métier. La recherche existante passe déjà `true` pour `matchesRelation` quand `entityType` est vide — il suffit d'exposer cet état via une pill dédiée et d'afficher un badge type par ligne de résultat pour que l'utilisateur distingue Client / Prospect / Fournisseur dans la liste agrégée.

#### D2 — Pill `Tout` dans `CockpitRelationSection`

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/components/cockpit/left/CockpitRelationSection.tsx` : introduction d'une constante `ALL_OPTION_VALUE = 'Tout'` prépondue à la liste d'options (ToggleGroup + Combobox). Icône `Globe` (lucide) pour l'option Tout, ajoutée à `RELATION_ICONS`. Le binding `toggleValue` vaut `'Tout'` quand `entityType.trim() === ''`, sinon il reflète `entityType`. Le handler `handleValueChange` re-mappe la sélection `'Tout'` vers `setValue('entity_type', '', …)` côté RHF, pour rester compatible avec la validation `entity_type.min(1)` qui sera respectée à la sélection du tiers (voir plus bas). Un texte d'aide `Tous les types sont visibles dans la recherche. Choisissez un tiers pour préciser.` apparaît sous la rangée quand Tout est actif, pour signaler que l'étape 2 n'est pas encore complète.
- **Comportement** :
  - État initial : `entity_type === ''` → pill `Tout` pressée, recherche sans filtre de type.
  - Clic sur `Tout` : remet à vide et réaffiche le hint.
  - Clic sur une pill autre (Client, Prospect, Fournisseur, Interne, Sollicitation) : filtre la recherche à ce type, masque le hint.
  - Sélection d'un tiers dans la recherche (quel que soit le mode) : `handleSelectEntity` pose `entity_type = entity.entity_type` → la pill correspondante devient automatiquement pressée et le hint disparaît.
- **Décisions** :
  - Pas de sentinelle au niveau schéma Zod : le schéma continue d'exiger `entity_type.min(1)`. Le mode `Tout` est purement un état UI avant sélection. Tant qu'aucun tiers n'est sélectionné, le gate de submit reste fermé (`gateMessage` → "Type de tiers requis"), donc aucun enregistrement avec `entity_type === ''` n'est possible.
  - Pas de sentinelle `__all__` côté RHF non plus : la valeur `''` reste cohérente avec le reste de la chaîne (search, gate, validation) sans exception.
  - Pas de pill `Tout` qui bascule vers une création inline : la pill `+ Creer <entity>` dans le footer du search continue d'être rendue uniquement quand `relationMode === 'client'` (via `CockpitSearchSection`) ; le mode Tout (`relationMode === 'other'`) ne propose pas de création directe, ce qui force le TCS à préciser un type avant création — cohérent avec le principe "pas de doublons par erreur".

#### D2 — Badge type dans la liste de résultats

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/components/interaction-search/InteractionSearchBar.types.ts` : nouveau prop optionnel `showTypeBadge?: boolean`.
  - `frontend/src/components/InteractionSearchBar.tsx` : propage `showTypeBadge` jusqu'à la `InteractionSearchListArea`.
  - `frontend/src/components/interaction-search/InteractionSearchListArea.tsx` : propage jusqu'à `InteractionSearchRecents` (chips "récents") et `InteractionSearchResults` (liste principale).
  - `frontend/src/components/interaction-search/InteractionSearchResults.tsx` : propage vers chaque `InteractionSearchEntityItem`.
  - `frontend/src/components/interaction-search/InteractionSearchEntityItem.tsx` : ajout d'un chip type (`rounded-full`, `text-[10px] uppercase`) à droite du nom, rendu uniquement si `showTypeBadge && entity.entity_type`. `data-testid="interaction-search-entity-type-badge"` pour les tests.
  - `frontend/src/components/interaction-search/InteractionSearchRecents.tsx` : idem, chip type à droite du nom dans les pastilles "Recents".
  - `frontend/src/components/cockpit/left/CockpitSearchSection.tsx` : calcul local `const showTypeBadge = entityType.trim() === '';` puis transmission à `InteractionSearchBar`.
- **Comportement** :
  - Mode Tout : le chip `CLIENT` / `PROSPECT / PARTICULIER` / `FOURNISSEUR` apparaît à droite de chaque ligne, côté résultats ET côté pastilles récentes — cohérent avec le mockup §6.2 "Chaque ligne porte son badge type".
  - Mode filtré : plus de chip (redondant, car la liste est déjà mono-type).
  - Les contacts ne reçoivent pas de chip : une fois la ligne cliquée, le handler `handleSelectEntity` pose l'entity parente et son type — le badge sur la ligne contact n'apporterait pas d'info actionnable (on pourrait l'ajouter si besoin remonte du terrain).
- **Validation globale** :
  - `pnpm run typecheck` → PASS.
  - `pnpm run lint` → PASS (max-warnings=0).
  - `npx vitest run` → **112 fichiers / 413 tests PASS** (aucune régression, pas de nouveau test dédié dans cette itération — la sémantique est couverte par le gate et les tests de `useInteractionSearch` existants via le chemin `entityType=''`).
- **Limitations connues** :
  - Pas de variantes dédiées Interne / Sollicitation dans le mode Tout : la pill `Tout` reste un filtre sur `entities`. Les Interne CIR et Sollicitations ne sont pas des tiers de la table `entities`, donc le mode Tout ne les fait PAS apparaître — cohérent avec le périmètre de recherche actuel (backend). Séparation assumée : pour saisir un Interne ou une Sollicitation, il faut explicitement choisir la pill correspondante (traitée en Étape E).
  - Pas encore de raccourci clavier pour cycler les pills (`← / →` sur les pills) — reporté en Étape I itération 2 si pertinent.
  - Pas de persistance de la pill choisie entre saisies : chaque nouvelle saisie repart sur le default (`''` = Tout) ou l'état restauré d'un brouillon. Comportement voulu pour éviter des "états collants" trompeurs.

### 2026-04-20 — Étape F (itération 1) : Création inline prospect

**Objectif** : ouvrir le même chemin de création inline que le client pour la pill Prospect, sans étendre le backend ni toucher au hotspot fournisseur. Le bouton `+ Creer <entity>` doit apparaître en mode prospect, créer l'entité via le flux d'onboarding existant, puis injecter le prospect créé dans la saisie en cours.

#### F1 — Dialog prospect + injection dans la saisie

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/hooks/useCockpitDialogsState.ts` : nouvel état `isProspectDialogOpen` + setter.
  - `frontend/src/hooks/useInteractionHandlers.ts` / `.types.ts` : ajout de `saveProspectMutation` et `handleSaveProspect(payload)`, qui attend l'entité retournée puis réutilise `handleSelectEntity(newEntity)`.
  - `frontend/src/hooks/useCockpitFormController.ts` : instancie `useSaveProspect(activeAgencyId, false, false)`, expose `onSaveProspect`, `isProspectDialogOpen`, `onProspectDialogChange`, et transmet `onOpenProspectDialog` aux props du panneau gauche.
  - `frontend/src/hooks/useCockpitPaneProps.ts` / `.types.ts`, `frontend/src/components/cockpit/CockpitPaneTypes.ts`, `frontend/src/components/cockpit/buildCockpitLeftEntitySectionsProps.ts` : propagation du callback `onOpenProspectDialog`.
  - `frontend/src/components/cockpit/left/CockpitSearchSection.tsx` : le footer de recherche reçoit maintenant `onCreateEntity` en mode `client` et en mode `prospect`; le mode `supplier` reste volontairement sans bouton de création.
  - `frontend/src/components/cockpit/CockpitFormDialogs.tsx` : montage d'un `EntityOnboardingDialog` dédié, `allowedIntents={['prospect']}`, `defaultIntent="prospect"`, `sourceLabel="Cockpit"`, avec `onSaveProspect` branché sur le handler cockpit.
  - `frontend/src/components/CockpitForm.tsx` : passage des nouveaux props de dialog prospect.
  - `frontend/src/components/cockpit/CockpitReadonlyView.tsx` : suppression d'un non-null assertion sur `mega_families` (`interaction.mega_families ?? []`) repéré pendant la vérification stricte du scope cockpit.
- **Fichiers créés / tests ajoutés** :
  - `frontend/src/hooks/__tests__/useInteractionHandlers.test.tsx` : vérifie que `handleSaveProspect` appelle la mutation, sélectionne l'entité retournée et renseigne les champs RHF (`entity_id`, `entity_type`, `company_name`, `company_city`).
  - `frontend/src/components/cockpit/left/__tests__/CockpitSearchSection.test.tsx` : vérifie le bouton de création prospect, l'absence de création fournisseur, et la propagation `showTypeBadge` uniquement en mode Tout.
  - `frontend/src/components/cockpit/__tests__/CockpitFormDialogs.test.tsx` : vérifie que le dialog prospect est monté ouvert, verrouillé sur `prospect`, avec source `Cockpit`.
  - `frontend/src/components/cockpit/__tests__/CockpitReadonlyView.test.tsx` : verrouille le fallback sans `mega_families`.
  - `frontend/src/hooks/__tests__/useCockpitFormController.test.tsx` : wiring `useSaveProspect` + props panneau/dialogs.
- **Comportement** :
  - Pill Prospect + recherche sans résultat pertinent → le bouton de footer ouvre le dialog prospect.
  - Enregistrement du prospect → `useSaveProspect` retourne l'`Entity`, puis le cockpit la sélectionne immédiatement comme si elle venait de la recherche.
  - Pill Fournisseur → aucun bouton inline pour l'instant, afin d'éviter de créer un fournisseur qui serait persisté comme prospect par le contrat actuel.
- **Décisions** :
  - Réutilisation de `EntityOnboardingDialog` au lieu de créer un `CockpitEntityCreateModal` séparé : le flux existe déjà, gère le payload prospect, et limite le risque de duplication UI.
  - Fournisseur explicitement reporté : `OnboardingIntent` vaut encore `'client' | 'prospect'`, `dataEntitiesPayloadSchema` n'accepte que `Client` / `Prospect`, et `saveEntity.ts` mappe toute entité non-client vers `Prospect`. L'itération fournisseur doit donc modifier le contrat avant d'activer le bouton.
  - Pas de changement DB/backend dans cette itération.
- **Validation** :
  - `pnpm --dir frontend run typecheck` → PASS.
  - `pnpm --dir frontend exec vitest run src/hooks/__tests__/useInteractionHandlers.test.tsx src/hooks/__tests__/useCockpitFormController.test.tsx src/components/cockpit/__tests__/CockpitFormDialogs.test.tsx src/components/cockpit/__tests__/CockpitReadonlyView.test.tsx src/components/cockpit/left/__tests__/CockpitSearchSection.test.tsx` → **5 fichiers / 10 tests PASS**.
  - `pnpm --dir frontend run lint` → PASS (`--max-warnings=0`).
  - `pnpm run qa` → PASS : frontend coverage **116 fichiers / 420 tests PASS**, backend **129 tests PASS / 8 ignored**, build front PASS, checks erreur PASS.
- **Limitations connues** :
  - Aucun E2E navigateur automatique lancé dans cette itération, conformément à la consigne de ne pas lancer d'E2E sans demande explicite pour une feature. Smoke test manuel recommandé : pill Prospect → taper un nom → `+ Creer` → enregistrer → vérifier que le prospect est injecté dans la saisie.
  - Fournisseur reste à traiter en Étape F itération 2 avec extension `OnboardingIntent` + contrat `dataEntitiesPayloadSchema` / service `saveEntity`.

### 2026-04-21 — Saisie guidée cockpit : canal → tiers → recherche → qualification

**Objectif** : faire évoluer la saisie vers un parcours progressif proche du mockup validé : une question active à la fois, les réponses déjà posées en lignes éditables, et un contexte droit léger quand une identité ou des interactions récentes existent. L'itération ajoute aussi les contrats nécessaires pour la suite fournisseur / interne / sollicitation.

#### Flux guidé

_Terminé._

- **Fichiers modifiés** :
  - `frontend/src/components/CockpitForm.tsx` : remplace la grille dense `CockpitFormLeftPane` / `CockpitFormRightPane` + stepper visible par `CockpitGuidedEntry`.
  - `frontend/src/hooks/useCockpitFormController.ts`, `frontend/src/hooks/useCockpitPaneProps.ts`, `.types.ts`, `frontend/src/components/cockpit/CockpitPaneTypes.ts` : propagation de `subject`, `contact_position`, `contact_name` aux props guidées.
  - `frontend/src/components/cockpit/left/CockpitIdentityEditor.tsx` : la sollicitation peut maintenant saisir une société, tout en gardant le client et l'interne hors champ libre.
  - `frontend/src/components/__tests__/CockpitForm.a11y.test.tsx` : mock du nouveau composant guidé.
- **Fichiers créés** :
  - `frontend/src/hooks/useCockpitGuidedFlow.ts` : état UI du parcours (`channel`, `relation`, `search`, `contact`, `qualification`, `subject`, `details`) + reprise intelligente d'un brouillon sur la première étape incomplète.
  - `frontend/src/components/cockpit/guided/*` : composants découpés du parcours guidé (`CockpitGuidedEntry`, answer rows, question frame, channel/relation questions, recherche interne, lookup sollicitation, qualification, details, contexte droit).
  - `frontend/src/hooks/__tests__/useCockpitGuidedFlow.test.tsx` : tests de progression prospect, saut contact pour sollicitation, édition/reset.
- **Comportement** :
  - Première saisie : l'écran démarre sur le choix de canal, puis demande le type de tiers (`Client`, `Prospect / Particulier`, `Fournisseur`, `Sollicitation`, `Interne (CIR)`).
  - Brouillon existant : le flow ne revient pas artificiellement au canal ; il ouvre la première étape réellement incomplète.
  - Client / prospect / fournisseur : recherche globale + saisie identité existante réutilisées dans une question "Recherche".
  - Interne : nouveau lookup membres agence via `useCockpitAgencyMembers`.
  - Sollicitation : saisie société + téléphone, lookup historique du numéro via `useCockpitPhoneLookup`.
  - Qualification : type d'interaction, service et statut sont groupés dans une seule étape.
  - Sujet : `CockpitSubjectSection` conserve sujet + familles + descriptif.
  - Contexte droit : aside léger avec identité sélectionnée et interactions récentes ; ce n'est pas encore le contexte riche Étape G.

#### Contrats fournisseur / cockpit

_Terminé._

- **Fichiers modifiés / créés backend & shared** :
  - `shared/schemas/supplier.schema.ts` : schéma `supplierFormSchema`.
  - `shared/schemas/cockpit.schema.ts` : inputs/réponses `cockpit.agency-members` et `cockpit.phone-lookup`.
  - `shared/schemas/data.schema.ts`, `shared/schemas/index.ts` : payload `data.entities` accepte maintenant `entity_type: 'Fournisseur'`.
  - `backend/functions/api/services/dataEntities.ts` : support ville optionnelle fournisseur.
  - `backend/functions/api/services/cockpit.ts` : liste membres agence + lookup téléphone normalisé.
  - `backend/functions/api/trpc/router.ts` : nouveau routeur `cockpit`.
  - `backend/migrations/20260421110000_cockpit_phone_lookup_index.sql` : index expressionnel sur téléphone normalisé par agence.
  - `frontend/scripts/generate-rpc-types.mjs` + `shared/api/generated/rpc-app.ts` : ajout des chemins RPC `cockpit.agency-members` / `cockpit.phone-lookup`.
  - `frontend/src/services/cockpit/*`, `frontend/src/hooks/useCockpitAgencyMembers.ts`, `frontend/src/hooks/useCockpitPhoneLookup.ts`, `frontend/src/services/query/queryKeys.ts` : services et hooks React Query.
  - `frontend/src/services/entities/saveEntity.ts`, `frontend/src/hooks/useSaveSupplier.ts` : `saveEntity` conserve `Fournisseur` au lieu de rabattre vers `Prospect`.
- **Tests ajoutés / modifiés** :
  - `backend/functions/api/trpc/router_test.ts` : contrats inputs cockpit.
  - `backend/functions/api/trpc/payloadContracts_test.ts` : payload save fournisseur.
  - `frontend/src/hooks/__tests__/useCockpitGuidedFlow.test.tsx` : 3 tests flow guidé.
- **Décisions** :
  - Le fournisseur est supporté par le contrat `data.entities` et par la création implicite au submit (`useInteractionSubmit`), mais le bouton d'onboarding fournisseur complet reste à traiter si l'on veut étendre `EntityOnboardingDialog`.
  - Le panneau contexte riche §7 n'est pas livré ici : l'aside actuel est volontairement minimal pour ne pas mélanger cette itération avec l'Étape G complète.
  - La barre submit n'est plus sticky dans le flow guidé : elle ne doit pas recouvrir la question active sur les écrans 1365x768.
- **Validation** :
  - `pnpm --dir frontend run typecheck` → PASS.
  - `pnpm --dir frontend run lint` → PASS (`--max-warnings=0`).
  - `deno check --config backend/deno.json backend/functions/api/index.ts` → PASS.
  - `deno lint backend/functions/api` → PASS.
  - `pnpm --dir frontend exec vitest run src/hooks/__tests__/useCockpitGuidedFlow.test.tsx src/components/__tests__/CockpitForm.a11y.test.tsx` → **2 fichiers / 4 tests PASS**.
  - `deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api/trpc/router_test.ts backend/functions/api/trpc/payloadContracts_test.ts` → **10 tests PASS**.
  - Smoke UI Chrome DevTools sur `http://127.0.0.1:3000/` : rendu guidé vérifié, reprise brouillon sur étape `Recherche`, pas de recouvrement avec la barre de validation.
  - `pnpm run qa` → PASS : frontend coverage **117 fichiers / 423 tests PASS**, backend **131 tests PASS / 8 ignored**, build front PASS, error compliance PASS.
- **Limitations connues** :
  - Pas d'E2E Playwright automatique lancé : conformément à la consigne, la vérification navigateur est restée en smoke manuel Chrome DevTools.
  - Le lookup sollicitation est prêt côté contrat/UI, mais sa pertinence dépend des données réelles `interactions.contact_phone` et de la migration d'index.
  - L'onboarding fournisseur via dialog dédié n'est pas encore câblé ; création fournisseur possible via saisie guidée + submit uniquement.

### 2026-04-21 — Correctif UX : reset de contexte au changement de type de tiers

**Objectif** : corriger le cas terrain `Téléphone -> Client -> SEA + contact`, puis retour sur `Type de tiers -> Fournisseur`. Le changement de type ne doit pas conserver l'ancien client, son contact, ni les champs de qualification déjà propres à ce contexte ; seul le canal reste conservé.

#### Reset relation

_Terminé._

- **Fichiers modifiés / créés** :
  - `frontend/src/hooks/useCockpitRelationChange.ts` : nouveau handler central `onRelationChange(nextEntityType)` + helper testable `buildRelationChangeValues`.
  - `frontend/src/hooks/useCockpitFormController.ts`, `frontend/src/hooks/useCockpitPaneProps.ts`, `.types.ts`, `frontend/src/components/cockpit/CockpitPaneTypes.ts` : propagation du handler aux composants de saisie.
  - `frontend/src/components/cockpit/guided/CockpitGuidedRelationQuestion.tsx` : la question guidée délègue le changement de type au handler central avant de continuer.
  - `frontend/src/components/cockpit/left/CockpitRelationSection.tsx`, `frontend/src/components/cockpit/CockpitFormLeftPane.tsx` : la section relation classique utilise le même handler, y compris pour la sentinelle UI `Tout -> entity_type=''`.
  - `frontend/src/hooks/useInteractionFormEffects.ts` : filet de sécurité sur les incohérences relation / entité sélectionnée, avec nettoyage des champs identité et contact dénormalisés.
  - `frontend/src/hooks/__tests__/useCockpitRelationChange.test.tsx` : régression Client -> Fournisseur, no-op même type, cas Interne CIR.
  - `frontend/src/components/cockpit/guided/__tests__/CockpitGuidedRelationQuestion.test.tsx` : vérifie que la question guidée appelle le reset central.
- **Décisions** :
  - Le reset est déclenché dans l'event handler utilisateur, pas dans un `useEffect`, pour éviter un rendu intermédiaire avec l'ancien tiers.
  - Le canal est conservé ; le type de tiers devient la nouvelle valeur ; les defaults agence (`status_id`, `contact_service`, `interaction_type`) sont réappliqués pour ne pas garder une qualification de l'ancien contexte.
  - Les données liées au tiers sont vidées : `entity_id`, `contact_id`, société, ville, identité/fonction/contact, sujet, familles, référence, rappel et notes.
  - `Interne (CIR)` réinitialise également les données tiers mais garde `company_name = CIR`, conforme au comportement existant.
- **Validation** :
  - `pnpm --dir frontend exec vitest run src/hooks/__tests__/useCockpitRelationChange.test.tsx src/components/cockpit/guided/__tests__/CockpitGuidedRelationQuestion.test.tsx` → **2 fichiers / 4 tests PASS**.
  - `pnpm --dir frontend run typecheck` → PASS.
  - `pnpm --dir frontend run lint` → PASS (`--max-warnings=0`).
  - `pnpm run qa` → PASS : frontend coverage **119 fichiers / 427 tests PASS**, backend **131 tests PASS / 8 ignored**, build front PASS, error compliance PASS.
- **Limitations connues** :
  - Pas d'E2E Playwright automatique lancé, conformément à la consigne projet de ne pas lancer systématiquement d'E2E pour chaque modification UI. La régression est couverte au niveau hook + composant.
  - Le mode `Tout` reste un état de recherche / filtre ; `entity_type=''` n'est toujours pas un état persistable au submit.

### 2026-04-20 — Handoff (point d'étape pour reprise IA)

Cette section est destinée à une IA qui reprend le redesign. Lire d'abord §13 (ordre global) et §17 (journal chronologique) avant de coder.

> Mise à jour 2026-04-21 : ce handoff reste l'état historique du 2026-04-20. Les entrées "2026-04-21 — Saisie guidée cockpit" et "2026-04-21 — Correctif UX" ci-dessus supersèdent une partie des priorités : les contrats fournisseur/cockpit, le lookup interne, le lookup sollicitation et le reset de contexte au changement de type sont maintenant posés ; le prochain gros sujet est plutôt le contexte droit riche Étape G, puis l'onboarding fournisseur dédié si nécessaire.

#### Ce qui est en place

État du repo : branche `main`, commits récents `3032b3b` (chore: solidify config) → travail en cours **non commité** sur ce redesign (voir `git status`). Les fichiers créés et modifiés couvrent les étapes A, B (itération 1), D (itérations 1 et 2), F (itération 1 prospect), H, I (itération 1).

Étapes terminées et mergeables indépendamment :

- **Étape A — Chrome persistant** (cf. §17 2026-04-19) :
  - Header dynamique : `CockpitFormHeader` + `useInteractionDraft` exportant `draftStatus` / `lastSavedAt`.
  - Légende raccourcis : `frontend/src/components/cockpit/CockpitShortcutLegend.tsx` (nouveau).
  - Pills canal persistantes liftées au niveau `CockpitForm` shell (dans `cockpit-channel-bar`).

- **Étape B itération 1 — Dernières saisies** :
  - Hook : `frontend/src/hooks/useRecentOwnInteractions.ts` + tests.
  - UI : `frontend/src/components/cockpit/CockpitEntryRecents.tsx`.
  - Wiring : `CockpitFormProps.interactions`, `useCockpitFormController` expose `recentOwnInteractions` / `onSelectRecent` / `showEntryRecents`, `useInteractionHandlers.handleSelectRecent(interaction, entity)`.
  - Rendu : bande `bg-surface-1/40` entre stepper et grille 2-col, conditionnelle à `!selectedEntity && !hasDraftContent && recentOwnInteractions.length > 0`.

- **Étape D itération 1 — Polish pills type de tiers** :
  - `CockpitRelationSection` : libellés "Type de tiers", icône `Users` pour Interne.

- **Étape D itération 2 — Pill `Tout` + badges type** :
  - `CockpitRelationSection` : pill `Tout` (icône `Globe`) avec sentinelle UI `'Tout'` remappée vers `entity_type=''` côté RHF. Hint sous les pills en mode Tout.
  - Propagation `showTypeBadge?: boolean` dans la chaîne search : `InteractionSearchBar → ListArea → Results/Recents → EntityItem`.
  - Badges type rendus uniquement en mode Tout (chip `rounded-full`, `text-[10px] uppercase`).
  - `CockpitSearchSection` calcule `showTypeBadge = entityType.trim() === ''`.

- **Étape F itération 1 — Création inline prospect** :
  - `CockpitSearchSection` ouvre la création inline en mode `prospect` comme en mode `client`, mais laisse volontairement `supplier` sans bouton.
  - `CockpitFormDialogs` monte un `EntityOnboardingDialog` dédié avec `allowedIntents={['prospect']}` / `defaultIntent="prospect"` / source `Cockpit`.
  - `useInteractionHandlers.handleSaveProspect(payload)` persiste via `useSaveProspect`, puis sélectionne immédiatement l'entité retournée dans la saisie.
  - Fournisseur reporté : le contrat actuel `OnboardingIntent` + `dataEntitiesPayloadSchema` ne supporte pas encore `supplier`.

- **Étape H — Mode lecture post-save** :
  - `CockpitReadonlyView` (nouveau) rendu à la place du `<form>` quand `lastSavedInteraction` est posé.
  - Header vert `Enregistré · INT-ABCDEF` via `formatInteractionReference`.
  - `useInteractionSubmit` accepte `onSaveSuccess` ; `⌘N` maintenant branché sur `onStartNewEntry` (vide `lastSavedInteraction` + reset).

- **Étape I itération 1 — Roving tabindex sur `CockpitEntryRecents`** :
  - `↑ / ↓` wrap, `Home / End` extrémités, un seul point d'entrée `Tab` sur la liste.
  - Tests : `frontend/src/components/cockpit/__tests__/CockpitEntryRecents.test.tsx` (5 cas).

Validations courantes (à rejouer avant merge) :
- `cd frontend && pnpm run typecheck` → PASS.
- `cd frontend && pnpm run lint` → PASS (`--max-warnings=0`).
- Tests ciblés F1 → **5 fichiers / 10 tests PASS**.
- `pnpm run qa` à la racine → PASS : frontend coverage **116 fichiers / 420 tests PASS**, backend **129 tests PASS / 8 ignored**.

Fichiers non commités actuellement (cf. `git status` au moment du handoff) :

Modifiés :
- `frontend/src/components/CockpitForm.tsx`
- `frontend/src/components/InteractionSearchBar.tsx`
- `frontend/src/components/__tests__/CockpitForm.a11y.test.tsx`
- `frontend/src/components/app-main/AppMainTabContent.tsx`
- `frontend/src/components/cockpit/CockpitForm.types.ts`
- `frontend/src/components/cockpit/CockpitFormDialogs.tsx`
- `frontend/src/components/cockpit/CockpitFormHeader.tsx`
- `frontend/src/components/cockpit/CockpitFormLeftPane.tsx`
- `frontend/src/components/cockpit/CockpitPaneTypes.ts`
- `frontend/src/components/cockpit/buildCockpitLeftEntitySectionsProps.ts`
- `frontend/src/components/cockpit/left/CockpitChannelSection.tsx`
- `frontend/src/components/cockpit/left/CockpitRelationSection.tsx`
- `frontend/src/components/cockpit/left/CockpitSearchSection.tsx`
- `frontend/src/components/interaction-search/InteractionSearchBar.types.ts`
- `frontend/src/components/interaction-search/InteractionSearchEntityItem.tsx`
- `frontend/src/components/interaction-search/InteractionSearchListArea.tsx`
- `frontend/src/components/interaction-search/InteractionSearchRecents.tsx`
- `frontend/src/components/interaction-search/InteractionSearchResults.tsx`
- `frontend/src/hooks/__tests__/useInteractionSubmit.test.tsx`
- `frontend/src/hooks/__tests__/useCockpitFormController.test.tsx`
- `frontend/src/hooks/useCockpitDialogsState.ts`
- `frontend/src/hooks/useCockpitFormController.ts`
- `frontend/src/hooks/useCockpitPaneProps.ts`
- `frontend/src/hooks/useCockpitPaneProps.types.ts`
- `frontend/src/hooks/useInteractionDraft.ts`
- `frontend/src/hooks/useInteractionHandlers.ts`
- `frontend/src/hooks/useInteractionHandlers.types.ts`
- `frontend/src/hooks/useInteractionHotkeys.ts`
- `frontend/src/hooks/useInteractionSubmit.ts`

Non trackés (créés pendant les étapes) :
- `docs/cockpit-saisie-redesign.md` (le design doc lui-même avec le journal §17)
- `frontend/src/components/cockpit/CockpitEntryRecents.tsx`
- `frontend/src/components/cockpit/CockpitReadonlyView.tsx`
- `frontend/src/components/cockpit/CockpitShortcutLegend.tsx`
- `frontend/src/components/cockpit/__tests__/CockpitEntryRecents.test.tsx`
- `frontend/src/components/cockpit/__tests__/CockpitFormDialogs.test.tsx`
- `frontend/src/components/cockpit/__tests__/CockpitReadonlyView.test.tsx`
- `frontend/src/components/cockpit/left/__tests__/CockpitSearchSection.test.tsx`
- `frontend/src/hooks/__tests__/useInteractionHandlers.test.tsx`
- `frontend/src/hooks/__tests__/useRecentOwnInteractions.test.tsx`

Modifs hors redesign à ne PAS embarquer dans les commits redesign (ignorer ou garder dans un commit séparé) : `backend/functions/api/services/configSnapshot_test.ts`, `package.json`, `shared/api/generated/rpc-app.ts`, `shared/schemas/config.schema.ts`.

#### Ce qui reste à faire — par priorité décroissante

**Ordre recommandé** : F itération 2 (fournisseur) ou G (scaffolding droit) → E → B itération 2 → I itération 2. Chaque étape doit rester mergeable indépendamment.

1. **Étape F — Création inline fournisseur** (priorité haute, nécessite extension du contrat).

   *Contexte actuel* :
   - `CockpitFormDialogs` câble déjà `ClientFormDialog` (client), `ClientContactDialog` (contact), `EntityOnboardingDialog` (conversion) et un `EntityOnboardingDialog` dédié prospect pour le cockpit.
   - `OnboardingIntent = 'client' | 'prospect'` → **fournisseur non supporté** par la flow d'onboarding actuelle.
   - `dataEntitiesPayloadSchema` n'accepte que `Client` / `Prospect`, et `saveEntity.ts` mappe toute entité non-client vers `Prospect`.
   - `CockpitSearchSection` passe `onCreateEntity` pour `relationMode === 'client' | 'prospect'` uniquement → le bouton `+ Creer <entity>` du footer ne s'affiche PAS pour fournisseur.
   - `InteractionSearchFooter` rend déjà le bouton quand `onCreateEntity` est fourni.

   *Travail F itération 2 (fournisseur)* :
   - Étendre `OnboardingIntent` à `'client' | 'prospect' | 'supplier'` dans `frontend/src/components/entity-onboarding/entityOnboarding.types.ts`.
   - Étendre `shared/schemas/data.schema.ts` + `backend/functions/api/services/dataEntities.ts` + `frontend/src/services/entities/saveEntity.ts` pour persister réellement `entity_type = 'Fournisseur'` au lieu de le rabattre vers `Prospect`.
   - Ajouter les copies (intent step, details step, review step) — probablement symétriques à prospect mais avec `entity_type = 'Fournisseur'`.
   - Impact : `useEntityOnboardingFlow.ts` (~1100 lignes, à lire avant de toucher ; mémoire du projet note que c'est un hotspot).

2. **Étape G — Contexte droit adaptatif** (priorité haute, scope large).

   *Contexte actuel* :
   - `frontend/src/components/cockpit/CockpitFormRightPane.tsx` ne contient que `CockpitSubjectSection` + `CockpitFooterSection`. Aucun panneau adaptatif selon le type de tiers.
   - Design spec : §7 du doc, 5 variantes selon `relationMode` (client, prospect, supplier, internal, solicitation).

   *Travail G itération 1 (scaffolding neutre, sans backend)* :
   - Créer `frontend/src/components/cockpit/right/CockpitContextPanel.tsx` qui route vers une variante selon `relationMode`.
   - Créer 5 composants stubs : `CockpitContextClient`, `CockpitContextProspect`, `CockpitContextSupplier`, `CockpitContextInternal`, `CockpitContextSolicitation`.
   - Chaque stub affiche juste l'identité + une zone "Contexte à enrichir" pour bien montrer la différenciation sans avoir à faire de backend.
   - Monter `CockpitContextPanel` dans `CockpitFormRightPane` au-dessus de `CockpitSubjectSection`.

   *Travail G itérations suivantes (par variante)* :
   - **Client** : CA 12M (besoin nouvelle RPC ou agrégation côté front sur `interactions`), dossiers ouverts (déjà via `entities.open_tickets` ?), 5 dernières interactions avec ce client (peut se faire localement avec la query `interactions` déjà en cache).
   - **Prospect** : identité + date création + statut conversion + interactions passées.
   - **Supplier** : tags fournis (nouvelle métadonnée à définir côté DB) + délais moyens + commandes récentes (nouvelle table `purchase_orders` à vérifier).
   - **Internal** : profil + rôle (via `profiles` / `agency_members`) + derniers échanges — requiert liste agency members (cf. §16).
   - **Solicitation** : numéro + historique des appels même numéro (requête SQL à définir avec index sur `contact_phone`).

   *Décisions d'arbitrage à prendre avant de coder les variantes riches* :
   - Question ouverte §16 : endpoints à créer pour CA 12M, score conversion, liste membres agence, lookup tél inverse.
   - Proposer une itération pure-cache-frontend pour les variantes simples (client "5 dernières interactions", solicitation "historique même numéro") avant de demander du backend.

3. **Étape E — Variantes Interne / Sollicitation écran 2** (priorité moyenne, backend requis).

   *Contexte actuel* :
   - `CockpitSearchSection` early-return (`return null`) pour `relationMode === 'internal' | 'solicitation'` → l'écran 2 est vide pour ces deux types (actuellement couvert partiellement par `CockpitIdentityHints`).
   - Design §6.3 : Interne = liste des membres agence + fallback libre ; Sollicitation = lookup tél inverse.

   *Travail E itération 1 (Interne)* :
   - Besoin backend : RPC / tRPC procédure qui retourne les `profiles` + `agency_members` de l'agence active pour le TCS courant. Vérifier si `agency_members` est déjà exposé via une query frontend (chercher dans `services/` et `hooks/`).
   - Nouveau composant `CockpitInternalSearch` : `Command` shadcn avec liste des membres, et `fallback` free-text qui met à jour `company_name` + `contact_name` sans entité.
   - Monter dans `CockpitSearchSection` avec un `switch` sur `relationMode` au lieu de l'early-return.

   *Travail E itération 2 (Sollicitation)* :
   - Besoin backend : endpoint lookup par `contact_phone` (à normaliser avec `formatFrenchPhone` existant) retournant historique par numéro.
   - Nouveau composant `CockpitSolicitationSearch` : champ tél avec debounce + liste de résultats historiques.
   - Vérifier qu'un index existe sur `interactions.contact_phone` (question ouverte §16).

4. **Étape B itération 2 — Liste de brouillons** (priorité basse, backend requis).

   *Contexte actuel* :
   - `services/interactions/getInteractionDraft.ts` ne récupère qu'un seul draft par `(user, agency, form_type)` (schéma unique-par-user).
   - `CockpitEntryRecents` affiche actuellement uniquement les 5 dernières saisies **sauvegardées** (`interactions`), pas les drafts.

   *Travail* :
   - Étendre `getInteractionDraft` (ou créer `listInteractionDrafts`) pour retourner un tableau plutôt qu'un `null | Draft`.
   - Option 1 : relâcher la contrainte unique (migration DB + RLS).
   - Option 2 : garder la contrainte unique mais ajouter un TTL pour "archiver" les drafts non-submittés → liste.
   - Ajouter un bloc "Brouillons" dans `CockpitEntryRecents` au-dessus des "Dernières saisies".

5. **Étape I itération 2 — Polish a11y / responsive** (priorité basse).

   - ARIA live sur le header statut (déjà présent via `role="status" aria-live="polite"`) — vérifier le passage lecteur d'écran VoiceOver / NVDA.
   - `prefers-reduced-motion` : auditer les transitions dans `CockpitFormHeader` et `CockpitEntryRecents`.
   - Raccourci `← / →` sur les pills relation (type de tiers) pour cycler au clavier.
   - Responsive tablette 1024 px : vérifier que le panneau contexte se replie proprement une fois Étape G posée.
   - Raccourci global `G R` pour sauter directement à `CockpitEntryRecents` (demande terrain à valider).

#### Conventions à respecter absolument

(Ré-énoncées ici pour la nouvelle IA — ce sont des règles dures du projet, non-négociables, voir `CLAUDE.md` racine pour la liste complète.)

- **Aucun `any`, aucun `as` casting sans type guard, aucun `!`, aucun `@ts-ignore`.**
- **`pnpm run lint` max-warnings=0** : aucun warning ESLint toléré. Si tu tombes sur `jsx-a11y/no-redundant-roles` sur un `<ul role="list">`, retire le role.
- **Tests Vitest** en `__tests__/` à côté du fichier source. Les tests React qui appellent `.focus()` synchronement doivent wrapper dans `act()` pour éviter les warnings.
- **Skills obligatoires** à invoquer AVANT de coder : `vercel-react-best-practices` (React), `web-design-guidelines` (UI), `cir-error-handling` (erreurs), `vitest` (tests front), `supabase-postgres-best-practices` (si tu touches à la DB).
- **Fichiers ~150 lignes max** : décomposer au-delà (politique §"Politique de decoupage pragmatique" du `CLAUDE.md`).
- **Zod schemas partagés** dans `shared/schemas/` — ne pas dupliquer côté front.
- **Types Supabase** : re-export depuis `shared/supabase.types.ts` → `frontend/src/types/supabase.ts`. Regénérer via `supabase gen types typescript` si schéma DB changé.
- **Pas de nouvelle Edge Function** : tout passe par le slug unique `api` (Hono). Mémoire projet : "Do NOT create separate Edge Functions per domain".
- **`entity_type`** côté schéma Zod garde `min(1)` → l'état `''` (mode Tout UI) n'est jamais persisté ; le gate de submit refuse la saisie sans type. Ne pas assouplir ce schéma pour plaire au mode Tout.
- **Journal §17** : à chaque étape itération qui compile/lint/passe les tests, **ajouter une entrée** avec : objectif, fichiers modifiés/créés, décisions, validation, limitations connues. C'est ce qui permet le handoff propre.

#### Où regarder pour comprendre le terrain

- `docs/cockpit-saisie-redesign.md` §5-§12 : spec détaillée écran par écran.
- `CLAUDE.md` racine : règles dures (TS, ESLint, tests, structure).
- `frontend/src/hooks/useCockpitFormController.ts` : orchestrateur central — tous les props du form partent d'ici.
- `frontend/src/hooks/useInteractionHandlers.ts` : toutes les mutations `setValue` et les handlers de sélection d'entité / contact / recent.
- `shared/schemas/interaction.schema.ts` : source unique des règles métier (ce qui est requis, les `superRefine` par `entity_type`).
- Mémoire projet (`C:\Users\arnau\.claude\projects\C--GitHub-CIR-Cockpit-CIR-Cockpit\memory\`) : métriques, conventions, hotspots. `EntityOnboardingDialog` + `useEntityOnboardingFlow` sont des hotspots — lire avant de toucher.
