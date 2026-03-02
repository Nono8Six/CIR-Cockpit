# T4. RLS et securite

[← Architecture API](./03-architecture-api.md) | [Sommaire](../00-sommaire.md) | [Import / Export →](./05-import-export.md)

---

## T4.1 - Principes de securite

Le module de tarification CIR repose sur un modele de securite multi-couche :

1. **Multi-tenant strict** : toutes les tables sont filtrees par `agency_id` via Row Level Security (RLS). Aucune requete ne peut acceder aux donnees d'une autre agence sans politique explicite.

2. **Roles techniques canoniques** :
   - `super_admin` : acces global, toutes agences, toutes operations
   - `agency_admin` : acces agence, validation des propositions, derogations agence
   - `tcs` : operateur agence, propositions soumises a validation
   - Les termes metier `direction` et `roi` restent des alias d'interface. En base/RLS, les controles s'appuient uniquement sur les roles techniques ci-dessus.

3. **Zero acces direct aux tables** : le frontend ne communique jamais directement avec la base de donnees pour les mutations. Tout passe par l'Edge Function Hono via tRPC.

4. **JWT valide dans le middleware, pas au niveau DB** : `verify_jwt=false` sur l'Edge Function. L'authentification est geree explicitement par le middleware `auth` qui extrait et verifie le token Supabase, puis injecte le profil utilisateur dans le contexte Hono.

5. **Audit trail complet** : chaque modification de condition genere un enregistrement immutable dans `pricing_proposals`. Meme les modifications directes (`agency_admin`/`super_admin`) creent une proposition auto-validee.

6. **Principe du moindre privilege** : chaque role ne voit et ne peut modifier que ce qui est strictement necessaire a sa fonction.

---

## T4.2 - Matrice des permissions par role

| Action | TCS | Agency Admin | Super Admin |
|--------|-----|--------------|-------------|
| Voir conditions (son agence) | oui | oui | oui |
| Voir conditions (autre agence) | non | non | oui |
| Proposer une condition | oui (-> validation) | oui (direct) | oui (direct) |
| Valider une proposition | non | oui | oui |
| Refuser une proposition | non | oui | oui |
| Poser marque globale prioritaire/forte | non | oui | oui |
| Poser marque globale standard/securite | oui (-> validation) | oui (direct) | oui (direct) |
| Creer derogation agence | non | oui | oui |
| Creer derogation nationale | non | non | oui |
| Creer derogation globale | non | non | oui |
| Voir derogations (son agence) | oui (lecture) | oui | oui |
| Voir derogations nationales/globales | oui (lecture) | oui (lecture) | oui |
| Gerer BFA (taux) | non | non (lecture) | oui |
| Voir BFA (taux) | non | oui | oui |
| Copier conditions | oui (-> validation) | oui (direct) | oui (direct) |
| Importer tarif fabricant | non | oui | oui |
| Importer prix marche | oui (-> validation) | oui (direct) | oui (direct) |
| Selecteur agence | non | non | oui |
| Admin conditions globales | non | non | oui |
| Utiliser IA (suggestions) | oui | oui | oui |
| Voir coefficients CL | oui (lecture) | oui (lecture) | oui |
| Gerer coefficients CL | non | oui | oui |
| Gerer config CL (frais) | non | non | oui |

**Legende** :
- `oui (-> validation)` : l'action cree une proposition soumise a validation `agency_admin`
- `oui (direct)` : l'action s'applique immediatement (proposition auto-validee)
- `oui (lecture)` : acces en lecture seule, sans droit de modification

---

## T4.3 - Politiques RLS par table

### T4.3.1 - pricing_conditions

Table centrale des conditions tarifaires par client/segment/agence.

```sql
-- Activer RLS
ALTER TABLE pricing_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_conditions FORCE ROW LEVEL SECURITY;

-- SELECT : son agence OU super_admin (cross-agence)
CREATE POLICY "pricing_conditions_select"
  ON pricing_conditions
  FOR SELECT
  USING (
    agency_id = (
      SELECT agency_id FROM profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- INSERT : uniquement dans son agence
CREATE POLICY "pricing_conditions_insert"
  ON pricing_conditions
  FOR INSERT
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM profiles
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE : uniquement dans son agence, restreint aux champs de statut
-- Les modifications de valeur passent par le systeme de propositions
CREATE POLICY "pricing_conditions_update"
  ON pricing_conditions
  FOR UPDATE
  USING (
    agency_id = (
      SELECT agency_id FROM profiles
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM profiles
      WHERE user_id = auth.uid()
    )
  );

-- DELETE : interdit. Archivage uniquement via UPDATE statut = 'archivee'
-- Aucune politique DELETE n'est creee.
```

