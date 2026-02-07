-- Normalize legacy values before enforcing constraints.
update public.interactions
set channel = 'Téléphone'
where channel in ('TMQhone', 'TＭＱhone', 'Telephone');

update public.interactions
set lead_source = 'Rétrocession Fournisseur'
where lead_source in ('RUrocession Fournisseur', 'RＵrocession Fournisseur', 'Retrocession Fournisseur');

alter table if exists public.interactions
  drop constraint if exists interactions_channel_check,
  drop constraint if exists interactions_lead_source_check;

alter table if exists public.interactions
  add constraint interactions_channel_check
    check (channel in ('Téléphone', 'Email', 'Comptoir', 'Visite')),
  add constraint interactions_lead_source_check
    check (lead_source in ('Client Direct', 'Rétrocession Fournisseur', 'Site Web'));
