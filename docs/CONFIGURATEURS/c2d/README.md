# C2d — qualifications factuelles moteur

Checkpoint du 28/07/2026. Cette passe corrige uniquement les valeurs démontrées
par les sources ou par une identité physique non ambiguë. Une donnée non
publiée, variante ou contradictoire reste nulle et reçoit une qualification
explicite.

Registre exhaustif des 141 points restant à contrôler :
`docs/CONFIGURATEURS/c2d/incertitudes-restantes.md`.

## État distant actif

| Élément | Valeur |
| --- | --- |
| Snapshot | `6fbf4046-be74-4422-9fe8-2d2d8a8d9157` |
| Lot d'import | `cc5689ac-cbf1-45e8-a079-62df8f77dfd8` |
| Empreinte du lot | `5db53991095401581953e48fd9b4bbba68c8a8be5b4d5f8c227456fc14256bdb` |
| Empreinte du diff | `d7e44f390d5ea0736f48ae12fefebd6a5b44d28caf783fb7fc5e5abe19860bed` |
| Gate | `passed` |
| Modèles physiques | 1 665 |
| Points de fonctionnement | 2 355 |
| Cotes | 45 568 |
| Options de bride | 7 940 |
| Issues moteur | 141, dont 79 qualifications C2d |

Le snapshot précédent
`900dfe00-d0e1-4f9d-8281-25c5f1beab50` a été retiré atomiquement lors de
l'activation. Il constitue la cible de rollback logique, via
`configurator.activate_snapshot`, et ne doit pas être supprimé.

## Corrections certaines

- `requires_vfd = true` pour les 59 PMaSynRM Leroy-Somer, faux pour les autres
  technologies.
- `is_iec_standard = false` et
  `shaft_spec = integrated_gearmotor_non_iec` pour les 109 Bonfiglioli M/ME/MX.
- `article_no_status = published` pour les 1 017 références Innomotics
  publiées ; `not_published_in_source` pour les 648 autres modèles.
- IP55 pour Innomotics, IP55 pour les familles Leroy-Somer fermées, IP23 pour
  PLSES/PLSHRM et IP55 pour les familles Bonfiglioli non ambiguës.
- Matériau Bonfiglioli qualifié par série et carcasse, sans extrapoler les cas
  non démontrés.
- 56 lignes VFD Leroy-Somer rattachées à leur modèle physique lorsque la clé
  exacte désignation normalisée + pôles + puissance n'offre qu'un seul triplet
  masse/inertie/montage. Les 2 355 points sont conservés.
- B publié `368/419` du PLSES 280 MGU conservé dans `value_text` avec
  `value_mm = null`.

## Inconnues conservées

| Qualification | Nombre | Traitement |
| --- | ---: | --- |
| `PHYSICAL_ATTRIBUTES_UNRESOLVED` | 65 | masse/inertie non rapprochées sans identité unique |
| `PROTECTION_IP_VARIANT_UNRESOLVED` | 6 | Bonfiglioli BY : IP55/IP56 dépend de la variante |
| `INERTIA_SOURCE_CONFLICT` | 1 | Innomotics `1LE1583-3AB5`, valeurs sources contradictoires |
| `IEC_DIMENSIONS_UNRESOLVED` | 7 | six modèles physiques Bonfiglioli BN et l'Innomotics `1LE1003-1BD2` |

Ces 79 lignes s'ajoutent aux 62 issues de validation déjà présentes. Elles ne
bloquent pas l'import parce qu'elles signalent précisément une absence de
preuve ; elles ne doivent pas être transformées en valeur par défaut.

## Couverture mécanique active

| Marque / nature | Modèles | A/B/C/H/K | D | E | F |
| --- | ---: | ---: | ---: | ---: | ---: |
| Leroy-Somer IEC | 384 | 384 | 384 | 384 | 384 |
| Innomotics IEC | 1 017 | 1 016 | 1 017 | 1 017 | 1 017 |
| Bonfiglioli IEC | 155 | 149 | 155 | 153 | 155 |
| Bonfiglioli intégré non-IEC | 109 | non applicable | non applicable | non applicable | non applicable |

Les six modèles physiques Bonfiglioli concernés sont BN 56A, BN 56B, deux
variantes physiques BN 160MR et deux BN 180M. A/B/C/H/K ne sont pas publiées
dans les lignes importées pour ces modèles ; E manque aussi pour les deux
BN 180M. Ces absences et l'unique plan de pieds Innomotics ne sont pas comblés
sans page constructeur probante.

## Schéma et preuves

La migration
`backend/migrations/20260728120556_configurator_c2d_motor_qualifications.sql`
ajoute trois colonnes nullables et leurs contraintes de cohérence. Le SQL
normalisé local et distant mesure 1 433 caractères et porte le MD5
`8654758944d3ec323172d9c3c1653d92`.

Preuves runtime :

- un seul snapshot actif, statut actif et gate `passed` ;
- zéro classification VFD incohérente et zéro statut article incohérent ;
- RLS : `anon` refusé ; profil TCS humain autorisé à lire les 1 665 modèles et
  45 568 cotes, le tout dans des transactions annulées ;
- aucun advisor sécurité spécifique au schéma `configurator` ; les advisors
  sécurité et performance préexistants hors C2d restent ouverts ;
- `node --check`, `deno check`, 13 tests d'extraction, `qa:docs` et `qa:back`
  passent ; `qa:back` couvre 449 tests backend réussis, 14 intégrations
  conditionnelles ignorées et zéro échec.

Preuves locales durables du lot C2d actif :

- `lot-manifest.json` : provenance et empreinte `5db53991…` ;
- `controles.json` : décision `GO_TECHNIQUE`, volumes et contrôles locaux ;
- `anomalies.json` : registre détaillé produit par les validateurs ;
- `diff-activation.json` : compteurs avant/après et empreinte du diff activé.

Le payload de chargement et les itérations de travail ne sont pas versionnés.
Ils sont régénérables depuis les extracteurs validés et les sources fabricant :

```powershell
node scripts/configurator-c2-import.mjs --source-root=C:\GitHub\CIR_Moteur `
  --out=docs/CONFIGURATEURS/c2d --emit-payload=.c2-payload
```

Le dossier `.c2-payload/` reste ignoré et doit être supprimé après usage.