### T4.3.2 - pricing_conditions_global

Conditions globales (marques) visibles par toutes les agences, modifiables par Super Admin.

```sql
ALTER TABLE pricing_conditions_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_conditions_global FORCE ROW LEVEL SECURITY;

-- SELECT : tous les utilisateurs authentifies
CREATE POLICY "pricing_conditions_global_select"
  ON pricing_conditions_global
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT : super_admin uniquement
CREATE POLICY "pricing_conditions_global_insert"
  ON pricing_conditions_global
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- UPDATE : super_admin uniquement
CREATE POLICY "pricing_conditions_global_update"
  ON pricing_conditions_global
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- DELETE : interdit (archivage uniquement)
```

### T4.3.3 - pricing_proposals

Historique des propositions de modification. Immutables apres validation.

```sql
ALTER TABLE pricing_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_proposals FORCE ROW LEVEL SECURITY;

-- SELECT : TCS voit ses propres propositions,
--          ROI voit toutes les propositions de son agence,
--          Super Admin voit tout
CREATE POLICY "pricing_proposals_select"
  ON pricing_proposals
  FOR SELECT
  USING (
    -- Direction / Super Admin : acces global
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
    OR (
      -- Agency Admin : toute l'agence
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
          AND role = 'agency_admin'
          AND agency_id = pricing_proposals.agency_id
      )
    )
    OR (
      -- TCS : uniquement ses propres propositions
      propose_par = auth.uid()
    )
  );

-- INSERT : dans son agence uniquement
CREATE POLICY "pricing_proposals_insert"
  ON pricing_proposals
  FOR INSERT
  WITH CHECK (
    agency_id = (
      SELECT agency_id FROM profiles
      WHERE user_id = auth.uid()
    )
    AND propose_par = auth.uid()
  );

-- UPDATE : agency_admin+ pour validation dans son agence, Super Admin global
CREATE POLICY "pricing_proposals_update"
  ON pricing_proposals
  FOR UPDATE
  USING (
    -- Direction / Super Admin : validation globale
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
    OR (
      -- Agency Admin : validation dans son agence
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
          AND role = 'agency_admin'
          AND agency_id = pricing_proposals.agency_id
      )
    )
  )
  WITH CHECK (
    -- Seuls les champs statut, valide_par, valide_le, motif_refus
    -- sont modifiables (controle applicatif dans le service)
    agency_id = pricing_proposals.agency_id
  );

-- DELETE : interdit (immutable)
```

### T4.3.4 - pricing_segments

Table de reference en lecture seule (segments tarifaires).

```sql
ALTER TABLE pricing_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_segments FORCE ROW LEVEL SECURITY;

-- SELECT : tous les utilisateurs authentifies
CREATE POLICY "pricing_segments_select"
  ON pricing_segments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE : aucune politique (administration via migration uniquement)
```

### T4.3.5 - supplier_derogations

Derogations fournisseur avec portee variable (agence, nationale, globale).

