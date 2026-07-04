-- Insert prompt templates
INSERT INTO public.ai_prompt_templates(feature, label, description, allowed_variables)
VALUES 
(
  'pricing.references.diagnose.classification',
  'Diagnostic Classification CIR',
  'Analyse assistee des anomalies de classification CIR.',
  ARRAY[
    'generated_at',
    'file_type',
    'classification_rows',
    'classification_unique_keys',
    'classification_duplicate_keys',
    'anomalies_total',
    'anomalies_blocking',
    'anomalies_high',
    'anomalies_medium',
    'anomalies_low'
  ]
),
(
  'pricing.references.diagnose.segments',
  'Diagnostic Segments et Grilles',
  'Analyse assistee des anomalies des segments et grilles fabricant.',
  ARRAY[
    'generated_at',
    'file_type',
    'segments_rows',
    'segments_unique_identities',
    'segments_missing_links',
    'segments_unknown_keys',
    'segments_missing_purchase_grids',
    'anomalies_total',
    'anomalies_blocking',
    'anomalies_high',
    'anomalies_medium',
    'anomalies_low'
  ]
)
ON CONFLICT (feature) DO NOTHING;

-- Insert default prompt versions
INSERT INTO public.ai_prompt_versions(template_id, version, status, body, change_note, published_at)
SELECT t.id,
  1,
  'published',
  'Tu es un assistant d analyse pour les classifications produit CIR. Analyse uniquement les donnees de classification fournies. Ne propose aucune correction automatique. Retourne strictement un JSON valide conforme a ce contrat: {"summary": string, "priority_anomalies": [{"title": string, "severity": "bloquante"|"haute"|"moyenne"|"faible", "evidence": string, "recommendation": string}], "recommendations": string[], "limits": string[], "confidence": number}. La confiance est un nombre entre 0 et 1.',
  'Version initiale classification',
  NOW()
FROM public.ai_prompt_templates t
WHERE t.feature = 'pricing.references.diagnose.classification'
  AND NOT EXISTS (
    SELECT 1 FROM public.ai_prompt_versions v WHERE v.template_id = t.id AND v.version = 1
  );

INSERT INTO public.ai_prompt_versions(template_id, version, status, body, change_note, published_at)
SELECT t.id,
  1,
  'published',
  'Tu es un assistant d analyse pour les segments et grilles fabricant. Analyse uniquement les donnees fournies. Ne propose aucune correction automatique. Retourne strictement un JSON valide conforme a ce contrat: {"summary": string, "priority_anomalies": [{"title": string, "severity": "bloquante"|"haute"|"moyenne"|"faible", "evidence": string, "recommendation": string}], "recommendations": string[], "limits": string[], "confidence": number}. La confiance est un nombre entre 0 et 1.',
  'Version initiale segments',
  NOW()
FROM public.ai_prompt_templates t
WHERE t.feature = 'pricing.references.diagnose.segments'
  AND NOT EXISTS (
    SELECT 1 FROM public.ai_prompt_versions v WHERE v.template_id = t.id AND v.version = 1
  );

-- Quota policies
INSERT INTO public.ai_quota_policies(scope, feature, enabled, daily_call_limit, monthly_call_limit, daily_token_limit, monthly_token_limit, daily_cost_limit, monthly_cost_limit, currency)
VALUES 
  ('global', 'pricing.references.diagnose.classification', true, 50, 1000, 200000, 4000000, 10, 200, 'USD'),
  ('global', 'pricing.references.diagnose.segments', true, 50, 1000, 200000, 4000000, 10, 200, 'USD')
ON CONFLICT DO NOTHING;
