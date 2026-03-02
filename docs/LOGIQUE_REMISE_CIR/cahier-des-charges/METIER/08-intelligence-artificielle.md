# 8. Intelligence artificielle

[← Regles metier](./07-regles-metier.md) | [Sommaire](../00-sommaire.md)

---

## 8.1 - Principe directeur : IA a cout maitrise

L'IA est integree des la v1 mais avec une strategie en 3 couches pour maitriser les couts :

| Couche | Technologie | Cout/appel | Description |
|--------|------------|------------|-------------|
| **Couche 1** | SQL + algorithmes | 0 EUR | "Intelligence statistique" : requetes SQL, moyennes, percentiles, regressions. Donne 80% de la valeur percue. |
| **Couche 2** | LLM leger (Mistral Small 3) | ~0.0001-0.0005 EUR | Taches ponctuelles : mise en forme, mapping colonnes, traduction requete. Francais natif. |
| **Couche 3** | LLM avance (Mistral Medium 3) | ~0.005-0.015 EUR | Analyses complexes a la demande : synthese client, preparation RDV. |

## 8.2 - Les 8 cas d'usage IA

### IA-1 : Suggestion de remise intelligente (Couche 1 - zero cout)

**Ou** : Edition inline d'une condition (ecran principal)
**Quand** : Le TCS edite une remise sur un segment

L'outil analyse automatiquement 6 dimensions :

| Dimension | Source | Donnee |
|-----------|--------|--------|
| Historique client | Ventes/consommation | Marge moy, tendance, derniere vente, nombre de ventes |
| Benchmark groupement | Conditions clients du meme groupement | Moyenne, min, max, percentile du client |
| Volume et importance | CA client x segment + poids agence | Levier de negociation |
| Derogation/BFA | Tables supplier_derogations + bfa_rates | PA effectif, marge reelle vs affichee |
| Evolution prix fabricant | Historique supplier_products | Derniere hausse, impact non repercute |
| Coherence cascade | Conditions existantes a d'autres niveaux | Incoherences, surcharges, heritage |

**Affichage** :
```
🤖 Suggestion: -38% (marge cible 42.4%)

Contexte :
  📊 42 ventes en 3 ans, marge moy 38.7%, tendance stable
  👥 8 clients Aero : remise moy -37.5%, AIRBUS = percentile 85
  💰 CA SKF/Z16 AIRBUS : 12.4k€/an (5% du CA SKF)
  ⚡ Derog active : PA aide 3.80€ → marge reelle 49.1%
  📈 Hausse tarif SKF +3.2% non repercutee → marge erodee 1.3pp

[Appliquer -38%]  [Modifier]  [Ignorer]
```

**Implementation** : 100% SQL (zero cout). Les 6 dimensions sont calculees par des requetes Postgres (AVG, PERCENT_RANK, regression lineaire). Template de texte pre-formate.

### IA-2 : Detection d'anomalies et alertes (Couche 1 - zero cout)