```sql
ALTER TABLE supplier_derogations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_derogations FORCE ROW LEVEL SECURITY;

-- SELECT : politique complexe basee sur la portee
CREATE POLICY "supplier_derogations_select"
  ON supplier_derogations
  FOR SELECT
  USING (
    -- Direction / Super Admin : tout voir
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
    OR (
      -- Portee agence : visible par les membres de l'agence
      portee = 'agence'
      AND agency_id = (
        SELECT agency_id FROM profiles
        WHERE user_id = auth.uid()
      )
    )
    OR (
      -- Portee nationale ou globale : visible par tous les authentifies
      portee IN ('nationale', 'globale')
      AND auth.uid() IS NOT NULL
    )
  );

-- INSERT : ROI pour portee agence, Direction+ pour nationale/globale
CREATE POLICY "supplier_derogations_insert"
  ON supplier_derogations
  FOR INSERT
  WITH CHECK (
    CASE
      WHEN portee = 'agence' THEN
        -- ROI de l'agence ou Super Admin
        EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
            AND (
              (role = 'agency_admin' AND agency_id = supplier_derogations.agency_id)
              OR role = 'super_admin'
            )
        )
      WHEN portee IN ('nationale', 'globale') THEN
        -- Direction ou Super Admin uniquement
        EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
      ELSE false
    END
  );

-- UPDATE : memes regles que INSERT
CREATE POLICY "supplier_derogations_update"
  ON supplier_derogations
  FOR UPDATE
  USING (
    CASE
      WHEN portee = 'agence' THEN
        EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
            AND (
              (role = 'agency_admin' AND agency_id = supplier_derogations.agency_id)
              OR role = 'super_admin'
            )
        )
      WHEN portee IN ('nationale', 'globale') THEN
        EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
            AND role = 'super_admin'
        )
      ELSE false
    END
  )
  WITH CHECK (
    -- La portee ne peut pas etre changee apres creation
    portee = supplier_derogations.portee
  );

-- DELETE : interdit (archivage via statut = 'archivee')
```

### T4.3.6 - bfa_rates

Taux BFA (Bonification de Fin d'Annee). Sensibilite elevee.

```sql
ALTER TABLE bfa_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bfa_rates FORCE ROW LEVEL SECURITY;

-- SELECT : ROI (lecture seule) + Direction + Super Admin
-- TCS ne voit pas les taux bruts, uniquement l'impact dans les marges calculees
CREATE POLICY "bfa_rates_select"
  ON bfa_rates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('agency_admin', 'super_admin')
    )
  );

-- INSERT : Direction ou Super Admin uniquement
CREATE POLICY "bfa_rates_insert"
  ON bfa_rates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- UPDATE : Direction ou Super Admin uniquement
CREATE POLICY "bfa_rates_update"
  ON bfa_rates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- DELETE : interdit
```

### T4.3.7 - cl_coefficients (NOUVEAU)

Coefficients Centre Logistique par hierarchie produit. Donnee de reference visible par tous, modifiable par agency_admin et super_admin.

```sql
ALTER TABLE cl_coefficients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cl_coefficients FORCE ROW LEVEL SECURITY;

-- SELECT : tous les utilisateurs authentifies (donnee de reference)
CREATE POLICY "cl_coefficients_select"
  ON cl_coefficients
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT : agency_admin ou super_admin uniquement
CREATE POLICY "cl_coefficients_insert"
  ON cl_coefficients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('agency_admin', 'super_admin')
    )
  );

-- UPDATE : agency_admin ou super_admin uniquement
CREATE POLICY "cl_coefficients_update"
  ON cl_coefficients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('agency_admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('agency_admin', 'super_admin')
    )
  );

-- DELETE : agency_admin ou super_admin uniquement
CREATE POLICY "cl_coefficients_delete"
  ON cl_coefficients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('agency_admin', 'super_admin')
    )
  );
```

### T4.3.8 - cl_config (NOUVEAU)

Configuration Centre Logistique (frais de ligne, frais de port). Table singleton modifiable uniquement par super_admin.

```sql
ALTER TABLE cl_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cl_config FORCE ROW LEVEL SECURITY;

-- SELECT : tous les utilisateurs authentifies
CREATE POLICY "cl_config_select"
  ON cl_config
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- UPDATE : super_admin uniquement
CREATE POLICY "cl_config_update"
  ON cl_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- INSERT : interdit (singleton initialise par migration)
-- DELETE : interdit
```

### T4.3.9 - supplier_products_history

Historique des prix fournisseur. Donnee de reference alimentee par import.

```sql
ALTER TABLE supplier_products_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products_history FORCE ROW LEVEL SECURITY;

-- SELECT : tous les utilisateurs authentifies (donnee de reference)
CREATE POLICY "supplier_products_history_select"
  ON supplier_products_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT : service_role uniquement (import systeme via Edge Function)
-- Pas de politique INSERT pour les utilisateurs normaux.
-- L'Edge Function utilise le service_role key pour inserer.

-- UPDATE / DELETE : interdit (historique immutable)
```

### T4.3.8 - client_consumption

Donnees de consommation client importees depuis AS400.

```sql
ALTER TABLE client_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_consumption FORCE ROW LEVEL SECURITY;

-- SELECT : son agence + Super Admin
CREATE POLICY "client_consumption_select"
  ON client_consumption
  FOR SELECT
  USING (
    agency_id = (
      SELECT agency_id FROM profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- INSERT : service_role uniquement (import AS400 via Edge Function)
-- Pas de politique INSERT pour les utilisateurs normaux.

-- UPDATE / DELETE : interdit
```

---

## T4.4 - Securite des derogations par portee

Le systeme de derogations introduit trois niveaux de portee avec des regles de visibilite et de modification distinctes :

### Portee AGENCE

```
Creation    : ROI de l'agence, Direction, Super Admin
Modification: ROI de l'agence, Direction, Super Admin
Visibilite  : membres de l'agence + Direction + Super Admin
Suppression : archivage uniquement (statut = 'archivee')

RLS lecture  : agency_id = user.agency_id
               OR user.role = 'super_admin'
RLS ecriture : (user.role = 'agency_admin' AND agency_id = user.agency_id)
               OR user.role = 'super_admin'
```

Une derogation agence s'applique uniquement aux clients de cette agence. Elle ne remonte pas dans le referentiel national. Le ROI de l'agence est autonome pour la creer et la modifier.

### Portee NATIONALE

```
Creation    : Direction (cellule marche), Super Admin
Modification: Direction, Super Admin
Visibilite  : toutes les agences (lecture), Super Admin (ecriture)
Suppression : archivage uniquement

RLS lecture  : auth.uid() IS NOT NULL (tous les authentifies)
RLS ecriture : user.role = 'super_admin'
```

Une derogation nationale s'applique a toutes les agences. Elle represente un accord negocie au niveau central avec un fournisseur. Les agences la voient et en beneficient mais ne peuvent pas la modifier.

### Portee GLOBALE

```
Creation    : Direction, Super Admin
Modification: Direction, Super Admin
Visibilite  : toutes les agences (lecture), Super Admin (ecriture)
Suppression : archivage uniquement

RLS lecture  : auth.uid() IS NOT NULL
RLS ecriture : user.role = 'super_admin'
```

Une derogation globale est similaire a la nationale mais s'applique a une categorie entiere de produits (tous les fournisseurs d'un segment). Elle est typiquement utilisee pour des ajustements de marche.

