-- Idempotent cleanup for legacy interaction values (safe to rerun)

update public.interactions
set channel = trim(channel)
where channel is not null
  and channel <> trim(channel);

update public.interactions
set lead_source = trim(lead_source)
where lead_source is not null
  and lead_source <> trim(lead_source);

update public.interactions
set channel = 'Téléphone'
where channel is null
  or trim(channel) = '';

update public.interactions
set lead_source = 'Client Direct'
where lead_source is null
  or trim(lead_source) = '';

update public.interactions
set channel = 'Téléphone'
where channel in ('TMQhone', 'TＭＱhone');

update public.interactions
set lead_source = 'Client Direct'
where lead_source = 'Direct';

update public.interactions
set lead_source = 'Rétrocession Fournisseur'
where lead_source in ('RUrocession Fournisseur', 'RＵrocession Fournisseur');

update public.interactions
set timeline = '[]'::jsonb
where timeline is null;

update public.interactions
set timeline = coalesce(nullif(trim(both '"' from timeline::text), ''), '[]')::jsonb
where jsonb_typeof(timeline) = 'string';