**Ou** : Dashboard, fiche client, page validation ROI
**Quand** : Automatique (job periodique ou a l'ouverture)

```
⚠ Anomalies detectees (3) :

1. SKF/Z16 AIRBUS : remise -40% mais sous-fam RIGIDES -30%
   → Exception segment 10pp plus genereuse que sous-famille
   → [Revoir] [OK, c'est voulu]

2. FESTO/VER_ISO MECAPLUS : marge 14.2% (sous le seuil 15%)
   → Non revisee depuis 14 mois
   → [Lancer une revision]

3. TIMKEN/SET_BR : 0 ventes en 12 mois malgre condition -28%
   → Condition potentiellement obsolete
   → [Archiver] [Conserver]
```

**Implementation** : Requetes SQL periodiques (ecart segment/parent > Xpp, marge < seuil + date revision > Y mois, condition active + zero ventes > Z mois).

### IA-3 : Auto-mapping des fichiers tarif (Couche 2 - cout faible)

**Ou** : Import tarif fabricant (etape mapping)
**Quand** : A l'upload d'un nouveau fichier

```
Fichier : tarif_SKF_2026.xlsx (47 colonnes, 12 340 lignes)

🤖 Mapping suggere :
  Reference produit  → "Art. No."        (confiance: 98%)
  Description        → "Product Description" (confiance: 95%)
  Categorie fab      → "Product Group"    (confiance: 92%)
  Prix tarif         → "List Price EUR"   (confiance: 97%)
  Remise standard    → (non detectee)

[Accepter] [Modifier] [Mapper manuellement]
```

**Implementation** : Un appel Mistral Small 3 avec les noms de colonnes + echantillon de donnees + schema attendu. Renvoie un mapping JSON.
**Cout** : ~0.0002 EUR/import. A 50 imports/an = ~0.01 EUR/an.

### IA-4 : Recherche en langage naturel (Couche 2 - cout faible)

**Ou** : Barre de recherche principale
**Quand** : L'utilisateur tape une question en francais

```
🔍 "quels clients ont une marge sous 20% sur les roulements SKF ?"

→ Traduction IA : { "mega": "ROULEMENTS", "marque": "SKF", "marge_max": 20 }
→ 7 resultats affiches
```

**Implementation** : Mistral Small 3 traduit la question en filtres JSON. Si non compris, fallback sur la recherche texte classique.
**Cout** : ~0.0001 EUR/recherche. Limite 200 recherches IA/jour/agence.

### IA-5 : Resume proactif fiche client (Couche 1+2)

**Ou** : En-tete de la fiche client
**Quand** : A l'ouverture de la fiche (cache 1h)

```
🤖 Apercu IA - AIRBUS OPERATIONS

• Marge moy 28.4% — au-dessus de la moyenne agence (24.1%)
• 3 conditions expirent dans 30 jours (SKF/Z16, FESTO/VER, ...)
• Ecart avec groupement Aero : +5pp en moyenne
• Pas de ventes HYDRAULIQUE depuis 8 mois (condition active)

[Voir le detail]  [Demander a l'IA ✨]
```

**Implementation** : 80% SQL pre-calcule (marge moy, expirations, ecart groupement, segments sans vente) + 20% Mistral Small 3 (mise en forme en 3-4 bullet points).
**Cout** : ~0.0003 EUR/ouverture. Cache 1h. Alternative zero cout : template statique.

### IA-6 : Aide a la validation ROI (Couche 1+2)

**Ou** : Page de validation ROI
**Quand** : Pour chaque proposition en attente

```
Proposition #234 - SKF/Z16 AIRBUS : -40% → -45%

🤖 ✅ Coherent
• Remise -45% dans la fourchette Aero (-30% a -48%)
• Marge resultante 34.6% > seuil 15%
• Le motif cite un concurrent NTN (tarifs agressifs confirmes)
```

ou

```
Proposition #235 - PARKER/HYD_FLEX MECAPLUS : -35% → -52%

🤖 ⚠️ Points d'attention
• Saut de 17pp inhabituel (moyenne modifications : 3-5pp)
• Marge resultante 14.8% — sous le seuil 15%
• 2 commandes PARKER en 12 mois (faible volume)
• Motif generique
```

**Implementation** : SQL pour les stats + Mistral Small 3 pour la synthese/verdict. Cache par proposition.
**Cout** : ~0.0003 EUR/proposition.

### IA-7 : Analyse delta import tarif (Couche 1+2)

**Ou** : Import tarif fabricant (apres import)
**Quand** : Apres chaque import de tarif

```
🤖 Analyse de l'import SKF 2026 :
• 12 340 references mises a jour
• Hausse moyenne : +3.2%
• 47 references avec hausse > 10% (dont 12 a fort CA)
• 23 conditions client seront sous le seuil 15% apres cette hausse
• Segments les plus impactes : Z16 (+4.1%), Z22 (+5.8%)
• Recommandation : reviser les 23 clients impactes
```

**Implementation** : SQL pour les deltas + Mistral Small 3 pour la synthese.
**Cout** : ~0.0005 EUR/import.

### IA-8 : Assistant pricing contextuel (Couche 3 - a la demande)

**Ou** : Bouton "Demander a l'IA" sur la fiche client
**Quand** : A la demande de l'utilisateur

```
🤖 Analyse AIRBUS OPERATIONS

Resume politique tarifaire :
AIRBUS beneficie de 23 conditions client et 34 conditions groupement.
Marge moyenne ponderee 28.4%, au-dessus de la moyenne agence (24.1%).

Points d'attention :
• 3 segments FESTO sous 20% de marge (conditions de 2024, non revisees)
• SKF 6205-2RSH : prix marche 7.80€ moins avantageux que remise segment (-40% = 7.50€)
• Groupement Aero a -20% sur HYDRAULIQUE mais AIRBUS n'a aucune condition

Recommandations :
1. Reviser les 3 segments FESTO
2. Corriger le prix marche SKF 6205-2RSH
3. Explorer une condition HYDRAULIQUE pour AIRBUS si CA > 5k€/an
```

**Implementation** : Mistral Medium 3 avec resume conditions (JSON) + historique consommation + benchmark.
**Cout** : ~0.012 EUR/analyse. Limite 20 analyses/jour/utilisateur.

## 8.3 - Estimation des couts annuels

### Hypotheses : 14 agences, ~200 utilisateurs actifs, usage quotidien

| Cas d'usage | Couche | Modele | Tokens in/out | Cout/appel | Volume/an | Cout/an |
|-------------|--------|--------|---------------|------------|-----------|---------|
| IA-1 Suggestions | 1 | SQL | - | 0 EUR | illimite | 0 EUR |
| IA-2 Anomalies | 1 | SQL | - | 0 EUR | illimite | 0 EUR |
| IA-3 Auto-mapping | 2 | Small 3 | 3k/500 | ~0.0002 EUR | ~50 | ~0.01 EUR |
| IA-4 Recherche NL | 2 | Small 3 | 1.5k/300 | ~0.0001 EUR | ~5 000 | ~0.50 EUR |
| IA-5 Resume fiche | 1+2 | Small 3 | 5k/800 | ~0.0003 EUR | ~50 000 | ~15 EUR |
| IA-6 Aide validation | 1+2 | Small 3 | 4k/600 | ~0.0003 EUR | ~7 500 | ~2 EUR |
| IA-7 Analyse import | 1+2 | Small 3 | 8k/1.5k | ~0.0005 EUR | ~100 | ~0.05 EUR |
| IA-8 Assistant pricing | 3 | Medium 3 | 15k/3k | ~0.012 EUR | ~2 500 | ~30 EUR |
| **TOTAL** | | | | | | **~48 EUR/an** |

**~48 EUR/an pour une IA omnipresente dans l'outil.** Reduction de ~40x vs l'estimation initiale (Claude ~1 880 EUR/an → Mistral ~48 EUR/an).

Mistral est un choix optimal pour ce projet : francais natif (modele franco-americain), structured output JSON supporte, context window 32k tokens suffisant, vitesse excellente (~100 tokens/s).

Le cout est si faible que les quotas peuvent etre releves significativement (cf. section 8.4).

## 8.4 - Controle des couts

| Mecanisme | Description |
|-----------|------------|
| **Cache** | Chaque reponse IA est cachee 1h (meme client/segment = meme reponse) |
| **Quota** | Max 1 000 appels LLM/jour/agence (Couche 2 - Mistral Small 3), 100/jour/agence (Couche 3 - Mistral Medium 3) |
| **Fallback** | Si quota atteint, afficher les donnees SQL brutes sans mise en forme IA |
| **Toggle** | Chaque utilisateur peut desactiver l'IA dans ses preferences |
| **Dashboard** | Ecran admin montrant la consommation IA par agence/jour |

## 8.5 - Architecture technique IA

### Backend : endpoint unifie `/api/ai/`

| Endpoint | Usage | Couche |
|----------|-------|--------|
| `POST /api/ai/insights` | Resume proactif fiche client | 1+2 |
| `POST /api/ai/suggest` | Suggestion contextuelle (edition, simulateur) | 1 |
| `POST /api/ai/search` | Recherche langage naturel | 2 |
| `POST /api/ai/validate` | Aide validation ROI | 1+2 |
| `POST /api/ai/analyze` | Analyse approfondie (import, copie, tendance) | 1+2 ou 3 |

Chaque endpoint :
1. Collecte les donnees SQL pertinentes (Couche 1)
2. Si LLM necessaire : formate un prompt contextuel + appelle l'API Mistral (`https://api.mistral.ai/v1/chat/completions`)
3. Renvoie la reponse structuree (JSON, via `response_format: { type: "json_object" }`)

### Fallback gracieux

Si le LLM n'est pas disponible ou si le quota est atteint :
- Les donnees SQL brutes sont toujours disponibles
- L'interface affiche les memes informations mais sans la mise en forme "intelligente"
- Aucune fonctionnalite n'est bloquee par l'absence de l'IA

## 8.6 - Idees complementaires (v2+)

### Heatmap visuelle des marges

Vue matricielle mega-famille x marque avec code couleur :
```
        │ SKF  │ FESTO │ PARKER │ TIMKEN │
ROULEM. │ 🟢40%│       │        │ 🟡28%  │
PNEUMA. │      │ 🟠22% │        │        │
HYDRAU. │      │       │ 🔴14%  │        │
```

### Preparation de rendez-vous client

```
🤖 Preparation RDV - DASSAULT AVIATION (15/03/2026)

1. SKF/Z16 : marge 40%, espace de negociation 15pp
   Argument : "Volume SKF en hausse de 18%"

2. FESTO/VER_ISO : opportunite de monter la marge (+4pp)
   Argument : "Derogation prix FESTO nous permet un prix competitif"

3. 5 references prix marche expirent le 31/03
   Impact si non-renouvele : marge 28% → 31%
```

### Mode "Revision periodique"

Campagne automatique tous les X mois :
- Liste des segments/clients non revises depuis > 6 mois
- Compare marges actives vs marges reellement pratiquees
- Signale les ecarts importants
- Distribution des revisions aux TCS

### Export PDF recapitulatif

PDF des conditions d'un client pour le TCS itinerant :
- Resume client (nom, groupement, CA, marge)
- Tableau des conditions par mega-famille
- Top 10 segments par CA
- Alertes (expiration, marges critiques)