### Priorite d'application

Quand plusieurs derogations s'appliquent a un meme produit/client :

```
1. Derogation agence (la plus specifique)
2. Derogation nationale
3. Derogation globale (la plus generale)
```

La derogation la plus specifique l'emporte. Ce calcul est fait cote applicatif dans le service `resolveDerogation()`.

### Regles specifiques groupements trans-agences

#### Derogations fournisseur (supplier_derogations)

- Portee "agence" + cible "groupement" : AUTORISE.
  Chaque agence peut negocier ses propres conditions fournisseur
  pour un groupement. La derogation ne s'applique qu'aux clients
  du groupement rattaches a cette agence.
- Pour qu'une derogation s'applique a TOUS les clients du groupement
  (toutes agences) : utiliser portee "nationale" ou "globale"
  (creee par Direction uniquement).

#### Conditions tarifaires (pricing_conditions)

- Les conditions `scope = 'groupement'` sont visibles en lecture
  par toutes les agences dont au moins un client appartient
  au groupement reference (`groupement_id`).
- La modification reste restreinte a l'agence proprietaire.

#### Policy RLS supplementaire

```sql
CREATE POLICY "pricing_conditions_groupement_read"
  ON pricing_conditions
  FOR SELECT
  USING (
    scope = 'groupement'
    AND groupement_id IN (
      SELECT c.groupement_id FROM clients c
      WHERE c.agency_id = (
        SELECT agency_id FROM profiles
        WHERE user_id = auth.uid()
      )
      AND c.groupement_id IS NOT NULL
    )
  );
```

#### Regles d'ecriture groupement multi-agences

- L'agency_admin peut creer des conditions `scope = 'groupement'` **uniquement si tous les clients du groupement sont dans son agence**.
- Si le groupement est multi-agences, l'agency_admin propose (`statut = 'en_attente'`) → validee par super_admin.
- Le super_admin peut creer/modifier des conditions groupement sans restriction.

```sql
-- Verification applicative (service layer, pas RLS)
-- Avant INSERT/UPDATE sur pricing_conditions WHERE scope = 'groupement':
SELECT COUNT(DISTINCT c.agency_id) AS nb_agences
FROM clients c
WHERE c.groupement_id = p_groupement_id;
-- Si nb_agences > 1 ET role = 'agency_admin' → bloquer ecriture directe, forcer proposition
```

---

## T4.5 - Audit trail

### Principe

Toute modification de condition tarifaire est tracee de maniere immutable. Le systeme de propositions (`pricing_proposals`) constitue le journal d'audit principal.

### Regles d'audit

1. **Propositions TCS** : creent un enregistrement avec `statut='en_attente'`, `propose_par=TCS.user_id`
2. **Modifications directes ROI/Direction** : creent un enregistrement avec `statut='validee'`, `propose_par=user_id`, `valide_par=user_id` (auto-validation)
3. **Validation ROI** : met a jour la proposition avec `statut='validee'`, `valide_par=ROI.user_id`, `valide_le=NOW()`
4. **Refus ROI** : met a jour la proposition avec `statut='refusee'`, `valide_par=ROI.user_id`, `motif_refus` obligatoire
5. **Immutabilite** : une proposition validee ou refusee ne peut plus etre modifiee. Un nouveau changement cree une nouvelle proposition.

### Trigger d'audit sur pricing_conditions

```sql
-- Fonction de journalisation des modifications de conditions
CREATE OR REPLACE FUNCTION log_condition_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO pricing_audit_log (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    agency_id,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE')
      THEN to_jsonb(OLD)
      ELSE NULL
    END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE')
      THEN to_jsonb(NEW)
      ELSE NULL
    END,
    auth.uid(),
    COALESCE(NEW.agency_id, OLD.agency_id),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Trigger sur pricing_conditions
CREATE TRIGGER audit_condition_change
  AFTER INSERT OR UPDATE ON pricing_conditions
  FOR EACH ROW EXECUTE FUNCTION log_condition_audit();

-- Trigger sur pricing_conditions_global
CREATE TRIGGER audit_condition_global_change
  AFTER INSERT OR UPDATE ON pricing_conditions_global
  FOR EACH ROW EXECUTE FUNCTION log_condition_audit();

-- Trigger sur supplier_derogations
CREATE TRIGGER audit_derogation_change
  AFTER INSERT OR UPDATE ON supplier_derogations
  FOR EACH ROW EXECUTE FUNCTION log_condition_audit();

-- Trigger sur bfa_rates
CREATE TRIGGER audit_bfa_change
  AFTER INSERT OR UPDATE ON bfa_rates
  FOR EACH ROW EXECUTE FUNCTION log_condition_audit();

-- Trigger sur cl_coefficients
CREATE TRIGGER audit_cl_coefficients_change
  AFTER INSERT OR UPDATE OR DELETE ON cl_coefficients
  FOR EACH ROW EXECUTE FUNCTION log_condition_audit();

-- Trigger sur cl_config
CREATE TRIGGER audit_cl_config_change
  AFTER UPDATE ON cl_config
  FOR EACH ROW EXECUTE FUNCTION log_condition_audit();
```

### Table pricing_audit_log

```sql
CREATE TABLE pricing_audit_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name    text NOT NULL,
  record_id     uuid NOT NULL,
  action        text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values    jsonb,
  new_values    jsonb,
  user_id       uuid REFERENCES auth.users(id),
  agency_id     uuid REFERENCES agencies(id),
  created_at    timestamptz DEFAULT NOW() NOT NULL
);

-- Index pour les requetes d'audit par table et date
CREATE INDEX idx_pricing_audit_log_table_date
  ON pricing_audit_log (table_name, created_at DESC);

-- Index pour les requetes d'audit par utilisateur
CREATE INDEX idx_pricing_audit_log_user
  ON pricing_audit_log (user_id, created_at DESC);

-- Index pour les requetes d'audit par agence
CREATE INDEX idx_pricing_audit_log_agency
  ON pricing_audit_log (agency_id, created_at DESC);

-- RLS : Direction et Super Admin uniquement
ALTER TABLE pricing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY "pricing_audit_log_select"
  ON pricing_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
    OR (
      -- ROI voit l'audit de son agence
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
          AND role = 'agency_admin'
          AND agency_id = pricing_audit_log.agency_id
      )
    )
  );

-- Pas de INSERT/UPDATE/DELETE pour les utilisateurs (triggers uniquement)
```

---

## T4.6 - Protection contre les abus

### Rate limiting

Le rate limiting existant dans le middleware Hono s'applique aux endpoints pricing :

- **Mutations** : 30 requetes / minute / utilisateur
- **Lectures** : 120 requetes / minute / utilisateur
- **Import CSV** : 5 requetes / minute / utilisateur (fichiers volumineux)
- **Appels IA** : quota par agence par jour (configurable, defaut 100 appels/jour/agence)

### Contraintes metier applicatives

Ces contraintes sont verifiees dans le service layer (pas dans RLS) :

1. **Motif obligatoire sur les propositions** : minimum 10 caracteres. Le service rejette toute proposition sans motif.

2. **Commentaire obligatoire sur les refus** : le ROI doit justifier chaque refus de proposition.

3. **Alerte coef_mini** : quand une condition proposee viole le coefficient minimum du segment, le service emet une alerte non bloquante. L'utilisateur peut confirmer avec un motif renforce.

4. **Alerte marque globale prioritaire/forte** : quand une marque globale de force `prioritaire` ou `forte` ecrase des conditions existantes, le service emet un avertissement listant les conditions impactees.

5. **TCS restreint aux forces standard/securite** : le service refuse la creation de marques globales `prioritaire` ou `forte` par un TCS, meme via proposition.

6. **Validation de coherence** : le service verifie que les valeurs proposees sont dans les bornes metier (coefficient > 0, remise entre 0 et 100%, etc.).

### Quota IA

```
Suivi par table : ai_usage_quotas
Colonnes : agency_id, date, call_count, max_calls
Verification : avant chaque appel IA, le service incremente et verifie le quota
Depassement : erreur PRICING_AI_QUOTA_EXCEEDED avec message explicite
Reset : quotidien via cron Supabase (pg_cron)
```

---

## T4.7 - CORS et headers

### Configuration CORS

Le CORS est gere par le middleware Hono existant :

```typescript
// Deja en place dans backend/functions/api/app.ts
app.use('*', cors({
  origin: Deno.env.get('CORS_ALLOWED_ORIGIN') ?? '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  maxAge: 86400,
}));
```

### Headers de securite

- **Authorization** : Bearer token JWT Supabase (obligatoire sur toutes les routes sauf health check)
- **Content-Type** : `application/json` strictement valide (middleware de validation)
- **x-request-id** : identifiant unique de requete pour le tracing (genere par le middleware `requestId`)
- **Pas de cookies** : l'authentification repose uniquement sur le header Authorization

### Validation du Content-Type

Le middleware existant rejette les requetes POST sans `Content-Type: application/json`. Cette regle s'applique a tous les endpoints pricing sans modification supplementaire.

---

## T4.8 - Resume des garanties de securite

| Garantie | Mecanisme |
|----------|-----------|
| Isolation multi-tenant | RLS sur `agency_id` pour toutes les tables |
| Controle d'acces par role | Politiques RLS + verification applicative dans les services |
| Immutabilite de l'audit | Table `pricing_proposals` + `pricing_audit_log` en append-only |
| Protection des donnees sensibles (BFA) | RLS restreint a agency_admin+ en lecture, super_admin en ecriture |
| Tracabilite complete | Triggers d'audit sur toutes les tables de conditions |
| Prevention des abus | Rate limiting middleware + quotas IA + contraintes metier |
| Securite des communications | CORS strict + JWT obligatoire + validation Content-Type |
| Coherence des donnees | Validation Zod partagee front/back + contraintes CHECK en base |
| Gestion CL centralisee | RLS cl_coefficients (agency_admin+) + cl_config (super_admin) + audit triggers |
